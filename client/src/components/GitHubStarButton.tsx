import { useEffect, useState } from "react";
import { Star } from "lucide-react";

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

interface GitHubStarButtonProps {
  repo: string;
  className?: string;
}

export function GitHubStarButton({ repo, className = "" }: GitHubStarButtonProps) {
  const [stars, setStars] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`https://api.github.com/repos/${repo}`)
      .then((res) => res.json())
      .then((data) => setStars(typeof data.stargazers_count === "number" ? data.stargazers_count : null))
      .catch(() => setStars(null))
      .finally(() => setLoading(false));
  }, [repo]);

  const formatted =
    loading
      ? "…"
      : stars === null
        ? "★"
        : stars >= 1000
          ? `${(stars / 1000).toFixed(1)}k`
          : String(stars);

  return (
    <a
      href={`https://github.com/${repo}`}
      target="_blank"
      rel="noreferrer"
      className={`fixed bottom-8 left-8 z-50 flex items-center gap-2 rounded-full border border-[#2A1D16] bg-[#110C0A]/90 px-4 py-2.5 shadow-xl transition-all hover:scale-105 hover:bg-[#1C130E] active:scale-95 sm:flex ${className}`}
    >
      <div className="flex items-center gap-1.5 border-r border-[#2A1D16] pr-2.5">
        <GithubIcon className="h-4 w-4 text-[#F5EFE8]" />
        <span className="text-xs font-semibold text-[#F5EFE8]">Star us</span>
      </div>
      <div className="flex items-center gap-1">
        <Star className="h-3.5 w-3.5 fill-[#C98A3D] text-[#C98A3D]" />
        <span className="text-xs font-bold text-[#E3D7C8]">{formatted}</span>
      </div>
    </a>
  );
}
