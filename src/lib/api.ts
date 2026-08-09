import type { TurnRequest, TurnResponse, HistoryMessage } from "./types";
import { getCandidate } from "./curriculum";

const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/interview-turn`;

function getHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
  };
}

export interface InterviewContext {
  sessionId: string;
  candidateId: string;
  history: HistoryMessage[];
}

export async function sendTurn(
  context: InterviewContext,
  userMessage: string
): Promise<TurnResponse> {
  const body: TurnRequest = {
    sessionId: context.sessionId,
    candidateId: context.candidateId,
    userMessage,
    history: context.history,
  };

  let response: Response;
  try {
    response = await fetch(EDGE_FUNCTION_URL, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("Network error — unable to reach the interview server.");
  }

  if (!response.ok) {
    let detail = "";
    try {
      const errBody = await response.json();
      detail = errBody?.error ? `: ${errBody.error}` : "";
    } catch {
      // ignore parse error
    }
    throw new Error(`Server error (${response.status})${detail}. Please try again.`);
  }

  const data = await response.json();

  if (!data || typeof data.agentMessage !== "string") {
    throw new Error("Unexpected response format from the interview server.");
  }

  return {
    agentMessage: data.agentMessage,
    isComplete: Boolean(data.isComplete),
    feedback: data.feedback,
  };
}

export { getCandidate };
