# InterviewAI-TrishaD

[![Open in Bolt](https://bolt.new/static/open-in-bolt.svg)](https://bolt.new/~/sb1-hqnnbaow)

> Build the interviewer, not the interview.

An adaptive AI agent that conducts realistic, multi-turn technical interviews personalized to each candidate's actual learning journey through the AI Cohort curriculum — not a scripted quiz, a genuine conversation that probes strengths, follows up on struggles, and closes with structured, actionable feedback.

Built for the AB Talks Hackathon — Problem Statement 2: The Interview Agent.

---

## Live Demo

- **Live app:** [ADD YOUR PUBLISHED .bolt.host URL HERE]
- **Video walkthrough:** [ADD LINK HERE]
- **Repository:** [ADD GITHUB URL HERE]

---

## What It Does

- Conducts a conversational technical interview across the 31-day AI Cohort curriculum
- Personalizes question selection using each candidate's real signals — completed missions, skipped topics, failed attempts, and retry patterns
- Asks a minimum of 8 questions spanning at least 4 different curriculum days, prioritizing topics the candidate actually struggled with
- Generates genuine adaptive follow-ups based on what the candidate just said — not a fixed script
- Maintains full conversation state server-side across requests, keyed by session
- Produces structured, actionable feedback at the end: strengths, gaps, and concrete next steps

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Tailwind CSS + Framer Motion |
| Backend | Supabase Edge Functions (Deno) |
| AI Model | Google Gemini API |
| Session Persistence | Supabase Postgres |
| Bonus Integration | Breeth (intent-aware memory for interviewer reasoning) |
| Hosting | Bolt Cloud (.bolt.host) |

---

## Architecture

    Candidate Profile + Curriculum Data
                │
                ▼
       Topic Prioritization Engine
       (weights by: skipped / failed / attempt count)
                │
                ▼
       Interview State Machine  ──────►  Supabase Postgres
       (session persistence keyed          (interview_sessions table:
        by sessionId)                       history, candidate, progress)
                │
                ▼
       Gemini API — per-turn reasoning
       (evaluate answer → decide: follow-up
        on same topic, or move to new topic)
                │
                ▼
       Structured JSON Response
       (reply / done / feedback)

---

## API Contract

Single endpoint, matching the official Technical Specification:

POST /api/interview

**Start interview:**
{ "sessionId": "abc-123", "candidate": { ...candidate.json } }

**Conversation turn:**
{ "sessionId": "abc-123", "message": "..." }

**Response (in progress):**
{ "reply": "...", "done": false }

**Response (complete):**
{
  "reply": "...",
  "done": true,
  "feedback": {
    "summary": "...",
    "strengths": ["..."],
    "gaps": ["..."],
    "next": ["..."]
  }
}

---

## Data

- curriculum.json — the full 31-day AI Cohort curriculum (modules, topics, tools, learning objectives)
- candidates.json — synthetic candidate profiles with mission completion, attempts, and skip signals

Both provided by hackathon organizers and used as-is.

---

## Running Locally

    git clone [YOUR REPO URL]
    cd [REPO NAME]
    npm install
    npm run dev

Set these environment variables as Supabase Edge Function secrets before running:
- GEMINI_API_KEY — your Gemini API key (aistudio.google.com)

---

## AI Usage Log

Full prompt history and AI-assisted development log available in AI_USAGE_LOG.md, per hackathon authenticity requirements.

---

## Author

Built solo by Trisha for the AB Talks Hackathon.
