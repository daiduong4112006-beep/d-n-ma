-- Add independent MAS291 / MAI391 grants; preserve existing JPD grants.
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
   or value-'disabled'-'jpdModules'-'studySubjects'-'updatedAt'<>'{}'::jsonb or jsonb_typeof(value->'updatedAt')<>'string'
   or (value ? 'disabled' and jsonb_typeof(value->'disabled')<>'boolean')
   or (value ? 'jpdModules' and (jsonb_typeof(value->'jpdModules')<>'array' or not(value->'jpdModules'<@'["vocabulary","kanji","grammar","speaking","exam-bank"]'::jsonb))) or (value ? 'studySubjects' and (jsonb_typeof(value->'studySubjects')<>'array' or not(value->'studySubjects'<@'["MAS291","MAI391"]'::jsonb))) then raise exception 'Invalid admin control' using errcode='42501';end if;
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
