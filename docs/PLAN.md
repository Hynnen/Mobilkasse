# Plan: Mobilkasse

## Mål
Selgere (på arrangementer, i resepsjonen, på forestillinger) skal kunne registrere et salg på under 10 sekunder, uten tilgang til WordPress-admin. Lageret i nettbutikken skal alltid stemme.

## Flyt
1. Selger åpner appen (lagt til på hjemskjermen), og PIN huskes i 30 dager
2. Ser produktgrid med lagerantall
3. Trykker produkter → kurv (± antall, fjern)
4. Viser totalsum til kunden → kunden Vippser til arrangement-nummeret
5. Selger trykker «Fullfør salg» → ordre opprettes i WooCommerce → lager trekkes
6. Bekreftelse → tom kurv, klar for neste kunde

## Fase 1: MVP
- [x] Prosjektoppsett: Next.js, Tailwind, zod, `.env.local`, design-skills i `.claude/skills`
- [x] `lib/config.ts`: typet og validert konfig fra env (butikk, WooCommerce, PIN)
- [x] `lib/woo.ts`: klient med `getPosProducts()` (inkl. varianter) og `createOrder()`
- [x] Test tilkobling: enkel `/api/health` som henter 1 produkt
- [x] PIN-innlogging: `/login`, `lib/auth.ts`, `proxy.ts`
- [x] `GET /api/products` → normalisert liste `{ id, variationId, name, variantLabel, priceOre, stock, inStock, image }`
- [ ] Kasse-UI: produktgrid, variantvelger, sticky kurv med total
- [x] `POST /api/sale`: zod-validering → hent ferskt lager → opprett ordre → returner ordrenr
- [ ] Bekreftelsesskjerm + feilhåndtering (for lite lager, nettverksfeil)
- [ ] PWA: dynamisk manifest fra config (navn, temafarge, ikoner), `display: standalone`
- [ ] Butikkprofil i UI: navn/logo/temafarge fra config
- [ ] Deploy til Vercel, env-variabler, test på mobil

## Fase 2: Nyttig etter første arrangement
- [ ] «Siste salg» (dagens ordre med `_mobilkasse_kanal = over-disk`) med mulighet til å angre (→ `cancelled`)
- [ ] Felt for arrangementnavn (lagres i localStorage og legges på ordren som meta + customer_note)
- [ ] Dagsoppgjør: antall salg og sum per arrangement/dag, for avstemming mot Vipps
- [ ] Søk/filter når produktlisten blir lang
- [ ] Designgjennomgang med Impeccable av kasse-skjermen

## Fase 3: Valgfritt
- [ ] Offline-kø: lagre salg i IndexedDB når nettet er dårlig, synk når det er tilbake (vis tydelig «X salg venter på synk»)
- [ ] Vipps ePayment API: appen starter betalingen (QR), og ordren opprettes først når betalingen er bekreftet

## Forberedelser i WooCommerce
1. WooCommerce → Innstillinger → Avansert → REST API → Legg til nøkkel
   - Beskrivelse: «Mobilkasse», Tillatelser: **Les/Skriv**
   - Gjerne knyttet til en egen WP-bruker med rolle Butikkansvarlig
2. Permalenker må ikke stå på «Enkel» (REST API trenger pene permalenker)
3. (Valgfritt) Lag produktkategori eller tagg «Kasse» for produktene som selges over disk, og sett `WOO_POS_CATEGORY`
4. Sjekk at «Aktiver lagerstyring» er på for produktene

## Åpne spørsmål
- Hvilke produkter selges over disk, og har de varianter?
- Ny butikk: hva må dokumenteres for å sette opp en ny deploy? (→ egen seksjon i README)
- Skal det skilles på arrangement i rapportene? (→ fase 2)
- Hvor god er mobildekningen på arrangementene? (→ offline-kø i fase 3)
