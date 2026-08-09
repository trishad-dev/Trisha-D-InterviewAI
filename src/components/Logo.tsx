import { motion } from "framer-motion";
import { Brain } from "lucide-react";

interface LogoProps {
  size?: "sm" | "md" | "lg";
}

export function Logo({ size = "md" }: LogoProps) {
  const dimensions = {
    sm: { box: "w-8 h-8", icon: 16 },
    md: { box: "w-10 h-10", icon: 20 },
    lg: { box: "w-14 h-14", icon: 28 },
  };
  const d = dimensions[size];

  return (
    <div className="flex items-center gap-2.5">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className={`${d.box} rounded-xl bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center shadow-lg shadow-accent-500/20`}
      >
        <Brain size={d.icon} className="text-ink-950" strokeWidth={2.5} />
      </motion.div>
      <span className="font-display font-bold text-ink-100 tracking-tight">
        Interview<span className="text-accent-400">AI</span>
      </span>
    </div>
  );
}
