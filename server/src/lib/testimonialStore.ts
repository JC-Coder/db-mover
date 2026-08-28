import { randomUUID } from "crypto";
import { MongoClient, Collection, Document } from "mongodb";
import { config } from "./config";

export interface ITestimonial {
  id: string;
  name: string;
  role: string;
  content: string;
  rating: number;
  dbType: "mongodb" | "postgres" | "mysql" | "redis" | "firebase" | "general";
  createdAt: string;
  status?: "approved" | "hidden";
}

const CACHE_TTL_MS = 30 * 1000; // In-memory cache TTL: 30s

let memoryCache: ITestimonial[] | null = null;
let lastFetchTime = 0;
let mongoClient: MongoClient | null = null;

// Connects to MongoDB cluster if MONGODB_URI is provided.
const getMongoCollection = async (): Promise<Collection<Document> | null> => {
  if (!config.mongodbUri) return null;

  try {
    if (!mongoClient) {
      mongoClient = new MongoClient(config.mongodbUri);
      await mongoClient.connect();
    }
    return mongoClient.db().collection("testimonials");
  } catch (err) {
    console.error("MongoDB connection for testimonials failed:", err);
    mongoClient = null; // Drop the broken client so the next call retries a fresh connection.
    return null;
  }
};

// Loads testimonials from MongoDB. Returns an empty list when Mongo is unconfigured or
// unreachable — the client falls back to its own seed list for that case.
const loadTestimonials = async (): Promise<ITestimonial[]> => {
  const now = Date.now();
  if (memoryCache !== null && now - lastFetchTime < CACHE_TTL_MS) {
    return memoryCache;
  }

  const collection = await getMongoCollection();
  if (!collection) {
    return [];
  }

  try {
    const docs = await collection.find({}).sort({ createdAt: -1 }).toArray();
    const items: ITestimonial[] = docs.map((doc) => ({
      id: doc.id || String(doc._id),
      name: doc.name || "",
      role: doc.role || "",
      content: doc.content || "",
      rating: typeof doc.rating === "number" ? doc.rating : 5,
      dbType: doc.dbType || "general",
      status: doc.status || "approved",
      createdAt: doc.createdAt || new Date().toISOString(),
    }));

    memoryCache = items;
    lastFetchTime = now;
    return items;
  } catch (err) {
    console.error("Failed to query testimonials from MongoDB:", err);
    return [];
  }
};

// Retrieves all approved testimonials sorted newest first.
export const getTestimonials = async (): Promise<ITestimonial[]> => {
  const list = await loadTestimonials();
  return list
    .filter((item) => item.status !== "hidden")
    .sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
};

// Adds a new testimonial to MongoDB. Throws if Mongo isn't configured/reachable —
// there's no local fallback to silently persist to.
export const addTestimonial = async (input: {
  name: string;
  role: string;
  content: string;
  rating: number;
  dbType: ITestimonial["dbType"];
}): Promise<ITestimonial> => {
  const collection = await getMongoCollection();
  if (!collection) {
    throw new Error("Testimonial storage is currently unavailable.");
  }

  const newRecord: ITestimonial = {
    id: `test_${Date.now()}_${randomUUID().slice(0, 8)}`,
    name: input.name.trim(),
    role: input.role.trim(),
    content: input.content.trim(),
    rating: Math.max(1, Math.min(5, Math.round(input.rating))),
    dbType: input.dbType || "general",
    status: "approved",
    createdAt: new Date().toISOString(),
  };

  await collection.insertOne({ ...newRecord });
  memoryCache = null; // Force the next read to refetch from Mongo, including this record.

  return newRecord;
};
