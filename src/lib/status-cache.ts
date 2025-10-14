import { redis, rkeys, type CachedSiteStatus } from "./redis";

/**
 * Cache the latest status for a site.
 * - 1 Redis command: SET key JSON EX <ttl>
 * - ttlSeconds = check interval * 3 (gives breathing room for page renders)
 */
export async function cacheSiteStatus(
  siteId: string | number,
  payload: Omit<CachedSiteStatus, "siteId">,
  ttlSeconds: number
): Promise<void> {
  const data: CachedSiteStatus = { siteId, ...payload };
  await redis.set(rkeys.siteStatus(siteId), JSON.stringify(data), {
    ex: ttlSeconds,
  });
}

/**
 * Fetch multiple site statuses in one go.
 * - 1 Redis command regardless of N sites: MGET
 * Returns an array aligned to siteIds; nulls for cache misses.
 */
export async function getStatusesForSites(
  siteIds: Array<string | number>
): Promise<(CachedSiteStatus | null)[]> {
  const keys = siteIds.map(rkeys.siteStatus);
  const results = await redis.mget<string[]>(...keys); // 1 command
  return results.map((raw) => (raw ? JSON.parse(raw) as CachedSiteStatus : null));
}

/**
 * Fallback for cache miss (optional):
 * Try DB (latest row) and rehydrate cache with a short TTL to avoid thundering herd.
 * Keep it simple; call this only if you actually want to show stale-but-available data.
 */
export async function getStatusWithFallback(
  siteId: string | number,
  pullFromDb: () => Promise<CachedSiteStatus | null>,
  ttlSeconds = 120
): Promise<CachedSiteStatus | null> {
  const cached = await redis.get<string>(rkeys.siteStatus(siteId)); // 1 GET
  if (cached) return JSON.parse(cached) as CachedSiteStatus;

  const db = await pullFromDb();
  if (db) {
    await redis.set(rkeys.siteStatus(siteId), JSON.stringify(db), { ex: ttlSeconds });
  }
  return db;
}
