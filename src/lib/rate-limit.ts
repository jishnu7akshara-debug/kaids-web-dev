import { hashIp } from './auth.js';

// Rate limit store (In-memory cache for fast lookup with DB fallback)
interface RateLimitEntry {
  count10m: number;
  reset10m: number;
  count24h: number;
  reset24h: number;
}

const memoryStore = new Map<string, RateLimitEntry>();

export function checkEnquiryRateLimit(clientIp: string): { allowed: boolean; retryAfter?: number; error?: string } {
  const ipHash = hashIp(clientIp);
  const now = Date.now();
  const entry = memoryStore.get(ipHash) || {
    count10m: 0,
    reset10m: now + 10 * 60 * 1000,
    count24h: 0,
    reset24h: now + 24 * 60 * 60 * 1000
  };

  // Reset expired windows
  if (now > entry.reset10m) {
    entry.count10m = 0;
    entry.reset10m = now + 10 * 60 * 1000;
  }
  if (now > entry.reset24h) {
    entry.count24h = 0;
    entry.reset24h = now + 24 * 60 * 60 * 1000;
  }

  // Thresholds: max 5 per 10m, max 20 per 24h
  if (entry.count10m >= 5) {
    const retryAfter = Math.ceil((entry.reset10m - now) / 1000);
    return {
      allowed: false,
      retryAfter,
      error: 'Too many enquiries from this connection. Please call 99163 10226.'
    };
  }

  if (entry.count24h >= 20) {
    const retryAfter = Math.ceil((entry.reset24h - now) / 1000);
    return {
      allowed: false,
      retryAfter,
      error: 'Too many enquiries from this connection. Please call 99163 10226.'
    };
  }

  entry.count10m += 1;
  entry.count24h += 1;
  memoryStore.set(ipHash, entry);

  return { allowed: true };
}
