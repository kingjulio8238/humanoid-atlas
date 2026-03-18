import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applySecurity, safeError } from './_middleware';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applySecurity(req, res)) return;

  const { query, nodes, edges } = req.body;

  if (!query || !nodes) {
    return res.status(400).json({ error: 'Missing query or nodes' });
  }

  const nodeList = (nodes as { id: string; name: string; country: string; type: string }[])
    .map((n) => `${n.id}: ${n.name} (${n.country}, ${n.type})`)
    .join('\n');

  const edgeList = (edges as { from: string; to: string; component: string }[])
    .map((e) => `${e.from} → ${e.to}: ${e.component}`)
    .join('\n');

  const validIds = new Set((nodes as { id: string }[]).map((n) => n.id));

  const prompt = `You analyze a supply chain network graph for the humanoid robotics industry. Given the user's query, return:
- "highlightIds": array of company IDs that should be highlighted in the graph to answer the query. Include the queried company AND all directly connected companies (suppliers, customers, upstream, downstream) as relevant.
- "answer": 1-2 sentence explanation of what the highlighted nodes show.

RULES:
- Only use IDs from the NODES list below
- For "dependency tree" or "supply chain" queries, include upstream suppliers AND downstream customers
- For "shared suppliers" queries, find OEMs with the most common supplier IDs
- For country-based queries, include all companies from that country and their connections
- Return ONLY valid JSON, no markdown

NODES:
${nodeList}

EDGES:
${edgeList}

QUERY: "${query}"

JSON:`;

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 400,
        response_format: { type: 'json_object' },
      }),
    });

    if (!groqRes.ok) {
      const err = await groqRes.text();
      return safeError(res, 502, 'Groq API error', err);
    }

    const data = await groqRes.json();
    const content = data.choices?.[0]?.message?.content?.trim();

    if (!content) {
      return res.status(502).json({ error: 'Empty response' });
    }

    const parsed = JSON.parse(content);

    return res.json({
      highlightIds: (parsed.highlightIds || []).filter((id: string) => validIds.has(id)),
      answer: parsed.answer || '',
    });
  } catch (err) {
    return safeError(res, 500, 'Failed to process query', err);
  }
}
