# Supabase verification — 2026-11-05

Production: https://d-n-ma.onrender.com/. Backend: wjqajawefmdzvijqbnkj.

## Confirmed on hosted services

- Google OAuth returns a native application session on localhost and Render; admin entry appears for the owner.
- Mark/unmark Japanese vocabulary was compared with the hosted database. A change from localhost appeared in the mounted Render view without reload; these origins have independent local storage.
- Imported a clearly labeled QA quiz with a generated PNG. Upload produced a Supabase Storage URL; both displayed images loaded successfully.
- Guest on a third origin (localhost instead of 127.0.0.1/Render) opened the public share, saved a copy, and displayed its Storage images.
- User confirmed on a physical phone: image and edited QA question both visible.
- User marked the QA flashcard as known on the physical phone; the already-mounted Render desktop view changed to known 1/1 without reload.
- Shared source quiz and guest copy intentionally retained for review; no personal library records removed.

## Automated checks

- 20 PostgreSQL RLS/RPC/Storage cases and 14 application integration cases passed. Integration uses independent VM/storage clients, simulated API/realtime, and real PGlite PostgreSQL; this is distinct from hosted checks above.
- Settings/admin: 15 cases passed. Study/Speaking regression suite passed. TypeScript and production build passed.
- Share modal regression covers clipboard rejection, successful copy, failed option update, and retry.
- Compact share dialog checked at 390x740: about 570px tall with advanced options collapsed, no horizontal overflow; expanded content is bounded and scrollable.

## Limits

- Physical-phone airplane-mode/offline recovery and two different real learner accounts not yet exercised. Offline replay, account isolation, disabled account, granular JPD rights, and stale edit/deletion are covered by automated tests.
- General document conflicts use newest updatedAt. SRS/FE history merge per item. This is not a guarantee of merging simultaneous content edits.
- Google-only sign-in is enforced in application UI; Email provider remains enabled in Supabase dashboard for compatibility. No custom SMTP configured.
- Microphone recordings and device-specific presentation options are not cloud data.

## Follow-up: 2026-11-06

- Fixed MCQ flashcard mastery control: the known state can now be toggled off. Unmark stays on the current card; mark retains next-card behavior. The action persists immediately after incoming remote updates and does not mutate question props.
- Updated quiz timestamp on mastery changes so conflict comparison does not treat the action as older content.
- Hardened offline shell cache: only successful HTML navigation replaces the cached shell; wait for shell/assets writes; cache failures do not break online navigation; background media refresh extends worker lifetime.
- Added regression cases for mark/unmark, local action after remote change, timestamp, offline shell after server error, cached assets, quota failures, and bypass of Auth/database/AI requests.
- The earlier phone offline test was not completed because the old known button could not unmark. Do not count that as a passed physical offline test. User confirmed deleting/changing QA data during follow-up; it was not restored.
