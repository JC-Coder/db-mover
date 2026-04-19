import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface DbSelectorProps {
	onSelect: (db: string) => void;
	selected?: string;
}

const DATABASES = [
	{ id: 'mongodb', name: 'MongoDB' },
	{ id: 'postgres', name: 'PostgreSQL' },
	{ id: 'mysql', name: 'MySQL' },
	{ id: 'redis', name: 'Redis' },
	{ id: 'firebase', name: 'Firebase' },
];

export function DbSelector({ onSelect, selected }: DbSelectorProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-10">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center space-y-3"
      >
        <h2 className="text-4xl font-bold tracking-tight text-[#F5EFE8]">
          Select your database
        </h2>
        <p className="text-[#E3D7C8]/50 text-base">
          Copy to another database or download a backup.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="flex flex-wrap justify-center gap-3"
      >
        {DATABASES.map((db) => {
          const isSelected = selected === db.id;
          return (
            <button
              key={db.id}
              onClick={() => onSelect(db.id)}
              className={cn(
                "px-6 py-2.5 rounded-full text-sm font-medium border transition-all duration-200",
                isSelected
                  ? "bg-[#C98A3D] border-[#C98A3D] text-[#1D130C]"
                  : "bg-[#1A130D] border-[#3C2B1F] text-[#E3D7C8]/70 hover:border-[#6A4B36] hover:text-[#F5EFE8] hover:bg-[#2B2018]"
              )}
            >
              {db.name}
            </button>
          );
        })}
      </motion.div>
    </div>
  );
}
