import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applySecurity, safeError } from './_middleware';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applySecurity(req, res)) return;

  const { query, companies } = req.body;

  if (!query || !companies) {
    return res.status(400).json({ error: 'Missing query or companies' });
  }

  // Build a compact company list for the prompt
  const companyList = (companies as { id: string; name: string; country: string; type: string }[])
    .map((c) => `${c.id} (${c.name}, ${c.country}, ${c.type})`)
    .join('\n');

  const validIds = new Set((companies as { id: string }[]).map((c) => c.id));

  const prompt = `You translate natural language supply chain scenarios into structured data.

Given the user's query, return a JSON object with:
- "cutCompanies": array of company IDs to remove from the supply chain
- "cutCountries": array of country group codes to remove. Valid values: "US", "CN", "OTHER"

RULES:
- Only use company IDs from the list below
- "OTHER" means all countries except US and CN (includes JP, DE, KR, TW, CH, NO, AU, CA, etc.)
- If the query mentions a country, use cutCountries. If it mentions specific companies, use cutCompanies. You can use both.
- If a query says "Japan" or "Japanese suppliers", find all Japanese (JP) companies in the list and put their IDs in cutCompanies (since JP falls under OTHER and cutting OTHER would cut too broadly)
- Return ONLY valid JSON, no explanation, no markdown

COMPANIES:
${companyList}

USER QUERY: "${query}"

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
        max_tokens: 300,
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
      return res.status(502).json({ error: 'Empty response from Groq' });
    }

    const parsed = JSON.parse(content);

    // Validate: only allow known IDs and country codes
    const cutCompanies = (parsed.cutCompanies || []).filter((id: string) => validIds.has(id));
    const cutCountries = (parsed.cutCountries || []).filter((c: string) => ['US', 'CN', 'OTHER'].includes(c));

    return res.json({ cutCompanies, cutCountries });
  } catch (err) {
    return safeError(res, 500, 'Failed to parse scenario', err);
  }
}
