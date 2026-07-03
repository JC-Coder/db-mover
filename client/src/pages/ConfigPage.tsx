import { useNavigate, useParams } from "react-router-dom";
import { DatabaseConfigForm } from "@/components/DatabaseConfigForm";
import { ThemeToggle } from "@/components/ThemeToggle";
import api from "@/lib/api";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { IBrowseConfig, ICopyConfig, IDownloadConfig } from "@/types/browser";

export function ConfigPage() {
  const { dbType } = useParams<{ dbType: string }>();
  const navigate = useNavigate();

  const handleStartCopy = async (config: ICopyConfig) => {
		try {
			const res = await api.post('/migrate/start', {
				type: 'copy',
				sourceUri: config.sourceUri,
				targetUri: config.targetUri,
				firebaseType: config.firebaseType,
				sourceCredent: config.sourceCredent,
				targetCredent: config.targetCredent,
				dbType: dbType,
			});

			const { jobId } = res.data;

			// Store migration config for retry functionality
sessionStorage.setItem(
				`migration_${jobId}`,
				JSON.stringify({
					type: 'copy',
					sourceUri: config.sourceUri,
					targetUri: config.targetUri,
					sourceCredent: config.sourceCredent,
					targetCredent: config.targetCredent,
					firebaseType: config.firebaseType,
					dbType: dbType,
				}),
			);

			toast.success('Migration started', {
				description: 'Your data is being transferred securely.',
			});
			navigate(`/migration/${jobId}`);
		} catch (err: unknown) {
			console.error(err);
			const msg =
				typeof err === "object" &&
				err !== null &&
				"response" in err &&
				typeof err.response === "object" &&
				err.response !== null &&
				"data" in err.response &&
				typeof err.response.data === "object" &&
				err.response.data !== null &&
				"error" in err.response.data &&
				typeof err.response.data.error === "string"
					? err.response.data.error
					: 'Failed to start migration job.';
			toast.error('Migration failed', { description: msg });
			throw err; // Re-throw to let form handle loading state
		}
  };

  const handleStartDownload = async (config: IDownloadConfig) => {
		const promise = async () => {
			const response = await api.post(
				'/download',
				{
					sourceUri: config.sourceUri,
					credent: config.credent,
					type: config.type,
					dbType: dbType,
				},
				{
					responseType: 'blob',
				},
			);

			const url = window.URL.createObjectURL(new Blob([response.data]));
			const link = document.createElement('a');
			link.href = url;
			link.setAttribute('download', `dump_${Date.now()}.zip`);
			document.body.appendChild(link);
			link.click();
			link.remove();
		};

		toast.promise(promise(), {
			loading: 'Preparing download...',
			success: 'Download started!',
			error: 'Export failed.',
		});
  };

  const handleStartBrowse = (config: IBrowseConfig) => {
		sessionStorage.setItem(
			`browser_credentials_${dbType}`,
			JSON.stringify({
				sourceUri: config.sourceUri,
				credent: config.credent,
				type: config.type,
				dbType: dbType,
			})
		);
		navigate(`/browser/${dbType}`);
  };

  return (
    <div className="min-h-screen bg-[var(--landing-bg)] text-[var(--landing-text)] transition-colors duration-500 px-4 sm:px-6 pt-6 pb-24">
      <div className="mb-8 flex items-center justify-between">
        <button
          onClick={() => navigate("/select")}
          className="flex items-center gap-2 text-sm text-[var(--landing-subtle)] transition-colors hover:text-[var(--landing-text)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <ThemeToggle />
      </div>
      <motion.div
        key="config"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 1.02 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="flex items-center justify-center min-h-[60vh]"
      >
        <DatabaseConfigForm
          key={dbType}
          dbType={dbType || "mongodb"}
          onStartCopy={handleStartCopy}
          onStartDownload={handleStartDownload}
          onStartBrowse={handleStartBrowse}
        />
      </motion.div>
    </div>
  );
}
