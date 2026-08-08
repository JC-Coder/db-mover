import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Braces,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Database,
  Hash,
  LayoutGrid,
  Loader2,
  Maximize2,
  Minimize2,
  RefreshCw,
  Rows3,
  Search,
  ShieldCheck,
  Table2,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { DatabaseBrand } from "@/components/DatabaseBrand";
import { ThemeToggle } from "@/components/ThemeToggle";
import api from "@/lib/api";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import {
  IBrowserConnectionPayload,
  IBrowserObject,
  IBrowserPreview,
  IBrowserSchemaResponse,
} from "@/types/browser";

type JsonPrimitive = string | number | boolean | null | undefined;
type DataRecord = Record<string, unknown>;

const DB_NAMES: Record<string, string> = {
  mongodb: "MongoDB",
  postgres: "PostgreSQL",
  mysql: "MySQL",
  redis: "Redis",
  firebase: "Firebase",
};

const PAGE_SIZE = 50;
const REDIS_DATABASES = Array.from({ length: 16 }, (_, index) => index);
const INSPECTOR_MIN_WIDTH = 320;
const INSPECTOR_DEFAULT_WIDTH = 340;
const INSPECTOR_EXPANDED_WIDTH = 680;
const INSPECTOR_MAX_WIDTH = 860;

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (
    isRecord(error) &&
    isRecord(error.response) &&
    isRecord(error.response.data) &&
    typeof error.response.data.error === "string"
  ) {
    return error.response.data.error;
  }

  return fallback;
};

const getRedisDatabase = (sourceUri: string) => {
  try {
    const pathname = new URL(sourceUri).pathname;
    const match = pathname.match(/^\/(\d+)\/?$/);
    const database = match ? Number(match[1]) : 0;
    return Number.isSafeInteger(database) && database >= 0 ? database : 0;
  } catch {
    return 0;
  }
};

const setRedisDatabase = (sourceUri: string, database: number): string | null => {
  try {
    const url = new URL(sourceUri);
    url.pathname = `/${database}`;
    return url.toString();
  } catch {
    return null;
  }
};

interface IRedisDatabasePickerProps {
  database: number;
  onSelect: (database: number) => void;
}

function RedisDatabasePicker({ database, onSelect }: IRedisDatabasePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedDatabase, setHighlightedDatabase] = useState(database);
  const pickerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const databaseOptions = REDIS_DATABASES.includes(database)
    ? REDIS_DATABASES
    : [...REDIS_DATABASES, database].sort((left, right) => left - right);

  useEffect(() => {
    setHighlightedDatabase(database);
  }, [database]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    menuRef.current?.focus();

    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen]);

  const closePicker = () => {
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const selectDatabase = (nextDatabase: number) => {
    onSelect(nextDatabase);
    closePicker();
  };

  const handleMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const currentIndex = databaseOptions.indexOf(highlightedDatabase);

    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightedDatabase(databaseOptions[(currentIndex + 1) % databaseOptions.length]);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightedDatabase(databaseOptions[(currentIndex - 1 + databaseOptions.length) % databaseOptions.length]);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectDatabase(highlightedDatabase);
    } else if (event.key === "Escape") {
      event.preventDefault();
      closePicker();
    }
  };

  return (
    <div ref={pickerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setHighlightedDatabase(database);
            setIsOpen(true);
          }
        }}
        className={cn(
          "flex h-8 items-center gap-2 border px-2.5 font-mono text-xs transition-colors",
          isOpen
            ? "border-cyan-500/60 bg-cyan-500/10 text-cyan-400"
            : "border-[var(--landing-border)] text-[var(--landing-muted)] hover:bg-[var(--landing-card-soft)] hover:text-[var(--landing-text)]",
        )}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={`Redis database ${database}`}
      >
        <Hash className="h-3.5 w-3.5" />
        <span>DB {database}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div
          ref={menuRef}
          role="listbox"
          tabIndex={-1}
          aria-label="Select Redis database"
          onKeyDown={handleMenuKeyDown}
          className="absolute right-0 top-full z-50 mt-2 w-48 rounded-xl border border-[var(--landing-border)] bg-[var(--landing-card)] p-2 shadow-2xl shadow-black/30 outline-none"
        >
          <div className="mb-2 border-b border-[var(--landing-border)] px-2 pb-2">
            <p className="text-[11px] font-semibold text-[var(--landing-text)]">Redis database</p>
            <p className="mt-0.5 text-[10px] text-[var(--landing-subtle)]">Choose the database from your connection URL.</p>
          </div>
          <div className="grid grid-cols-4 gap-1">
            {databaseOptions.map((option) => {
              const isSelected = option === database;
              const isHighlighted = option === highlightedDatabase;

              return (
                <button
                  key={option}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setHighlightedDatabase(option)}
                  onClick={() => selectDatabase(option)}
                  className={cn(
                    "flex h-8 items-center justify-center gap-1 rounded-md font-mono text-xs transition-colors",
                    isSelected
                      ? "bg-cyan-500 text-slate-950"
                      : isHighlighted
                        ? "bg-[var(--landing-card-soft)] text-[var(--landing-text)]"
                        : "text-[var(--landing-muted)] hover:bg-[var(--landing-card-soft)] hover:text-[var(--landing-text)]",
                  )}
                >
                  {option}
                  {isSelected && <Check className="h-3 w-3" />}
                </button>
              );
            })}
          </div>
          <p className="mt-2 border-t border-[var(--landing-border)] px-2 pt-2 font-mono text-[10px] text-[var(--landing-subtle)]">
            URL path: /{database}
          </p>
        </div>
      )}
    </div>
  );
}

