# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Frivillige og foreldre som står i kassen på arrangementer for en danseskole (første butikk: Huldance). De skifter fra gang til gang, og mange bruker appen for første gang samme kveld, uten opplæring. Jobben: registrere et kjøp av merch (caps, gensere, notatbøker, nøkkelringer o.l.) på sekunder, vise kunden beløpet, og gå videre til neste i køen.

Kunden er også en «bruker»: hen ser på skjermen for å lese beløpet som skal Vippses.

## Product Purpose
En enkel kasse (PWA) for salg over disk. Selgeren trykker på varene kunden kjøper, viser totalsummen, kunden betaler med Vipps til arrangementets nummer (utenfor appen), og selgeren trykker «Fullfør salg». Appen oppretter en fullført ordre i WooCommerce, som trekker lageret, så nettbutikken alltid stemmer.

Suksess: et salg registreres på under 10 sekunder, uten feil antall eller feil beløp, og uten at selgeren trenger hjelp.

## Positioning
Ingen egen database eller eget kassesystem: nettbutikkens WooCommerce er eneste sannhet for produkter, priser og lager. Ingen innlogging i WordPress-admin; én felles PIN per butikk. White-label: samme kode, nytt Vercel-prosjekt med egne env-verdier per butikk (navn, logo, temafarge).

## Operating Context
- Foajé/lobby før forestillinger: kø, tidspress, ofte dempet lys, støy. Selger holder ofte telefonen med én hånd.
- Resepsjon i danseskolen: rolig, godt lys, få kunder om gangen.
- Enheter: blandet iPhone og Android-telefoner, og også nettbrett (iPad, Samsung Tab). Installeres som PWA via «Legg til på Hjem-skjerm».
- Betaling skjer i Vipps på kundens telefon; selgeren ser bekreftelsen på kundens skjerm og trykker deretter «Fullfør salg».
- Nettdekning i foajéer kan være ustabil (offline-kø er fase 3, ikke nå).

## Capabilities and Constraints
- Produkter med og uten varianter (farge/størrelse); lager styres på produkt- eller variantnivå. Restordre kan være tillatt per vare.
- Utsolgte varer vises grået ut, ikke skjult. Nedlastbare varer vises ikke.
- Ferske lagertall sjekkes før ordren opprettes; tydelige feil ved for lite lager, endret pris eller nettverksfeil.
- Priser i NOK, regnes i øre.
- All tekst på norsk (bokmål).
- Trykkflater minst 56 px. Skal fungere med én hånd på telefon.
- Temafarge, butikknavn og logo kommer fra env per butikk; designet må tåle vilkårlig temafarge.
- Fase 2: «Siste salg» med angre, arrangementnavn, dagsoppgjør, søk.

## Brand Commitments
Butikkens identitet kommer fra env (`STORE_NAME`, `STORE_LOGO_URL`, `STORE_THEME_COLOR`). Appen selv skal være nøytral nok til å bære ulike butikkers profil.

## Evidence on Hand
Ekte produktdata fra Huldance sin WooCommerce (16 produkter, 36 salgbare varer/varianter, produktbilder). Ingen logo-fil i repoet ennå.

## Product Principles
1. Fart over alt: hvert ekstra trykk eller hver tvil koster i køen.
2. Beløpet er hovedsaken: totalsummen skal kunne leses av kunden på armlengdes avstand.
3. Umulig å gjøre feil i det stille: lager, pris og nettverksfeil sies tydelig, aldri skjult.
4. Ingen opplæring: en førstegangs frivillig skal forstå skjermen med en gang.
5. Butikken eier profilen; appen er verktøyet.

## Accessibility & Inclusion
Dempet lys og stress: høy kontrast, store tall, tydelige tilstander (utsolgt, i kurv, laster) som ikke bare bæres av farge. Skal fungere både på telefon (én hånd) og nettbrett.
