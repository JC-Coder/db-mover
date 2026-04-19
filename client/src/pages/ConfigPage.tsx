import { useNavigate, useParams } from "react-router-dom";
import { DatabaseConfigForm } from "@/components/DatabaseConfigForm";
import api from "@/lib/api";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";

export function ConfigPage() {
  const { dbType } = useParams<{ dbType: string }>();
  const navigate = useNavigate();

  const handleStartCopy = async (config: {
		sourceUri: string;
		targetUri: string;
		targetCredent?: string;
		sourceCredent?: string;
		firebaseType?: string;
  }) => {
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
		} catch (err: any) {
			console.error(err);
			const msg = err.response?.data?.error || 'Failed to start migration job.';
			toast.error('Migration failed', { description: msg });
			throw err; // Re-throw to let form handle loading state
		}
  };

  const handleStartDownload = async (config: {
		sourceUri: string;
		credent?: any;
		type?: string;
  }) => {
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

  return (
    <div className="min-h-screen bg-[#080604] text-[#F5EFE8] px-4 sm:px-6 pt-6 pb-24">
      <button
        onClick={() => navigate("/select")}
        className="mb-8 flex items-center gap-2 text-sm text-[#E3D7C8]/50 hover:text-[#F5EFE8] transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>
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
        />
      </motion.div>
    </div>
  );
}
