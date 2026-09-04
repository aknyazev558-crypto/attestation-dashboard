-- A separate scoring column for staff, between self-assessment and the
-- final manager score — previously staff wrote directly into
-- manager_scores (scoped to their department by the app), sharing the
-- field with owner/CEO's final input. Now staff get their own column;
-- manager_scores becomes owner/CEO-only, filled in last, with staff_scores
-- (and self_scores) as a fallback until the owner/CEO enters their own.

alter table attestations add column if not exists staff_scores jsonb not null default '{}'::jsonb;
