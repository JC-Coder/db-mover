import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import {
	Download,
	Play,
	Eye,
	EyeOff,
	Loader2,
	HelpCircle,
	X,
	Copy,
	ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Uploader } from './ui/uploader';
import { CheckBox } from './ui/checkbox';
import { cn } from "@/lib/utils";

interface DatabaseConfigFormProps {
	dbType: string;
	onStartCopy: (config: any) => void;
	onStartDownload: (config: any, credent?: any, type?: string) => void;
}

interface FirebaseConfig {
	projectId: string;
	clientEmail: string;
	privateKey: string;
}
type FirebaseMode = 'rtdb' | 'firestore';

const getPlaceholder = (dbType: string): string => {
	switch (dbType) {
		case 'mongodb': return 'mongodb+srv://user:pass@cluster.host/dbname';
		case 'postgres': return 'postgresql://user:pass@host:5432/dbname';
		case 'mysql': return 'mysql://user:pass@host:3306/dbname';
		case 'redis': return 'redis://:pass@host:6379';
		case 'firebase': return 'https://<databaseid>.firebaseio.com';
		default: return 'connection string';
	}
};

const validateUri = (uri: string, dbType: string): boolean => {
	const patterns: Record<string, RegExp> = {
		mongodb: /^mongodb(\+srv)?:\/\//,
		postgres: /^postgres(ql)?:\/\//,
		mysql: /^mysql:\/\//,
		redis: /^redis?:\/\//,
		firebase: /^https:\/\/([a-z0-9-]+)(-default-rtdb)?\.(firebaseio\.com|firebasedatabase\.app)(\/.*)?$/i,
	};
	const pattern = patterns[dbType];
	return pattern ? pattern.test(uri) : false;
};

const DRAFT_KEY = (dbType: string) => `db_mover_draft_${dbType}`;

const loadDraft = (dbType: string) => {
	try {
		const raw = sessionStorage.getItem(DRAFT_KEY(dbType));
		return raw ? JSON.parse(raw) : null;
	} catch { return null; }
};

const saveDraft = (dbType: string, data: { mode: string; sourceUri: string; targetUri: string }) => {
	try { sessionStorage.setItem(DRAFT_KEY(dbType), JSON.stringify(data)); } catch { }
};

const clearDraft = (dbType: string) => {
	try { sessionStorage.removeItem(DRAFT_KEY(dbType)); } catch { }
};

const DB_NAMES: Record<string, string> = {
	mongodb: 'MongoDB', postgres: 'PostgreSQL', mysql: 'MySQL', redis: 'Redis', firebase: 'Firebase',
};

