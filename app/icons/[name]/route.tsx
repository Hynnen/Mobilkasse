import { appIcon } from '@/lib/app-icon';

// Ikoner til manifestet: /icons/192.png, /icons/512.png, /icons/maskable-512.png
const ICONS: Record<string, { size: number; maskable?: boolean }> = {
  '192.png': { size: 192 },
  '512.png': { size: 512 },
  'maskable-512.png': { size: 512, maskable: true },
};

export async function GET(_req: Request, ctx: RouteContext<'/icons/[name]'>) {
  const icon = ICONS[(await ctx.params).name];
  if (!icon) return new Response('Ikke funnet', { status: 404 });

  const res = await appIcon(icon.size, { maskable: icon.maskable });
  res.headers.set('Cache-Control', 'public, max-age=86400');
  return res;
}
