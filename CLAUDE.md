# Mobilkasse

Enkel mobil-PWA for salg over disk: på arrangementer, i studioresepsjonen og på forestillinger. Selgeren trykker på produktene kunden kjøper, og appen oppretter en fullført ordre i WooCommerce, som trekker lageret automatisk. Selve betalingen skjer på eget Vipps-nummer, utenfor appen.

Første kunde er Huldance. Appen skal kunne brukes av flere butikker (f.eks. andre dansestudioer), med én deploy per butikk.

Se `docs/PLAN.md` for full plan og faser.

## Stack
- Next.js 16 (App Router, Cache Components) + TypeScript + Tailwind v4, hostet på Vercel. Les AGENTS.md: APIer avviker fra eldre Next-versjoner, se `node_modules/next/dist/docs/`.
- Ingen egen database. WooCommerce REST API (v3) er eneste kilde til produkter, lager og ordre.
- PWA: `app/manifest.ts` + enkel service worker (kun app-skall, ikke API-data)

## Flere butikker (white-label)
- Ingen butikkspesifikke verdier i koden. Alt styres via env (se `.env.example`):
  `STORE_NAME`, `STORE_LOGO_URL`, `STORE_THEME_COLOR`, pluss WooCommerce-nøkler og PIN.
- `lib/config.ts` leser og validerer env med zod ved oppstart, og er eneste sted env leses.
- Manifest (navn, theme_color, ikoner) genereres dynamisk fra config.
- Ny butikk = nytt Vercel-prosjekt fra samme repo med egne env-variabler.

## Arkitektur
- **All** kommunikasjon med WooCommerce skjer server-side (route handlers / server actions). Consumer key/secret skal ALDRI til klienten.
- `lib/config.ts`: typet konfig fra env
- `lib/woo.ts`: tynn, typet klient mot `/wp-json/wc/v3` (fetch + Basic auth, `cache: 'no-store'`)
- `lib/money.ts`: `toOre()` / `formatKr()` (beløp alltid i øre)
- `lib/catalog.ts`: normaliserte kassevarer (`PosItem`, nedlastbare varer skjules), lageroppslag (`resolveStock`, inkl. `manage_stock: 'parent'` og restordre) og `checkStock()` før salg
- `lib/auth.ts`: PIN-sjekk + signert httpOnly-cookie (HMAC med `SESSION_SECRET`, gyldig 30 dager)
- `proxy.ts` (Next 16 sitt navn på middleware): beskytter alt unntatt `/login`, manifest, ikoner og statiske filer
- `app/api/products` GET → produkter for kassen (inkl. varianter)
- `app/api/sale` POST → validerer kurv, oppretter ordre

## WooCommerce-detaljer
- Produkter: `GET /products?status=publish&per_page=100` (paginer via `X-WP-TotalPages`). Kun produkter i kategorien `WOO_POS_CATEGORY` vises, hvis satt.
- Varianter: `GET /products/{id}/variations?per_page=100` for `type === 'variable'`
- Lager kan styres på produkt- eller variantnivå (`manage_stock`, `stock_quantity`, `stock_status`). Håndter begge.
- Salg: `POST /orders` med
  ```json
  {
    "status": "completed",
    "set_paid": true,
    "payment_method": "vipps_over_disk",
    "payment_method_title": "Vipps over disk",
    "line_items": [{ "product_id": 1, "variation_id": 0, "quantity": 2 }],
    "meta_data": [{ "key": "_mobilkasse_kanal", "value": "over-disk" }],
    "customer_note": "<valgfri merknad, f.eks. arrangement>"
  }
  ```
  `set_paid: true` → WooCommerce reduserer lager selv. IKKE trekk lager manuelt i tillegg.
- REST API validerer ikke lager ved ordreopprettelse. Sjekk ferske lagertall server-side før ordren opprettes, og returner tydelig feil ved for lite lager.
- Ingen billing-e-post på ordren → ingen kunde-e-post sendes.
- Angre salg: sett ordren til `cancelled` (gjenoppretter lager). Brukes fra «Siste salg»-listen.
- Delt hosting kan svare 429 ved mange kall tett: `wooFetch` prøver GET på nytt med pause, og `getPosItems()` ligger i delt cache (`'use cache: remote'`, tag `pos-catalog`: fersk 30 s, så stale-while-revalidate, utløper etter 1 t). Etter salg oppdateres den i bakgrunnen og kassen trekker solgt antall lokalt; «Oppdater» bruker `getPosItemsFresh()`. `checkStock()` er alltid fersk.
- Noen hostere (f.eks. One.com) stripper Authorization-headeren. Fall da tilbake til `consumer_key`/`consumer_secret` som query-parametre (kun HTTPS).

## Design
Prosjektet har disse skillene i `.claude/skills`:
- **Impeccable**: helhetlig UI, layout, typografi, farger. Styrer hovedretningen.
- **Emil Kowalski (emil-design-eng)**: animasjoner, overganger og mikrointeraksjoner
- **Taste (design-taste-frontend)**: unngå generisk AI-preg

Ved konflikt gjelder rekkefølgen over. Mobilkasse er et arbeidsverktøy som brukes i farten: lesbarhet, hastighet og trygghet går foran pynt. Animasjoner skal være korte og aldri forsinke et salg.

## UI-prinsipper
- Designsystem: se `DESIGN.md` (tokens i `app/globals.css`) og `PRODUCT.md`. Retningen for kasse-skjermen ligger i `.impeccable/surfaces/app-page-tsx.md`.
- Mobil først, store trykkflater (min 56px), fungerer med én hånd
- Norsk tekst i hele appen
- Butikkens navn/logo/temafarge fra config øverst
- Produktkort: bilde, navn, pris, lagerantall. Variable produkter åpner en enkel velger (størrelse/farge).
- Kurv nederst (sticky) med totalsum i stort format, så selger kan vise beløpet kunden skal Vippse
- Bekreftelse etter salg (tydelig suksess-skjerm, ordrenummer), og tilbake til tom kurv
- Utsolgt = grået ut, ikke skjult

## Konvensjoner
- Ren, minimal kode med tydelig separasjon (UI / API-ruter / lib)
- Inkrementelle endringer. Lag en plan før større kodeendringer.
- Valider input med zod i API-rutene
- Beløp: WooCommerce gir priser som strenger. Konverter til øre (heltall) før summering for å unngå flyttallsfeil.

## Kommandoer
- `npm run dev`: lokal utvikling (`npm run dev -- -H 0.0.0.0` for test på mobil i samme nett)
- `npm run build`: produksjonsbygg
- Env-variabler: se `.env.example`
