import 'server-only';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { getPublicStoreConfig, type StoreConfig } from './config';
import { actionInk } from './theme';

function store(): StoreConfig {
  try {
    return getPublicStoreConfig();
  } catch {
    return { name: 'Mobilkasse', shortName: 'Kasse', themeColor: '#f07c23' };
  }
}

/**
 * App-ikon per butikk: logo hvis STORE_LOGO_URL er satt, ellers forbokstaven
 * i butikknavnet på temafargen. `maskable` holder innholdet innenfor sikker sone (80 %).
 */
// Nunito Sans ExtraBold (OFL), samme skrift som appen. Lastes én gang per instans.
let fontPromise: Promise<Buffer> | undefined;
const loadFont = () => (fontPromise ??= readFile(join(process.cwd(), 'assets/fonts/nunito-sans-latin-800-normal.woff')));

export async function appIcon(size: number, { maskable = false, rounded = false } = {}): Promise<ImageResponse> {
  const { name, themeColor, logoUrl } = store();
  const font = await loadFont();
  const inner = Math.round(size * (maskable ? 0.56 : 0.7));

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: logoUrl ? '#ffffff' : themeColor,
          borderRadius: rounded ? size * 0.22 : 0,
        }}
      >
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- ImageResponse tegner rå <img>
          <img src={logoUrl} width={inner} height={inner} style={{ objectFit: 'contain' }} alt="" />
        ) : (
          <div style={{ display: 'flex', fontFamily: 'Nunito Sans', fontSize: inner, fontWeight: 800, color: actionInk(themeColor), lineHeight: 1 }}>
            {name.trim().charAt(0).toUpperCase() || 'K'}
          </div>
        )}
      </div>
    ),
    { width: size, height: size, fonts: [{ name: 'Nunito Sans', data: font, weight: 800, style: 'normal' }] },
  );
}
