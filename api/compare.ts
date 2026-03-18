import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applySecurity, safeError } from './_middleware';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applySecurity(req, res)) return;

  const { companyA, companyB, shared, exclusiveA, exclusiveB, geoA, geoB } = req.body;

  if (!companyA || !companyB) {
    return res.status(400).json({ error: 'Missing company data' });
  }

  const prompt = `You are a supply chain analyst. Write a 2-3 paragraph competitive comparison (200 words max) of these two humanoid robot companies. Be specific with numbers. Cover: cost structure differences, supply chain resilience, geopolitical exposure, and strategic positioning.

COMPANY A: ${companyA.name} (${companyA.country})
- BOM: ${companyA.bom || 'N/A'}, Price: ${companyA.price || 'N/A'}
- Status: ${companyA.status}, Shipments: ${companyA.shipments || 'N/A'}
- Suppliers: ${companyA.supplierCount} total
- Geo exposure: US ${geoA.us}%, CN ${geoA.cn}%, Other ${geoA.other}%

COMPANY B: ${companyB.name} (${companyB.country})
- BOM: ${companyB.bom || 'N/A'}, Price: ${companyB.price || 'N/A'}
- Status: ${companyB.status}, Shipments: ${companyB.shipments || 'N/A'}
- Suppliers: ${companyB.supplierCount} total
- Geo exposure: US ${geoB.us}%, CN ${geoB.cn}%, Other ${geoB.other}%

Shared suppliers (${shared.length}): ${shared.join(', ') || 'None'}
${companyA.name}-only suppliers (${exclusiveA.length}): ${exclusiveA.join(', ') || 'None'}
${companyB.name}-only suppliers (${exclusiveB.length}): ${exclusiveB.join(', ') || 'None'}

Write comparison now (200 words max, no headers, no bullets):`;

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
        temperature: 0.3,
        max_tokens: 300,
      }),
    });

    if (!groqRes.ok) {
      const err = await groqRes.text();
      return safeError(res, 502, 'Groq API error', err);
    }

    const data = await groqRes.json();
    const analysis = data.choices?.[0]?.message?.content?.trim() || 'Unable to generate analysis.';

    return res.json({ analysis });
  } catch (err) {
    return safeError(res, 500, 'Failed to generate comparison', err);
  }
}
