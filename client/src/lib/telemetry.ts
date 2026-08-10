export type TelemetryEventName =
  | "app_opened"
  | "page_viewed"
  | "landing_cta_clicked"
  | "database_selected"
  | "mode_selected"
  | "connection_verified"
  | "connection_verification_failed"
  | "browser_preview_loaded"
  | "browser_preview_failed";

export type TelemetryDatabaseType = "mongodb" | "postgres" | "mysql" | "redis" | "firebase";
export type TelemetryMode = "copy" | "download" | "browser";

export interface ITelemetryProperties {
  databaseType?: TelemetryDatabaseType;
  mode?: TelemetryMode;
  [key: string]: unknown;
}

const VISITOR_KEY = "db_mover_visitor_id";
const SESSION_KEY = "db_mover_session_id";
const OPENED_KEY = "db_mover_opened";

/**
 * Where self-hosted builds report by default. Without this, a self-hosted install posts to its own
 * server, which drops everything unless that operator configured their own PostHog project — so
 * the public numbers would only ever cover the hosted app.
 */
const DEFAULT_CENTRAL_URL = "https://dbmover.cloud/api/telemetry/event";

const getCentralUrl = (): string => {
  const envUrl = import.meta.env.VITE_PUBLIC_CENTRAL_TELEMETRY_URL;
  if (typeof envUrl === "string" && envUrl.trim().length > 0) {
    return envUrl.trim();
  }
  // Development builds stay same-origin so local work never reaches the public relay.
  if (import.meta.env.MODE !== "production") return "/api/telemetry/event";
  return DEFAULT_CENTRAL_URL;
};

const createUuid = (): string => {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

const getStoredUuid = (storage: Storage, key: string): string => {
  try {
    const existing = storage.getItem(key);
    if (existing) return existing;
    const value = createUuid();
    storage.setItem(key, value);
    return value;
  } catch {
    return createUuid();
  }
};

export const getTelemetryIdentity = () => ({
  visitorId: getStoredUuid(localStorage, VISITOR_KEY),
  sessionId: getStoredUuid(sessionStorage, SESSION_KEY),
});

const getReferrerHost = (): string | undefined => {
  try {
    if (!document.referrer) return undefined;
    return new URL(document.referrer).hostname || undefined;
  } catch {
    return undefined;
  }
};

export const getTelemetryHeaders = (): Record<string, string> => {
  const identity = getTelemetryIdentity();
  return {
    "X-DB-Mover-Visitor": identity.visitorId,
    "X-DB-Mover-Session": identity.sessionId,
  };
};

export const trackTelemetry = (
  eventName: TelemetryEventName | string,
  properties: ITelemetryProperties = {},
): void => {
  try {
    const identity = getTelemetryIdentity();
    const isProd = import.meta.env.MODE === "production";

    const payload = {
      distinctId: identity.visitorId,
      event: eventName,
      properties: {
        sessionId: identity.sessionId,
        currentRoute: window.location.pathname,
        // Host only — a full referrer URL can carry paths and query strings.
        referrerHost: getReferrerHost(),
        screenWidth: window.innerWidth,
        ...properties,
      },
      // Deployment is derived server-side from the request host; a client cannot claim it.
      // The server likewise ignores an environment claim of "production".
      environment: isProd ? "production" : "development",
    };

    void fetch(getCentralUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {
      // Non-blocking telemetry: a failed send must never surface to the user.
    });
  } catch {
    // Non-blocking telemetry
  }
};

export const trackAppOpenedOnce = (): void => {
  try {
    if (sessionStorage.getItem(OPENED_KEY)) return;
    sessionStorage.setItem(OPENED_KEY, "1");
  } catch {
    // Session storage fallback
  }
  trackTelemetry("app_opened");
};
