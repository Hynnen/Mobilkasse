import type { MetadataRoute } from 'next';
import { getPublicStoreConfig, type StoreConfig } from '@/lib/config';
import { groundHex } from '@/lib/theme';

function store(): StoreConfig {
  try {
    return getPublicStoreConfig();
  } catch {
    return { name: 'Mobilkasse', shortName: 'Kasse', themeColor: '#f07c23' };
  }
}

export default function manifest(): MetadataRoute.Manifest {
  const { name, shortName, themeColor } = store();
  const ground = groundHex(themeColor);
  return {
    name: `${name} – kasse`,
    short_name: shortName,
    description: `Kasse for salg over disk hos ${name}.`,
    lang: 'nb',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: ground,
    theme_color: ground,
    icons: [
      { src: '/icons/192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
