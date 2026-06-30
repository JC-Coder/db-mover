import { DatabaseBrand } from "@/components/DatabaseBrand";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface IDbSelectorProps {
  onSelect: (db: string) => void;
  selected?: string;
}

const DATABASES = [
  { id: "mongodb", name: "MongoDB" },
  { id: "postgres", name: "PostgreSQL" },
  { id: "mysql", name: "MySQL" },
  { id: "redis", name: "Redis" },
  { id: "firebase", name: "Firebase" },
];

export function DbSelector({ onSelect, selected }: IDbSelectorProps) {
  const { theme } = useTheme();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-10">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center space-y-3"
      >
        <h2 className="text-5xl font-bold tracking-tight text-[var(--landing-text)] transition-colors duration-500">
          Select your database
        </h2>
        <p className="text-[var(--landing-subtle)] text-lg transition-colors duration-500">
          Copy to another database or download a backup.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="grid w-full max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5"
      >
        {DATABASES.map((db) => {
          const isSelected = selected === db.id;
          return (
            <button
              key={db.id}
              onClick={() => onSelect(db.id)}
              className={cn(
                "group flex h-36 flex-col items-center justify-center gap-4 rounded-xl px-5 py-5 text-base font-medium transition-all duration-200",
                isSelected
                  ? "bg-[var(--landing-accent)] text-[var(--landing-accent-text)] shadow-[0_18px_45px_-28px_var(--landing-shadow)]"
                  : "bg-[var(--landing-card)]/70 text-[var(--landing-muted)] hover:bg-[var(--landing-card-soft)] hover:text-[var(--landing-text)]"
              )}
            >
              <span
                className={cn(
                  "flex h-16 w-16 items-center justify-center rounded-lg transition-transform duration-200",
                  isSelected
                    ? "scale-105 bg-[var(--landing-card-soft)]/25"
                    : "bg-transparent group-hover:scale-105",
                )}
              >
                <DatabaseBrand
                  db={db.id}
                  theme={isSelected ? "dark" : theme}
                  variant="icon"
                  className="h-10 w-10"
                />
              </span>
              <span>{db.name}</span>
            </button>
          );
        })}
      </motion.div>
    </div>
  );
}