function GuideModal({ dbType, onClose }: { dbType: string; onClose: () => void }) {
	const ipSteps: { service: string; path: string }[] = [
		{ service: 'MongoDB Atlas', path: 'Security → Network Access → Add IP Address' },
		{ service: 'Supabase', path: 'Project Settings → Database → Network Restrictions' },
		{ service: 'PlanetScale', path: 'Settings → Passwords → IP Restrictions' },
		{ service: 'Upstash Redis', path: 'Console → Details → Allow All Regions' },
		{ service: 'Railway / Render', path: 'Usually open by default — check your service docs' },
	];

	const formatExamples: Record<string, string> = {
		mongodb: 'mongodb+srv://user:pass@cluster.host/dbname',
		postgres: 'postgresql://user:pass@host:5432/dbname',
		mysql: 'mysql://user:pass@host:3306/dbname',
		redis: 'redis://:password@host:6379',
		firebase: 'https://<database-id>.firebaseio.com',
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
			<div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
			<motion.div
				initial={{ opacity: 0, scale: 0.95, y: 8 }}
				animate={{ opacity: 1, scale: 1, y: 0 }}
				exit={{ opacity: 0, scale: 0.95, y: 8 }}
				transition={{ duration: 0.2 }}
				className="relative w-full max-w-lg rounded-2xl border border-[#2A1C12] bg-[#0E0A07] shadow-2xl overflow-hidden"
			>
				<div className="flex items-center justify-between px-6 py-4 border-b border-[#2A1C12]">
					<h3 className="font-semibold text-[#F5EFE8]">How DB Mover works</h3>
					<button onClick={onClose} className="text-[#E3D7C8]/40 hover:text-[#F5EFE8] transition-colors">
						<X className="h-4 w-4" />
					</button>
				</div>

				<div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
					{/* Steps */}
					<div className="space-y-3">
						{[
							{ n: '1', title: 'Pick your database', body: 'Select the engine you want to copy or back up. You\'ve already done this.' },
							{ n: '2', title: 'Paste your connection string', body: 'For Copy: paste both source and destination URIs. For Backup: only the source is needed.' },
							{ n: '3', title: 'Hit run', body: 'DB Mover handles the dump, transfer, and restore. Watch live logs as it runs.' },
						].map(({ n, title, body }) => (
							<div key={n} className="flex gap-4">
								<span className="shrink-0 text-xs font-bold text-[#C98A3D] mt-0.5">{n}</span>
								<div>
									<p className="text-sm font-medium text-[#F5EFE8]">{title}</p>
									<p className="text-sm text-[#E3D7C8]/60 mt-0.5">{body}</p>
								</div>
							</div>
						))}
					</div>

					<div className="h-px bg-[#2A1C12]" />

					{/* IP Allowlist */}
					<div className="space-y-3">
						<div className="flex items-center gap-2">
							<ShieldAlert className="h-4 w-4 text-[#C98A3D]" />
							<p className="text-sm font-semibold text-[#F5EFE8]">IP allowlist — most common issue</p>
						</div>
						<p className="text-sm text-[#E3D7C8]/70 leading-relaxed">
							Cloud databases block outside connections by default. Before running, whitelist the server IP in your provider's network settings — or temporarily allow <span className="font-mono text-[#D8C3AA]">0.0.0.0/0</span>.
						</p>
						<div className="rounded-xl border border-[#2A1C12] bg-[#080604] divide-y divide-[#2A1C12]">
							{ipSteps.map(({ service, path }) => (
								<div key={service} className="px-4 py-3">
									<p className="text-xs font-medium text-[#F5EFE8]">{service}</p>
									<p className="text-xs text-[#E3D7C8]/50 mt-0.5">{path}</p>
								</div>
							))}
						</div>
					</div>

					<div className="h-px bg-[#2A1C12]" />

					{/* Connection string format */}
					<div className="space-y-2">
						<p className="text-sm font-semibold text-[#F5EFE8]">
							{DB_NAMES[dbType] || 'Database'} connection string format
						</p>
						<div className="rounded-xl border border-[#2A1C12] bg-[#080604] px-4 py-3">
							<p className="font-mono text-xs text-[#D8C3AA] break-all">
								{formatExamples[dbType] || formatExamples.mongodb}
							</p>
						</div>
						<p className="text-xs text-[#E3D7C8]/50">
							Find this in your hosting provider's connection details or dashboard.
						</p>
					</div>
				</div>
			</motion.div>
		</div>
	);
}

