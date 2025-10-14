import { Redis } from "@upstash/redis";

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

/** Key helpers */
export const rkeys = {
  siteStatus: (siteId: string | number) => `site:${siteId}:status:v1`, // JSON blob of the latest check
};

export type CachedSiteStatus = {
  siteId: string | number;
  ok: boolean;                 // true = up, false = down
  statusCode?: number | null;
  responseMs?: number | null;
  lastCheckAt: string;         // ISO string
  error?: string | null;
  // Optional lightweight rollups for the status page:
  last5mUptime?: number;       // e.g., 0..1
  last1hUptime?: number;       // e.g., 0..1
};
