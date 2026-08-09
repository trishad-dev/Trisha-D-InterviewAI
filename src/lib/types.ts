export type DayType =
  | "SETUP"
  | "BUILD"
  | "AI_CORE"
  | "LEARN"
  | "SHIP_IT"
  | "OPTIMIZE"
  | "CAPSTONE";

export interface CurriculumDay {
  day: number;
  title: string;
  type: DayType;
  tools: string[];
  objectives: string[];
}

export interface CurriculumModule {
  n: number;
  title: string;
  days: [number, number];
}

export interface CurriculumData {
  cohort: string;
  modules: CurriculumModule[];
  days: CurriculumDay[];
}

export interface Mission {
  day: number;
  title: string;
  passed?: boolean;
  attempts?: number;
  skipped?: boolean;
}

export interface CandidateSignals {
  commitDays: number;
  missionsCompleted: number;
  missionsFirstTry: number;
}

export interface CandidateMember {
  id: string;
  name: string;
  jobRole: string;
  yearsExperience: number;
  education: string;
  status: string;
}

export interface Candidate {
  member: CandidateMember;
  missions: Mission[];
  signals: CandidateSignals;
}

export interface CandidatesData {
  candidates: Candidate[];
}

export type Sender = "agent" | "candidate";

export interface ChatMessage {
  id: string;
  sender: Sender;
  text: string;
  reasoning?: string;
  timestamp: number;
}

export type Understanding = "strong" | "developing" | "weak";

export interface TopicBreakdownEntry {
  day: number;
  topic: string;
  understanding: Understanding;
}

export interface InterviewFeedback {
  strengths: string[];
  gaps: string[];
  topicBreakdown: TopicBreakdownEntry[];
  overallSummary: string;
}

export interface HistoryMessage {
  role: Sender;
  text: string;
}

export interface TurnRequest {
  sessionId: string;
  candidateId: string;
  userMessage: string;
  history: HistoryMessage[];
}

export interface TurnResponse {
  agentMessage: string;
  isComplete: boolean;
  feedback?: InterviewFeedback;
}
