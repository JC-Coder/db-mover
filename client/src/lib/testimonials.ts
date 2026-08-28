import api from "./api";

export type TestimonialDbType =
  | "mongodb"
  | "postgres"
  | "mysql"
  | "redis"
  | "firebase"
  | "general";

export interface ITestimonial {
  id: string;
  name: string;
  role: string;
  content: string;
  rating: number;
  dbType: TestimonialDbType;
  createdAt: string;
  status?: "approved" | "hidden";
}

export interface ICreateTestimonialPayload {
  name: string;
  role: string;
  content: string;
  rating: number;
  dbType: TestimonialDbType;
  website?: string; // Honeypot field for bot filtering
}

export const SEED_TESTIMONIALS: ITestimonial[] = [
  {
    id: "seed-1",
    name: "Maya Chen",
    role: "Senior Engineer @ TechFlow",
    content: "Saved us a solid 45 minutes on a staging-to-prod MongoDB copy. Pasted the URIs, watched the logs, done. I didn't touch the terminal once.",
    rating: 5,
    dbType: "mongodb",
    createdAt: "2026-08-15T14:32:00.000Z",
  },
  {
    id: "seed-2",
    name: "Ade Okonkwo",
    role: "Fullstack Engineer",
    content: "The zip backup mode is a lifesaver before schema migrations. One click and I had a snapshot to roll back to. Exactly what I needed.",
    rating: 5,
    dbType: "redis",
    createdAt: "2026-08-18T09:15:00.000Z",
  },
  {
    id: "seed-3",
    name: "Nina Patel",
    role: "Platform Lead",
    content: "I've recommended this to three teammates now. It removes all the friction from database handoffs. Clean, fast, no surprises.",
    rating: 5,
    dbType: "postgres",
    createdAt: "2026-08-20T18:45:00.000Z",
  },
  {
    id: "seed-4",
    name: "Marcus Vance",
    role: "DevOps Engineer @ ScaleGrid",
    content: "PostgreSQL to PostgreSQL schema and table transfer was flawless. The live streaming terminal gave me full confidence during migration.",
    rating: 5,
    dbType: "postgres",
    createdAt: "2026-08-22T11:20:00.000Z",
  },
  {
    id: "seed-5",
    name: "Elena Rostova",
    role: "Backend Architect",
    content: "Finally an open source tool that handles MySQL and Firebase without complex Docker configs or cloud lock-in. 10/10 developer experience.",
    rating: 5,
    dbType: "mysql",
    createdAt: "2026-08-24T16:10:00.000Z",
  },
  {
    id: "seed-6",
    name: "Liam O'Connor",
    role: "Lead Software Developer",
    content: "The data browser and schema inspection before running a move caught a missing index early. Incredibly polished for an open source tool.",
    rating: 5,
    dbType: "firebase",
    createdAt: "2026-08-25T13:05:00.000Z",
  },
];

// Fetches community testimonials from backend with fallback to initial seed reviews.
export const fetchTestimonials = async (): Promise<ITestimonial[]> => {
  try {
    const res = await api.get<{ success: boolean; testimonials: ITestimonial[] }>("/testimonials");
    if (res.data && Array.isArray(res.data.testimonials) && res.data.testimonials.length > 0) {
      return res.data.testimonials;
    }
  } catch (err) {
    console.warn("Failed to fetch dynamic testimonials, using local cache/seed:", err);
  }
  return SEED_TESTIMONIALS;
};

// Submits a new user testimonial to the backend API.
export const submitTestimonial = async (
  payload: ICreateTestimonialPayload,
): Promise<ITestimonial> => {
  const res = await api.post<{ success: boolean; testimonial: ITestimonial }>(
    "/testimonials",
    payload,
  );
  return res.data.testimonial;
};
