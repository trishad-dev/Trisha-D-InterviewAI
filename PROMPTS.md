# AI Usage Log

This document records the AI-assisted development process for InterviewAI, built for the AB Talks Hackathon — Problem Statement 2: The Interview Agent.

**AI tools used:**
- **Claude** — strategy, architecture planning, prompt engineering, code review, debugging
- **Bolt.new (Gemini-powered)** — code generation and implementation
- **Gemini API** — runtime reasoning inside the deployed interview agent itself

---

## 1. Initial Build Prompt

**Purpose:** Scaffold the full-stack AI Interview Agent from scratch — data model, backend state machine, Gemini integration, frontend screens, and motion design.

**Given to:** Bolt.new

    ROLE
    You are a senior full-stack engineer and product designer building a
    polished, production-quality MVP for a 48-hour AI hackathon. Prioritize
    working functionality first, then visual craft. No placeholder "lorem
    ipsum" UI — everything should feel real.

    PROJECT: AI Interview Agent
    An AI agent that conducts a realistic, adaptive, multi-turn technical
    interview based on a candidate's progress through a 31-day AI curriculum
    (RAG, Vector DBs, Prompt Engineering, Agentic AI, MCP, AI Deployment).

    TECH STACK
    - Frontend: React + Tailwind CSS + Framer Motion for animation
    - Backend: Node.js/Express (or Next.js API routes if easier to unify)
    - LLM: Google Gemini API (gemini-2.0-flash or later), called server-side
      only — never expose the API key client-side. Read it from an
      environment variable named GEMINI_API_KEY.
    - No database required — hold interview state in memory per session
      (sessionId), since persistence across sessions is explicitly out of
      scope for this project.

    DATA (replace with real files before final build)
    1. curriculum.json — structured as: array of days, each with
       { day: number, topic: string, module: string, learningObjectives: string[] }
    2. candidateProfile.json — structured as:
       { candidateId: string, completedDays: number[], skippedDays: number[],
         attempts: { day: number, count: number }[], signals: string[] }
    Use realistic mock data matching this shape until real files are provided.

    CORE LOGIC — Interview State Machine
    1. On session start, load candidate profile + curriculum.
    2. Prioritize topics the candidate actually completed; weight skipped/
       struggled topics slightly higher for probing (real interviewers do this).
    3. Ask a minimum of 8 questions spanning at least 4 different curriculum days.
    4. After each candidate response, the SAME LLM call that evaluates the
       answer should also decide: ask a follow-up on this topic, or move to
       a new topic. This must be genuinely conditional on what was said —
       not a fixed script. Pass the full conversation history in context.
    5. At the end, generate structured feedback:
       { strengths: string[], gaps: string[], topicBreakdown: 
         { day, topic, understanding: "strong"|"developing"|"weak" }[],
         overallSummary: string }

    API ENDPOINT
    [PLACEHOLDER — paste exact contract from the Technical Specification
    document here: method, path, request body shape, response shape.
    Until then, scaffold a clean REST endpoint:
    POST /api/interview/turn
    Request: { sessionId, candidateProfileId, userMessage }
    Response: { agentMessage, isComplete, feedback (only when isComplete) }
    Make this easy to rename/reshape once the real spec is provided.]

    FRONTEND — SCREENS
    1. Start screen: candidate profile selector (mock dropdown), brief
       framing of what to expect, animated entrance.
    2. Interview screen: chat-style interface. Agent messages animate in
       with a typing-indicator delay (400-800ms) before appearing — feels
       alive, not instant. Show a subtle progress indicator (e.g. "Day 3 of
       ~4 topics") without giving away exact question count.
    3. Feedback screen: reveal strengths/gaps with a staggered fade-in
       (each item animates in ~80ms after the last), not all at once.

    MOTION DESIGN DIRECTION
    - Use Framer Motion for all transitions — no jarring instant state changes.
    - Page/screen transitions: slide + fade, 250-300ms, ease-out.
    - Chat bubbles: enter with slight upward motion + fade (y: 10 → 0, opacity 0 → 1).
    - Avoid generic bounce/spring overuse — favor smooth, confident motion
      that feels calm and credible, appropriate for an "interview" context,
      not playful/gamey.
    - Typography: one strong display font for headers, clean sans-serif for
      body. Avoid default Inter-everywhere look — pick something with
      personality but still readable.
    - Color: avoid default purple-gradient SaaS look. Choose a distinct,
      intentional palette (e.g. deep charcoal + one confident accent color).

    EDGE CASES TO HANDLE
    - LLM call fails/times out → graceful retry message, not a broken UI.
    - Empty/missing candidate profile → clear fallback state, not a crash.
    - Candidate gives a one-word or off-topic answer → agent should
      naturally redirect, not break the flow.

    BUILD ORDER
    1. Scaffold full project structure first (folders, empty files) so I can
       see the architecture before logic is filled in.
    2. Implement the backend state machine + Gemini integration end-to-end
       with a hardcoded mock candidate first — get one full interview loop
       working before touching final visual polish.
    3. Then build the frontend screens against that working backend.
    4. Then layer in motion/animation polish last.

    Do not fake the adaptive follow-up logic with pre-written branches —
    it must genuinely be LLM-generated based on conversation history.

**Outcome:** Bolt generated a working landing page, candidate selector, chat-style interview interface, and structured feedback screen using Supabase Edge Functions and the Gemini API.

---

## 2. Security Fix — Hardcoded API Key

**Purpose:** Bolt's automated agent defaulted to hardcoding the Gemini API key directly in the edge function source (as a fallback) after a Supabase Management API call failed. This was caught before any public commit.

**Fix applied manually, verified in code review with Claude:**

    Before:
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? "AQ.Ab8R...[key]";

    After:
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

Key was rotated (old key deleted, new key generated) as a precaution, and set properly via Supabase's Edge Function Secrets Management dashboard.

---

## 3. Correction & Enhancement Prompt

**Purpose:** Fix evaluation logic (interview was rating every topic "Strong" regardless of answer quality), add a server-side completion guard, add a reasoning-trail feature, and fix topic-progress accuracy.

**Given to:** Bolt.new

    ROLE
    You are refining an existing, working AI Interview Agent — not rebuilding it.
    Make surgical, targeted changes only. Do not touch the frontend visual design,
    the candidate-context panel, the landing page, or the working Gemini
    integration unless a change below explicitly requires it. Test after each
    numbered change before moving to the next.

    CRITICAL CONSTRAINT
    Do NOT reintroduce a hardcoded fallback for GEMINI_API_KEY. It must remain:
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    with no `?? "..."` fallback, ever.

    CHANGE 1 — Server-side completion guard (reliability fix)
    Currently isComplete, questionCount, and topicsCovered are self-reported by
    the LLM in its JSON response with no independent verification. Fix:
    - Update TurnRequestBody to also accept the last known topicsCovered: string[]
      and questionCount: number from the previous turn (frontend should store
      and re-send these each request).
    - After parsing the LLM's response, before returning isComplete: true to the
      client, check: if the LLM's own reported questionCount < 8, OR
      topicsCovered.length < 4, forcibly override isComplete to false and
      continue the interview regardless of what the LLM claimed.
    - Never let the interview end early due to a model error — this check must
      be authoritative, not advisory.

    CHANGE 2 — Rigorous evaluator instruction (fix "everything is Strong")
    In buildInterviewSystemPrompt and buildFeedbackSystemPrompt, add an explicit
    instruction: "You are a rigorous, honest technical evaluator. Do not default
    to positive assessments. If an answer is vague, incorrect, incomplete, or
    shows surface-level pattern matching rather than real understanding, rate it
    'developing' or 'weak' accordingly — even if the candidate's profile suggests
    they completed the topic. A completed-but-poorly-explained topic should not
    be rated 'strong'. Base every rating solely on the quality of what was
    actually said in this conversation, not on the candidate's prior profile
    data."

    CHANGE 3 — Reasoning trail (new field, minimal UI)
    Add a new field to every non-final turn response: "reasoning" — one concise
    sentence explaining why the interviewer chose to probe deeper on the same
    topic vs. move to a new one, based on the candidate's last answer. Update the
    system prompt's OUTPUT FORMAT schema to include this field. On the frontend,
    render it as a small, subtle collapsed caption under each interviewer
    message (e.g. a muted-color line prefixed with "Why this question:") —
    collapsible/optional, not competing visually with the main conversation.

    CHANGE 4 — Fix topic-progress accuracy
    Ensure "currentTopic" in the LLM's response changes precisely when the
    actual curriculum day being probed changes — not only when the high-level
    module changes. A follow-up that moves from RAG chunking (Day 3) into vector
    index internals (Day 4) must update currentTopic and increment the
    frontend's progress indicator accordingly. Audit the system prompt's
    topic-labeling instructions to enforce this precisely.

    CHANGE 5 — Natural interview opening
    On interview start, before the first substantive technical question, have
    the agent send one brief, warm opening line (e.g. acknowledging the
    candidate by name and role, setting expectations) as a separate first
    message — not folded into the first question itself.

    CHANGE 6 — Actionable feedback
    In buildFeedbackSystemPrompt, require that each item in "gaps" be paired
    with one concrete, specific recommended next step (not generic advice like
    "study more" — something like "revisit HNSW vs IVF trade-offs with a focus
    on memory/latency benchmarks"). Update the JSON schema so each gap is an
    object: { "gap": "...", "recommendedNextStep": "..." } instead of a plain
    string, and update the frontend feedback screen to render both.

    CHANGE 7 — Mark data for swap-in (no logic change)
    Add a clear comment block directly above the CURRICULUM and CANDIDATES
    constants: "// TODO: Replace with the official Curriculum JSON and
    Candidate Profiles provided by hackathon organizers before final
    submission — this is placeholder data for development only." Do not alter
    the data itself yet.

    After all changes, run one full interview end-to-end and confirm:
    - The interview cannot end before 8 questions / 4 days even if forced
    - A deliberately wrong answer produces a "weak" or "developing" rating
    - The reasoning caption appears on interviewer messages
    - The progress indicator increments correctly across topic changes

---

## 4. Real Data & Contract Alignment Prompt

**Purpose:** Replace mock curriculum/candidate data with the official 31-day curriculum.json and candidates.json, and correct the API contract to exactly match the provided Technical Specification (endpoint path, field names, and — critically — server-side session persistence instead of client-sent conversation history).

**Given to:** Bolt.new, with curriculum.json, candidates.json, and technical-spec.md attached

    ROLE
    You are correcting an existing, mostly-working AI Interview Agent to match a
    real technical specification. This supersedes any prior data/contract work —
    apply everything below as one coherent pass. Preserve the existing frontend
    visual design, landing page, and candidate-context panel styling; only
    rewire logic, data, and the API contract.

    CRITICAL CONSTRAINT (unchanged)
    Do NOT reintroduce a hardcoded fallback for GEMINI_API_KEY. It must remain:
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    with no `?? "..."` fallback, ever.

    PART 1 — DATA (use the attached files exactly)
    Two files are attached: curriculum.json and candidates.json. Convert each
    into a typed TypeScript module (curriculumData.ts, candidatesData.ts)
    colocated with the edge function, using their EXACT contents — do not
    invent, paraphrase, drop, or summarize any day or candidate. Every day
    (1–31) and every candidate must be present.

    Update types to match reality:

    interface CurriculumDay {
      day: number;
      title: string;
      type: "SETUP" | "BUILD" | "AI_CORE" | "LEARN" | "SHIP_IT" | "OPTIMIZE" | "CAPSTONE";
      tools: string[];
      objectives: string[];
    }
    interface Module { n: number; title: string; days: [number, number]; }

    interface Mission {
      day: number;
      title: string;
      passed?: boolean;
      attempts?: number;
      skipped?: boolean;
    }
    interface Candidate {
      member: {
        id: string; name: string; jobRole: string;
        yearsExperience: number; education: string; status: string;
      };
      missions: Mission[];
      signals: { commitDays: number; missionsCompleted: number; missionsFirstTry: number };
    }

    PART 2 — SESSION PERSISTENCE (most important structural fix)
    The API contract does NOT send conversation history on each request — only
    {sessionId, message}. State must be held server-side, keyed by sessionId.
    Do NOT rely on in-memory variables in the edge function — serverless
    instances are not guaranteed to persist between invocations.

    Create a Supabase table (via migration) named interview_sessions:
    - session_id (text, primary key)
    - candidate (jsonb)
    - history (jsonb, array of {role, text})
    - topics_covered (jsonb, array of strings)
    - question_count (integer, default 0)
    - created_at (timestamptz, default now())

    On every request:
    - If the request body contains "candidate" (first call): create a new row,
      store the candidate, generate the opening reply, save history so far.
    - If the request body contains "message" only: load the row by sessionId,
      append the candidate's message to history, run the interview logic,
      append the agent's reply to history, update question_count and
      topics_covered, save the row back.
    - If sessionId isn't found for a "message"-only request, return a clear
      error rather than crashing.

    PART 3 — EXACT API CONTRACT
    Single endpoint: POST /api/interview (rename from whatever path exists now)

    Start request:  { "sessionId": string, "candidate": Candidate }
    Turn request:   { "sessionId": string, "message": string }

    Turn response (both cases, while ongoing):
    { "reply": string, "done": false }

    Final response (when interview concludes):
    {
      "reply": string,
      "done": true,
      "feedback": {
        "summary": string,
        "strengths": string[],
        "gaps": string[],
        "next": string[]
      }
    }
    "gaps" and "next" are separate flat arrays — do NOT nest next-steps inside
    gap objects. Each "next" entry should be a concrete, specific action tied
    to the interview (not generic advice).

    Additional internal fields (currentTopic, reasoning, etc. — see Part 5)
    may still be included in the response for the frontend's own use, as long
    as reply/done/feedback remain present and correctly named for grading.

    PART 4 — TOPIC PRIORITIZATION (rewrite using real signals)
    For each mission in candidate.missions, compute a probe weight:
    - skipped === true → weight += 3 ("probe lightly, confirm the actual gap")
    - passed === false → weight += 8 (failed despite attempting — strongest signal)
    - passed === true → weight += 5, plus +2 per attempt beyond the first
      (capped at +10) if attempts were needed

    Exclude curriculum days with type === "SETUP" from the core question pool
    entirely (tooling installation isn't a meaningful technical assessment) —
    Day 31 (CAPSTONE) is fine to include, good as an integrative closing
    question.

    When selecting the 8+ questions across 4+ days, prefer spanning multiple
    different modules (using the modules array's day ranges) rather than 4
    adjacent days in the same module — this demonstrates breadth across the
    whole cohort, not just one section.

    Use candidate.signals.missionsFirstTry ÷ signals.missionsCompleted as an
    overall calibration signal: a low ratio suggests a candidate who struggled
    broadly even on "passed" work — lean slightly more probing throughout, not
    just on flagged missions.

    Lightly incorporate member.jobRole and yearsExperience into the system
    prompt's tone-setting instructions (e.g. framing may differ for a
    Marketing Manager vs. a Principal Architect) — keep this subtle, not a
    difficulty gate.

    PART 5 — CARRY FORWARD FROM PRIOR WORK (still required)
    1. Server-side completion guard: never allow "done": true unless
       question_count >= 8 AND topics_covered has >= 4 distinct days, verified
       independently of what the LLM claims — override if the model is wrong.
    2. Rigorous evaluator instruction: explicitly tell the model not to default
       to positive assessments; rate based only on what was actually said this
       turn, not the candidate's prior profile.
    3. Reasoning trail: include a "reasoning" field on non-final turns — one
       sentence on why this question/follow-up was chosen. Render subtly under
       each interviewer message on the frontend.
    4. Natural opening: first response should include a brief warm opening
       line referencing candidate.member.name and jobRole before the first
       real question.

    PART 6 — FRONTEND REWIRE
    - Candidate selector must load from the real candidatesData.ts (20
      candidates, using member.name / member.jobRole for display) instead of
      the 4 mocked profiles.
    - Update all API calls: send {sessionId, candidate} to start, {sessionId,
      message} for turns — remove any client-side history being sent.
    - Update response parsing: read "reply"/"done" instead of
      "agentMessage"/"isComplete"; read feedback.summary/strengths/gaps/next
      on completion.

    After all changes: run one full interview end-to-end using a real
    candidate from candidates.json, confirm the session survives a page
    refresh mid-interview (proving persistence actually works, not just
    in-memory luck), and confirm the final response matches the exact
    contract shape above.

---

## 5. Known Issue Under Investigation

**Observed:** During manual testing, a candidate response of "I don't know, I am not prepared, can we end" caused the interview to terminate immediately at question 5 (below the required minimum of 8 questions across 4 curriculum days) with thin, generic feedback, and no attempt to redirect the candidate first.

**Status:** Root cause being diagnosed — likely the server-side completion guard from Prompt #3 either wasn't fully applied or isn't correctly overriding the model's self-reported `done` field. Fix in progress.

---

## Notes on Process

- All prompts were iteratively refined based on manual testing against real screenshots of the running application, not assumed to work from code alone.
- A security issue (hardcoded API key) was caught through manual review before any public commit.
- Data-fidelity was prioritized over convenience: the real curriculum.json and candidates.json files were attached directly to prompts rather than having the AI regenerate them from memory, to avoid transcription drift.
