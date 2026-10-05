-- The DDL the deploy applies. `clawnify deploy` reconciles THIS file and
-- nothing else, and reconciliation is additive: it adds missing columns and
-- never drops anything, so editing this file in place is safe against a live
-- database. Template repos carry no migrations/ folder: migrations are per
-- deployed instance, tracked in each app's own database.
--
-- LOCAL DEVELOPMENT DOES NOT RECONCILE. `clawnify dev` runs this file as-is,
-- and every CREATE below is IF NOT EXISTS, so adding a column to a table you
-- have already created locally is a silent no-op. Delete
-- .clawnify/.wrangler/state/v3/d1 and restart to pick the change up.

-- What to look for. The agent runs each active search on its schedule and
-- reports back, so `last_run_at` says whether the radar is actually running.
CREATE TABLE IF NOT EXISTS searches (
  id            TEXT PRIMARY KEY,
  org_id        TEXT NOT NULL,
  -- The words typed into the platform's own search box, exactly.
  query         TEXT NOT NULL,
  platform      TEXT NOT NULL DEFAULT 'linkedin',
  -- Why this search exists, in a sentence. The agent reads it to judge
  -- relevance, so "people asking who can help them sell on Bol" beats "bol".
  intent        TEXT NOT NULL DEFAULT '',
  active        INTEGER NOT NULL DEFAULT 1,
  last_run_at   TEXT,
  -- Posts the last run added to the queue (duplicates not counted).
  last_found    INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS searches_org ON searches(org_id, active);

-- Who can comment: the company page and the people allowed to speak for it.
-- A suggestion names one, because the same reply lands differently from a
-- founder than from a logo.
CREATE TABLE IF NOT EXISTS voices (
  id            TEXT PRIMARY KEY,
  org_id        TEXT NOT NULL,
  name          TEXT NOT NULL,
  -- 'company' = a company page, 'person' = someone's own profile.
  kind          TEXT NOT NULL DEFAULT 'person',
  profile_url   TEXT,
  -- How this voice talks and what it should be used for, in plain words.
  notes         TEXT NOT NULL DEFAULT '',
  created_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS voices_org ON voices(org_id);

-- One row per post found. The queue, the history and the agent's feedback all
-- read this table; nothing is ever re-inserted for a URL the org has seen, so a
-- post someone dismissed stays dismissed.
CREATE TABLE IF NOT EXISTS posts (
  id                 TEXT PRIMARY KEY,
  org_id             TEXT NOT NULL,
  platform           TEXT NOT NULL DEFAULT 'linkedin',
  -- Normalised (no query string, fragment or trailing slash). With org_id it
  -- is the identity of a post, enforced by the unique index below.
  url                TEXT NOT NULL,
  author_name        TEXT NOT NULL DEFAULT '',
  author_headline    TEXT NOT NULL DEFAULT '',
  author_url         TEXT,
  text               TEXT NOT NULL DEFAULT '',
  -- When the author posted it, as precisely as the platform said. Null when
  -- the platform only said "3d"; the age is then read from found_at.
  posted_at          TEXT,
  found_at           TEXT NOT NULL,
  search_id          TEXT,
  language           TEXT,
  -- 0 to 100, the agent's judgement. `reason` is the one line a person reads
  -- to decide whether to trust it.
  relevance          INTEGER NOT NULL DEFAULT 0,
  reason             TEXT NOT NULL DEFAULT '',
  suggested_comment  TEXT NOT NULL DEFAULT '',
  -- The agent's draft exactly as it arrived. suggested_comment changes as a
  -- person edits; this never does, so the two together show what they changed.
  original_comment   TEXT NOT NULL DEFAULT '',
  voice_id           TEXT,
  -- 'new'       = waiting for a person
  -- 'approved'  = comment copied and the post opened; not yet confirmed posted
  -- 'commented' = a person posted it
  -- 'dismissed' = not worth it, with a reason the agent learns from
  status             TEXT NOT NULL DEFAULT 'new',
  dismiss_reason     TEXT,
  -- What was actually posted, which is the suggestion after a person's edits.
  -- The difference between the two is the best feedback the agent gets.
  final_comment      TEXT,
  decided_by         TEXT,
  decided_at         TEXT,
  created_at         TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS posts_org_url ON posts(org_id, url);
CREATE INDEX IF NOT EXISTS posts_queue ON posts(org_id, status, relevance);
CREATE INDEX IF NOT EXISTS posts_decided ON posts(org_id, decided_at);
