import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, User, Sparkles, MessageSquare, CheckCircle2 } from "lucide-react";
import type { Candidate } from "@/lib/types";
import { prioritizeTopics } from "@/lib/curriculum";
import { Logo } from "@/components/Logo";

interface StartScreenProps {
  candidates: Candidate[];
  onStart: (candidate: Candidate) => void;
}

export function StartScreen({ candidates, onStart }: StartScreenProps) {
  const [selectedId, setSelectedId] = useState<string>("");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const selected = candidates.find((c) => c.member.id === selectedId);

  const handleStart = () => {
    if (!selected) return;
    onStart(selected);
  };

  const completedCount = (c: Candidate) =>
    c.missions.filter((m) => m.passed).length;
  const skippedCount = (c: Candidate) =>
    c.missions.filter((m) => m.skipped).length;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-2xl"
      >
        <div className="flex justify-center mb-10">
          <Logo size="lg" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
          className="text-center mb-10"
        >
          <h1 className="font-display font-bold text-4xl md:text-5xl text-ink-50 mb-4 tracking-tight leading-tight">
            Adaptive AI Interview
          </h1>
          <p className="text-ink-300 text-lg font-body max-w-lg mx-auto leading-relaxed">
            A realistic technical interview that adapts to your curriculum progress.
            Answer questions, get probed on weak spots, and receive structured feedback.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
          className="bg-ink-900 border border-ink-800 rounded-2xl p-6 md:p-8 shadow-2xl shadow-black/40"
        >
          <label className="block text-sm font-semibold text-ink-200 mb-3 font-body">
            Select Candidate Profile
          </label>

          <div className="relative mb-6">
            <button
              onClick={() => setDropdownOpen((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3.5 bg-ink-850 border border-ink-700 rounded-xl text-left hover:border-ink-600 transition-colors"
            >
              <span className={`flex items-center gap-3 ${selected ? "text-ink-100" : "text-ink-400"}`}>
                <User size={18} className="text-accent-400" />
                {selected
                  ? `${selected.member.name} — ${selected.member.jobRole}`
                  : "Choose a candidate..."}
              </span>
              <ChevronDown
                size={18}
                className={`text-ink-400 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
              />
            </button>

            {dropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="absolute z-10 w-full mt-2 bg-ink-850 border border-ink-700 rounded-xl shadow-xl overflow-hidden max-h-80 overflow-y-auto scrollbar-thin"
              >
                {candidates.map((c) => (
                  <button
                    key={c.member.id}
                    onClick={() => {
                      setSelectedId(c.member.id);
                      setDropdownOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-ink-800 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <User size={16} className="text-accent-400" />
                      <div>
                        <p className="text-ink-100 text-sm font-medium">{c.member.name}</p>
                        <p className="text-ink-400 text-xs">{c.member.jobRole}</p>
                      </div>
                    </div>
                    <span className="text-xs text-ink-500">
                      {completedCount(c)} days done
                    </span>
                  </button>
                ))}
              </motion.div>
            )}
          </div>

          {selected && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="mb-6 overflow-hidden"
            >
              <div className="bg-ink-850 border border-ink-700 rounded-xl p-4 space-y-3">
                <div className="flex flex-wrap gap-2">
                  {selected.missions.filter((m) => m.passed).map((m) => (
                    <span
                      key={m.day}
                      className="px-2.5 py-1 rounded-md bg-accent-500/15 text-accent-300 text-xs font-medium border border-accent-500/20"
                    >
                      Day {m.day}
                    </span>
                  ))}
                  {selected.missions.filter((m) => m.skipped).map((m) => (
                    <span
                      key={m.day}
                      className="px-2.5 py-1 rounded-md bg-ink-800 text-ink-400 text-xs font-medium border border-ink-700"
                    >
                      Day {m.day} (skipped)
                    </span>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-2 pt-2">
                  <div className="text-center">
                    <p className="text-accent-400 font-display font-bold text-lg">
                      {selected.signals.commitDays}
                    </p>
                    <p className="text-ink-500 text-xs">Commit Days</p>
                  </div>
                  <div className="text-center">
                    <p className="text-accent-400 font-display font-bold text-lg">
                      {selected.signals.missionsCompleted}
                    </p>
                    <p className="text-ink-500 text-xs">Missions Done</p>
                  </div>
                  <div className="text-center">
                    <p className="text-accent-400 font-display font-bold text-lg">
                      {selected.signals.missionsFirstTry}
                    </p>
                    <p className="text-ink-500 text-xs">First Try</p>
                  </div>
                </div>
                <div className="space-y-1 pt-1">
                  <p className="text-xs text-ink-400 font-body font-semibold mb-1">
                    Topics prioritized for interview:
                  </p>
                  {prioritizeTopics(selected).slice(0, 5).map((p) => (
                    <p key={p.day.day} className="text-xs text-ink-300 flex items-start gap-2">
                      <Sparkles size={12} className="text-accent-400 mt-0.5 shrink-0" />
                      Day {p.day.day}: {p.day.title} — {p.reason}
                    </p>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            {[
              { Icon: MessageSquare, text: "Multi-turn conversation" },
              { Icon: Sparkles, text: "Adaptive follow-ups" },
              { Icon: CheckCircle2, text: "Structured feedback" },
            ].map(({ Icon, text }, i) => (
              <motion.div
                key={text}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 + i * 0.08, ease: "easeOut" }}
                className="flex items-center gap-2.5 text-ink-300 text-sm"
              >
                <Icon size={16} className="text-accent-400" />
                <span className="font-body">{text}</span>
              </motion.div>
            ))}
          </div>

          <motion.button
            whileHover={{ scale: selected ? 1.02 : 1 }}
            whileTap={{ scale: selected ? 0.98 : 1 }}
            onClick={handleStart}
            disabled={!selected}
            className={`w-full py-3.5 rounded-xl font-display font-semibold text-base transition-all ${
              selected
                ? "bg-accent-500 text-ink-950 hover:bg-accent-400 shadow-lg shadow-accent-500/20"
                : "bg-ink-800 text-ink-500 cursor-not-allowed"
            }`}
          >
            Start Interview
          </motion.button>
        </motion.div>
      </motion.div>
    </div>
  );
}
