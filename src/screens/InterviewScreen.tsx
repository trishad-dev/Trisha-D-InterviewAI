import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, ArrowLeft, AlertCircle, RotateCcw } from "lucide-react";
import type { Candidate, ChatMessage, InterviewFeedback, HistoryMessage } from "@/lib/types";
import { sendTurn } from "@/lib/api";
import { generateSessionId, prioritizeTopics } from "@/lib/curriculum";
import { ChatBubble } from "@/components/ChatBubble";
import { TypingIndicator } from "@/components/TypingIndicator";
import { Logo } from "@/components/Logo";

interface InterviewScreenProps {
  candidate: Candidate;
  onBack: () => void;
  onComplete: (feedback: InterviewFeedback, history: ChatMessage[]) => void;
}

let msgCounter = 0;
function makeMsg(sender: ChatMessage["sender"], text: string): ChatMessage {
  msgCounter += 1;
  return { id: `msg-${msgCounter}`, sender, text, timestamp: Date.now() };
}

const MAX_RETRIES = 2;
const TYPING_DELAY_MIN = 400;
const TYPING_DELAY_MAX = 800;

function randomTypingDelay(): number {
  return TYPING_DELAY_MIN + Math.random() * (TYPING_DELAY_MAX - TYPING_DELAY_MIN);
}

export function InterviewScreen({ candidate, onBack, onComplete }: InterviewScreenProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [topicsCovered, setTopicsCovered] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sessionIdRef = useRef<string>(generateSessionId());

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  const buildHistory = useCallback(
    (msgs: ChatMessage[]): HistoryMessage[] =>
      msgs.map((m) => ({ role: m.sender, text: m.text })),
    []
  );

  const startInterview = useCallback(async () => {
    if (hasStarted) return;
    setHasStarted(true);
    setIsTyping(true);
    setError(null);

    try {
      const response = await sendTurn(
        { sessionId: sessionIdRef.current, candidateId: candidate.member.id, history: [] },
        `Hello, I'm ready to begin the interview.`
      );
      const delay = randomTypingDelay();
      setTimeout(() => {
        setMessages([makeMsg("agent", response.agentMessage)]);
        setIsTyping(false);
      }, delay);
    } catch (err) {
      setIsTyping(false);
      setError(err instanceof Error ? err.message : "Failed to start the interview.");
    }
  }, [hasStarted, candidate]);

  useEffect(() => {
    startInterview();
  }, [startInterview]);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isTyping) return;

    const userMsg = makeMsg("candidate", trimmed);
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsTyping(true);
    setError(null);

    const history = buildHistory(newMessages);

    let lastError: string | null = null;
    let success = false;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await sendTurn(
          { sessionId: sessionIdRef.current, candidateId: candidate.member.id, history },
          trimmed
        );

        if (response.isComplete && response.feedback) {
          const delay = randomTypingDelay();
          setTimeout(() => {
            setMessages((prev) => [...prev, makeMsg("agent", response.agentMessage)]);
            setIsTyping(false);
            setTopicsCovered(response.feedback?.topicBreakdown.length ?? 0);
            setTimeout(() => {
              onComplete(response.feedback!, newMessages);
            }, 1500);
          }, delay);
        } else {
          const delay = randomTypingDelay();
          setTimeout(() => {
            setMessages((prev) => [...prev, makeMsg("agent", response.agentMessage)]);
            setIsTyping(false);
            setTopicsCovered((prev) => Math.min(prev + 1, 6));
          }, delay);
        }
        success = true;
        break;
      } catch (err) {
        lastError = err instanceof Error ? err.message : "Something went wrong.";
        if (attempt < MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
    }

    if (!success) {
      setIsTyping(false);
      setError(lastError ?? "Failed to get a response. Please try again.");
    }
  }, [input, isTyping, messages, candidate, onComplete, buildHistory]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleRetry = () => {
    setError(null);
    handleSend();
  };

  const estimatedTopics = Math.max(prioritizeTopics(candidate).length, 4);

  return (
    <div className="min-h-screen flex flex-col">
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="border-b border-ink-800 bg-ink-900/80 backdrop-blur-md sticky top-0 z-20"
      >
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-ink-400 hover:text-ink-100 transition-colors text-sm"
          >
            <ArrowLeft size={16} />
            <span className="font-body">Exit</span>
          </button>
          <Logo size="sm" />
          <div className="w-16" />
        </div>
        <div className="max-w-3xl mx-auto px-4 pb-3">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-1.5 bg-ink-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-accent-500 to-accent-400 rounded-full"
                animate={{ width: `${Math.min((topicsCovered / estimatedTopics) * 100, 100)}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
            <span className="text-xs text-ink-400 font-body whitespace-nowrap">
              {topicsCovered === 0 ? "Starting..." : `${topicsCovered} of ~${estimatedTopics} topics`}
            </span>
          </div>
        </div>
      </motion.header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-4">
          <AnimatePresence mode="popLayout">
            {messages.map((msg) => (
              <ChatBubble key={msg.id} message={msg} />
            ))}
          </AnimatePresence>

          {isTyping && (
            <div className="max-w-3xl mx-auto">
              <div className="bg-ink-800 border border-ink-700 rounded-2xl rounded-bl-md max-w-[80%]">
                <TypingIndicator visible={true} />
              </div>
            </div>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-3xl mx-auto"
            >
              <div className="flex items-center gap-3 bg-rose-500/10 border border-rose-500/30 rounded-xl px-4 py-3">
                <AlertCircle size={18} className="text-rose-400 shrink-0" />
                <span className="text-rose-300 text-sm font-body flex-1">{error}</span>
                <button
                  onClick={handleRetry}
                  className="flex items-center gap-1.5 text-rose-300 hover:text-rose-200 text-sm font-body transition-colors"
                >
                  <RotateCcw size={14} />
                  Retry
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="border-t border-ink-800 bg-ink-900/80 backdrop-blur-md"
      >
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-end gap-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isTyping}
              rows={1}
              placeholder="Type your answer..."
              className="flex-1 bg-ink-850 border border-ink-700 rounded-xl px-4 py-3 text-ink-100 placeholder-ink-500 font-body text-[15px] resize-none focus:outline-none focus:border-accent-500/50 transition-colors disabled:opacity-50"
              style={{ maxHeight: "120px" }}
            />
            <motion.button
              whileHover={{ scale: input.trim() && !isTyping ? 1.05 : 1 }}
              whileTap={{ scale: input.trim() && !isTyping ? 0.95 : 1 }}
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className={`p-3 rounded-xl transition-all ${
                input.trim() && !isTyping
                  ? "bg-accent-500 text-ink-950 hover:bg-accent-400"
                  : "bg-ink-800 text-ink-500 cursor-not-allowed"
              }`}
            >
              <Send size={20} />
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
