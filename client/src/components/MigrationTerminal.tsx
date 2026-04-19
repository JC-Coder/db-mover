import { useEffect, useRef } from "react";
import { CheckCircle2, XCircle, Loader2, Database, Layers, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface MigrationTerminalProps {
  logs: string[];
  progress: number;
  status: "pending" | "running" | "completed" | "failed";
  dbType?: string;
  stats?: {
    collections: number;
    documents: number;
    keys?: number;
    totalDocuments?: number;
  };
  onRetry?: () => void;
}

const STATUS_CONFIG = {
  pending: { label: 'Waiting', color: 'text-[#E3D7C8]/40', bg: 'bg-[#0E0A07]', border: 'border-[#2A1C12]' },
  running: { label: 'Running', color: 'text-[#C98A3D]', bg: 'bg-[#C98A3D]/10', border: 'border-[#C98A3D]/30' },
  completed: { label: 'Completed', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  failed: { label: 'Failed', color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
};

export function MigrationTerminal({ logs, progress, status, dbType, stats, onRetry }: MigrationTerminalProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const cfg = STATUS_CONFIG[status];

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [logs]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-2xl mx-auto space-y-8"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-[#F5EFE8]">Migration</h1>
          <p className="mt-2 text-base text-[#E3D7C8]/50">
            {status === 'pending' && 'Starting up…'}
            {status === 'running' && 'Your data is being transferred. Keep this tab open.'}
            {status === 'completed' && 'All done. Your data has been transferred successfully.'}
            {status === 'failed' && 'Something went wrong. Check the logs below and retry.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {status === 'failed' && onRetry && (
            <button
              onClick={onRetry}
              className="flex items-center gap-2 rounded-xl border border-[#2A1C12] bg-[#0E0A07] px-5 py-2.5 text-base font-medium text-[#F5EFE8] hover:border-[#4A3022] transition-colors"
            >
              <RotateCw className="h-3.5 w-3.5" />
              Retry
            </button>
          )}
          <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-medium", cfg.color, cfg.bg, cfg.border)}>
            {status === 'running' && <Loader2 className="h-3 w-3 animate-spin" />}
            {status === 'completed' && <CheckCircle2 className="h-3 w-3" />}
            {status === 'failed' && <XCircle className="h-3 w-3" />}
            {cfg.label}
          </span>
        </div>
      </div>

      {/* Progress */}
      <div className="rounded-2xl border border-[#2A1C12] bg-[#0E0A07] p-6 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold uppercase tracking-widest text-[#E3D7C8]/40">Progress</span>
          <span className="text-3xl font-bold text-[#F5EFE8]">{Math.round(progress)}%</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-[#2A1C12] overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
            className={cn("h-full rounded-full", status === 'failed' ? 'bg-rose-500' : status === 'completed' ? 'bg-emerald-500' : 'bg-[#C98A3D]')}
          />
        </div>

        {stats && (stats.collections > 0 || stats.documents > 0) && (
          <div className="grid grid-cols-2 gap-3 pt-2">
            <StatCard
              icon={<Layers className="h-4 w-4" />}
              label={dbType === 'redis' ? 'Keys processed' : 'Collections'}
              value={dbType === 'redis' ? stats.documents.toLocaleString() : stats.collections}
            />
            <StatCard
              icon={<Database className="h-4 w-4" />}
              label={dbType === 'redis' ? 'Total keys' : 'Documents'}
              value={dbType === 'redis' && stats.totalDocuments ? stats.totalDocuments.toLocaleString() : stats.documents.toLocaleString()}
            />
          </div>
        )}
      </div>

      {/* Log output */}
      <div className="rounded-2xl border border-[#2A1C12] bg-[#080604] overflow-hidden">
        <div className="flex items-center gap-2 border-b border-[#2A1C12] px-4 py-3">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#2A1C12]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#2A1C12]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#2A1C12]" />
          </div>
          <span className="text-sm text-[#E3D7C8]/30 ml-1">Log output</span>
        </div>
        <div
          ref={scrollRef}
          className="h-[300px] overflow-y-auto p-5 font-mono text-sm space-y-2"
        >
          {logs.length === 0 ? (
            <div className="flex h-full items-center justify-center text-[#E3D7C8]/20">
              Waiting for logs…
            </div>
          ) : (
            logs.map((log, i) => (
              <div key={i} className="flex gap-3">
                <span className="shrink-0 select-none text-[#E3D7C8]/25">
                  {new Date().toLocaleTimeString('en-GB', { hour12: false })}
                </span>
                <span className={cn(
                  'break-all',
                  log.includes('Error') || log.includes('Failed') ? 'text-rose-400' :
                    log.includes('Success') || log.includes('Completed') ? 'text-emerald-400' :
                      'text-[#E3D7C8]/65'
                )}>
                  {log}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </motion.div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[#2A1C12] bg-[#080604] p-3">
      <div className="text-[#C98A3D]/70">{icon}</div>
      <div>
        <p className="text-xs text-[#E3D7C8]/40 uppercase tracking-wide">{label}</p>
        <p className="text-xl font-bold text-[#F5EFE8]">{value}</p>
      </div>
    </div>
  );
}
