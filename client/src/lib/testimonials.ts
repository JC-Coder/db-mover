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

// Fetches community testimonials from backend.
export const fetchTestimonials = async (): Promise<ITestimonial[]> => {
  try {
    const res = await api.get<{ success: boolean; testimonials: ITestimonial[] }>("/testimonials");
    if (res.data && Array.isArray(res.data.testimonials)) {
      return res.data.testimonials;
    }
  } catch (err) {
    console.warn("Failed to fetch testimonials:", err);
  }
  return [];
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
