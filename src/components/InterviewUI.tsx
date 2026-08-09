import { motion } from "framer-motion";
import { CheckCircle2, AlertCircle, XCircle } from "lucide-react";
import type { Understanding } from "@/lib/types";

interface UnderstandingBadgeProps {
  level: Understanding;
}

const config: Record<
  Understanding,
  { label: string; color: string; bg: string; Icon: typeof CheckCircle2 }
> = {
  strong: {
    label: "Strong",
    color: "text-accent-300",
    bg: "bg-accent-500/15 border-accent-500/30",
    Icon: CheckCircle2,
  },
  developing: {
    label: "Developing",
    color: "text-amber-400",
    bg: "bg-amber-500/15 border-amber-500/30",
    Icon: AlertCircle,
  },
  weak: {
    label: "Weak",
    color: "text-rose-400",
    bg: "bg-rose-500/15 border-rose-500/30",
    Icon: XCircle,
  },
};

export function UnderstandingBadge({ level }: UnderstandingBadgeProps) {
  const { label, color, bg, Icon } = config[level];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${bg} ${color}`}
    >
      <Icon size={12} strokeWidth={2.5} />
      {label}
    </span>
  );
}

interface ProgressBarProps {
  topicsCovered: number;
  totalTopics: number;
}

export function ProgressBar({ topicsCovered, totalTopics }: ProgressBarProps) {
  const pct = Math.min((topicsCovered / totalTopics) * 100, 100);

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1.5 bg-ink-800 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-accent-500 to-accent-400 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
      <span className="text-xs text-ink-400 font-body whitespace-nowrap">
        {topicsCovered} of {totalTopics} topics
      </span>
    </div>
  );
}
