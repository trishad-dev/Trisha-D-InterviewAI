import type { Candidate, CandidatesData, CurriculumDay, CurriculumData, Mission } from "./types";
import curriculumData from "@/data/curriculum.json";
import candidatesData from "@/data/candidates.json";

const curriculum = curriculumData as CurriculumData;
const candidates = candidatesData as CandidatesData;

export function getCurriculum(): CurriculumDay[] {
  return curriculum.days;
}

export function getModules() {
  return curriculum.modules;
}

export function getCohortLabel(): string {
  return curriculum.cohort;
}

export function getDay(day: number): CurriculumDay | undefined {
  return curriculum.days.find((d) => d.day === day);
}

export function getAllCandidates(): Candidate[] {
  return candidates.candidates;
}

export function getCandidate(id: string): Candidate | undefined {
  return candidates.candidates.find((c) => c.member.id === id);
}

export interface PrioritizedDay {
  day: CurriculumDay;
  weight: number;
  reason: string;
}

export function prioritizeTopics(candidate: Candidate): PrioritizedDay[] {
  const prioritized: PrioritizedDay[] = [];

  for (const day of getCurriculum()) {
    let weight = 0;
    const reasons: string[] = [];

    const mission: Mission | undefined = candidate.missions.find(
      (m) => m.day === day.day
    );

    if (mission?.skipped) {
      weight += 6;
      reasons.push("skipped (probe lightly)");
    }

    if (mission?.passed) {
      weight += 10;
      reasons.push("completed");
    }

    const attempts = mission?.attempts ?? 0;
    if (attempts > 1) {
      weight += attempts * 2;
      reasons.push(`${attempts} attempts (struggled)`);
    } else if (attempts === 1 && mission?.passed) {
      weight += 3;
      reasons.push("first-try pass");
    }

    if (weight > 0) {
      prioritized.push({ day, weight, reason: reasons.join(", ") });
    }
  }

  prioritized.sort((a, b) => b.weight - a.weight);
  return prioritized;
}

export function generateSessionId(): string {
  return `sess-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
