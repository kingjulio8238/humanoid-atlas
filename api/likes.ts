import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Redis } from '@upstash/redis';

const ALLOWED_ORIGINS = [
  /^https:\/\/(www\.)?humanoids\.fyi$/,
  /^https:\/\/humanoid-atlas[a-z0-9-]*\.vercel\.app$/,
  /^https?:\/\/localhost(:\d+)?$/,
];

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const REDIS_KEY = 'oem_likes';
const REDIS_VOTED_PREFIX = 'oem_voted:'; // Set of IPs that liked a given OEM

const VALID_OEM_IDS = new Set([
  'apptronik', 'tesla', 'figure', 'agility', '1x', 'boston_dynamics', 'sunday', 'vibe',
  'unitree', 'booster', 'booster_k1', 'agibot', 'xpeng', 'engineai', 'ubtech', 'dexmate',
  'fourier', 'kepler', 'sanctuary_ai', 'noetix', 'dobot', 'limx', 'pudu',
  'astribot', 'magiclab', 'xiaomi', 'foundation_robotics', 'neura_4ne1', 'robotera',
  'fauna', 'vanar_robots', 'mentee_robotics', 'pal_robotics', 'engineered_arts',
  'pollen_robotics', 'clone_robotics', 'qinglong', 'unitree_h2', 'ultra',
]);

function getClientIP(req: VercelRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  if (Array.isArray(forwarded)) return forwarded[0].split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const origin = req.headers.origin as string | undefined;
  const allowed = origin && ALLOWED_ORIGINS.some((p) => p.test(origin));
  if (allowed) {
    res.setHeader('Access-Control-Allow-Origin', origin!);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE');

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }

  try {
    if (req.method === 'POST' || req.method === 'DELETE') {
      const { oemId } = req.body || {};
      if (!oemId || typeof oemId !== 'string' || !VALID_OEM_IDS.has(oemId)) {
        return res.status(400).json({ error: 'Invalid oemId' });
      }

      const ip = getClientIP(req);
      const votedKey = `${REDIS_VOTED_PREFIX}${oemId}`;

      if (req.method === 'POST') {
        // Check if this IP already liked this OEM
        const alreadyVoted = await redis.sismember(votedKey, ip);
        if (alreadyVoted) {
          const current = (await redis.hget<number>(REDIS_KEY, oemId)) || 0;
          return res.json({ oemId, likes: current, alreadyVoted: true });
        }
        // Record the vote and increment
        await redis.sadd(votedKey, ip);
        const count = await redis.hincrby(REDIS_KEY, oemId, 1);
        return res.json({ oemId, likes: count });
      } else {
        // DELETE: unlike - remove IP from voted set and decrement
        const wasVoted = await redis.srem(votedKey, ip);
        if (!wasVoted) {
          const current = (await redis.hget<number>(REDIS_KEY, oemId)) || 0;
          return res.json({ oemId, likes: current });
        }
        const count = await redis.hincrby(REDIS_KEY, oemId, -1);
        const safeCount = Math.max(0, count);
        if (count < 0) await redis.hset(REDIS_KEY, { [oemId]: 0 });
        return res.json({ oemId, likes: safeCount });
      }
    }

    const all = (await redis.hgetall<Record<string, number>>(REDIS_KEY)) || {};
    return res.json({ likes: all });
  } catch {
    return res.status(503).json({ error: 'Service temporarily unavailable' });
  }
}
