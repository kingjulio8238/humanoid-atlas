// Basic JSON export for AGI pipelines
import { supplyChainGraph } from '../../src/data/relationships';

export default async function handler(req: Request) {
  return new Response(JSON.stringify(supplyChainGraph), {
    headers: { 'Content-Type': 'application/json' }
  });
}
