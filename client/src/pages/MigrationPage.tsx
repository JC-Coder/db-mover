import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MigrationTerminal } from "@/components/MigrationTerminal";
import api from "@/lib/api";
import { toast } from "sonner";

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

      const config = JSON.parse(storedConfig);

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
          const storedConfig = sessionStorage.getItem(`migration_${jobId}`);
          if (storedConfig) {
            const parsedConfig = JSON.parse(storedConfig);
            const storedDbType =
              typeof parsedConfig?.dbType === "string"
                ? parsedConfig.dbType.trim()
                : "";
            if (storedDbType) {
              sessionStorage.removeItem(`db_mover_draft_${storedDbType}`);
            }
          }
          sessionStorage.removeItem(`migration_${jobId}`);
        } catch (storageError) {
          console.error("Error cleaning up migration storage", storageError);
        }
      }
    };
  }, [jobId]);

  return (
    <div className="container mx-auto px-6 max-w-7xl pt-12 pb-24">
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
