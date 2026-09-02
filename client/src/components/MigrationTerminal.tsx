import { useEffect, useRef } from "react";
import { CheckCircle2, XCircle, Loader2, Database, Layers, RotateCw, Download, HardDrive, SlidersHorizontal } from "lucide-react";
import { DatabaseBrand } from "@/components/DatabaseBrand";
import { getDatabaseBrand } from "@/lib/databaseBrands";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export interface IMigrationTerminalProps {
  logs: string[];
  progress: number;
  status: "pending" | "running" | "completed" | "failed";
  dbType?: string;
  type?: "copy" | "download";
  selectedObjects?: string[];
  downloadUrl?: string;
  downloadExpiry?: string;
  fileSizeBytes?: number;
  stats?: {
    collections: number;
    documents: number;
    keys?: number;
    tables?: number;
    totalDocuments?: number;
  };
  onRetry?: () => void;
}

const formatBytes = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
};

const STATUS_CONFIG = {
  pending: { label: 'Waiting', color: 'text-[var(--landing-subtle)]', bg: 'bg-[var(--landing-card)]', border: 'border-[var(--landing-border)]' },
  running: { label: 'Running', color: 'text-[var(--landing-accent)]', bg: 'bg-[var(--landing-card-soft)]', border: 'border-[var(--landing-accent)]' },
  completed: { label: 'Completed', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  failed: { label: 'Failed', color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
};

export function MigrationTerminal({
  logs,
  progress,
  status,
  dbType,
  type = "copy",
  selectedObjects,
  downloadUrl,
  downloadExpiry,
  fileSizeBytes,
  stats,
  onRetry,
}: IMigrationTerminalProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const cfg = STATUS_CONFIG[status];
  const brand = getDatabaseBrand(dbType);
  const { theme } = useTheme();
  const isDownload = type === "download";

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
        <div className="flex min-w-0 items-center gap-4">
          {brand && dbType && (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-[var(--landing-border)] bg-[var(--landing-card)]">
              <DatabaseBrand
                db={dbType}
                theme={theme}
                variant="icon"
                className="h-9 w-9"
              />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-bold text-[var(--landing-text)]">
                {isDownload ? "Database Export" : "Migration"}
              </h1>
              {selectedObjects && selectedObjects.length > 0 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[var(--landing-accent)]/15 text-[var(--landing-accent)] border border-[var(--landing-accent)]/30">
                  <SlidersHorizontal className="h-3 w-3" />
                  Selective ({selectedObjects.length})
                </span>
              )}
            </div>
            <p className="mt-2 text-base text-[var(--landing-subtle)]">
              {status === 'pending' && (isDownload ? 'Preparing export…' : 'Starting up…')}
              {status === 'running' && (isDownload ? 'Exporting database to compressed archive. Keep this tab open.' : 'Your data is being transferred. Keep this tab open.')}
              {status === 'completed' && (isDownload ? 'Export completed! Your backup archive is ready.' : 'All done. Your data has been transferred successfully.')}
              {status === 'failed' && 'Something went wrong. Check the logs below and retry.'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {status === 'failed' && onRetry && (
            <button
              onClick={onRetry}
              className="flex items-center gap-2 rounded-xl border border-[var(--landing-border)] bg-[var(--landing-card)] px-5 py-2.5 text-base font-medium text-[var(--landing-text)] hover:border-[var(--landing-border-strong)] transition-colors"
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

      {/* Download Action Card if completed */}
      {isDownload && status === "completed" && downloadUrl && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-emerald-400 flex items-center gap-2">
              <Download className="h-5 w-5" /> Download Ready
            </h3>
            <p className="text-sm text-[var(--landing-subtle)]">
              {fileSizeBytes ? `Archive size: ${formatBytes(fileSizeBytes)} • ` : ""}
              {downloadExpiry
                ? `Direct download link valid until ${new Date(downloadExpiry).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`
                : "Direct streaming download link generated."}
            </p>
          </div>
          <a
            href={downloadUrl}
            download
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 text-sm font-semibold transition-colors shadow-lg shadow-emerald-600/20"
          >
            <Download className="h-4 w-4" />
            Download .zip
          </a>
        </motion.div>
      )}

      {/* Progress */}
      <div className="rounded-2xl border border-[var(--landing-border)] bg-[var(--landing-card)] p-6 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold uppercase tracking-widest text-[var(--landing-subtle)]">Progress</span>
          <span className="text-3xl font-bold text-[var(--landing-text)]">{Math.round(progress)}%</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-[var(--landing-border)] overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
            className={cn("h-full rounded-full", status === 'failed' ? 'bg-rose-500' : status === 'completed' ? 'bg-emerald-500' : 'bg-[var(--landing-accent)]')}
          />
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          {fileSizeBytes && fileSizeBytes > 0 ? (
            <StatCard
              icon={<HardDrive className="h-4 w-4" />}
              label="Archive Size"
              value={formatBytes(fileSizeBytes)}
            />
          ) : null}
          {stats && (stats.collections > 0 || stats.documents > 0 || (stats.tables && stats.tables > 0)) ? (
            <>
              <StatCard
                icon={<Layers className="h-4 w-4" />}
                label={dbType === 'redis' ? 'Keys processed' : stats.tables ? 'Tables' : 'Collections'}
                value={dbType === 'redis' ? stats.documents.toLocaleString() : stats.tables || stats.collections}
              />
              <StatCard
                icon={<Database className="h-4 w-4" />}
                label={dbType === 'redis' ? 'Total keys' : 'Documents'}
                value={dbType === 'redis' && stats.totalDocuments ? stats.totalDocuments.toLocaleString() : stats.documents.toLocaleString()}
              />
            </>
          ) : null}
        </div>
      </div>

      {/* Log output */}
      <div className="rounded-2xl border border-[var(--landing-border)] bg-[var(--landing-bg)] overflow-hidden">
        <div className="flex items-center gap-2 border-b border-[var(--landing-border)] px-4 py-3">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--landing-border)]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--landing-border)]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--landing-border)]" />
          </div>
          <span className="text-sm text-[var(--landing-subtle)] ml-1">Log output</span>
        </div>
        <div
          ref={scrollRef}
          className="h-[300px] overflow-y-auto p-5 font-mono text-sm space-y-2"
        >
          {logs.length === 0 ? (
            <div className="flex h-full items-center justify-center text-[var(--landing-subtle)]">
              Waiting for logs…
            </div>
          ) : (
            logs.map((log, i) => (
              <div key={i} className="flex gap-3">
                <span className="shrink-0 select-none text-[var(--landing-subtle)]">
                  {new Date().toLocaleTimeString('en-GB', { hour12: false })}
                </span>
                <span className={cn(
                  'break-all',
                  log.includes('Error') || log.includes('Failed') ? 'text-rose-400' :
                    log.includes('Success') || log.includes('Completed') ? 'text-emerald-400' :
                      'text-[var(--landing-muted)]'
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
    <div className="flex items-center gap-3 rounded-xl border border-[var(--landing-border)] bg-[var(--landing-bg)] p-3">
      <div className="text-[var(--landing-accent)]/70">{icon}</div>
      <div>
        <p className="text-xs text-[var(--landing-subtle)] uppercase tracking-wide">{label}</p>
        <p className="text-xl font-bold text-[var(--landing-text)]">{value}</p>
      </div>
    </div>
  );
}
