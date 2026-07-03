export type DatabaseMode = "copy" | "download" | "browse";
export type BrowserObjectType = "collection" | "table" | "keyspace" | "path";

export interface IFirebaseConfig {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

export interface ICopyConfig {
  sourceUri: string;
  targetUri: string;
  sourceCredent?: IFirebaseConfig | null;
  targetCredent?: IFirebaseConfig | null;
  firebaseType?: string;
}

export interface IDownloadConfig {
  sourceUri: string;
  credent?: IFirebaseConfig | null;
  type?: string;
}

export interface IBrowseConfig {
  sourceUri: string;
  credent?: IFirebaseConfig | null;
  type?: string;
}

export interface IBrowserConnectionPayload extends IBrowseConfig {
  dbType: string;
}

export interface IBrowserObject {
  database: string;
  name: string;
  type: BrowserObjectType;
  schema?: string;
  count?: number;
}

export interface IBrowserSchemaResponse {
  objects: IBrowserObject[];
}

export interface IBrowserPreview {
  rows: Record<string, unknown>[];
  columns: string[];
  limit: number;
  offset: number;
  elapsedMs: number;
  total?: number;
  nextCursor?: string;
}
