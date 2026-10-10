import { buildLlmsTxt } from '@/lib/llms';

/** /llms-full.txt — see src/lib/llms.ts. Rebuilt at most hourly from the live data. */
export const revalidate = 3600;

export async function GET() {
  return new Response(await buildLlmsTxt({ full: true }), {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
}
