begin;
create table if not exists public.dun_documents(
 id uuid primary key default gen_random_uuid(),
 path text not null unique check(length(path) between 3 and 1000),
 collection_path text not null,
 owner_email text not null,
 data jsonb not null check(jsonb_typeof(data)='object'),
 revision bigint not null default 1,
 updated_at timestamptz not null default now()
);
create index if not exists dun_documents_collection_owner on public.dun_documents(collection_path,owner_email);
alter table public.dun_documents enable row level security;
revoke all on public.dun_documents from public,anon,authenticated;
grant select on public.dun_documents to anon,authenticated;
grant all on public.dun_documents to service_role;
-- Native signup/OAuth accounts appear in admin management without a client-side profile write.
create or replace function public.dun_new_auth_profile() returns trigger language plpgsql security definer set search_path='' as $$
begin if new.email is not null then insert into public.dun_documents(path,collection_path,owner_email,data)
 values('users/'||lower(new.email),'users',lower(new.email),jsonb_build_object('email',lower(new.email),'name',left(coalesce(new.raw_user_meta_data->>'display_name',new.raw_user_meta_data->>'full_name',split_part(new.email,'@',1)),200),'createdAt',now(),'updatedAt',now())) on conflict(path) do nothing;end if;return new;end; $$;
revoke all on function public.dun_new_auth_profile() from public,anon,authenticated;
drop trigger if exists dun_auth_profile_created on auth.users;
create trigger dun_auth_profile_created after insert on auth.users for each row execute function public.dun_new_auth_profile();
-- Trust confirmed Supabase Auth records, never editable user_metadata or profile roles.
create or replace function public.dun_email() returns text language sql stable security definer set search_path='' as $$
 select lower(email) from auth.users where id=auth.uid() and email_confirmed_at is not null;
$$;
create or replace function public.dun_admin() returns boolean language sql stable security definer set search_path='' as $$ select coalesce(public.dun_email()='daiduong4112006@gmail.com',false); $$;
create or replace function public.dun_active() returns boolean language sql stable security definer set search_path='' as $$
 select public.dun_email() is not null and (public.dun_admin() or not exists(select 1 from public.dun_documents where path='admin_controls/'||public.dun_email() and data->>'disabled'='true'));
$$;
create or replace function public.dun_share_open(s jsonb) returns boolean language sql stable security invoker set search_path='' as $$
 select s is not null and not(s ? 'deletedAt') and (s->>'expiresAtMs' is null or (s->>'expiresAtMs')::numeric>extract(epoch from now())*1000);
$$;
create or replace function public.dun_can_read(p text,o text,d jsonb) returns boolean language plpgsql stable security definer set search_path='' as $$
declare c text:=split_part(p,'/',1);e text:=public.dun_email();share jsonb;
begin
 if c='shared_quizzes' and array_length(string_to_array(p,'/'),1)=2 then return public.dun_share_open(d) or (public.dun_active() and o=e);end if;
 if c='admin_controls' then return e is not null and (public.dun_admin() or p='admin_controls/'||e);end if;
 if not public.dun_active() then return false;end if;
 if c='admin_audit' then return public.dun_admin();end if;
 if c='settings' and p='settings/jpd123_access_list' then return true;end if;
 if c='shared_quizzes' then select data into share from public.dun_documents where path=split_part(p,'/',1)||'/'||split_part(p,'/',2);return share->>'ownerEmail'=e or o=e;end if;
 return o=e or (public.dun_admin() and c in('users','quizzes','attempts'));
end; $$;
drop policy if exists dun_documents_read on public.dun_documents;
create policy dun_documents_read on public.dun_documents for select to anon,authenticated using(public.dun_can_read(path,owner_email,data));
-- Raise on disabled/revoked sessions instead of returning an empty private snapshot.
create or replace function public.dun_read_documents(p_path text,p_collection boolean default false,p_offset integer default 0,p_limit integer default 500)
returns setof public.dun_documents language plpgsql stable security invoker set search_path='' as $$
begin
 if split_part(p_path,'/',1) not in('admin_controls','shared_quizzes') and not public.dun_active() then raise exception 'Account disabled, unverified or expired' using errcode='42501';end if;
 if p_collection then return query select * from public.dun_documents where collection_path=p_path order by path offset greatest(p_offset,0) limit least(greatest(p_limit,1),500);
 else return query select * from public.dun_documents where path=p_path;end if;
