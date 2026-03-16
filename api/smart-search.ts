import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { query, companies, relationships } = req.body;

  if (!query || !companies) {
    return res.status(400).json({ error: 'Missing query or companies' });
  }

  // Build compact data context for Groq
  const companyLines = (companies as { id: string; name: string; country: string; type: string; marketShare?: string }[])
    .map((c) => `${c.id}: ${c.name} (${c.country}, ${c.type}${c.marketShare ? ', share: ' + c.marketShare : ''})`)
    .join('\n');

  const relLines = (relationships as { from: string; to: string; component: string }[])
    .map((r) => `${r.from} → ${r.to}: ${r.component}`)
    .join('\n');

  const prompt = `You are a supply chain analyst for the humanoid robotics industry. Answer the user's question using ONLY the data provided below. Be concise (1-3 sentences). Also return the IDs of the most relevant companies to the answer.

COMPANIES:
${companyLines}

RELATIONSHIPS:
${relLines}

QUESTION: "${query}"

Return ONLY valid JSON with:
- "answer": your concise answer string (1-3 sentences)
- "companyIds": array of relevant company IDs from the data above (max 8)

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
        temperature: 0.2,
        max_tokens: 300,
        response_format: { type: 'json_object' },
      }),
    });

    if (!groqRes.ok) {
      const err = await groqRes.text();
      return res.status(502).json({ error: 'Groq API error', details: err });
    }

    const data = await groqRes.json();
    const content = data.choices?.[0]?.message?.content?.trim();

    if (!content) {
      return res.status(502).json({ error: 'Empty response' });
    }

    const parsed = JSON.parse(content);
    const validIds = new Set((companies as { id: string }[]).map((c) => c.id));

    return res.json({
      answer: parsed.answer || 'No answer generated.',
      companyIds: (parsed.companyIds || []).filter((id: string) => validIds.has(id)),
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to process query', details: String(err) });
  }
}
