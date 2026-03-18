import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applySecurity, safeError } from './_middleware';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applySecurity(req, res)) return;

  const { query, company, supplierRels, customerRels, allCompanies } = req.body;

  if (!query || !company) {
    return res.status(400).json({ error: 'Missing query or company' });
  }

  const suppliersText = (supplierRels || [])
    .map((r: { fromName: string; fromCountry: string; component: string }) =>
      `${r.fromName} (${r.fromCountry}) supplies ${r.component}`)
    .join('\n');

  const customersText = (customerRels || [])
    .map((r: { toName: string; toCountry: string; component: string }) =>
      `${r.toName} (${r.toCountry}) buys ${r.component}`)
    .join('\n');

  const companyList = (allCompanies || [])
    .map((c: { id: string; name: string; country: string; type: string }) =>
      `${c.name} (${c.country}, ${c.type})`)
    .join(', ');

  const prompt = `You are a supply chain analyst for the humanoid robotics industry. Answer the user's question about the company below. Be concise (1-3 sentences). Use ONLY the data provided — do not invent facts.

COMPANY:
- Name: ${company.name}
- Country: ${company.country}
- Type: ${company.type}
- Description: ${company.description || 'N/A'}
- Market share: ${company.marketShare || 'N/A'}
- Ticker: ${company.ticker || 'Private'}
${company.robotSpecs ? `- Status: ${company.robotSpecs.status}
- Launch: ${company.robotSpecs.launchDate}
- Price: ${company.robotSpecs.price || 'N/A'}
- BOM: ${company.robotSpecs.bom || 'N/A'}` : ''}

SUPPLIERS TO THIS COMPANY:
${suppliersText || 'None'}

CUSTOMERS OF THIS COMPANY:
${customersText || 'None'}

OTHER COMPANIES IN THE DATASET:
${companyList}

QUESTION: "${query}"

Answer (1-3 sentences):`;

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
        max_tokens: 200,
      }),
    });

    if (!groqRes.ok) {
      const err = await groqRes.text();
      return safeError(res, 502, 'Groq API error', err);
    }

    const data = await groqRes.json();
    const answer = data.choices?.[0]?.message?.content?.trim() || 'Unable to answer.';

    return res.json({ answer });
  } catch (err) {
    return safeError(res, 500, 'Failed to process query', err);
  }
}
