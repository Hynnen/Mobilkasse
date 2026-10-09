import 'server-only';
import { z } from 'zod';

export type AuthMode = 'auto' | 'header' | 'query';

export type StoreConfig = {
  name: string;
  shortName: string;
  themeColor: string;
  logoUrl?: string;
};

export type AppConfig = {
  store: StoreConfig;
  woo: {
    url: string;
    consumerKey: string;
    consumerSecret: string;
    posCategory?: string;
    authMode: AuthMode;
  };
  auth: { pin: string; sessionSecret: string };
};

export class ConfigError extends Error {
  constructor(public readonly issues: string[]) {
    super(`Ugyldig konfigurasjon: ${issues.join('; ')}`);
    this.name = 'ConfigError';
  }
}

// Tomme strenger i .env behandles som «ikke satt».
const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? undefined : v), schema.optional());

// https er påkrevd, unntatt mot lokal utvikling.
const secureUrl = z
  .url({ error: 'må være en gyldig URL' })
  .refine((u) => u.startsWith('https://') || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?/.test(u), {
    error: 'må bruke https',
  })
  .transform((u) => u.replace(/\/+$/, ''));

const envSchema = z.object({
  STORE_NAME: z.string().trim().min(1, { error: 'mangler' }),
  STORE_SHORT_NAME: optional(z.string().trim().max(12, { error: 'maks 12 tegn' })),
  STORE_THEME_COLOR: optional(
    z.string().regex(/^#[0-9a-fA-F]{6}$/, { error: 'må være hex, f.eks. #111111' }),
  ),
  STORE_LOGO_URL: optional(secureUrl),

  WOO_URL: secureUrl.refine((u) => !u.includes('/wp-json'), { error: 'skal ikke inneholde /wp-json' }),
  WOO_CONSUMER_KEY: z.string().startsWith('ck_', { error: 'må starte med ck_' }),
  WOO_CONSUMER_SECRET: z.string().startsWith('cs_', { error: 'må starte med cs_' }),
  WOO_POS_CATEGORY: optional(z.string().trim()),
  WOO_AUTH_MODE: optional(z.enum(['auto', 'header', 'query'])),

  POS_PIN: z.string().regex(/^\d{4,8}$/, { error: 'må være 4–8 sifre' }),
  SESSION_SECRET: z.string().min(32, { error: 'må være minst 32 tegn' }),
});

let cached: AppConfig | undefined;

/**
 * Leser og validerer env ved første kall (ikke ved import), så `next build`
 * ikke feiler uten env. Feilmeldinger navngir variablene, aldri verdiene.
 */
export function getConfig(): AppConfig {
  if (cached) return cached;

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new ConfigError(
      parsed.error.issues.map((i) => {
        const key = String(i.path[0]);
        const value = process.env[key];
        return `${key} ${value === undefined || value.trim() === '' ? 'mangler' : i.message}`;
      }),
    );
  }

  const env = parsed.data;
  cached = {
    store: {
      name: env.STORE_NAME,
      shortName: env.STORE_SHORT_NAME ?? env.STORE_NAME.slice(0, 12),
      themeColor: env.STORE_THEME_COLOR ?? '#111111',
      logoUrl: env.STORE_LOGO_URL,
    },
    woo: {
      url: env.WOO_URL,
      consumerKey: env.WOO_CONSUMER_KEY,
      consumerSecret: env.WOO_CONSUMER_SECRET,
      posCategory: env.WOO_POS_CATEGORY,
      authMode: env.WOO_AUTH_MODE ?? 'auto',
    },
    auth: { pin: env.POS_PIN, sessionSecret: env.SESSION_SECRET },
  };
  return cached;
}

/** Trygt å sende til klienten (manifest, UI). */
export function getPublicStoreConfig(): StoreConfig {
  return getConfig().store;
}