const getValueKind = (value: unknown) => {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
};

function RenderValue({ value }: { value: unknown }) {
  if (value === null) {
    return <span className="font-mono text-xs italic text-zinc-500">null</span>;
  }

  if (value === undefined) {
    return <span className="font-mono text-xs italic text-zinc-500">undefined</span>;
  }

  if (typeof value === "boolean") {
    return (
      <span
        className={cn(
          "px-1.5 py-0.5 font-mono text-[11px] font-semibold",
          value ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500",
        )}
      >
        {String(value)}
      </span>
    );
  }

  if (typeof value === "number") {
    return <span className="font-mono text-xs font-medium text-cyan-500">{value}</span>;
  }

  if (typeof value === "string") {
    return (
      <span className="block max-w-full whitespace-normal break-all font-mono text-xs leading-5 text-[var(--landing-text)]/85">
        "{value}"
      </span>
    );
  }

  return (
    <span className="block max-w-[260px] truncate font-mono text-xs text-[var(--landing-muted)]">
      {JSON.stringify(value)}
    </span>
  );
}

interface IJsonTreeViewProps {
  data: unknown;
  isRoot?: boolean;
}

function JsonTreeView({ data, isRoot = true }: IJsonTreeViewProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  if (data === null || data === undefined || typeof data !== "object") {
    return <RenderValue value={data as JsonPrimitive} />;
  }

  if (Array.isArray(data)) {
    return (
      <div className="my-1 border-l border-[var(--landing-border)] pl-4 font-mono text-xs">
        <span className="select-none text-[var(--landing-subtle)]">Array({data.length}) [</span>
        <div className="my-1 space-y-1">
          {data.map((item, index) => (
            <div key={index} className="flex items-start">
              <span className="mr-2 select-none text-[var(--landing-subtle)]">{index}:</span>
              <JsonTreeView data={item} isRoot={false} />
            </div>
          ))}
        </div>
        <span className="select-none text-[var(--landing-subtle)]">]</span>
      </div>
    );
  }

  const entries = Object.entries(data);

  return (
    <div className="my-1 border-l border-[var(--landing-border)] pl-4 font-mono text-xs">
      {!isRoot && <span className="select-none text-[var(--landing-subtle)]">{"{"}</span>}
      <div className="my-1 space-y-1">
        {entries.map(([key, value]) => {
          const isCollapsible = typeof value === "object" && value !== null;
          const isCollapsed = collapsed[key];

          return (
            <div key={key} className="flex flex-col">
              <button
                type="button"
                onClick={() => isCollapsible && setCollapsed((current) => ({ ...current, [key]: !current[key] }))}
                className={cn(
                  "flex items-center gap-1.5 px-1 py-0.5 text-left transition-colors",
                  isCollapsible ? "cursor-pointer hover:bg-[var(--landing-card-soft)]/50" : "cursor-default",
                )}
              >
                {isCollapsible && (
                  <ChevronRight
                    className={cn("h-3 w-3 text-[var(--landing-subtle)] transition-transform", !isCollapsed && "rotate-90")}
                  />
                )}
                <span className="font-medium text-cyan-500">{key}</span>
                <span className="text-[var(--landing-subtle)]">:</span>
                {!isCollapsible && <JsonTreeView data={value} isRoot={false} />}
                {isCollapsible && isCollapsed && (
                  <span className="bg-[var(--landing-card-soft)] px-1 text-[10px] text-[var(--landing-subtle)]">
                    {Array.isArray(value) ? `Array(${value.length})` : "{...}"}
                  </span>
                )}
              </button>
              {isCollapsible && !isCollapsed && <JsonTreeView data={value} isRoot={false} />}
            </div>
          );
        })}
      </div>
      {!isRoot && <span className="select-none text-[var(--landing-subtle)]">{"}"}</span>}
    </div>
  );
}

