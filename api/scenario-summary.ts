import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applySecurity, safeError } from './_middleware';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applySecurity(req, res)) return;

  const { scenarios, componentImpacts, oemImpacts, cascadeChains } = req.body;

  if (!componentImpacts && !oemImpacts) {
    return res.status(400).json({ error: 'Missing impact data' });
  }

  // Build a concise prompt from the structured impact data
  const scenarioNames = (scenarios || []).join(' + ');

  const compSummary = (componentImpacts || [])
    .map((c: { name: string; remainingSuppliers: number; totalSuppliers: number; bottleneck: boolean }) =>
      `${c.name}: ${c.remainingSuppliers}/${c.totalSuppliers} suppliers remain${c.bottleneck ? ' [BOTTLENECK]' : ''}`)
    .join('; ');

  const oemSummary = (oemImpacts || [])
    .slice(0, 8)
    .map((o: { name: string; country: string; pctLost: number; lostSuppliers: number }) =>
      `${o.name} (${o.country}): -${o.lostSuppliers} suppliers (${o.pctLost}% lost)`)
    .join('; ');

  const cascadeSummary = (cascadeChains || [])
    .map((c: { sourceName: string; affected: { name: string }[] }) =>
      `${c.sourceName} → ${c.affected.map((a: { name: string }) => a.name).join(', ')}`)
    .join('; ');

  const prompt = `You are a supply chain analyst for the humanoid robotics industry. Given this scenario simulation result, write a 2-3 sentence analyst summary. Be specific with numbers and company names. Be direct and insightful — focus on who is most affected and why.

Scenario: ${scenarioNames || 'Custom simulation'}
${cascadeSummary ? `Cascade: ${cascadeSummary}` : ''}
Component impact: ${compSummary || 'None'}
OEM impact: ${oemSummary || 'None'}

Write the summary now (2-3 sentences, no bullet points):`;

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
        max_tokens: 200,
      }),
    });

    if (!groqRes.ok) {
      const err = await groqRes.text();
      return safeError(res, 502, 'Groq API error', err);
    }

    const data = await groqRes.json();
    const summary = data.choices?.[0]?.message?.content?.trim() || 'Unable to generate summary.';

    return res.json({ summary });
  } catch (err) {
    return safeError(res, 500, 'Failed to generate summary', err);
  }
}
