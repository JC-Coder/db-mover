import { useState, useEffect, useMemo } from "react";
import { MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TestimonialCard } from "@/components/TestimonialCard";
import { TestimonialModal } from "@/components/TestimonialModal";
import {
  fetchTestimonials,
  type ITestimonial,
} from "@/lib/testimonials";

// Displays testimonials adaptively (centered grid for 1-3 items, infinite marquee for 4+ items).
export function TestimonialsSection() {
  const [testimonials, setTestimonials] = useState<ITestimonial[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    fetchTestimonials().then((data) => {
      if (isMounted) {
        setTestimonials(data);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleCreated = (newTestimonial: ITestimonial) => {
    setTestimonials((prev) => [newTestimonial, ...prev]);
  };

  // Splits testimonials into two balanced rows with adequate loop repetition.
  const { row1, row2 } = useMemo(() => {
    const r1: ITestimonial[] = [];
    const r2: ITestimonial[] = [];

    testimonials.forEach((item, index) => {
      if (index % 2 === 0) {
        r1.push(item);
      } else {
        r2.push(item);
      }
    });

    // Ensure at least 1 item per row
    if (r2.length === 0 && r1.length > 0) r2.push(...r1);

    // Calculate repetitions so each row contains at least 8 items for a seamless infinite loop
    const repeat1 = Math.max(2, Math.ceil(8 / Math.max(1, r1.length)));
    const repeat2 = Math.max(2, Math.ceil(8 / Math.max(1, r2.length)));

    const row1Filled: ITestimonial[] = [];
    for (let i = 0; i < repeat1; i++) row1Filled.push(...r1);

    const row2Filled: ITestimonial[] = [];
    for (let i = 0; i < repeat2; i++) row2Filled.push(...r2);

    return { row1: row1Filled, row2: row2Filled };
  }, [testimonials]);

  const hasFewTestimonials = testimonials.length > 0 && testimonials.length < 4;

  return (
    <section id="testimonials" className="overflow-hidden px-6 py-20 transition-colors duration-500">
      <div className="mx-auto max-w-5xl">
        {/* Section Header */}
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row md:items-end">
          <div className="text-center md:text-left">
            <h2 className="text-3xl font-bold tracking-tight text-[var(--landing-text)] sm:text-4xl">
              What developers are saying
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--landing-muted)] sm:text-base">
              Used by developers who'd rather ship features than memorize CLI flags.
            </p>
          </div>

          <Button
            onClick={() => setIsModalOpen(true)}
            className="group relative flex h-11 shrink-0 items-center gap-2 rounded-full bg-[var(--landing-accent)] px-5 text-sm font-semibold text-[var(--landing-accent-text)] shadow-md transition-all duration-300 hover:bg-[var(--landing-accent-hover)] hover:shadow-lg"
          >
            <MessageSquarePlus className="h-4 w-4 transition-transform group-hover:scale-110" />
            <span>Share Your Story</span>
          </Button>
        </div>
      </div>

      {/* Adaptive Display: Empty state vs Centered Grid (1-3 items) vs Infinite Marquee (4+ items) */}
      {testimonials.length === 0 ? (
        <div className="mx-auto mt-12 flex max-w-md flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--landing-border)] p-8 text-center">
          <p className="text-sm text-[var(--landing-muted)]">No testimonials yet.</p>
          <Button
            onClick={() => setIsModalOpen(true)}
            size="sm"
            className="mt-3 rounded-full bg-[var(--landing-accent)] text-xs text-[var(--landing-accent-text)] hover:bg-[var(--landing-accent-hover)]"
          >
            Be the first to leave a review
          </Button>
        </div>
      ) : hasFewTestimonials ? (
        <div className="mx-auto mt-12 flex max-w-5xl flex-wrap justify-center gap-6">
          {testimonials.map((item) => (
            <div key={item.id} className="w-full max-w-sm">
              <TestimonialCard testimonial={item} />
            </div>
          ))}
        </div>
      ) : (
        /* Full-width Marquee Container with edge mask */
        <div className="relative mx-auto mt-12 max-w-7xl [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
          {/* Marquee Row 1: Leftward scroll */}
          <div className="group flex overflow-hidden py-3">
            <div className="flex w-max animate-testimonial-marquee gap-6 group-hover:[animation-play-state:paused]">
              {row1.map((item, idx) => (
                <div
                  key={`r1-${item.id}-${idx}`}
                  className="w-[320px] shrink-0 sm:w-[380px] md:w-[420px]"
                >
                  <TestimonialCard testimonial={item} />
                </div>
              ))}
            </div>
          </div>

          {/* Marquee Row 2: Rightward scroll */}
          <div className="group mt-2 flex overflow-hidden py-3">
            <div className="flex w-max animate-testimonial-marquee-reverse gap-6 group-hover:[animation-play-state:paused]">
              {row2.map((item, idx) => (
                <div
                  key={`r2-${item.id}-${idx}`}
                  className="w-[320px] shrink-0 sm:w-[380px] md:w-[420px]"
                >
                  <TestimonialCard testimonial={item} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Submission Modal */}
      <TestimonialModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleCreated}
      />
    </section>
  );
}
