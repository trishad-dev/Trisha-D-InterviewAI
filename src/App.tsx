import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Candidate, InterviewFeedback, ChatMessage } from "@/lib/types";
import { getAllCandidates } from "@/lib/curriculum";
import { StartScreen } from "@/screens/StartScreen";
import { InterviewScreen } from "@/screens/InterviewScreen";
import { FeedbackScreen } from "@/screens/FeedbackScreen";

type Screen = "start" | "interview" | "feedback";

function App() {
  const [screen, setScreen] = useState<Screen>("start");
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [feedback, setFeedback] = useState<InterviewFeedback | null>(null);
  const [interviewHistory, setInterviewHistory] = useState<ChatMessage[]>([]);

  const candidates = getAllCandidates();

  const handleStart = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
    setScreen("interview");
  };

  const handleComplete = (fb: InterviewFeedback, history: ChatMessage[]) => {
    setFeedback(fb);
    setInterviewHistory(history);
    setScreen("feedback");
  };

  const handleBack = () => {
    setSelectedCandidate(null);
    setFeedback(null);
    setInterviewHistory([]);
    setScreen("start");
  };

  const handleRestart = () => {
    setFeedback(null);
    setInterviewHistory([]);
    setScreen("interview");
  };

  return (
    <div className="min-h-screen bg-ink-950">
      <AnimatePresence mode="wait">
        {screen === "start" && (
          <motion.div
            key="start"
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <StartScreen candidates={candidates} onStart={handleStart} />
          </motion.div>
        )}

        {screen === "interview" && selectedCandidate && (
          <motion.div
            key="interview"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 30 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <InterviewScreen
              candidate={selectedCandidate}
              onBack={handleBack}
              onComplete={handleComplete}
            />
          </motion.div>
        )}

        {screen === "feedback" && selectedCandidate && feedback && (
          <motion.div
            key="feedback"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 30 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <FeedbackScreen
              candidate={selectedCandidate}
              feedback={feedback}
              history={interviewHistory}
              onRestart={handleRestart}
              onHome={handleBack}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
