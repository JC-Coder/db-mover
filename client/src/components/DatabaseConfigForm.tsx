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

interface DatabaseConfigFormProps {
  dbType: string;
  onStartCopy: (config: any) => void;
  onStartDownload: (config: any) => void;
}

const getPlaceholder = (dbType: string): string => {
  switch (dbType) {
    case "mongodb":
      return "mongodb+srv://user:pass@host/db";
    case "postgres":
      return "postgresql://user:pass@host:5432/db";
    case "mysql":
      return "mysql://user:pass@host:3306/db";
    case "redis":
      return "redis://:pass@host:6379";
    default:
      return "connection string";
  }
};

const validateUri = (uri: string, dbType: string): boolean => {
  const patterns: Record<string, RegExp> = {
    mongodb: /^mongodb(\+srv)?:\/\//,
    postgres: /^postgres(ql)?:\/\//,
    mysql: /^mysql:\/\//,
    redis: /^rediss?:\/\//,
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
  const [mode, setMode] = useState<"copy" | "download">(() => {
    const d = loadDraft(dbType);
    return d?.mode ?? "copy";
  });
  const [sourceUri, setSourceUri] = useState(() => {
    const d = loadDraft(dbType);
    return d?.sourceUri ?? "";
  });
  const [targetUri, setTargetUri] = useState(() => {
    const d = loadDraft(dbType);
    return d?.targetUri ?? "";
  });
  const [loading, setLoading] = useState(false);
  const [showSource, setShowSource] = useState(false);
  const [showTarget, setShowTarget] = useState(false);
  const [showTips, setShowTips] = useState(false);
  const [hasDraft, setHasDraft] = useState(() => {
    const d = loadDraft(dbType);
    return !!(d?.sourceUri || d?.targetUri);
  });

  // Sync state → sessionStorage whenever any field changes
  useEffect(() => {
    // Only save if there is actual data to preserve
    if (sourceUri || targetUri) {
      saveDraft(dbType, { mode, sourceUri, targetUri });
      setHasDraft(true);
    }
  }, [dbType, mode, sourceUri, targetUri]);

  const handleClearDraft = () => {
    setSourceUri("");
    setTargetUri("");
    setMode("copy");
    clearDraft(dbType);
    setHasDraft(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!validateUri(sourceUri, dbType)) {
        toast.error("Connection Error", {
          description: `The source connection string is not a valid ${dbType} URI.`,
        });
        setLoading(false);
        return;
      }

      if (mode === "copy") {
        if (!validateUri(targetUri, dbType)) {
          toast.error("Connection Error", {
            description: `The destination connection string is not a valid ${dbType} URI.`,
          });
          setLoading(false);
          return;
        }
        await onStartCopy({ sourceUri, targetUri });
      } else {
        await onStartDownload({ sourceUri });
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

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-2xl mx-auto rounded-3xl glass-card shadow-xl overflow-hidden border-white/10"
    >
      <CardHeader className="space-y-4 p-8 pb-6 border-b border-white/5">
        <CardTitle className="text-2xl font-bold">
          Configure{" "}
          {dbType === "mongodb"
            ? "MongoDB"
            : dbType === "postgres"
              ? "PostgreSQL"
              : dbType === "mysql"
                ? "MySQL"
                : "Redis"}
        </CardTitle>
        <CardDescription className="text-base text-muted-foreground">
          Enter your connection details below.
        </CardDescription>
      </CardHeader>

      <CardContent className="p-8 pt-6 space-y-8">
        <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-xl p-4 flex gap-3 text-indigo-200/80 text-sm backdrop-blur-sm">
          <AlertCircle className="h-5 w-5 shrink-0 text-indigo-400" />
          <div className="flex-1 flex items-center justify-between gap-2">
            <p>
              Credentials are stored in your session only and cleared on tab
              close.
            </p>
            {hasDraft && (
              <button
                type="button"
                onClick={handleClearDraft}
                className="shrink-0 text-xs font-medium text-indigo-400/70 hover:text-indigo-300 underline underline-offset-2 transition-colors"
              >
                Clear saved
              </button>
            )}
          </div>
        </div>

        <Tabs
          value={mode}
          onValueChange={(v) => setMode(v as any)}
          className="space-y-8"
        >
          <TabsList className="grid w-full grid-cols-2 p-1 bg-white/5 rounded-xl border border-white/5">
            <TabsTrigger
              value="copy"
              className="rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white font-medium"
            >
              Copy Data
            </TabsTrigger>
            <TabsTrigger
              value="download"
              className="rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white font-medium"
            >
              Download
            </TabsTrigger>
          </TabsList>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <Label
                htmlFor="source-uri"
                className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70"
              >
                Source Database
              </Label>
              <div className="relative group">
                <Input
                  id="source-uri"
                  type={showSource ? "text" : "password"}
                  placeholder={getPlaceholder(dbType)}
                  value={sourceUri}
                  onChange={(e) => setSourceUri(e.target.value)}
                  autoComplete="off"
                  data-lpignore="true"
                  className="h-12 bg-white/[0.03] border-white/10 rounded-xl px-4 pr-12 font-mono text-sm placeholder:text-white/20 focus:ring-2 focus:ring-indigo-500/50"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-2 h-8 w-8 p-0 hover:bg-white/10 rounded-lg text-white/40 hover:text-white"
                  onClick={() => setShowSource(!showSource)}
                >
                  {showSource ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <TabsContent
              value="copy"
              className="m-0 space-y-6 animate-in fade-in slide-in-from-top-2 duration-300"
            >
              <div className="space-y-3">
                <Label
                  htmlFor="target-uri"
                  className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70"
                >
                  Target Database
                </Label>
                <div className="relative group">
                  <Input
                    id="target-uri"
                    type={showTarget ? "text" : "password"}
                    placeholder={getPlaceholder(dbType)}
                    value={targetUri}
                    onChange={(e) => setTargetUri(e.target.value)}
                    autoComplete="off"
                    data-lpignore="true"
                    className="h-12 bg-white/[0.03] border-white/10 rounded-xl px-4 pr-12 font-mono text-sm placeholder:text-white/20 focus:ring-2 focus:ring-indigo-500/50"
                    required={mode === "copy"}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-2 h-8 w-8 p-0 hover:bg-white/10 rounded-lg text-white/40 hover:text-white"
                    onClick={() => setShowTarget(!showTarget)}
                  >
                    {showTarget ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent
              value="download"
              className="m-0 animate-in fade-in slide-in-from-top-2 duration-300"
            >
              <div className="p-6 rounded-xl bg-indigo-500/5 border border-dashed border-indigo-500/20 text-center space-y-2">
                <Download className="h-6 w-6 text-indigo-400 mx-auto mb-2" />
                <p className="font-medium text-white">Download Backup</p>
                <p className="text-sm text-muted-foreground">
                  Save your database content as a compressed file.
                </p>
              </div>
            </TabsContent>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setShowTips(!showTips)}
                className="flex items-center gap-2 text-xs font-medium text-white/40 hover:text-white/60 transition-colors"
              >
                {showTips ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
                Troubleshooting Tips
              </button>

              <AnimatePresence>
                {showTips && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-xs space-y-3 text-white/60">
                      <p>
                        <strong className="text-white/80 block mb-1">
                          Connection Failed?
                        </strong>
                        Ensure your database host allows connections from this
                        service's IP address.
                      </p>
                      <p>
                        <strong className="text-white/80 block mb-1">
                          Permissions
                        </strong>
                        Verify that the provided user has read/write privileges
                        on the target database.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Button
              type="submit"
              className="w-full h-12 rounded-xl text-base font-bold bg-white text-black hover:bg-white/90 shadow-lg disabled:opacity-50"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : mode === "copy" ? (
                <>
                  Start Copy
                  <Play className="ml-2 h-4 w-4 fill-current" />
                </>
              ) : (
                <>
                  Download Data <Download className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        </Tabs>
      </CardContent>
    </motion.div>
  );
}