interface IDataTableProps {
  columns: string[];
  data: DataRecord[];
  offset: number;
  onRowClick: (row: DataRecord, index: number) => void;
  selectedRowIndex?: number | null;
}

function DataTable({ columns, data, offset, onRowClick, selectedRowIndex }: IDataTableProps) {
  const visibleColumns = useMemo(() => {
    return columns.length > 0 ? columns : Array.from(new Set(data.flatMap((row) => Object.keys(row))));
  }, [columns, data]);

  if (data.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center border border-dashed border-[var(--landing-border)] bg-[var(--landing-card)]/20 text-[var(--landing-subtle)]">
        <Rows3 className="mb-2 h-8 w-8 opacity-40" />
        <p className="text-sm font-medium">No records in this preview.</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto border border-[var(--landing-border)] bg-[var(--landing-card)]/30">
      <table className="w-full min-w-max border-collapse text-left text-sm">
        <thead className="sticky top-0 z-10">
          <tr className="border-b border-[var(--landing-border)] bg-[var(--landing-bg)]/95">
            <th className="w-12 border-r border-[var(--landing-border)] px-3 py-2 text-center font-mono text-xs font-medium text-[var(--landing-subtle)]">
              #
            </th>
            {visibleColumns.map((column) => (
              <th key={column} className="border-r border-[var(--landing-border)] px-3 py-2 last:border-r-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-[var(--landing-text)]">{column}</span>
                  <span className="border border-[var(--landing-border)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--landing-subtle)]">
                    {getValueKind(data[0]?.[column])}
                  </span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--landing-border)]">
          {data.map((row, index) => {
            const isSelected = selectedRowIndex === index;

            return (
              <tr
                key={index}
                onClick={() => onRowClick(row, index)}
                className={cn(
                  "cursor-pointer transition-colors hover:bg-[var(--landing-card-soft)]/40",
                  isSelected && "bg-cyan-500/10",
                )}
              >
                <td className="border-r border-[var(--landing-border)] bg-[var(--landing-card-soft)]/10 px-3 py-2 text-center font-mono text-xs text-[var(--landing-subtle)]">
                  {offset + index + 1}
                </td>
                {visibleColumns.map((column) => (
                  <td
                    key={column}
                    className="max-w-[320px] align-top border-r border-[var(--landing-border)] px-3 py-2 last:border-r-0"
                  >
                    <RenderValue value={row[column]} />
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const readStoredConnection = (dbType: string | undefined): IBrowserConnectionPayload | null => {
  if (!dbType) return null;

  try {
    const raw = sessionStorage.getItem(`browser_credentials_${dbType}`);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed) || parsed.dbType !== dbType || typeof parsed.sourceUri !== "string") {
      return null;
    }

    return parsed as unknown as IBrowserConnectionPayload;
  } catch {
    return null;
  }
};

export function BrowserPage() {
  const { dbType } = useParams<{ dbType: string }>();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const dbLabel = DB_NAMES[dbType ?? ""] ?? dbType ?? "Database";

  const [connection, setConnection] = useState<IBrowserConnectionPayload | null>(null);
  const [objects, setObjects] = useState<IBrowserObject[]>([]);
  const [activeObject, setActiveObject] = useState<IBrowserObject | null>(null);
  const [expandedDbs, setExpandedDbs] = useState<Record<string, boolean>>({});
  const [schemaSearch, setSchemaSearch] = useState("");
  const [rowSearch, setRowSearch] = useState("");
  const [schemaLoading, setSchemaLoading] = useState(true);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [preview, setPreview] = useState<IBrowserPreview | null>(null);
  const [offset, setOffset] = useState(0);
  const [cursor, setCursor] = useState<string | undefined>();
  const [cursorHistory, setCursorHistory] = useState<(string | undefined)[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedRecord, setSelectedRecord] = useState<DataRecord | null>(null);
  const [selectedRecordIndex, setSelectedRecordIndex] = useState<number | null>(null);
  const [isInspectorExpanded, setIsInspectorExpanded] = useState(false);
  const [inspectorWidth, setInspectorWidth] = useState(INSPECTOR_DEFAULT_WIDTH);
  const [isResizingInspector, setIsResizingInspector] = useState(false);

  const groupedObjects = useMemo(() => {
    return objects.reduce<Record<string, IBrowserObject[]>>((groups, object) => {
      const key = object.database;
      groups[key] = groups[key] ? [...groups[key], object] : [object];
      return groups;
    }, {});
  }, [objects]);

  const filteredGroups = useMemo(() => {
    const term = schemaSearch.trim().toLowerCase();
    if (!term) return groupedObjects;

    const filtered: Record<string, IBrowserObject[]> = {};
    for (const [database, groupObjects] of Object.entries(groupedObjects)) {
      const matches = groupObjects.filter((object) => {
        return database.toLowerCase().includes(term) || object.name.toLowerCase().includes(term);
      });

      if (matches.length > 0) {
        filtered[database] = matches;
      }
    }

    return filtered;
  }, [groupedObjects, schemaSearch]);

  const visibleRows = useMemo(() => {
    const rows = preview?.rows ?? [];
    if (!rowSearch.trim()) return rows;

    const term = rowSearch.toLowerCase();
    return rows.filter((row) => JSON.stringify(row).toLowerCase().includes(term));
  }, [preview?.rows, rowSearch]);

  useEffect(() => {
    const storedConnection = readStoredConnection(dbType);
    if (!storedConnection) {
      toast.error("Database browser session expired", {
        description: "Paste your connection details again to continue.",
      });
      navigate(`/config/${dbType ?? "mongodb"}`);
      return;
    }

    setConnection(storedConnection);
  }, [dbType, navigate]);

  useEffect(() => {
    if (!connection) return;

    let isMounted = true;

    const loadSchema = async () => {
      setSchemaLoading(true);
      try {
        const response = await api.post<IBrowserSchemaResponse>("/browser/schema", connection);
        if (!isMounted) return;

        setObjects(response.data.objects);
        const firstObject = response.data.objects[0] ?? null;
        setActiveObject(firstObject);
        setExpandedDbs(firstObject ? { [firstObject.database]: true } : {});
      } catch (error) {
        toast.error("Failed to load schema", {
          description: getErrorMessage(error, "Check your connection details and try again."),
        });
      } finally {
        if (isMounted) setSchemaLoading(false);
      }
    };

    void loadSchema();

    return () => {
      isMounted = false;
    };
  }, [connection]);

  useEffect(() => {
    setSelectedRecord(null);
    setSelectedRecordIndex(null);
    setRowSearch("");
  }, [activeObject, preview]);

  useEffect(() => {
    if (!isResizingInspector) return;

    const handlePointerMove = (event: PointerEvent) => {
      const maxWidth = Math.max(
        INSPECTOR_MIN_WIDTH,
        Math.min(INSPECTOR_MAX_WIDTH, window.innerWidth - 520),
      );
      const nextWidth = Math.min(
        Math.max(window.innerWidth - event.clientX, INSPECTOR_MIN_WIDTH),
        maxWidth,
      );

      setInspectorWidth(nextWidth);
      setIsInspectorExpanded(nextWidth > INSPECTOR_EXPANDED_WIDTH - 80);
    };

    const handlePointerUp = () => {
      setIsResizingInspector(false);
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [isResizingInspector]);

  useEffect(() => {
    if (!connection || !activeObject) return;

    let isMounted = true;

    const loadPreview = async () => {
      setPreviewLoading(true);
      try {
        const response = await api.post<IBrowserPreview>("/browser/preview", {
          ...connection,
          database: activeObject.database,
          schema: activeObject.schema,
          objectName: activeObject.name,
          limit: PAGE_SIZE,
          offset,
          cursor,
        });

        if (isMounted) {
          setPreview(response.data);
        }
      } catch (error) {
        if (isMounted) {
          setPreview(null);
          toast.error("Failed to preview data", {
            description: getErrorMessage(error, "The selected object could not be loaded."),
          });
        }
      } finally {
        if (isMounted) setPreviewLoading(false);
      }
    };

    void loadPreview();

    return () => {
      isMounted = false;
    };
  }, [activeObject, connection, cursor, offset, refreshKey]);

  const resetPaging = (object: IBrowserObject) => {
    setActiveObject(object);
    setOffset(0);
    setCursor(undefined);
    setCursorHistory([]);
  };

  const handleNextPage = () => {
    if (!preview) return;

    if (preview.nextCursor) {
      setCursorHistory((current) => [...current, cursor]);
      setCursor(preview.nextCursor);
    }

    setOffset((current) => current + PAGE_SIZE);
  };

  const handlePreviousPage = () => {
    if (offset === 0) return;

    if (cursorHistory.length > 0) {
      const previous = cursorHistory[cursorHistory.length - 1];
      setCursorHistory((current) => current.slice(0, -1));
      setCursor(previous);
    }

    setOffset((current) => Math.max(current - PAGE_SIZE, 0));
  };

  // Switch Redis databases by changing the URL path and clearing stale browser state.
  const handleRedisDatabaseChange = (database: number) => {
    if (!connection || dbType !== "redis" || !Number.isSafeInteger(database) || database < 0) return;

    const nextSourceUri = setRedisDatabase(connection.sourceUri, database);
    if (!nextSourceUri) {
      toast.error("Invalid Redis connection string", {
        description: "Return to configuration and enter a valid Redis URI.",
      });
      return;
    }

    const nextConnection = {
      ...connection,
      sourceUri: nextSourceUri,
    };

    sessionStorage.setItem(`browser_credentials_${dbType}`, JSON.stringify(nextConnection));
    setObjects([]);
    setActiveObject(null);
    setExpandedDbs({});
    setSchemaSearch("");
    setRowSearch("");
    setPreview(null);
    setOffset(0);
    setCursor(undefined);
    setCursorHistory([]);
    setSelectedRecord(null);
    setSelectedRecordIndex(null);
    setIsInspectorExpanded(false);
    setInspectorWidth(INSPECTOR_DEFAULT_WIDTH);
    setConnection(nextConnection);
  };

  const canGoNext = Boolean(
    preview && (activeObject?.type === "keyspace" ? preview.nextCursor : preview.nextCursor || preview.rows.length === PAGE_SIZE),
  );
  const currentObjectLabel = activeObject?.name ?? "No object selected";
  const browserGridStyle = {
    "--inspector-width": `${inspectorWidth}px`,
  } as CSSProperties;

  const renderObjectIcon = (object: IBrowserObject) => {
    if (object.type === "keyspace") return <Hash className="h-3.5 w-3.5" />;
    if (object.type === "collection" || object.type === "path") return <Braces className="h-3.5 w-3.5" />;
    return <Table2 className="h-3.5 w-3.5" />;
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[var(--landing-bg)] text-[var(--landing-text)]">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--landing-border)] bg-[var(--landing-bg)] px-4">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(`/config/${dbType}`)}
            className="flex h-8 w-8 items-center justify-center border border-[var(--landing-border)] text-[var(--landing-subtle)] transition-colors hover:bg-[var(--landing-card-soft)] hover:text-[var(--landing-text)]"
            aria-label="Back to database configuration"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <DatabaseBrand db={dbType} theme={theme === "light" ? "light" : "dark"} variant="icon" className="h-7 w-7" />
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold">{dbLabel} Data Browser</h1>
            <p className="truncate font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--landing-subtle)]">
              Read-only live preview
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-500 sm:flex">
            <ShieldCheck className="h-3.5 w-3.5" />
            Read-only
          </div>
          {preview && (
            <div className="hidden items-center gap-2 border border-[var(--landing-border)] px-2.5 py-1 font-mono text-xs text-[var(--landing-muted)] md:flex">
              {preview.elapsedMs}ms
            </div>
          )}
          {dbType === "redis" && connection && (
            <RedisDatabasePicker
              database={getRedisDatabase(connection.sourceUri)}
              onSelect={handleRedisDatabaseChange}
            />
          )}
          <ThemeToggle />
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[240px_minmax(620px,1fr)] overflow-x-auto xl:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col border-r border-[var(--landing-border)] bg-[var(--landing-card)]/20">
          <div className="border-b border-[var(--landing-border)] p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--landing-subtle)]">Schema</p>
              <span className="font-mono text-[10px] text-[var(--landing-subtle)]">{objects.length}</span>
            </div>
            <label className="relative block">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[var(--landing-subtle)]" />
              <input
                value={schemaSearch}
                onChange={(event) => setSchemaSearch(event.target.value)}
                placeholder="Search objects"
                className="h-8 w-full border border-[var(--landing-border)] bg-[var(--landing-bg)] pl-8 pr-2 font-mono text-xs text-[var(--landing-text)] outline-none transition-colors placeholder:text-[var(--landing-subtle)] focus:border-cyan-500/60"
              />
            </label>
          </div>

          <div className="min-h-0 flex-1 overflow-auto p-2">
            {schemaLoading ? (
              <div className="flex h-32 items-center justify-center text-[var(--landing-subtle)]">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : Object.keys(filteredGroups).length === 0 ? (
              <div className="px-3 py-8 text-center text-xs text-[var(--landing-subtle)]">No database objects found.</div>
            ) : (
              Object.entries(filteredGroups).map(([databaseName, databaseObjects]) => (
                <div key={databaseName} className="mb-1">
                  <button
                    type="button"
                    onClick={() => setExpandedDbs((current) => ({ ...current, [databaseName]: !current[databaseName] }))}
                    className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-xs font-semibold text-[var(--landing-muted)] transition-colors hover:bg-[var(--landing-card-soft)]/50 hover:text-[var(--landing-text)]"
                  >
                    <ChevronRight className={cn("h-3 w-3 transition-transform", expandedDbs[databaseName] && "rotate-90")} />
                    <Database className="h-3.5 w-3.5" />
                    <span className="min-w-0 flex-1 truncate">{databaseName}</span>
                    <span className="font-mono text-[10px] text-[var(--landing-subtle)]">{databaseObjects.length}</span>
                  </button>

                  <AnimatePresence initial={false}>
                    {expandedDbs[databaseName] && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.12 }}
                        className="overflow-hidden"
                      >
                        <div className="space-y-0.5 pl-5">
                          {databaseObjects.map((object) => {
                            const isActive =
                              activeObject?.database === object.database && activeObject?.name === object.name;

                            return (
                              <button
                                key={`${object.database}-${object.name}`}
                                type="button"
                                onClick={() => resetPaging(object)}
                                className={cn(
                                  "flex w-full items-center gap-2 border-l-2 px-2 py-1.5 text-left text-xs transition-colors",
                                  isActive
                                    ? "border-cyan-500 bg-cyan-500/10 text-cyan-500"
                                    : "border-transparent text-[var(--landing-subtle)] hover:bg-[var(--landing-card-soft)]/40 hover:text-[var(--landing-text)]",
                                )}
                              >
                                {renderObjectIcon(object)}
                                <span className="min-w-0 flex-1 truncate">{object.name}</span>
                                {typeof object.count === "number" && <span className="font-mono text-[10px]">{object.count}</span>}
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))
            )}
          </div>
        </aside>

        <main className="flex min-h-0 min-w-0 flex-col bg-[var(--landing-card)]/10">
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[var(--landing-border)] bg-[var(--landing-card)]/20 px-4 py-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs text-[var(--landing-subtle)]">
                <span className="font-mono">{activeObject?.database ?? "No schema"}</span>
                <span>/</span>
                <span className="font-mono text-[var(--landing-text)]">{currentObjectLabel}</span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-[var(--landing-muted)]">
                  {visibleRows.length} of {preview?.rows.length ?? 0} visible
                </span>
                {activeObject && (
                  <span className="border border-[var(--landing-border)] px-1.5 py-0.5 font-mono text-[10px] uppercase text-[var(--landing-subtle)]">
                    {activeObject.type}
                  </span>
                )}
              </div>
            </div>

            <div className="flex min-w-[280px] flex-1 items-center justify-end gap-2">
              <label className="relative w-full max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[var(--landing-subtle)]" />
                <input
                  value={rowSearch}
                  onChange={(event) => setRowSearch(event.target.value)}
                  placeholder="Filter visible records"
                  className="h-8 w-full border border-[var(--landing-border)] bg-[var(--landing-bg)] pl-8 pr-2 font-mono text-xs text-[var(--landing-text)] outline-none transition-colors placeholder:text-[var(--landing-subtle)] focus:border-cyan-500/60"
                />
              </label>
              <button
                type="button"
                onClick={() => {
                  setOffset(0);
                  setCursor(undefined);
                  setCursorHistory([]);
                  setRefreshKey((current) => current + 1);
                }}
                className="flex h-8 items-center gap-1.5 border border-[var(--landing-border)] px-2.5 text-xs font-medium text-[var(--landing-muted)] transition-colors hover:bg-[var(--landing-card-soft)] hover:text-[var(--landing-text)]"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh
              </button>
            </div>
          </div>

          <div
            className={cn(
              "grid min-h-0 flex-1 grid-cols-1 transition-[grid-template-columns] duration-200",
              selectedRecord ? "lg:grid-cols-[minmax(0,1fr)_var(--inspector-width)]" : "lg:grid-cols-1",
            )}
            style={browserGridStyle}
          >
            <section className="min-h-0 min-w-0 p-4">
              {previewLoading ? (
                <div className="flex h-full items-center justify-center border border-dashed border-[var(--landing-border)] text-[var(--landing-subtle)]">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : activeObject && preview ? (
                <DataTable
                  columns={preview.columns}
                  data={visibleRows}
                  offset={offset}
                  onRowClick={(record, index) => {
                    setSelectedRecord(record);
                    setSelectedRecordIndex(index);
                  }}
                  selectedRowIndex={selectedRecordIndex}
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center border border-dashed border-[var(--landing-border)] text-[var(--landing-subtle)]">
                  <Database className="mb-2 h-8 w-8 opacity-40" />
                  <p className="text-sm font-medium">Select a schema object to begin browsing.</p>
                </div>
              )}
            </section>

            {selectedRecord && (
              <aside className="relative hidden min-h-0 border-l border-[var(--landing-border)] bg-[var(--landing-card)]/20 lg:flex lg:flex-col">
                <button
                  type="button"
                  onPointerDown={(event) => {
                    event.preventDefault();
                    setIsResizingInspector(true);
                  }}
                  className={cn(
                    "absolute -left-1 top-0 z-20 h-full w-2 cursor-col-resize border-l border-transparent transition-colors hover:border-cyan-500 hover:bg-cyan-500/10",
                    isResizingInspector && "border-cyan-500 bg-cyan-500/10",
                  )}
                  aria-label="Resize inspector"
                  title="Drag to resize inspector"
                />
                <div className="flex h-11 items-center justify-between border-b border-[var(--landing-border)] px-3">
                  <div className="flex items-center gap-2">
                    <LayoutGrid className="h-3.5 w-3.5 text-[var(--landing-subtle)]" />
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--landing-subtle)]">Inspector</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const shouldExpand = inspectorWidth < INSPECTOR_EXPANDED_WIDTH;
                        setIsInspectorExpanded(shouldExpand);
                        setInspectorWidth(shouldExpand ? INSPECTOR_EXPANDED_WIDTH : INSPECTOR_DEFAULT_WIDTH);
                      }}
                      className="flex h-7 w-7 items-center justify-center text-[var(--landing-subtle)] transition-colors hover:bg-[var(--landing-card-soft)] hover:text-[var(--landing-text)]"
                      aria-label={isInspectorExpanded ? "Collapse inspector" : "Expand inspector"}
                      title={isInspectorExpanded ? "Collapse inspector" : "Expand inspector"}
                    >
                      {isInspectorExpanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRecord(null);
                        setSelectedRecordIndex(null);
                      }}
                      className="text-[var(--landing-subtle)] transition-colors hover:text-[var(--landing-text)]"
                      aria-label="Close inspector"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--landing-border)] px-4 py-3">
                  <div className="min-w-0">
                    <p className="font-mono text-xs text-[var(--landing-subtle)]">Selected record</p>
                    <p className="mt-1 truncate font-mono text-sm text-[var(--landing-text)]">
                      {String(selectedRecord.id ?? selectedRecord._id ?? selectedRecord.key ?? selectedRecordIndex ?? "record")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard?.writeText(JSON.stringify(selectedRecord, null, 2));
                      toast.success("Record copied");
                    }}
                    className="flex h-8 shrink-0 items-center gap-1.5 border border-[var(--landing-border)] px-2.5 text-xs text-[var(--landing-muted)] transition-colors hover:bg-[var(--landing-card-soft)] hover:text-[var(--landing-text)]"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copy JSON
                  </button>
                </div>
                <div className={cn("min-h-0 flex-1 overflow-auto", isInspectorExpanded ? "p-5" : "p-4")}>
                  <JsonTreeView data={selectedRecord} />
                </div>
              </aside>
            )}
          </div>

          <footer className="flex h-9 shrink-0 items-center justify-between border-t border-[var(--landing-border)] bg-[var(--landing-bg)] px-4 font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--landing-subtle)]">
            <span>{currentObjectLabel}</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePreviousPage}
                disabled={offset === 0 || previewLoading}
                className="border border-[var(--landing-border)] px-2 py-1 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Prev
              </button>
              <span>
                {offset + 1}-{offset + visibleRows.length}
              </span>
              <button
                type="button"
                onClick={handleNextPage}
                disabled={!canGoNext || previewLoading}
                className="border border-[var(--landing-border)] px-2 py-1 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
