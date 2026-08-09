import { motion } from "framer-motion";
import type { ChatMessage } from "@/lib/types";

interface ChatBubbleProps {
  message: ChatMessage;
}

export function ChatBubble({ message }: ChatBubbleProps) {
  const isAgent = message.sender === "agent";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`flex ${isAgent ? "justify-start" : "justify-end"}`}
    >
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isAgent
            ? "bg-ink-800 text-ink-100 rounded-bl-md border border-ink-700"
            : "bg-accent-600 text-ink-950 rounded-br-md font-medium"
        }`}
      >
        <p className="text-[15px] leading-relaxed whitespace-pre-wrap font-body">
          {message.text}
        </p>
      </div>
    </motion.div>
  );
}
