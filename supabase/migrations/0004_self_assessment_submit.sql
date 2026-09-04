-- Self-assessment becomes a one-time submission: the director fills
-- self_scores + 3 required achievement fields, then locks it in.
-- Enforced in the UI (same convention already used for the self/manager
-- score split) — the director's existing RLS update rights on their own
-- attestation row are broad enough that this isn't re-enforced in SQL.

alter table attestations add column if not exists self_submitted boolean not null default false;
alter table attestations add column if not exists achievement_1 text;
alter table attestations add column if not exists achievement_2 text;
alter table attestations add column if not exists achievement_3 text;

-- The old freeform `achievements` column is left in place (unused by the
-- app going forward) so any already-entered text isn't lost.