export function DatabaseConfigForm({ dbType, onStartCopy, onStartDownload }: DatabaseConfigFormProps) {
	const [mode, setMode] = useState<'copy' | 'download'>(() => loadDraft(dbType)?.mode ?? 'copy');
	const [sourceUri, setSourceUri] = useState(() => loadDraft(dbType)?.sourceUri ?? '');
	const [targetUri, setTargetUri] = useState(() => loadDraft(dbType)?.targetUri ?? '');
	const [loading, setLoading] = useState(false);
	const [showSource, setShowSource] = useState(false);
	const [showTarget, setShowTarget] = useState(false);
	const [showGuide, setShowGuide] = useState(false);
	const [hasDraft, setHasDraft] = useState(() => {
		const d = loadDraft(dbType);
		return !!(d?.sourceUri || d?.targetUri);
	});

	const [firebaseSourceConfig, setFirebaseSourceConfig] = useState<FirebaseConfig | null>(null);
	const [firebaseTargetConfig, setFirebaseTargetConfig] = useState<FirebaseConfig | null>(null);
	const [firebaseSourceError, setFirebaseSourceError] = useState<string | null>(null);
	const [firebaseTargetError, setFirebaseTargetError] = useState<string | null>(null);
	const [firebaseMode, setFirebaseMode] = useState<FirebaseMode>('rtdb');

	const handleFirebaseFile = async (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
		if (type === 'source') setFirebaseSourceError(null);
		else setFirebaseTargetError(null);

		const file = e.target.files?.[0];
		if (!file) return;

		if (file.type !== 'application/json') {
			if (type === 'upload-source') setFirebaseSourceError('Only JSON files are allowed');
			else setFirebaseTargetError('Only JSON files are allowed');
			return;
		}

		if (file.size > 50 * 1024) {
			if (type === 'upload-source') setFirebaseSourceError('File too large (max 50KB)');
			else setFirebaseTargetError('File too large (max 50KB)');
			return;
		}

		try {
			const text = await file.text();
			let json: any;
			try { json = JSON.parse(text); } catch { throw new Error('Invalid JSON format'); }

			const requiredFields = ['project_id', 'private_key', 'client_email'];
			for (const field of requiredFields) {
				if (!json[field] || typeof json[field] !== 'string')
					throw new Error(`Missing or invalid field: ${field}`);
			}
			if (!json.private_key.includes('BEGIN PRIVATE KEY')) throw new Error('Invalid private key format');
			if (!json.client_email.includes('@')) throw new Error('Invalid client email');

			const normalized = { projectId: json.project_id, clientEmail: json.client_email, privateKey: json.private_key };
			if (type === 'upload-source') setFirebaseSourceConfig(normalized);
			else setFirebaseTargetConfig(normalized);
		} catch (err: any) {
			if (type === 'upload-source') { setFirebaseSourceConfig(null); setFirebaseSourceError(err.message || 'Invalid Firebase credentials'); }
			else { setFirebaseTargetConfig(null); setFirebaseTargetError(err.message || 'Invalid Firebase credentials'); }
		}
	};

	useEffect(() => {
		if (sourceUri || targetUri) { saveDraft(dbType, { mode, sourceUri, targetUri }); setHasDraft(true); }
	}, [dbType, mode, sourceUri, targetUri]);

	useEffect(() => { setSourceUri(''); setTargetUri(''); }, [firebaseMode]);

	const handleClearDraft = () => {
		setSourceUri(''); setTargetUri('');
		setFirebaseSourceConfig(null); setFirebaseTargetConfig(null);
		setFirebaseSourceError(null); setFirebaseTargetError(null);
		setMode('copy'); setFirebaseMode('rtdb');
		clearDraft(dbType); setHasDraft(false);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		try {
			if (dbType === 'firebase' && firebaseMode === 'rtdb') {
				if (!validateUri(sourceUri, dbType)) {
					toast.error('Invalid source URL', { description: 'Check your RTDB URL format.' });
					setLoading(false); return;
				}
				const urlProjectId = sourceUri.match(/https:\/\/([a-z0-9-]+)/i)?.[1];
				if (firebaseSourceConfig && urlProjectId && !urlProjectId.startsWith(firebaseSourceConfig.projectId)) {
					toast.error('Project mismatch', { description: `URL doesn't match project ${firebaseSourceConfig.projectId}` });
					setLoading(false); return;
				}
			}

			if (mode === 'copy') {
				if (sourceUri === targetUri && sourceUri !== '' && dbType !== 'firebase') {
					toast.error('Same source and destination', { description: 'Source and destination URIs must be different.' });
					setLoading(false); return;
				}
				if (dbType === 'firebase') {
					if (!firebaseSourceConfig || !firebaseTargetConfig) {
						toast.error('Missing credentials', { description: 'Upload both Firebase Service Account JSON files.' });
						setLoading(false); return;
					}
					if (firebaseMode === 'rtdb' && !validateUri(targetUri, dbType)) {
						toast.error('Invalid destination URL', { description: 'Check your target RTDB URL format.' });
						setLoading(false); return;
					}
					const targetUrlId = targetUri.match(/https:\/\/([a-z0-9-]+)/i)?.[1];
					if (firebaseTargetConfig && targetUrlId && !targetUrlId.startsWith(firebaseTargetConfig.projectId)) {
						toast.error('Project mismatch', { description: `Target URL doesn't match project ${firebaseTargetConfig.projectId}` });
						setLoading(false); return;
					}
					if (firebaseSourceConfig?.projectId === firebaseTargetConfig?.projectId) {
						toast.error('Same project', { description: 'Source and destination Firebase projects must be different.' });
						setLoading(false); return;
					}
				}
				await onStartCopy({ sourceUri, targetUri, firebaseType: firebaseMode, sourceCredent: firebaseSourceConfig, targetCredent: firebaseTargetConfig });
			} else {
				if (dbType === 'firebase' && !firebaseSourceConfig) {
					toast.error('Missing credentials', { description: 'Upload your Firebase Service Account JSON.' });
					setLoading(false); return;
				}
				await onStartDownload({ sourceUri, credent: firebaseSourceConfig, type: firebaseMode });
			}
		} catch (err) {
			console.error(err);
		} finally {
			setLoading(false);
		}
	};

	const FileUploader = ({ id, error, config }: { id: string; error: string | null; config: FirebaseConfig | null }) => {
		if (dbType === 'firebase')
			return <Uploader id={id} handleFirebaseFile={handleFirebaseFile} firebaseError={error} firebaseConfig={config} />;
		return null;
	};

	const options: { value: FirebaseMode; label: string }[] = [
		{ value: 'rtdb', label: 'Realtime DB' },
		{ value: 'firestore', label: 'Firestore' },
	];

	return (
		<>
			<AnimatePresence>
				{showGuide && <GuideModal dbType={dbType} onClose={() => setShowGuide(false)} />}
			</AnimatePresence>

			<motion.div
				initial={{ opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				className="w-full max-w-xl mx-auto"
			>
				{/* Header */}
				<div className="mb-8 flex flex-wrap items-start justify-between gap-3">
					<div className="min-w-0">
						<h1 className="text-3xl sm:text-4xl font-bold text-[#F5EFE8] break-words">
							Configure {DB_NAMES[dbType] || dbType}
						</h1>
						<p className="mt-2 text-base text-[#E3D7C8]/55">
							Paste your connection strings below to get started.
						</p>
					</div>
					<button
						type="button"
						onClick={() => setShowGuide(true)}
						className="flex shrink-0 items-center gap-1.5 mt-1 text-sm font-medium text-[#E3D7C8]/50 hover:text-[#C98A3D] transition-colors"
					>
						<HelpCircle className="h-4 w-4" />
						How it works
					</button>
				</div>

				{/* Session notice */}
				<div className="mb-6 flex items-center justify-between rounded-xl border border-[#2A1C12] bg-[#0E0A07] px-5 py-4">
					<p className="text-sm text-[#E3D7C8]/55">
						Credentials are stored in your session only and cleared on tab close.
					</p>
					{hasDraft && (
						<button
							type="button"
							onClick={handleClearDraft}
							className="ml-3 shrink-0 text-sm font-medium text-[#C98A3D]/70 hover:text-[#C98A3D] transition-colors"
						>
							Clear saved
						</button>
					)}
				</div>

				{/* Mode toggle */}
				<div className="mb-8 flex rounded-xl border border-[#2A1C12] bg-[#0E0A07] p-1">
					{(['copy', 'download'] as const).map((m) => (
						<button
							key={m}
							type="button"
							onClick={() => setMode(m)}
							className={cn(
								"flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-base font-medium transition-all duration-200",
								mode === m
									? "bg-[#C98A3D] text-[#1D130C]"
									: "text-[#E3D7C8]/50 hover:text-[#F5EFE8]"
							)}
						>
							{m === 'copy' ? <Copy className="h-3.5 w-3.5" /> : <Download className="h-3.5 w-3.5" />}
							{m === 'copy' ? 'Copy to database' : 'Download backup'}
						</button>
					))}
				</div>

				<form onSubmit={handleSubmit} className="space-y-5">
					{dbType === 'firebase' && (
						<CheckBox
							options={options}
							firebaseMode={firebaseMode}
							onClick={setFirebaseMode}
							activeColor='#C98A3D'
							inactiveColor='#0E0A07'
							textColor='#F5EFE8'
							indicatorColor='#C98A3D'
						/>)}
					{/* Source */}
					<div className="space-y-2">
						<label className="text-sm font-semibold uppercase tracking-widest text-[#E3D7C8]/45">
							Source
						</label>
						<div className="space-y-3">
							{firebaseMode === 'rtdb' && (
								<div className="relative">
									<Input
										id="source-uri"
										type={showSource ? 'text' : 'password'}
										placeholder={getPlaceholder(dbType)}
										value={sourceUri}
										onChange={(e) => setSourceUri(e.target.value)}
										autoComplete="off"
										data-lpignore="true"
										required
										className="h-13 text-base rounded-xl border-[#2A1C12] bg-[#0E0A07] text-[#F5EFE8] placeholder:text-[#E3D7C8]/25 pr-10 focus-visible:ring-[#C98A3D]/40 focus-visible:border-[#4A3022]"
									/>
									<button
										type="button"
										className="absolute right-3 top-1/2 -translate-y-1/2 text-[#E3D7C8]/30 hover:text-[#E3D7C8]/70 transition-colors"
										onClick={() => setShowSource(!showSource)}
									>
										{showSource ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
									</button>
								</div>
							)}
							<FileUploader id="upload-source" error={firebaseSourceError} config={firebaseSourceConfig} />
						</div>
					</div>

					{/* Target — copy mode only */}
					<AnimatePresence>
						{mode === 'copy' && (
							<motion.div
								initial={{ opacity: 0, height: 0 }}
								animate={{ opacity: 1, height: 'auto' }}
								exit={{ opacity: 0, height: 0 }}
								className="space-y-2 overflow-hidden"
							>
								<label className="text-sm font-semibold uppercase tracking-widest text-[#E3D7C8]/45">
									Destination
								</label>
								<div className="space-y-3">
									{firebaseMode === 'rtdb' && (
										<div className="relative">
											<Input
												id="target-uri"
												type={showTarget ? 'text' : 'password'}
												placeholder={getPlaceholder(dbType)}
												value={targetUri}
												onChange={(e) => setTargetUri(e.target.value)}
												autoComplete="off"
												data-lpignore="true"
												required
												className="h-13 text-base rounded-xl border-[#2A1C12] bg-[#0E0A07] text-[#F5EFE8] placeholder:text-[#E3D7C8]/25 pr-10 focus-visible:ring-[#C98A3D]/40 focus-visible:border-[#4A3022]"
											/>
											<button
												type="button"
												className="absolute right-3 top-1/2 -translate-y-1/2 text-[#E3D7C8]/30 hover:text-[#E3D7C8]/70 transition-colors"
												onClick={() => setShowTarget(!showTarget)}
											>
												{showTarget ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
											</button>
										</div>
									)}
									<FileUploader id="upload-target" error={firebaseTargetError} config={firebaseTargetConfig} />
								</div>
							</motion.div>
						)}
					</AnimatePresence>

					{/* Download info banner */}
					<AnimatePresence>
						{mode === 'download' && (
							<motion.div
								initial={{ opacity: 0, height: 0 }}
								animate={{ opacity: 1, height: 'auto' }}
								exit={{ opacity: 0, height: 0 }}
								className="overflow-hidden"
							>
								<div className="rounded-xl border border-[#2A1C12] bg-[#0E0A07] px-4 py-3">
									<p className="text-sm text-[#E3D7C8]/60 leading-relaxed">
										A compressed <span className="font-mono text-[#D8C3AA]">.zip</span> of your source data will be downloaded to your device. No destination needed.
									</p>
								</div>
							</motion.div>
						)}
					</AnimatePresence>

					{/* Submit */}
					<button
						type="submit"
						disabled={loading}
						className="w-full h-13 rounded-xl bg-[#C98A3D] text-[#1D130C] text-base font-semibold hover:bg-[#D49A54] transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mt-2 p-3"
					>
						{loading ? (
							<><Loader2 className="h-4 w-4 animate-spin" /> Processing…</>
						) : mode === 'copy' ? (
							<><Play className="h-4 w-4 fill-current" /> Start migration</>
						) : (
							<><Download className="h-4 w-4" /> Download backup</>
						)}
					</button>
				</form>
			</motion.div>
		</>
	);
}
