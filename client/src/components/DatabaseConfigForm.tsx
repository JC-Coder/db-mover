import { useState, useEffect } from "react";
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertCircle,
  Download,
  Play,
  Eye,
  EyeOff,
  Loader2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Uploader } from './ui/uploader';

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
		case 'mongodb':
			return 'mongodb+srv://user:pass@host/db';
		case 'postgres':
			return 'postgresql://user:pass@host:5432/db';
		case 'mysql':
			return 'mysql://user:pass@host:3306/db';
		case 'redis':
			return 'redis://:pass@host:6379';
		case 'firebase':
			return 'https://<databaseid>.firebaseio.com';
		default:
			return 'connection string';
	}
};

const validateUri = (uri: string, dbType: string): boolean => {
	const patterns: Record<string, RegExp> = {
		mongodb: /^mongodb(\+srv)?:\/\//,
		postgres: /^postgres(ql)?:\/\//,
		mysql: /^mysql:\/\//,
		redis: /^redis?:\/\//,
		firebase:
			/^https:\/\/([a-z0-9-]+)(-default-rtdb)?\.(firebaseio\.com|firebasedatabase\.app)\/?$/i,
	};

	const pattern = patterns[dbType];
	return pattern ? pattern.test(uri) : false;
};

const DRAFT_KEY = (dbType: string) => `db_mover_draft_${dbType}`;

const loadDraft = (dbType: string) => {
	try {
		const raw = sessionStorage.getItem(DRAFT_KEY(dbType));
		return raw ? JSON.parse(raw) : null;
	} catch {
		return null;
	}
};

const saveDraft = (
	dbType: string,
	data: { mode: string; sourceUri: string; targetUri: string },
) => {
	try {
		sessionStorage.setItem(DRAFT_KEY(dbType), JSON.stringify(data));
	} catch {
		// sessionStorage not available (e.g. private browsing with storage blocked)
	}
};

const clearDraft = (dbType: string) => {
	try {
		sessionStorage.removeItem(DRAFT_KEY(dbType));
	} catch {
		// noop
	}
};

