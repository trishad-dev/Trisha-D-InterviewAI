/*
# Create interview_sessions table (single-tenant, no auth)

1. New Tables
- `interview_sessions`
  - `id` (text, primary key — frontend-generated session ID like "sess-...")
  - `candidate_id` (text, not null — references candidate ID from data file)
  - `candidate_name` (text, not null — denormalized for convenience)
  - `messages` (jsonb, not null, default '[]' — array of {role, text} history messages)
  - `question_count` (integer, not null, default 0 — number of agent questions asked so far)
  - `is_complete` (boolean, not null, default false — whether the interview has concluded)
  - `created_at` (timestamptz, default now())
  - `updated_at` (timestamptz, default now())

2. Security
- Enable RLS on `interview_sessions`.
- This is a single-tenant app with no sign-in screen, so all CRUD is allowed for both anon and authenticated roles.
- 4 separate policies (SELECT, INSERT, UPDATE, DELETE) with `TO anon, authenticated`.

3. Notes
- The `messages` jsonb column stores the full conversation history so the edge function can reconstruct context across requests without relying on in-memory state.
- `question_count` and `is_complete` let the edge function enforce minimum-question and completion guards server-side.
*/

CREATE TABLE IF NOT EXISTS interview_sessions (
  id text PRIMARY KEY,
  candidate_id text NOT NULL,
  candidate_name text NOT NULL,
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  question_count integer NOT NULL DEFAULT 0,
  is_complete boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE interview_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_interview_sessions" ON interview_sessions;
CREATE POLICY "anon_select_interview_sessions" ON interview_sessions FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_interview_sessions" ON interview_sessions;
CREATE POLICY "anon_insert_interview_sessions" ON interview_sessions FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_interview_sessions" ON interview_sessions;
CREATE POLICY "anon_update_interview_sessions" ON interview_sessions FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_interview_sessions" ON interview_sessions;
CREATE POLICY "anon_delete_interview_sessions" ON interview_sessions FOR DELETE
  TO anon, authenticated USING (true);
