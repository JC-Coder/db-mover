import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Search,
  Check,
  Table2,
  Layers,
  KeyRound,
  FolderTree,
  Loader2,
  AlertCircle,
  Info,
  CheckSquare,
  Square,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { IBrowserObject, IBrowserSchemaResponse, IFirebaseConfig } from "@/types/browser";
import { cn } from "@/lib/utils";

export interface ITableSelectionModalProps {
  dbType: string;
  sourceUri: string;
  credent?: IFirebaseConfig | null;
  firebaseType?: string;
  isOpen: boolean;
  initialSelected?: string[];
  onClose: () => void;
  onApply: (selected: string[]) => void;
}

const formatNumber = (num?: number): string => {
  if (num === undefined || num === null) return "";
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}k`;
  return num.toLocaleString();
};

const getObjectLabel = (type: string): string => {
  switch (type) {
    case "table":
      return "tables";
    case "collection":
      return "collections";
    case "keyspace":
      return "key groups";
    case "path":
      return "paths";
    default:
      return "objects";
  }
};

// The Postgres migration and export paths only handle the public schema, so anything
// else stays visible in the Data Browser but cannot be picked for a transfer.
const getSelectableObjects = (dbType: string, objects: IBrowserObject[]): IBrowserObject[] =>
  dbType === "postgres"
    ? objects.filter((obj) => !obj.schema || obj.schema === "public")
    : objects;

// MongoDB collection names are only unique within a database and a transfer can span
// several, so the value sent to the server has to carry the database too.
const getObjectValue = (dbType: string, obj: IBrowserObject): string =>
  dbType === "mongodb" && obj.database ? `${obj.database}.${obj.name}` : obj.name;

const getObjectIcon = (type: string) => {
  switch (type) {
    case "table":
      return <Table2 className="h-4 w-4 text-[var(--landing-accent)] shrink-0" />;
    case "collection":
      return <Layers className="h-4 w-4 text-[var(--landing-accent)] shrink-0" />;
    case "keyspace":
      return <KeyRound className="h-4 w-4 text-[var(--landing-accent)] shrink-0" />;
    case "path":
      return <FolderTree className="h-4 w-4 text-[var(--landing-accent)] shrink-0" />;
    default:
      return <Table2 className="h-4 w-4 text-[var(--landing-accent)] shrink-0" />;
  }
};

// Interactive selection modal allowing users to include or exclude tables/collections for partial transfer.
export function TableSelectionModal({
  dbType,
  sourceUri,
  credent,
  firebaseType,
  isOpen,
  initialSelected,
  onClose,
  onApply,
}: ITableSelectionModalProps) {
  const [objects, setObjects] = useState<IBrowserObject[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedNames, setSelectedNames] = useState<Set<string>>(new Set());
  const [truncated, setTruncated] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const fetchSchema = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.post<IBrowserSchemaResponse>("/browser/schema", {
          sourceUri,
          dbType,
          credent: credent || undefined,
          type: firebaseType,
        });

        if (!isMounted) return;
        const fetchedObjects = response.data?.objects || [];
        setObjects(fetchedObjects);
        setTruncated(Boolean(response.data?.truncated));

        const selectable = getSelectableObjects(dbType, fetchedObjects);
        const allValues = selectable.map((o) => getObjectValue(dbType, o));

        // If initialSelected is provided, use it; otherwise default to all objects selected
        if (initialSelected && initialSelected.length > 0) {
          const availableSet = new Set(allValues);
          const validSelected = initialSelected.filter((name) => availableSet.has(name));
          setSelectedNames(new Set(validSelected.length > 0 ? validSelected : allValues));
        } else {
          setSelectedNames(new Set(allValues));
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        const msg =
          typeof err === "object" &&
            err !== null &&
            "response" in err &&
            typeof (err as { response?: { data?: { error?: string } } }).response?.data?.error === "string"
            ? (err as { response: { data: { error: string } } }).response.data.error
            : "Failed to load database schema. Verify your connection string and credentials.";
        setError(msg);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchSchema();
    return () => {
      isMounted = false;
    };
  }, [isOpen, sourceUri, dbType, credent, firebaseType]);

  const selectableObjects = useMemo(
    () => getSelectableObjects(dbType, objects),
    [dbType, objects],
  );
  const hiddenSchemaCount = objects.length - selectableObjects.length;

  const filteredObjects = useMemo(() => {
    if (!searchQuery.trim()) return selectableObjects;
    const query = searchQuery.toLowerCase().trim();
    return selectableObjects.filter(
      (obj) =>
        obj.name.toLowerCase().includes(query) ||
        (obj.schema && obj.schema.toLowerCase().includes(query)),
    );
  }, [selectableObjects, searchQuery]);

  const toggleObject = (name: string) => {
    setSelectedNames((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedNames(new Set(selectableObjects.map((o) => getObjectValue(dbType, o))));
  };

  const handleDeselectAll = () => {
    setSelectedNames(new Set());
  };

  const handleApply = () => {
    if (selectedNames.size === 0) {
      toast.error("Please select at least one item to transfer.");
      return;
    }
    onApply(Array.from(selectedNames));
    onClose();
  };

  const isFirestore = dbType === "firebase" && firebaseType === "firestore";
  // Firestore subcollections hang off documents, not collections, so only root
  // collections can be listed here — say so rather than implying a flat namespace.
  const objectTypeLabel = isFirestore
    ? "top-level collections"
    : selectableObjects.length > 0
      ? getObjectLabel(selectableObjects[0].type)
      : "items";

  const selectionNotices: string[] = [];
  if (dbType === "postgres" || dbType === "mysql") {
    selectionNotices.push(
      "Foreign keys pointing to unselected tables will be safely omitted during migration.",
    );
  }
  if (hiddenSchemaCount > 0) {
    selectionNotices.push(
      `${hiddenSchemaCount} table${hiddenSchemaCount === 1 ? "" : "s"} outside the public schema ${hiddenSchemaCount === 1 ? "is" : "are"} hidden — transfers currently support the public schema only.`,
    );
  }
  if (truncated) {
    selectionNotices.push(
      "This source was too large to scan completely, so some items may be missing from this list. Anything not listed cannot be selected and will not be transferred.",
    );
  }
  if (isFirestore) {
    selectionNotices.push(
      "Subcollections are transferred automatically with the documents that own them.",
    );
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-2xl rounded-2xl border border-[var(--landing-border)] bg-[var(--landing-card)] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--landing-border)]">
              <div>
                <h3 className="text-lg font-semibold text-[var(--landing-text)]">
                  Select {objectTypeLabel.charAt(0).toUpperCase() + objectTypeLabel.slice(1)} to Transfer
                </h3>
                <p className="text-xs text-[var(--landing-subtle)] mt-0.5">
                  Choose the specific {objectTypeLabel} you want to include in this operation.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1.5 text-[var(--landing-subtle)] hover:text-[var(--landing-text)] hover:bg-[var(--landing-bg)] transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Search & Bulk Actions Bar */}
            {!loading && !error && selectableObjects.length > 0 && (
              <div className="p-4 border-b border-[var(--landing-border)] bg-[var(--landing-bg)]/40 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--landing-subtle)]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={`Search ${selectableObjects.length} ${objectTypeLabel}...`}
                    className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-[var(--landing-border)] bg-[var(--landing-card)] text-[var(--landing-text)] placeholder:text-[var(--landing-subtle)] focus:outline-none focus:border-[var(--landing-accent)] focus:ring-1 focus:ring-[var(--landing-accent)]"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--landing-subtle)] hover:text-[var(--landing-text)]"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-[var(--landing-border)] text-[var(--landing-muted)] hover:text-[var(--landing-text)] hover:border-[var(--landing-accent)] transition-colors"
                  >
                    <CheckSquare className="h-3.5 w-3.5 text-[var(--landing-accent)]" />
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={handleDeselectAll}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-[var(--landing-border)] text-[var(--landing-muted)] hover:text-[var(--landing-text)] hover:border-[var(--landing-accent)] transition-colors"
                  >
                    <Square className="h-3.5 w-3.5" />
                    Clear
                  </button>
                  <div className="ml-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-[var(--landing-accent)]/15 text-[var(--landing-accent)]">
                    {selectedNames.size} of {selectableObjects.length}
                  </div>
                </div>
              </div>
            )}

            {/* List Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2 min-h-[220px]">
              {loading && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-[var(--landing-accent)] mb-3" />
                  <p className="text-sm font-medium text-[var(--landing-text)]">
                    Inspecting database structure…
                  </p>
                  <p className="text-xs text-[var(--landing-subtle)] mt-1">
                    Fetching available {objectTypeLabel} and row counts from source
                  </p>
                </div>
              )}

              {error && (
                <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                  <AlertCircle className="h-10 w-10 text-rose-500 mb-3" />
                  <p className="text-sm font-semibold text-[var(--landing-text)]">
                    Unable to inspect database
                  </p>
                  <p className="text-xs text-[var(--landing-muted)] mt-1 max-w-md leading-relaxed">
                    {error}
                  </p>
                </div>
              )}

              {!loading && !error && selectableObjects.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-sm text-[var(--landing-muted)]">
                    No {objectTypeLabel} found in the source database.
                  </p>
                </div>
              )}

              {!loading && !error && filteredObjects.length === 0 && selectableObjects.length > 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-sm text-[var(--landing-muted)]">
                    No {objectTypeLabel} match "{searchQuery}".
                  </p>
                </div>
              )}

              {!loading &&
                !error &&
                filteredObjects.map((obj) => {
                  const objectValue = getObjectValue(dbType, obj);
                  const isChecked = selectedNames.has(objectValue);
                  return (
                    <motion.div
                      key={objectValue}
                      whileHover={{ scale: 1.002 }}
                      whileTap={{ scale: 0.998 }}
                      onClick={() => toggleObject(objectValue)}
                      className={cn(
                        "flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer select-none",
                        isChecked
                          ? "border-[var(--landing-accent)]/60 bg-[var(--landing-accent)]/5 hover:bg-[var(--landing-accent)]/10"
                          : "border-[var(--landing-border)] bg-[var(--landing-card)] hover:border-[var(--landing-border-hover)] opacity-70 hover:opacity-100",
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-2">
                        <div
                          className={cn(
                            "h-5 w-5 rounded-md border flex items-center justify-center transition-colors shrink-0",
                            isChecked
                              ? "bg-[var(--landing-accent)] border-[var(--landing-accent)] text-[var(--landing-accent-text)]"
                              : "border-[var(--landing-border)] bg-[var(--landing-bg)]",
                          )}
                        >
                          {isChecked && <Check className="h-3.5 w-3.5 stroke-[2.5]" />}
                        </div>
                        {getObjectIcon(obj.type)}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[var(--landing-text)] truncate font-mono">
                            {obj.name}
                          </p>
                          {obj.schema && obj.schema !== "public" && (
                            <p className="text-[11px] text-[var(--landing-subtle)]">
                              Schema: {obj.schema}
                            </p>
                          )}
                          {dbType === "mongodb" && obj.database && (
                            <p className="text-[11px] text-[var(--landing-subtle)]">
                              Database: {obj.database}
                            </p>
                          )}
                        </div>
                      </div>

                      {obj.count !== undefined && (
                        <span className="shrink-0 px-2 py-0.5 text-xs rounded-md bg-[var(--landing-bg)] text-[var(--landing-subtle)] font-mono border border-[var(--landing-border)]">
                          {formatNumber(obj.count)} {obj.type === "table" ? "rows" : "docs"}
                        </span>
                      )}
                    </motion.div>
                  );
                })}
            </div>

            {/* Per-engine caveats about what a selection actually covers */}
            {!loading && !error && objects.length > 0 && selectionNotices.length > 0 && (
              <div className="px-6 py-2.5 bg-[var(--landing-bg)]/60 border-t border-[var(--landing-border)] space-y-1.5">
                {selectionNotices.map((notice) => (
                  <div key={notice} className="flex items-center gap-2 text-xs text-[var(--landing-subtle)]">
                    <Info className="h-3.5 w-3.5 text-[var(--landing-accent)] shrink-0" />
                    <span>{notice}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--landing-border)] bg-[var(--landing-card)]">
              <span className="text-xs text-[var(--landing-subtle)]">
                {selectedNames.size} {objectTypeLabel} selected
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium rounded-xl text-[var(--landing-muted)] hover:text-[var(--landing-text)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApply}
                  disabled={loading || !!error || selectedNames.size === 0}
                  className="px-5 py-2 text-sm font-semibold rounded-xl bg-[var(--landing-accent)] text-[var(--landing-accent-text)] hover:bg-[var(--landing-accent-hover)] transition-colors disabled:opacity-50"
                >
                  Apply Selection ({selectedNames.size})
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

