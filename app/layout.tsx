import type { Metadata, Viewport } from 'next';
import { Nunito_Sans } from 'next/font/google';
import type { CSSProperties } from 'react';
import { getPublicStoreConfig, type StoreConfig } from '@/lib/config';
import { groundHex, themeVars } from '@/lib/theme';
import { ServiceWorker } from '@/components/ServiceWorker';
import './globals.css';

const nunito = Nunito_Sans({
  variable: '--font-nunito',
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
});

function store(): StoreConfig {
  try {
    return getPublicStoreConfig();
  } catch {
    return { name: 'Mobilkasse', shortName: 'Kasse', themeColor: '#f07c23' };
  }
}

export function generateMetadata(): Metadata {
  const { name } = store();
  return {
    title: { default: name, template: `%s · ${name}` },
    robots: { index: false, follow: false },
    appleWebApp: { capable: true, title: store().shortName, statusBarStyle: 'default' },
  };
}

export function generateViewport(): Viewport {
  return {
    width: 'device-width',
    initialScale: 1,
    viewportFit: 'cover',
    themeColor: groundHex(store().themeColor),
  };
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="nb" className={`${nunito.variable} h-full antialiased`} style={themeVars(store().themeColor) as CSSProperties}>
      <body className="min-h-full">
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
