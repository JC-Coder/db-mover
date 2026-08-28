import { useState, useId, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Star, Loader2 } from "lucide-react";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { submitTestimonial, type ITestimonial } from "@/lib/testimonials";

export interface ITestimonialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (testimonial: ITestimonial) => void;
}

const fireModalConfetti = () => {
  confetti({
    particleCount: 70,
    spread: 80,
    origin: { y: 0.6 },
    zIndex: 99999,
  });
};

// Clean, high-contrast modal dialog matching DB Mover's native form styling.
export function TestimonialModal({
  isOpen,
  onClose,
  onSuccess,
}: ITestimonialModalProps) {
  const nameId = useId();
  const roleId = useId();
  const contentId = useId();

  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [content, setContent] = useState("");
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [website, setWebsite] = useState(""); // Honeypot
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleReset = () => {
    setName("");
    setRole("");
    setContent("");
    setRating(5);
    setWebsite("");
    setErrorMessage(null);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim() || name.trim().length < 2) {
      setErrorMessage("Please enter your name.");
      return;
    }

    if (!role.trim() || role.trim().length < 2) {
      setErrorMessage("Please enter your role or company.");
      return;
    }

    if (!content.trim() || content.trim().length < 10) {
      setErrorMessage("Please write a short review (at least 10 characters).");
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await submitTestimonial({
        name: name.trim(),
        role: role.trim(),
        content: content.trim(),
        rating,
        dbType: "general",
        website: website.trim(),
      });

      fireModalConfetti();
      // Pinned top-right with an explicit z-index so it stays visible above the closing modal/confetti.
      toast.success("Thank you! Your testimonial has been posted.", {
        position: "top-right",
        style: { zIndex: 999999999 },
      });
      onSuccess(created);
      handleClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to submit testimonial. Please try again.";
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            aria-hidden="true"
          />

          {/* Dialog Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-[var(--landing-border)] bg-[var(--landing-card)] shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="testimonial-modal-title"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--landing-border)] px-6 py-4">
              <div>
                <h3
                  id="testimonial-modal-title"
                  className="text-base font-semibold text-[var(--landing-text)]"
                >
                  Share your experience
                </h3>
                <p className="mt-0.5 text-xs text-[var(--landing-muted)]">
                  Leave a review for fellow developers using DB Mover.
                </p>
              </div>

              <button
                type="button"
                onClick={handleClose}
                className="text-[var(--landing-subtle)] transition-colors hover:text-[var(--landing-text)]"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form Content */}
            <form onSubmit={handleSubmit} className="space-y-4 p-6">
              {/* Honeypot for bots */}
              <input
                type="text"
                name="website"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
                style={{ display: "none" }}
                aria-hidden="true"
              />

              {errorMessage && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                  {errorMessage}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label
                    htmlFor={nameId}
                    className="block text-xs font-semibold uppercase tracking-widest text-[var(--landing-subtle)]"
                  >
                    Name
                  </label>
                  <input
                    id={nameId}
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Maya Chen"
                    maxLength={50}
                    required
                    className="h-10 w-full rounded-xl border border-[var(--landing-border)] bg-[var(--landing-bg)] px-3.5 text-sm text-[var(--landing-text)] placeholder:text-[var(--landing-subtle)] focus:border-[var(--landing-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--landing-accent)]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor={roleId}
                    className="block text-xs font-semibold uppercase tracking-widest text-[var(--landing-subtle)]"
                  >
                    Role / Company
                  </label>
                  <input
                    id={roleId}
                    type="text"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="Senior Engineer @ TechFlow"
                    maxLength={60}
                    required
                    className="h-10 w-full rounded-xl border border-[var(--landing-border)] bg-[var(--landing-bg)] px-3.5 text-sm text-[var(--landing-text)] placeholder:text-[var(--landing-subtle)] focus:border-[var(--landing-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--landing-accent)]"
                  />
                </div>
              </div>

              {/* Rating */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-widest text-[var(--landing-subtle)]">
                  Rating
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(null)}
                        onClick={() => setRating(star)}
                        className="p-0.5 text-[var(--landing-subtle)] transition-colors hover:text-[var(--landing-accent)] focus:outline-none"
                        aria-label={`${star} star${star > 1 ? "s" : ""}`}
                      >
                        <Star
                          className={`h-5 w-5 ${
                            star <= (hoverRating || rating)
                              ? "fill-[var(--landing-accent)] text-[var(--landing-accent)]"
                              : "fill-transparent"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                  <span className="text-xs font-medium text-[var(--landing-muted)]">
                    {hoverRating || rating} of 5 stars
                  </span>
                </div>
              </div>

              {/* Story */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor={contentId}
                    className="block text-xs font-semibold uppercase tracking-widest text-[var(--landing-subtle)]"
                  >
                    Feedback
                  </label>
                  <span className="text-[11px] text-[var(--landing-subtle)]">
                    {content.length}/500
                  </span>
                </div>
                <textarea
                  id={contentId}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="How did DB Mover help with your database migration or backup?"
                  rows={4}
                  maxLength={500}
                  required
                  className="w-full resize-none rounded-xl border border-[var(--landing-border)] bg-[var(--landing-bg)] p-3 text-sm leading-relaxed text-[var(--landing-text)] placeholder:text-[var(--landing-subtle)] focus:border-[var(--landing-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--landing-accent)]"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="rounded-xl px-4 py-2 text-sm font-medium text-[var(--landing-muted)] transition-colors hover:text-[var(--landing-text)]"
                >
                  Cancel
                </button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-10 rounded-xl bg-[var(--landing-accent)] px-5 text-sm font-medium text-[var(--landing-accent-text)] transition-colors hover:bg-[var(--landing-accent-hover)]"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit review"
                  )}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
