import { useNavigate } from "react-router-dom";
import { DbSelector } from "@/components/DbSelector";
import { ThemeToggle } from "@/components/ThemeToggle";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";

export function SelectPage() {
  const navigate = useNavigate();

  const handleDbSelect = (db: string) => {
    navigate(`/config/${db}`);
  };

  return (
    <div className="min-h-screen bg-[var(--landing-bg)] text-[var(--landing-text)] transition-colors duration-500 container mx-auto px-4 sm:px-6 max-w-7xl pt-6 pb-24">
      <div className="mb-8 flex items-center justify-between">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-sm text-[var(--landing-subtle)] transition-colors hover:text-[var(--landing-text)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Home
        </button>
        <ThemeToggle />
      </div>
      <motion.div
        key="select"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <DbSelector onSelect={handleDbSelect} />
      </motion.div>
    </div>
  );
}
