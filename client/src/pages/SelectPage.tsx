import { useNavigate } from "react-router-dom";
import { DbSelector } from "@/components/DbSelector";
import { motion } from "framer-motion";

export function SelectPage() {
  const navigate = useNavigate();

  const handleDbSelect = (db: string) => {
    navigate(`/config/${db}`);
  };

  return (
    <div className="min-h-screen bg-[#120E0A] text-[#F5EFE8] container mx-auto px-6 max-w-7xl pt-12 pb-24">
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
