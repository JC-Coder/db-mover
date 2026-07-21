import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import confetti from "canvas-confetti";
import { MigrationTerminal } from "@/components/MigrationTerminal";
import { ThemeToggle } from "@/components/ThemeToggle";
import api from "@/lib/api";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

const fireConfetti = () => {
  // Center wide burst
  confetti({
    particleCount: 90,
    spread: 110,
    origin: { y: 0.6 },
    zIndex: 9999,
  });

  // Left side cannon
  confetti({
    particleCount: 45,
    angle: 60,
    spread: 75,
    origin: { x: 0, y: 0.7 },
    zIndex: 9999,
  });

  // Right side cannon
  confetti({
    particleCount: 45,
    angle: 120,
    spread: 75,
    origin: { x: 1, y: 0.7 },
    zIndex: 9999,
  });
};

const parseStoredMigrationConfig = (
  raw: string,
): Record<string, unknown> | null => {
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
};

export function MigrationPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<
    "pending" | "running" | "completed" | "failed"
  >("pending");
  const [dbType, setDbType] = useState<string | undefined>(undefined);
  const [stats, setStats] = useState({
    collections: 0,
    documents: 0,
    totalDocuments: 0,
  });

  const handleRetry = async () => {
    if (!jobId) return;

    try {
      // Get stored migration config
      const storedConfig = sessionStorage.getItem(`migration_${jobId}`);
      if (!storedConfig) {
        toast.error("Retry failed", {
          description:
            "Migration configuration not found. Please start a new migration.",
        });
        return;
      }

      const config = parseStoredMigrationConfig(storedConfig);
      if (!config) {
        sessionStorage.removeItem(`migration_${jobId}`);
        toast.error("Retry failed", {
          description:
            "Stored migration configuration is invalid. Please start a new migration.",
        });
        return;
      }

      // Start new migration with same config
      const res = await api.post("/migrate/start", config);
      const newJobId = res.data.jobId;
      try {
        // Store config for new job
        sessionStorage.setItem(`migration_${newJobId}`, JSON.stringify(config));
      } catch (error) {
        // Ignore storage access errors (e.g. when storage is blocked)
      }

      // Navigate to new migration page
      navigate(`/migration/${newJobId}`);
      toast.success("Migration restarted", {
        description:
          "Your migration has been restarted with the same configuration.",
      });
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.error || "Failed to restart migration.";
      toast.error("Retry failed", { description: msg });
    }
  };

  const hasTriggeredCompletion = useRef(false);

  useEffect(() => {
    if (status === "completed" && !hasTriggeredCompletion.current) {
      hasTriggeredCompletion.current = true;
      fireConfetti();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [status]);

  useEffect(() => {
    if (!jobId) return;

    const es = new EventSource(`/api/migrate/${jobId}/status`);

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.logs) setLogs(data.logs);
        if (data.progress !== undefined) setProgress(data.progress);
        if (data.status) setStatus(data.status);
        if (data.dbType) setDbType(data.dbType);
        if (data.stats) setStats(data.stats);

        if (data.status === "completed" || data.status === "failed") {
          es.close();
        }
      } catch (e) {
        console.error("Error parsing SSE", e);
      }
    };

    es.onerror = (err) => {
      console.error("SSE Error", err);
      // Don't toast here as it might be a temporary disconnect
    };

    return () => {
      es.close();

      // Clean up session storage when navigating away
      if (jobId) {
        try {
          sessionStorage.removeItem(`migration_${jobId}`);
        } catch (storageError) {
          console.error("Error cleaning up migration storage", storageError);
        }
      }
    };
  }, [jobId]);

  return (
    <div className="min-h-screen bg-[var(--landing-bg)] text-[var(--landing-text)] transition-colors duration-500 px-4 sm:px-6 pt-6 pb-24">
      <div className="w-full max-w-2xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <button
            onClick={() => navigate("/select")}
            className="flex items-center gap-2 text-sm text-[var(--landing-subtle)] transition-colors hover:text-[var(--landing-text)]"
          >
            <ArrowLeft className="h-4 w-4" />
            New migration
          </button>
          <ThemeToggle />
        </div>
      </div>
      <MigrationTerminal
        logs={logs}
        progress={progress}
        status={status}
        dbType={dbType}
        stats={stats}
        onRetry={status === "failed" ? handleRetry : undefined}
      />
    </div>
  );
}
