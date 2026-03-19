import type { VercelRequest, VercelResponse } from '@vercel/node';

const ALLOWED_ORIGINS = [
  /^https:\/\/(www\.)?humanoids\.fyi$/,
  /^https:\/\/humanoid-atlas[a-z0-9-]*\.vercel\.app$/,
  /^https?:\/\/localhost(:\d+)?$/,
];

function isAllowedOrigin(origin: string | undefined): string | null {
  if (!origin) return null;
  for (const pattern of ALLOWED_ORIGINS) {
    if (pattern.test(origin)) return origin;
  }
  return null;
}

/**
 * Applies CORS headers restricted to allowed origins and handles preflight.
 * Returns true if the request was handled (preflight or rejected), false to continue.
 */
export function applySecurity(req: VercelRequest, res: VercelResponse): boolean {
  const origin = req.headers.origin as string | undefined;
  const allowed = isAllowedOrigin(origin);

  if (allowed) {
    res.setHeader('Access-Control-Allow-Origin', allowed);
    res.setHeader('Vary', 'Origin');
  }

  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST only' });
    return true;
  }

  // Block requests with no origin (direct curl/script calls) in production
  if (process.env.VERCEL_ENV === 'production' && !allowed) {
    res.status(403).json({ error: 'Forbidden' });
    return true;
  }

  return false;
}

/** Sanitize error for client — never leak internal details */
export function safeError(res: VercelResponse, status: number, message: string, err?: unknown) {
  if (err) console.error(message, err);
  return res.status(status).json({ error: message });
}
