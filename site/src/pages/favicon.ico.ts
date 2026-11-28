import { brandFavicon } from '../lib/favicon.mjs';
export function GET() {
  return new Response(brandFavicon(), { headers: { 'Content-Type': 'image/x-icon' } });
}
