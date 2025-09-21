// src/app/status/[slug]/page.tsx
// Status portfolio page (per-user).
// Pulls site list from DB and latest statuses from Redis in a single MGET.
// Drop this file in: src/app/status/[slug]/page.tsx

import type { Metadata } from "next";
import { notFound } from "next/navigation";

// You already have these (names based on our previous messages).
// Adjust import paths if your project structure differs.
import { getUserPublicSitesBySlug } from "@/lib/db";
import { getStatusesForSites } from "@/lib/status-cache";

export const dynamic = "force-dynamic"; // ensure fresh data on each request

export const metadata: Metadata = {
  title: "Status | PingBuoy",
  description: "Live status for public sites",
};

type PageProps = {
  params: { slug: string };
};

function StatusPill({ up }: { up: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
        up ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
      }`}
    >
      <span
        className={`mr-1 h-2 w-2 rounded-full ${
          up ? "bg-green-500" : "bg-red-500"
        }`}
      />
      {up ? "Up" : "Down"}
    </span>
  );
}

function formatWhen(iso?: string | null) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString();
  } catch {
    return "—";
  }
}

export default async function StatusPage({ params }: PageProps) {
  const slug = params?.slug?.trim();
  if (!slug) notFound();

  // 1) Pull the list of public sites for this user (from DB)
  const sites = await getUserPublicSitesBySlug(slug);
  if (!sites || sites.length === 0) {
    // If slug exists but no public sites, show a friendly message
    return (
      <main className="mx-auto max-w-4xl p-6">
        <h1 className="text-2xl font-semibold">Status</h1>
        <p className="mt-2 text-neutral-600">
          This user has no public sites on their status page.
        </p>
      </main>
    );
  }

  // 2) Fetch the latest statuses for all sites in one Redis call
  const siteIds = sites.map((s: any) => s.id);
  const statuses = await getStatusesForSites(siteIds); // MGET under the hood

  return (
    <main className="mx-auto max-w-5xl p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Status</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Public sites for this user (auto-refreshed by checks every 1–5 minutes).
        </p>
      </header>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sites.map((site: any, i: number) => {
          const st = statuses[i] as
            | {
                ok: boolean;
                statusCode?: number | null;
                responseMs?: number | null;
                lastCheckAt: string;
                error?: string | null;
              }
            | null;

          const up = st?.ok ?? false;
          const last = formatWhen(st?.lastCheckAt);

          return (
            <li
              key={site.id}
              className="rounded-2xl border border-neutral-200 p-4 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-medium">{site.name ?? site.url}</div>
                  <div className="truncate text-xs text-neutral-600">{site.url}</div>
                </div>
                <StatusPill up={up} />
              </div>

              <div className="mt-3 space-y-1 text-sm text-neutral-700">
                <div>
                  <span className="text-neutral-500">Last check:</span> {last}
                </div>
                {typeof st?.responseMs === "number" && (
                  <div>
                    <span className="text-neutral-500">Response:</span>{" "}
                    {st.responseMs} ms
                  </div>
                )}
                {st?.statusCode != null && (
                  <div>
                    <span className="text-neutral-500">HTTP:</span> {st.statusCode}
                  </div>
                )}
                {!up && st?.error && (
                  <div className="text-red-700">
                    <span className="text-neutral-500">Error:</span> {st.error}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {/*
        If/when you add per-site public pages:
        - Wrap the card in a Link to `/status/${slug}/${site.public_slug || site.slug}`
        - The per-site page can use a single GET to Redis for that site's latest,
          and pull history charts from Postgres.
      */}
    </main>
  );
}
