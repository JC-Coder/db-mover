import { memo } from "react";
import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ITestimonial } from "@/lib/testimonials";

export interface ITestimonialCardProps {
  testimonial: ITestimonial;
  isPreview?: boolean;
  className?: string;
}

// Renders an individual testimonial card matching DB Mover's native card border and layout.
export const TestimonialCard = memo(function TestimonialCard({
  testimonial,
  isPreview = false,
  className,
}: ITestimonialCardProps) {
  const { name, role, content, rating } = testimonial;

  const initials = name
    ? name
        .split(" ")
        .filter(Boolean)
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";

  return (
    <motion.article
      layout={!isPreview}
      initial={isPreview ? undefined : { opacity: 0, y: 20 }}
      animate={isPreview ? undefined : { opacity: 1, y: 0 }}
      exit={isPreview ? undefined : { opacity: 0, scale: 0.95 }}
      whileHover={isPreview ? undefined : { y: -3, transition: { duration: 0.2 } }}
      className={cn(
        "group relative flex h-full flex-col justify-between rounded-xl border border-[var(--landing-border)] bg-[var(--landing-card)] p-6 shadow-[0_18px_50px_-28px_var(--landing-shadow)] transition-all duration-300 hover:border-[var(--landing-border-strong)]",
        className,
      )}
    >
      <div>
        {/* Top bar: Stars */}
        <div className="flex items-center gap-1" aria-label={`${rating} out of 5 stars`}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`h-4 w-4 ${
                i < rating
                  ? "fill-[var(--landing-accent)] text-[var(--landing-accent)]"
                  : "fill-transparent text-[var(--landing-border)]"
              }`}
            />
          ))}
        </div>

        {/* Testimonial Quote */}
        <p className="mt-4 text-sm leading-relaxed text-[var(--landing-text)] transition-colors">
          "{content || "Write your feedback to preview how your testimonial card will look..."}"
        </p>
      </div>

      {/* Author Details Footer */}
      <div className="mt-6 flex items-center justify-between border-t border-[var(--landing-border)] pt-4 transition-colors">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--landing-border)] bg-[var(--landing-card-soft)] text-xs font-bold text-[var(--landing-accent)] transition-colors">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-[var(--landing-text)]">
              {name || "Your Name"}
            </p>
            <p className="truncate text-xs font-medium text-[var(--landing-muted)]">
              {role || "Your Role or Company"}
            </p>
          </div>
        </div>
      </div>
    </motion.article>
  );
});
