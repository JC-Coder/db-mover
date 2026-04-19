import { useNavigate } from "react-router-dom";
import { DbSelector } from "@/components/DbSelector";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";

export function SelectPage() {
  const navigate = useNavigate();

  const handleDbSelect = (db: string) => {
    navigate(`/config/${db}`);
  };

  return (
    <div className="min-h-screen bg-[#080604] text-[#F5EFE8] container mx-auto px-4 sm:px-6 max-w-7xl pt-6 pb-24">
      <button
        onClick={() => navigate("/")}
        className="mb-8 flex items-center gap-2 text-sm text-[#E3D7C8]/50 hover:text-[#F5EFE8] transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Home
      </button>
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
