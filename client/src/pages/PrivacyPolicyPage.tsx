import { Link } from "react-router-dom";
import {
  ShieldCheck,
  Lock,
  Clock,
  Ban,
  BarChart3,
  Server,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { ContentLayout } from "@/components/ContentLayout";
import { Seo } from "@/components/Seo";
import {
  breadcrumbJsonLd,
  getStaticRouteSeo,
  organizationJsonLd,
  type IPageSeo,
} from "@/lib/seo";

const PRIVACY_SEO = getStaticRouteSeo("/privacy") as IPageSeo;

export function PrivacyPolicyPage() {
  return (
    <ContentLayout>
      <Seo
        {...PRIVACY_SEO}
        structuredData={[
          organizationJsonLd(),
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Privacy Policy", path: "/privacy" },
          ]),
        ]}
      />

      <div className="mx-auto max-w-4xl px-6 py-16">
        {/* Breadcrumbs */}
        <nav aria-label="Breadcrumb" className="mb-8">
          <ol className="flex items-center gap-2 text-sm text-[var(--landing-subtle)]">
            <li>
              <Link
                to="/"
                className="transition-colors hover:text-[var(--landing-text)]"
              >
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="text-[var(--landing-text)]">
              Privacy Policy
            </li>
          </ol>
        </nav>

        {/* Page Header */}
        <div className="mb-12 border-b border-[var(--landing-border)] pb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-1 text-xs font-medium text-emerald-400 mb-4">
            <ShieldCheck className="h-3.5 w-3.5" />
            Privacy & Data Sovereignty
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--landing-text)] sm:text-4xl">
            Privacy Policy
          </h1>
          <p className="mt-3 text-lg text-[var(--landing-muted)]">
            DB Mover is built on a simple principle: your database data belongs
            exclusively to you. Here is a clear, transparent explanation of how
            data flows through our platform.
          </p>
          <p className="mt-2 text-xs text-[var(--landing-subtle)]">
            Last updated: August 23, 2026 • Effective immediately
          </p>
        </div>

        {/* Core Principles Banner */}
        <div className="mb-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-[var(--landing-border)] bg-[var(--landing-card)] p-5">
            <Lock className="h-5 w-5 text-[var(--landing-accent)] mb-3" />
            <h3 className="font-semibold text-[var(--landing-text)] text-sm">
              Zero Credential Storage
            </h3>
            <p className="mt-1 text-xs text-[var(--landing-subtle)] leading-relaxed">
              Connection strings and keys are held in volatile memory only for the
              active job and never written to disk.
            </p>
          </div>

          <div className="rounded-xl border border-[var(--landing-border)] bg-[var(--landing-card)] p-5">
            <Clock className="h-5 w-5 text-amber-400 mb-3" />
            <h3 className="font-semibold text-[var(--landing-text)] text-sm">
              24-Hour Auto-Purge
            </h3>
            <p className="mt-1 text-xs text-[var(--landing-subtle)] leading-relaxed">
              Exported backup archives are temporary. Hosted R2 deployments use a
              24-hour bucket lifecycle rule, and local exports expire with their
              download link.
            </p>
          </div>

          <div className="rounded-xl border border-[var(--landing-border)] bg-[var(--landing-card)] p-5">
            <Ban className="h-5 w-5 text-emerald-400 mb-3" />
            <h3 className="font-semibold text-[var(--landing-text)] text-sm">
              No Data Selling or AI
            </h3>
            <p className="mt-1 text-xs text-[var(--landing-subtle)] leading-relaxed">
              Your database content is never inspected, sold to third parties, or used
              to train AI models.
            </p>
          </div>
        </div>

        {/* Detailed Sections */}
        <div className="space-y-12 text-[var(--landing-text)] leading-relaxed">
          {/* Section 1: Data in Transit */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold tracking-tight text-[var(--landing-text)] flex items-center gap-2.5">
              <Lock className="h-5 w-5 text-[var(--landing-accent)]" />
              1. Database Credentials & In-Transit Data
            </h2>
            <p className="text-sm text-[var(--landing-muted)]">
              When you run a migration or export, you provide connection details (such
              as MongoDB URIs, PostgreSQL connection strings, Redis endpoints, or
              Firebase Service Account JSON).
            </p>
            <ul className="space-y-2 text-sm text-[var(--landing-muted)]">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Volatile Memory Only:</strong> Credentials exist in server
                  RAM only for the lifetime of your active migration job. Once the job
                  ends or the server process restarts, credentials vanish.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Encrypted Connections:</strong> Browser traffic uses HTTPS.
                  Use TLS-enabled database connection strings to encrypt traffic between
                  DB Mover and your source or target database.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Privacy-Safe Telemetry:</strong> Telemetry excludes connection
                  URIs, passwords, tokens, usernames, hostnames, and database content.
                </span>
              </li>
            </ul>
          </section>

          {/* Section 2: Temporary Backup Storage (R2 Downloads) */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold tracking-tight text-[var(--landing-text)] flex items-center gap-2.5">
              <Clock className="h-5 w-5 text-amber-400" />
              2. Temporary Backup Storage & 24-Hour Auto-Purge
            </h2>
            <p className="text-sm text-[var(--landing-muted)]">
              When you choose <strong>Download</strong> instead of copying to another
              database, DB Mover packages your source database into a compressed zip
              archive.
            </p>
            <div className="rounded-xl border border-[var(--landing-border)] bg-[var(--landing-card)] p-5 space-y-3">
              <h4 className="font-semibold text-sm text-[var(--landing-text)]">
                How Cloudflare R2 Temporary Storage Works:
              </h4>
              <p className="text-xs text-[var(--landing-muted)] leading-relaxed">
                To support multi-gigabyte files without browser crashes or network
                timeouts, the export is streamed to Cloudflare R2 object storage
                encrypted at rest.
              </p>
              <ul className="space-y-1.5 text-xs text-[var(--landing-muted)]">
                <li>
                  • <strong>Time-Limited Pre-Signed URLs:</strong> Access to your download
                  file is granted via a cryptographically signed URL valid for 2 hours.
                </li>
                <li>
                  • <strong>Strict 24-Hour Deletion TTL:</strong> Hosted R2 deployments
                  require a bucket lifecycle rule that permanently deletes backup files
                  after 24 hours.
                </li>
                <li>
                  • <strong>No Secondary Backups:</strong> DB Mover creates no archival
                  replicas or long-term snapshots of your exported data.
                </li>
              </ul>
            </div>
          </section>

          {/* Section 3: What We Do NOT Do */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold tracking-tight text-[var(--landing-text)] flex items-center gap-2.5">
              <Ban className="h-5 w-5 text-rose-400" />
              3. What We Do NOT Do
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-4 space-y-1.5">
                <p className="text-sm font-semibold text-rose-400 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" /> No Content Inspection
                </p>
                <p className="text-xs text-[var(--landing-subtle)]">
                  We never view, index, search, or inspect the contents of your database
                  tables, collections, or documents.
                </p>
              </div>

              <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-4 space-y-1.5">
                <p className="text-sm font-semibold text-rose-400 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" /> No AI Model Training
                </p>
                <p className="text-xs text-[var(--landing-subtle)]">
                  Your dataset is never used to train, evaluate, or fine-tune artificial
                  intelligence or machine learning models.
                </p>
              </div>

              <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-4 space-y-1.5">
                <p className="text-sm font-semibold text-rose-400 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" /> No Data Selling or Ads
                </p>
                <p className="text-xs text-[var(--landing-subtle)]">
                  We do not monetize user data, sell records to third-party data brokers,
                  or embed advertising trackers.
                </p>
              </div>

              <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-4 space-y-1.5">
                <p className="text-sm font-semibold text-rose-400 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" /> No Persistent Retention
                </p>
                <p className="text-xs text-[var(--landing-subtle)]">
                  Once your migration completes and the session closes, all customer
                  database records are completely gone from our systems.
                </p>
              </div>
            </div>
          </section>

          {/* Section 4: Anonymous Telemetry */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold tracking-tight text-[var(--landing-text)] flex items-center gap-2.5">
              <BarChart3 className="h-5 w-5 text-indigo-400" />
              4. Anonymous Telemetry & Public Stats
            </h2>
            <p className="text-sm text-[var(--landing-muted)]">
              To understand reliability and optimize throughput, DB Mover records
              minimal, anonymized operational events via PostHog. You can review all
              aggregated numbers publicly on our{" "}
              <Link
                to="/stats"
                className="text-[var(--landing-accent)] underline hover:opacity-80"
              >
                Usage Statistics
              </Link>{" "}
              page.
            </p>
            <div className="rounded-xl border border-[var(--landing-border)] bg-[var(--landing-bg)] p-4 text-xs font-mono space-y-2 text-[var(--landing-subtle)]">
              <p className="text-[var(--landing-muted)] font-semibold font-sans text-xs">
                What We Record:
              </p>
              <p>• Database engine type (e.g. "mongodb", "postgres", "redis")</p>
              <p>• Operation mode ("copy", "download", "browse")</p>
              <p>• Job duration and total record count processed</p>
              <p>• Categorized error codes (e.g. "CONNECTION_REFUSED", "AUTH_FAILED")</p>
              <p className="text-[var(--landing-muted)] font-semibold font-sans text-xs pt-2">
                What We NEVER Record:
              </p>
              <p className="text-rose-400">✗ Connection URIs, passwords, or authentication secrets</p>
              <p className="text-rose-400">✗ Hostnames, IP addresses, database names, or table names</p>
              <p className="text-rose-400">✗ Document contents or query results</p>
            </div>
          </section>

          {/* Section 5: Self-Hosting Sovereignty */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold tracking-tight text-[var(--landing-text)] flex items-center gap-2.5">
              <Server className="h-5 w-5 text-sky-400" />
              5. Self-Hosting & Full Data Sovereignty
            </h2>
            <p className="text-sm text-[var(--landing-muted)]">
              If your organization requires strict compliance (HIPAA, GDPR, SOC 2, or
              PCI-DSS) or operates behind an isolated corporate VPC, you can self-host
              DB Mover entirely on your own hardware or private cloud.
            </p>
            <p className="text-sm text-[var(--landing-muted)]">
              DB Mover is 100% open-source under the MIT license. When self-hosted, no
              data touches any third-party server.
            </p>
            <div className="pt-2">
              <a
                href="https://github.com/JC-Coder/db-mover"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-[var(--landing-border)] bg-[var(--landing-card)] px-4 py-2 text-xs font-medium text-[var(--landing-text)] hover:border-[var(--landing-border-strong)] transition-colors"
              >
                View Source on GitHub →
              </a>
            </div>
          </section>

          {/* Section 6: Contact */}
          <section className="space-y-4 border-t border-[var(--landing-border)] pt-8">
            <h2 className="text-lg font-bold text-[var(--landing-text)]">
              6. Security Inquiries & Contact
            </h2>
            <p className="text-sm text-[var(--landing-muted)]">
              If you have any questions about this Privacy Policy, data handling, or
              wish to report a security vulnerability, please contact us via GitHub
              Issues or our community channels.
            </p>
          </section>
        </div>
      </div>
    </ContentLayout>
  );
}
