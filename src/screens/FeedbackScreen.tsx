import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, FileText, RotateCcw, Home } from "lucide-react";
import type { Candidate, InterviewFeedback, ChatMessage } from "@/lib/types";
import { UnderstandingBadge } from "@/components/InterviewUI";
import { Logo } from "@/components/Logo";

interface FeedbackScreenProps {
  candidate: Candidate;
  feedback: InterviewFeedback;
  history: ChatMessage[];
  onRestart: () => void;
  onHome: () => void;
}

export function FeedbackScreen({
  candidate,
  feedback,
  history,
  onRestart,
  onHome,
}: FeedbackScreenProps) {
  const questionCount = history.filter((m: ChatMessage) => m.sender === "candidate").length;

  return (
    <div className="min-h-screen px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="flex justify-center mb-8"
        >
          <Logo size="md" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
          className="text-center mb-10"
        >
          <h1 className="font-display font-bold text-3xl md:text-4xl text-ink-50 mb-3 tracking-tight">
            Interview Feedback
          </h1>
          <p className="text-ink-300 font-body">
            {candidate.member.name} · {candidate.member.jobRole} · {questionCount} questions answered
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2, ease: "easeOut" }}
          className="bg-ink-900 border border-ink-800 rounded-2xl p-6 mb-6"
        >
          <div className="flex items-center gap-2.5 mb-3">
            <FileText size={18} className="text-accent-400" />
            <h2 className="font-display font-semibold text-lg text-ink-100">Summary</h2>
          </div>
          <p className="text-ink-300 font-body leading-relaxed">
            {feedback.overallSummary}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3, ease: "easeOut" }}
          className="bg-ink-900 border border-ink-800 rounded-2xl p-6 mb-6"
        >
          <div className="flex items-center gap-2.5 mb-4">
            <TrendingUp size={18} className="text-accent-400" />
            <h2 className="font-display font-semibold text-lg text-ink-100">Strengths</h2>
          </div>
          {feedback.strengths.length > 0 ? (
            <div className="space-y-2.5">
              {feedback.strengths.map((strength, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.4 + i * 0.08, ease: "easeOut" }}
                  className="flex items-start gap-3"
                >
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-accent-400 shrink-0" />
                  <p className="text-ink-200 font-body text-[15px] leading-relaxed">{strength}</p>
                </motion.div>
              ))}
            </div>
          ) : (
            <p className="text-ink-400 font-body text-sm italic">No specific strengths identified.</p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4, ease: "easeOut" }}
          className="bg-ink-900 border border-ink-800 rounded-2xl p-6 mb-6"
        >
          <div className="flex items-center gap-2.5 mb-4">
            <TrendingDown size={18} className="text-amber-400" />
            <h2 className="font-display font-semibold text-lg text-ink-100">Areas to Improve</h2>
          </div>
          {feedback.gaps.length > 0 ? (
            <div className="space-y-2.5">
              {feedback.gaps.map((gap, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.5 + i * 0.08, ease: "easeOut" }}
                  className="flex items-start gap-3"
                >
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                  <p className="text-ink-200 font-body text-[15px] leading-relaxed">{gap}</p>
                </motion.div>
              ))}
            </div>
          ) : (
            <p className="text-ink-400 font-body text-sm italic">No significant gaps identified.</p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5, ease: "easeOut" }}
          className="bg-ink-900 border border-ink-800 rounded-2xl p-6 mb-8"
        >
          <h2 className="font-display font-semibold text-lg text-ink-100 mb-4">
            Topic Breakdown
          </h2>
          {feedback.topicBreakdown.length > 0 ? (
            <div className="space-y-3">
              {feedback.topicBreakdown.map((entry, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.6 + i * 0.08, ease: "easeOut" }}
                  className="flex items-center justify-between gap-4 py-2 border-b border-ink-800 last:border-0"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs font-mono text-ink-500 shrink-0">Day {entry.day}</span>
                    <span className="text-ink-200 font-body text-sm truncate">{entry.topic}</span>
                  </div>
                  <UnderstandingBadge level={entry.understanding} />
                </motion.div>
              ))}
            </div>
          ) : (
            <p className="text-ink-400 font-body text-sm italic">No topic breakdown available.</p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.7, ease: "easeOut" }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <button
            onClick={onRestart}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-accent-500 text-ink-950 font-display font-semibold hover:bg-accent-400 transition-colors"
          >
            <RotateCcw size={18} />
            New Interview
          </button>
          <button
            onClick={onHome}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-ink-800 text-ink-200 font-display font-semibold hover:bg-ink-700 transition-colors"
          >
            <Home size={18} />
            Home
          </button>
        </motion.div>
      </div>
    </div>
  );
}