end; $$;
revoke all on function public.dun_read_documents(text,boolean,integer,integer) from public;
grant execute on function public.dun_read_documents(text,boolean,integer,integer) to anon,authenticated;
-- Apply field-delete transforms only; increments have a dedicated constrained share RPC.
create or replace function public.dun_merge(old jsonb,patch jsonb,merging boolean) returns jsonb language plpgsql immutable set search_path='' as $$
declare result jsonb:=case when merging then coalesce(old,'{}') else '{}' end;k text;v jsonb;
begin
 for k,v in select * from jsonb_each(patch) loop
 if v='{"__dm_delete":true}'::jsonb then result:=result-k;
 elsif jsonb_typeof(v)='object' and v ? '__dm_increment' then raise exception 'Use dedicated counter RPC' using errcode='42501';
 else result:=jsonb_set(result,array[k],v,true);end if;end loop;return result;
end; $$;
create or replace function public.dun_commit_documents(p_reads jsonb,p_writes jsonb) returns void language plpgsql security definer set search_path='' as $$
declare w jsonb;r jsonb;p text;c text;e text:=public.dun_email();old public.dun_documents;value jsonb;owner text;at text;share jsonb;
begin
 if not public.dun_active() then raise exception 'Verified active account required' using errcode='42501';end if;
 if jsonb_typeof(p_reads)<>'array' or jsonb_typeof(p_writes)<>'array' or jsonb_array_length(p_writes)>100 or jsonb_array_length(p_reads)>100 or octet_length(p_writes::text)>16777216 then raise exception 'Invalid transaction';end if;
 -- Lock nonexistent paths too. Sorted locks prevent cross-transaction deadlocks.
 for p in select distinct x->>'path' from (select jsonb_array_elements(p_reads) x union all select jsonb_array_elements(p_writes) x) q order by 1 loop perform pg_advisory_xact_lock(hashtextextended(p,0));end loop;
 for r in select * from jsonb_array_elements(p_reads) loop
 select * into old from public.dun_documents where path=r->>'path';
 if found and not public.dun_can_read(old.path,old.owner_email,old.data) then raise exception 'Read denied' using errcode='42501';end if;
 if coalesce(old.revision,0)<>coalesce((r->>'revision')::bigint,0) then raise exception 'Concurrent update' using errcode='40001';end if;
 end loop;
 for w in select * from jsonb_array_elements(p_writes) loop
 p:=w->>'path';c:=split_part(p,'/',1);select * into old from public.dun_documents where path=p;
 if c not in('users','settings','quizzes','attempts','user_japanese_courses','vocabulary','starred_questions','flashcard_progress','quiz_learning_progress','practice_mistakes_progress','study_progress','srs_progress','fe_mock_exams','admin_controls','admin_audit','shared_quizzes') then raise exception 'Unknown collection' using errcode='42501';end if;
 if coalesce((w->>'delete')::boolean,false) then
 if old.path is null then continue;end if;
 if old.owner_email<>e or c in('admin_controls','admin_audit') then raise exception 'Delete denied' using errcode='42501';end if;
 delete from public.dun_documents where path=p;continue;
 end if;
 if jsonb_typeof(w->'data')<>'object' then raise exception 'Document must be an object';end if;
 value:=public.dun_merge(old.data,w->'data',coalesce((w->>'merge')::boolean,false));
 if c='admin_controls' then
  if not public.dun_admin() or p='admin_controls/daiduong4112006@gmail.com' or array_length(string_to_array(p,'/'),1)<>2
   or value-'disabled'-'jpdModules'-'updatedAt'<>'{}'::jsonb or jsonb_typeof(value->'updatedAt')<>'string'
   or (value ? 'disabled' and jsonb_typeof(value->'disabled')<>'boolean')
   or (value ? 'jpdModules' and (jsonb_typeof(value->'jpdModules')<>'array' or not(value->'jpdModules'<@'["vocabulary","kanji","grammar","speaking","exam-bank"]'::jsonb))) then raise exception 'Invalid admin control' using errcode='42501';end if;
  owner:=split_part(p,'/',2);
 elsif c='admin_audit' then
  if not public.dun_admin() or old.path is not null or value->>'actor'<>e or value-'actor'-'target'-'at'-'before'-'after'<>'{}'::jsonb then raise exception 'Audit is append-only' using errcode='42501';end if;owner:=e;
 elsif c='settings' and p='settings/jpd123_access_list' then
  if not public.dun_admin() then raise exception 'Admin only' using errcode='42501';end if;owner:=e;
 elsif c in('users','settings') then owner:=split_part(p,'/',2);if owner<>e then raise exception 'Foreign settings/profile' using errcode='42501';end if;
 elsif c='shared_quizzes' then
  if array_length(string_to_array(p,'/'),1)<>2 then raise exception 'Use result RPC' using errcode='42501';end if;owner:=value->>'ownerEmail';
  if old.path is not null and (value->'views' is distinct from old.data->'views' or value->'saves' is distinct from old.data->'saves') then raise exception 'Use counter RPC' using errcode='42501';end if;
 else owner:=case when c in('quizzes','attempts') then value->>'userEmail' else value->>'email' end;
 end if;
 if owner is null or owner='' or (owner<>e and c<>'admin_controls') or (old.path is not null and old.owner_email<>owner) then raise exception 'Ownership denied' using errcode='42501';end if;
 if c='users' then value:=value-'password'-'passwordHash';end if;
 insert into public.dun_documents(path,collection_path,owner_email,data,revision) values(p,regexp_replace(p,'/[^/]+$',''),owner,value,1)
 on conflict(path) do update set data=excluded.data,revision=dun_documents.revision+1,updated_at=now();
 end loop;