export function DatabaseConfigForm({
	dbType,
	onStartCopy,
	onStartDownload,
}: DatabaseConfigFormProps) {
	const [mode, setMode] = useState<'copy' | 'download'>(() => {
		const d = loadDraft(dbType);
		return d?.mode ?? 'copy';
	});
	const [sourceUri, setSourceUri] = useState(() => {
		const d = loadDraft(dbType);
		return d?.sourceUri ?? '';
	});
	const [targetUri, setTargetUri] = useState(() => {
		const d = loadDraft(dbType);
		return d?.targetUri ?? '';
	});
	const [loading, setLoading] = useState(false);
	const [showSource, setShowSource] = useState(false);
	const [showTarget, setShowTarget] = useState(false);
	const [showTips, setShowTips] = useState(false);
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

		// 🔒 1. Basic file validation
		if (file.type !== 'application/json') {
			if (type === 'source') setFirebaseSourceError('Only JSON files are allowed');
			else setFirebaseTargetError('Only JSON files are allowed');
			return;
		}

		// Limit size (service account files are usually small <10KB)
		if (file.size > 50 * 1024) {
			if (type === 'source') setFirebaseSourceError('File too large (max 50KB)');
			else setFirebaseTargetError('File too large (max 50KB)');
			return;
		}

		try {
			const text = await file.text();

			// 🔒 2. Parse safely
			let json: any;
			try {
				json = JSON.parse(text);
			} catch {
				throw new Error('Invalid JSON format');
			}

			// 🔒 3. Strict schema validation (critical fields)
			const requiredFields = ['project_id', 'private_key', 'client_email'];

			for (const field of requiredFields) {
				if (!json[field] || typeof json[field] !== 'string') {
					throw new Error(`Missing or invalid field: ${field}`);
				}
			}

			// 🔒 4. Additional sanity checks
			if (!json.private_key.includes('BEGIN PRIVATE KEY')) {
				throw new Error('Invalid private key format');
			}

			if (!json.client_email.includes('@')) {
				throw new Error('Invalid client email');
			}
			// 🔒 5. Normalize (optional but useful)
			const normalized = {
				projectId: json.project_id,
				clientEmail: json.client_email,
				privateKey: json.private_key,
			};

			if (type === 'source') setFirebaseSourceConfig(normalized);
			else setFirebaseTargetConfig(normalized);
		} catch (err: any) {
			if (type === 'source') {
				setFirebaseSourceConfig(null);
				setFirebaseSourceError(err.message || 'Invalid Firebase credentials');
			} else {
				setFirebaseTargetConfig(null);
				setFirebaseTargetError(err.message || 'Invalid Firebase credentials');
			}
		}
	};

	// Sync state → sessionStorage whenever any field changes
	useEffect(() => {
		// Only save if there is actual data to preserve
		if (sourceUri || targetUri) {
			saveDraft(dbType, { mode, sourceUri, targetUri });
			setHasDraft(true);
		}
	}, [dbType, mode, sourceUri, targetUri]);

	useEffect(() => {
		if (firebaseMode === 'firestore') {
			setSourceUri('undefined');
			setTargetUri('undefined');
		} else {
			setSourceUri('');
			setTargetUri('');
		}
	}, [firebaseMode]);

	const handleClearDraft = () => {
		setSourceUri('');
		setTargetUri('');
		setFirebaseSourceConfig(null);
		setFirebaseTargetConfig(null);
		setFirebaseSourceError(null);
		setFirebaseTargetError(null);
		setMode('copy');
		clearDraft(dbType);
		setHasDraft(false);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);

		try {
			if (
				dbType === 'firebase' &&
				firebaseMode === 'rtdb' &&
				!validateUri(sourceUri, dbType)
			) {
				toast.error('Connection Error', {
					description: `The source connection string is not a valid ${dbType} URI.`,
				});
				setLoading(false);
				return;
			}

			if (mode === 'copy') {
				if (!validateUri(targetUri, dbType)) {
					toast.error('Connection Error', {
						description: `The destination connection string is not a valid ${dbType} URI.`,
					});
					setLoading(false);
					return;
				}
				await onStartCopy({ sourceUri, targetUri });
			} else {
				if (!firebaseSourceConfig) {
					toast.error('Connection Error', {
						description: `The missing info in json please upload the proper one`,
					});
					setLoading(false);
					return;
				}
				await onStartDownload({
					sourceUri,
					credent: firebaseSourceConfig,
					type: firebaseMode,
				});
			}
			// Draft is intentionally kept so if the user navigates back
			// (e.g. migration failed) they don't have to re-enter credentials.
			// They can clear it manually via the "Clear saved" button.
		} catch (err) {
			// Parent component (ConfigPage) handles the toast for execution errors
			console.error(err);
		} finally {
			setLoading(false);
		}
	};

	const getDBType = () => {
		switch (dbType) {
			case 'mongodb':
				return 'MongoDB';
			case 'postgres':
				return 'PostgreSQL';
			case 'mysql':
				return 'MySQL';
			case 'redis':
				return 'Redis';
			default:
				return 'Firebase';
		}
	};

	const options: { value: FirebaseMode; label: string }[] = [
		{ value: 'rtdb', label: 'Realtime DB' },
		{ value: 'firestore', label: 'Firestore' },
	];
	return (
		<motion.div
			initial={{ opacity: 0, scale: 0.95 }}
			animate={{ opacity: 1, scale: 1 }}
			className='w-full max-w-2xl mx-auto rounded-3xl glass-card shadow-xl overflow-hidden border-white/10'
		>
			<CardHeader className='space-y-4 p-8 pb-6 border-b border-white/5'>
				<CardTitle className='text-2xl font-bold'>Configure {getDBType()}</CardTitle>
				<CardDescription className='text-base text-muted-foreground'>
					Enter your connection details below.
				</CardDescription>
			</CardHeader>

			<CardContent className='p-8 pt-6 space-y-8'>
				<div className='bg-indigo-500/5 border border-indigo-500/10 rounded-xl p-4 flex gap-3 text-indigo-200/80 text-sm backdrop-blur-sm'>
					<AlertCircle className='h-5 w-5 shrink-0 text-indigo-400' />
					<div className='flex-1 flex items-center justify-between gap-2'>
						<p>Credentials are stored in your session only and cleared on tab close.</p>
						{hasDraft && (
							<button
								type='button'
								onClick={handleClearDraft}
								className='shrink-0 text-xs font-medium text-indigo-400/70 hover:text-indigo-300 underline underline-offset-2 transition-colors'
							>
								Clear saved
							</button>
						)}
					</div>
				</div>

				<Tabs value={mode} onValueChange={(v) => setMode(v as any)} className='space-y-8'>
					<TabsList className='grid w-full grid-cols-2 p-1 bg-white/5 rounded-xl border border-white/5'>
						<TabsTrigger
							value='copy'
							className='rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white font-medium'
						>
							Copy Data
						</TabsTrigger>
						<TabsTrigger
							value='download'
							className='rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white font-medium'
						>
							Download
						</TabsTrigger>
					</TabsList>

					<form onSubmit={handleSubmit} className='space-y-6'>
						<div className='space-y-3'>
							<Label
								htmlFor='source-uri'
								className='text-xs font-bold uppercase tracking-wider text-muted-foreground/70'
							>
								Source Database
							</Label>
							{dbType === 'firebase' && (
								<div className='grid grid-cols-2 gap-3'>
									{options.map((item) => {
										const active = firebaseMode === item.value;
										console.log('refreshed');
										return (
											<button
												key={item.value}
												type='button'
												onClick={() => setFirebaseMode(item.value)}
												className={`relative p-4 rounded-xl border transition-all text-left
        ${
			active
				? 'bg-indigo-600/20 border-indigo-500 shadow-lg shadow-indigo-500/10'
				: 'bg-white/[0.03] border-white/10 hover:border-white/20'
		}
        `}
											>
												<div className='flex items-center justify-between'>
													<span className='text-sm font-medium text-white'>
														{item.label}
													</span>

													{/* indicator */}
													<div
														className={`h-4 w-4 rounded-full border flex items-center justify-center
            ${active ? 'border-indigo-400' : 'border-white/30'}
            `}
													>
														{active && (
															<div className='h-2 w-2 rounded-full bg-indigo-400' />
														)}
													</div>
												</div>
											</button>
										);
									})}
								</div>
							)}
							<div className='relative group'>
								{dbType === 'firebase' && firebaseMode === 'rtdb' && (
									<Input
										id='source-uri'
										type={showSource ? 'text' : 'password'}
										placeholder={getPlaceholder(dbType)}
										value={sourceUri}
										onChange={(e) => setSourceUri(e.target.value)}
										autoComplete='off'
										data-lpignore='true'
										className='h-12 ...'
										required
									/>
								)}

								{dbType === 'firebase' && firebaseMode === 'rtdb' && (
									<Button
										type='button'
										variant='ghost'
										size='sm'
										className='absolute right-2 top-2 h-8 w-8 p-0 hover:bg-white/10 rounded-lg text-white/40 hover:text-white'
										onClick={() => setShowSource(!showSource)}
									>
										{showSource ? (
											<EyeOff className='h-4 w-4' />
										) : (
											<Eye className='h-4 w-4' />
										)}
									</Button>
								)}

								{dbType === 'firebase' && (
									<Uploader
										id='source'
										handleFirebaseFile={handleFirebaseFile}
										firebaseError={firebaseSourceError}
										firebaseConfig={firebaseSourceConfig}
									/>
								)}
							</div>
						</div>

						<TabsContent
							value='copy'
							className='m-0 space-y-6 animate-in fade-in slide-in-from-top-2 duration-300'
						>
							<div className='space-y-3'>
								<Label
									htmlFor='target-uri'
									className='text-xs font-bold uppercase tracking-wider text-muted-foreground/70'
								>
									Target Database
								</Label>
								<div className='relative group'>
									{dbType === 'firebase' && firebaseMode === 'rtdb' && (
										<Input
											id='target-uri'
											type={showSource ? 'text' : 'password'}
											placeholder={getPlaceholder(dbType)}
											value={targetUri}
											onChange={(e) => setTargetUri(e.target.value)}
											autoComplete='off'
											data-lpignore='true'
											className='h-12 ...'
											required
										/>
									)}
									{dbType === 'firebase' && firebaseMode === 'rtdb' && (
										<Button
											type='button'
											variant='ghost'
											size='sm'
											className='absolute right-2 top-2 h-8 w-8 p-0 hover:bg-white/10 rounded-lg text-white/40 hover:text-white'
											onClick={() => setShowTarget(!showTarget)}
										>
											{showTarget ? (
												<EyeOff className='h-4 w-4' />
											) : (
												<Eye className='h-4 w-4' />
											)}
										</Button>
									)}
									<Uploader
										id='target'
										handleFirebaseFile={handleFirebaseFile}
										firebaseError={firebaseTargetError}
										firebaseConfig={firebaseTargetConfig}
									/>
								</div>
							</div>
						</TabsContent>

						<TabsContent
							value='download'
							className='m-0 animate-in fade-in slide-in-from-top-2 duration-300'
						>
							<div className='p-6 rounded-xl bg-indigo-500/5 border border-dashed border-indigo-500/20 text-center space-y-2'>
								<Download className='h-6 w-6 text-indigo-400 mx-auto mb-2' />
								<p className='font-medium text-white'>Download Backup</p>
								<p className='text-sm text-muted-foreground'>
									Save your database content as a compressed file.
								</p>
							</div>
						</TabsContent>

						<div className='space-y-2'>
							<button
								type='button'
								onClick={() => setShowTips(!showTips)}
								className='flex items-center gap-2 text-xs font-medium text-white/40 hover:text-white/60 transition-colors'
							>
								{showTips ? (
									<ChevronDown className='h-3 w-3' />
								) : (
									<ChevronRight className='h-3 w-3' />
								)}
								Troubleshooting Tips
							</button>

							<AnimatePresence>
								{showTips && (
									<motion.div
										initial={{ height: 0, opacity: 0 }}
										animate={{ height: 'auto', opacity: 1 }}
										exit={{ height: 0, opacity: 0 }}
										className='overflow-hidden'
									>
										<div className='p-4 rounded-xl bg-white/5 border border-white/10 text-xs space-y-3 text-white/60'>
											<p>
												<strong className='text-white/80 block mb-1'>
													Connection Failed?
												</strong>
												Ensure your database host allows connections from
												this service's IP address.
											</p>
											<p>
												<strong className='text-white/80 block mb-1'>
													Permissions
												</strong>
												Verify that the provided user has read/write
												privileges on the target database.
											</p>
										</div>
									</motion.div>
								)}
							</AnimatePresence>
						</div>

						<Button
							type='submit'
							className='w-full h-12 rounded-xl text-base font-bold bg-white text-black hover:bg-white/90 shadow-lg disabled:opacity-50'
							disabled={loading}
						>
							{loading ? (
								<>
									<Loader2 className='mr-2 h-4 w-4 animate-spin' />
									Processing...
								</>
							) : mode === 'copy' ? (
								<>
									Start Copy
									<Play className='ml-2 h-4 w-4 fill-current' />
								</>
							) : (
								<>
									Download Data <Download className='ml-2 h-4 w-4' />
								</>
							)}
						</Button>
					</form>
				</Tabs>
			</CardContent>
		</motion.div>
	);
}
