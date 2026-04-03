import { Badge } from "@/components/ui/badge";
import { Database, Server, Layers, ArrowRight, Box, FileArchiveIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, Variants } from 'framer-motion';

interface DbSelectorProps {
	onSelect: (db: string) => void;
	selected?: string;
}

const DATABASES = [
	{ id: 'mongodb', name: 'MongoDB', status: 'available', icon: Database },
	{ id: 'postgres', name: 'PostgreSQL', status: 'available', icon: Server },
	{ id: 'mysql', name: 'MySQL', status: 'available', icon: Layers },
	{ id: 'redis', name: 'Redis', status: 'available', icon: Box },
	{ id: 'firebase', name: 'Firebase', status: 'available', icon: FileArchiveIcon },
];

const container: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const item: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

export function DbSelector({ onSelect, selected }: DbSelectorProps) {
  return (
    <div className="space-y-24 max-w-5xl mx-auto w-full py-10">
      <div className="text-center space-y-8">
        <h2 className="text-6xl font-extrabold tracking-tighter text-gradient leading-tight">
          Select <span className="text-white/60">Infrastructure</span>
        </h2>
        <p className="text-muted-foreground text-xl font-light max-w-2xl mx-auto tracking-tight leading-relaxed">
          Choose the data environment you wish to relocate. Our engine supports
          enterprise-grade architectures with zero data loss guarantee.
        </p>
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-2 gap-8"
      >
        {DATABASES.map((db) => {
          const isAvailable = db.status === "available";
          const isSelected = selected === db.id;

          return (
            <motion.div
              key={db.id}
              variants={item}
              className={cn(
                "group relative p-10 rounded-[2.5rem] border transition-all duration-500",
                isAvailable
                  ? "glass-card hover:bg-white/[0.04] cursor-pointer"
                  : "opacity-40 grayscale pointer-events-none border-white/[0.02] bg-white/[0.01]",
                isSelected &&
                  "ring-2 ring-indigo-500 border-indigo-500/50 bg-indigo-500/5 shadow-[0_0_30px_rgba(99,102,241,0.1)]"
              )}
              onClick={() => isAvailable && onSelect(db.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-8">
                  <div
                    className={cn(
                      "w-20 h-20 rounded-2xl flex items-center justify-center border transition-all duration-500",
                      isSelected
                        ? "bg-white text-black border-white shadow-lg"
                        : "bg-white/[0.03] border-white/10 group-hover:border-white/20 group-hover:scale-105"
                    )}
                  >
                    <db.icon
                      className={cn(
                        "h-10 w-10 transition-transform duration-500",
                        isSelected
                          ? "text-black"
                          : "text-white/40 group-hover:text-white group-hover:rotate-12"
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-bold text-2xl tracking-tight text-white">
                      {db.name}
                    </h3>
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          isAvailable
                            ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                            : "bg-zinc-600"
                        )}
                      />
                      <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">
                        {isAvailable ? "Operational" : "Under Observation"}
                      </p>
                    </div>
                  </div>
                </div>

                {isAvailable ? (
                  <div
                    className={cn(
                      "h-12 w-12 rounded-full border border-white/10 flex items-center justify-center transition-all duration-500",
                      isSelected
                        ? "bg-white border-white translate-x-1"
                        : "bg-white/5 opacity-0 group-hover:opacity-100 group-hover:translate-x-0"
                    )}
                  >
                    <ArrowRight
                      className={cn(
                        "h-6 w-6",
                        isSelected ? "text-black" : "text-white"
                      )}
                    />
                  </div>
                ) : (
                  <Badge
                    variant="secondary"
                    className="bg-white/5 text-[10px] uppercase tracking-widest border-none font-black text-white/20 px-4 py-1.5 rounded-full"
                  >
                    Soon
                  </Badge>
                )}
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