end; $$;
create or replace function public.dun_shared_action(p_share text,p_action text,p_score integer default null,p_total integer default null,p_name text default '') returns void language plpgsql security definer set search_path='' as $$
declare p text:='shared_quizzes/'||p_share;s public.dun_documents;e text:=public.dun_email();v jsonb;previous jsonb;percent integer;result_path text;
begin
 perform pg_advisory_xact_lock(hashtextextended(p,0));select * into s from public.dun_documents where path=p;
 if s.path is null or not public.dun_share_open(s.data) then raise exception 'Link unavailable' using errcode='42501';end if;
 if p_action in('views','saves') then update public.dun_documents set data=jsonb_set(data,array[p_action],to_jsonb(coalesce((data->>p_action)::bigint,0)+1)),revision=revision+1,updated_at=now() where path=p;return;end if;
 if p_action<>'result' or not public.dun_active() or s.data->>'classMode' is distinct from 'true' or p_total is null or p_total<1 or p_score<0 or p_score>p_total or p_score is null then raise exception 'Invalid class result' using errcode='42501';end if;
 result_path:=p||'/results/'||e;select data into previous from public.dun_documents where path=result_path;
 percent:=round(100.0*p_score/p_total);v:=jsonb_build_object('email',e,'name',left(p_name,200),'score',p_score,'total',p_total,'percent',percent,'bestPercent',greatest(percent,coalesce((previous->>'bestPercent')::integer,0)),'attempts',coalesce((previous->>'attempts')::integer,0)+1,'lastAt',to_char(now() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'));
 insert into public.dun_documents(path,collection_path,owner_email,data) values(result_path,p||'/results',e,v) on conflict(path) do update set data=excluded.data,revision=dun_documents.revision+1,updated_at=now();
end; $$;
create or replace function public.dun_delete_my_data() returns void language plpgsql security definer set search_path='' as $$
declare e text:=public.dun_email();begin if e is null then raise exception 'Sign in required' using errcode='42501';end if;
 delete from public.dun_documents where collection_path in(select path||'/results' from public.dun_documents where collection_path='shared_quizzes' and owner_email=e);
 delete from public.dun_documents where owner_email=e and collection_path not in('admin_controls','admin_audit');end; $$;
create or replace function public.dun_delete_my_account() returns void language plpgsql security definer set search_path='' as $$
begin perform public.dun_delete_my_data();delete from auth.users where id=auth.uid();end; $$;
-- Revoke default PUBLIC function execution, including the mutation helpers.
revoke all on function public.dun_email(),public.dun_admin(),public.dun_active(),public.dun_can_read(text,text,jsonb),public.dun_share_open(jsonb) from public;
grant execute on function public.dun_email(),public.dun_admin(),public.dun_active(),public.dun_can_read(text,text,jsonb),public.dun_share_open(jsonb) to anon,authenticated;
revoke all on function public.dun_merge(jsonb,jsonb,boolean),public.dun_commit_documents(jsonb,jsonb),public.dun_delete_my_data(),public.dun_delete_my_account(),public.dun_shared_action(text,text,integer,integer,text) from public,anon,authenticated;
grant execute on function public.dun_commit_documents(jsonb,jsonb),public.dun_delete_my_data(),public.dun_delete_my_account() to authenticated;
grant execute on function public.dun_shared_action(text,text,integer,integer,text) to anon,authenticated;
do $$ begin if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='dun_documents') then alter publication supabase_realtime add table public.dun_documents;end if;end $$;
commit;
