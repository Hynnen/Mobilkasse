---
name: Mobilkasse
description: Varm forbruker-kasse for salg over disk – myke kort på varm grunn, én handlingsfarge per butikk.
colors:
  action: "#f07c23"
  action-ink: "#24170e"
  ground: "#fdf2e8"
  surface: "#f7e5d6"
  card: "#ffffff"
  ink: "#2a211b"
  ink-2: "#6f6259"
  line: "#eadfd3"
  success: "#1f7a4d"
  success-ground: "#e5f4ea"
  danger: "#b4321f"
  danger-ground: "#fbe9e5"
  warn-ink: "#7a4b00"
  warn-ground: "#fdf1d8"
typography:
  display-sale:
    fontFamily: "Nunito Sans, system-ui, sans-serif"
    fontSize: "60px"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.02em"
    fontFeature: "tnum"
  display:
    fontFamily: "Nunito Sans, system-ui, sans-serif"
    fontSize: "44px"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.02em"
    fontFeature: "tnum"
  headline:
    fontFamily: "Nunito Sans, system-ui, sans-serif"
    fontSize: "28px"
    fontWeight: 800
    lineHeight: 1.25
  title:
    fontFamily: "Nunito Sans, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 800
    lineHeight: 1.25
  button:
    fontFamily: "Nunito Sans, system-ui, sans-serif"
    fontSize: "19px"
    fontWeight: 800
    lineHeight: 1
  body-strong:
    fontFamily: "Nunito Sans, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 800
    lineHeight: 1.375
  body:
    fontFamily: "Nunito Sans, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 700
    lineHeight: 1.375
  label:
    fontFamily: "Nunito Sans, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.4
rounded:
  row: "12px"
  notice: "16px"
  inset: "15px"
  tile: "18px"
  card: "20px"
  float: "26px"
  sheet: "28px"
  pill: "9999px"
spacing:
  card-inset: "6px"
  grid-gap: "12px"
  grid-gap-md: "16px"
  gutter: "12px"
  gutter-md: "24px"
  panel: "20px"
  tap-min: "48px"
  tap-primary: "64px"
components:
  button-primary:
    backgroundColor: "{colors.action}"
    textColor: "{colors.action-ink}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    height: "64px"
  button-primary-disabled:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.pill}"
    height: "64px"
  button-text-danger:
    textColor: "{colors.danger}"
    typography: "{typography.body}"
    rounded: "{rounded.pill}"
    height: "56px"
  button-icon:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    size: "48px"
  product-card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "6px"
  product-card-image:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.inset}"
  count-chip:
    backgroundColor: "{colors.action}"
    textColor: "{colors.action-ink}"
    rounded: "{rounded.pill}"
    height: "36px"
  stepper:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    height: "48px"
  cart-float:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.float}"
    padding: "12px 16px 16px"
  sheet:
    backgroundColor: "{colors.ground}"
    rounded: "{rounded.sheet}"
    padding: "24px 20px 20px"
  variant-row:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.tile}"
    padding: "12px 16px"
    height: "64px"
  notice-danger:
    backgroundColor: "{colors.danger-ground}"
    textColor: "{colors.danger}"
    rounded: "{rounded.notice}"
    padding: "12px 16px"
  notice-warn:
    backgroundColor: "{colors.warn-ground}"
    textColor: "{colors.warn-ink}"
    rounded: "{rounded.notice}"
    padding: "12px 16px"
  input-pin:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    height: "64px"
  success-screen:
    backgroundColor: "{colors.success}"
    textColor: "{colors.card}"
    typography: "{typography.display-sale}"
---

# Design System: Mobilkasse

## Overview

**Creative North Star: "Varm disk, én farge å trykke på"**

Mobilkasse er en varm forbruker-app, ikke et kasseapparat. Skjermen er en lys, kremtonet grunn med hvite, myke kort som hviler på den med en varm, diffus skygge. Det finnes bare én sterk farge, butikkens egen temafarge, og den betyr alltid «dette kan du trykke på» eller «dette er valgt». Alt annet er varm brun tekst på krem og hvitt.

Temafargen er per butikk (white-label, `STORE_THEME_COLOR`), ikke en fast merkevarefarge. Huldance bruker oransje (#f07c23), og alle verdier i frontmatter er løst mot den. Grunnen og flatene blandes mot temafargen med `color-mix(in oklab, …)`, slik at hele appen tones lett mot butikken uten at noe annet enn handlinger får full farge. Teksten på temafargen (`--action-ink`) velges automatisk i `lib/theme.ts`: mørk brun (#24170e) eller hvit, etter hva som gir best kontrast.

Tettheten er lav og trykkflatene store: dette skal brukes med én hånd i en mørk foajé, av en frivillig som aldri har sett appen før. Bevegelser er myke fjærer: kort som gir etter når du trykker, en antall-chip som spretter inn, en totalsum som ruller opp til nytt beløp.

**Key Characteristics:**
- Varm krem-grunn tonet mot butikkens temafarge, hvite kort oppå
- Én handlingsfarge, kun på handlinger og aktivt valgt
- Ett avrundet humanistisk skriftsnitt (Nunito Sans) i tunge vekter
- Store, myke former: 20 px kort, pilleknapper, ark med 28 px hjørner
- Myk fjær-trykk på alt som kan trykkes
- Totalsummen er det største på skjermen, i tabelltall

## Colors

En varm, nesten monokrom krem-og-brun palett der butikkens temafarge er den eneste mettede fargen, pluss tre statusfarger.

### Primary
- **Butikkens handlingsfarge** (`action`, Huldance: #f07c23): «Fullfør salg», «Logg inn», «Prøv igjen», antall-chipen på kortene og ringen rundt kort/varianter som ligger i kurven. Settes fra `STORE_THEME_COLOR` via `themeVars()` i `lib/theme.ts`; verdien i frontmatter er bare Huldance-standarden.
- **Tekst på handlingsfarge** (`action-ink`, #24170e eller #ffffff): velges automatisk etter kontrast mot temafargen. Skriv aldri hardkodet hvitt eller svart på `action`.

### Neutral
- **Varm krem-grunn** (`ground`): sidebakgrunn og bakgrunn i bunnark. Kilde: `color-mix(in oklab, var(--action) 6%, #fdf9f3)`.
- **Tonet flate** (`surface`): innfelt bakgrunn bak produktbilder, antallsvelgeren i kurven, skjelett-plassholdere og deaktivert hovedknapp. Kilde: `color-mix(in oklab, var(--action) 9%, #f6efe6)`.
- **Hvitt kort** (`card`): produktkort, kurvkapsel/-panel, ikonknapper, PIN-felt.
- **Varm mørkebrun** (`ink`): all primær tekst, priser og totalsum.
- **Dempet brun** (`ink-2`): sekundær tekst som lagerantall, «2 varianter», «Å betale», tomtilstander.
- **Varm skillelinje** (`line`): skiller mellom kurvlinjer og over betalingsdelen i sidepanelet, håndtak på bunnark.

### Status
- **Bekreftelsesgrønn** (`success`): fullskjerm etter fullført salg, med hvit tekst. `success-ground` er reservert lys variant.
- **Varselrød** (`danger` på `danger-ground`): lagerfeil, nettverksfeil, «Tøm kurv», «Logg ut», og lavt lager («3 igjen») på kort.
- **Advarselsgul** (`warn-ink` på `warn-ground`): «Prisen er endret».

### Named Rules
**The One Voice Rule.** Handlingsfargen brukes bare på det som kan trykkes eller er valgt. Aldri på overskrifter, ikoner i ro, bakgrunner eller dekor.

**The Store Owns the Hue Rule.** Ingen komponent kan anta at handlingsfargen er oransje. Alt må fungere med en vilkårlig temafarge; tekst på den hentes alltid fra `action-ink`, og grunn/flate avledes med `color-mix` i stedet for faste krem-verdier.

**The Sold-Out Loses Color Rule.** Utsolgte varer vises, men mister fargen: bildet blir gråtonet og nedtonet (45 %), teksten nedtonet (55 %), og merkelappen «Utsolgt» står i full `ink` så tilstanden ikke bæres av farge alene.

## Typography

**Display Font:** Nunito Sans (med system-ui, sans-serif)
**Body Font:** Nunito Sans (samme familie)

**Character:** Ett avrundet, humanistisk sansserif i tunge vekter (600–800) gir en vennlig, leken forbruker-tone uten å bli barnslig. Alle tall som er beløp eller antall bruker tabelltall (`tabular`) så de ikke hopper når de endres.

### Hierarchy
- **Display-sale** (800, 60 px, lh 1, -0.02em): beløpet på grønn bekreftelsesskjerm.
- **Display** (800, 44 px, lh 1, -0.02em): totalsummen i kurven. Skal kunne leses av kunden på armlengdes avstand.
- **Headline** (800, 28–30 px): sideoverskrift på innlogging, «Salg registrert», feilside (24 px).
- **Title** (800, 19–20 px): butikknavn i toppfeltet, «Kurv», overskrift i bunnark.
- **Button** (800, 19 px): hovedknapper; 17 px i bunnark.
- **Body-strong** (800, 17 px): priser på kort og varianter, antall i velgeren.
- **Body** (700, 15 px): produktnavn, kurvlinjer, «N varer», varsler. Vanlig vekt (400) for løpende hjelpetekst.
- **Label** (400, 13 px): lagerantall, variantantall, enhetspris i kurvlinje. Fet og `danger` når lageret er lavt.

### Named Rules
**The Amount Is the Headline Rule.** Totalsummen er alltid det største elementet i kurven (minst 44 px, 800, tabelltall), og den ruller inn på nytt hver gang beløpet endres.

**The One Family Rule.** Hele appen bruker Nunito Sans. Hierarki lages med størrelse og vekt (400/700/800), ikke med en ekstra font.

## Layout

Mobil først, med én hånd. Telefon: toppfelt 64 px høyt (sticky, `ground` med 90 % dekning og blur), 2-kolonners kortgrid med 12 px avstand og 12 px sidemarg, og en flytende hvit kurvkapsel festet nederst (10 px fra kantene, over safe-area). Gridet får ekstra bunnpolstring (safe-area + 232 px) så siste rad ikke skjules bak kapselen.

Stående nettbrett (768–1023 px): 3 kolonner, 16 px avstand, 24 px sidemarg; kurvkapselen beholdes, sentrert med maks 576 px bredde og kan utvides til linjene. Liggende nettbrett og større (≥1024 px): kurven blir et fast kort til høyre (396 px kolonne, 12 px luft rundt), forankret nederst og voksende oppover med linjene. Gridet går til 4 kolonner fra 1280 px og 5 fra 1536 px.

Alle trykkflater er minst 48 px; primærhandlinger er 64 px høye og fullbredde. Innlogging og feilside er en smal sentrert kolonne (maks 384 px).

**The Thumb Zone Rule.** Totalsum og «Fullfør salg» står alltid nederst, nær tommelen, på alle skjermstørrelser.

## Elevation & Depth

Dybde kommer fra hvite kort på en tonet grunn pluss to varme, diffuse skygger (brunlig `rgb(80 50 20)`, aldri grå eller svart). Det finnes ingen kantlinjer rundt kort; skyggen og fargeforskjellen gjør jobben.

### Shadow Vocabulary
- **Kortskygge** (`box-shadow: 0 1px 2px rgb(80 50 20 / 0.05), 0 6px 18px rgb(80 50 20 / 0.06)`): produktkort, ikonknapper, hovedknapper, PIN-felt, antall-chip.
- **Flytende skygge** (`box-shadow: 0 -2px 6px rgb(80 50 20 / 0.04), 0 -12px 32px rgb(80 50 20 / 0.10)`): kurvkapsel/-panel og bunnark. Kastes oppover fordi elementet ligger over innholdet nedenfra.

Overlegg bak ark er `ink` med 25–35 % dekning.

### Named Rules
**The Warm Shadow Rule.** Skygger er alltid varmtonet og myke. Ingen harde forskjøvne skygger, ingen nøytralgrå.

## Shapes

Store, myke former gjennom hele appen, med nestet radius: kortet har 20 px, og bildet inni (innfelt 6 px) har 15 px, så kurvene løper parallelt. Variantrader har 18 px, kurvkapselen 26 px og bunnarkene 28 px (kun øverste hjørner på telefon, alle hjørner på nettbrett). Alle knapper, chips, antallsvelgere og ikonknapper er fulle piller eller sirkler. Varsler har 16 px.

**The Nested Radius Rule.** Et element som ligger innfelt i et avrundet kort har radius lik kortets radius minus innfellingen (20 − 6 ≈ 15 px).

## Components

### Buttons
Taktile og selvsikre; alle gir etter med en myk fjær ved trykk (skala 0.965, 90 ms inn, 220 ms fjær tilbake via `cubic-bezier(0.34, 1.56, 0.64, 1)`).
- **Shape:** full pille (9999px)
- **Primary:** `action` med `action-ink`, 64 px høy, fullbredde, 19 px/800, kortskygge. Viser roterende spinner og presens-tekst under arbeid («Registrerer salget …»).
- **Disabled primary:** `surface` med `ink-2`, uten skygge. Kurven er tom, så knappen synes, men lokker ikke.
- **Danger text:** ingen bakgrunn, `danger`-tekst, 15–17 px/700 («Tøm kurv», «Logg ut»).
- **Icon:** 48 px hvit sirkel med kortskygge og 20 px strektegnet ikon (Lucide, strek 2.25).
- **Focus:** 3 px kontur i `action` blandet 70 % mot `ink`, 2 px avstand.

### Product Card (signatur)
- **Corner Style:** 20 px, hvitt, kortskygge, ingen kant.
- **Bilde:** innfelt 6 px, 16:11, 15 px radius på `surface`; manglende bilde viser et dempet ikon.
- **Innhold:** navn (15 px/700, maks 2 linjer), variantantall (13 px `ink-2`), pris (17 px/800) nederst til venstre og lager nederst til høyre.
- **I kurven:** 2 px ring i `action` og en 36 px antall-chip i `action` øverst til høyre som spretter inn (`pop-in`, 320 ms) hver gang tallet endres.
- **Utsolgt:** se The Sold-Out Loses Color Rule; kortet er deaktivert, sorteres sist.

### Cart (signatur)
- **Telefon / stående nettbrett:** hvit kapsel, 26 px radius, flytende skygge. Øverst «N varer» med chevron, til høyre totalsummen (display), under hovedknappen. Trykk utvider linjene inne i kapselen med dempet bakteppe.
- **Liggende nettbrett+:** samme kort som sidepanel med «Kurv»-overskrift, linjer, skillelinje og «Å betale» + total.
- **Kurvlinje:** navn og enhetspris til venstre, antallsvelger (pille i `surface` med 48 px −/+), søppelbøtte-knapp. Linje med lagerproblem får `danger-ground` og «For lite på lager».

### Sheets
- Bunnark (variantvelger, utloggingsbekreftelse) glir opp nedenfra (`sheet-up`, 340 ms), har `ground` som bakgrunn, 28 px øvre radius, håndtak på telefon og blir sentrert dialog på nettbrett. Fokus settes på første trygge valg.
- **Variantrad:** hvit, 18 px radius, min 64 px, navn (17 px/700) med lagerlinje under, pris til høyre; i kurven får den ring og antall-chip i `action`. Ikke-tilgjengelig variant er overstreket og nedtonet.

### Inputs / Fields
- **PIN-felt:** hvitt, 20 px radius, 64 px høyt, kortskygge, ingen kant; sentrerte tabelltall (30 px, sperret 0.5em). Fokus: 2 px ring i `action`. Feil: 2 px ring i `danger` og feilmelding i `danger` under.

### Notices
- Avrundet boks (16 px) i `danger-ground`/`danger` eller `warn-ground`/`warn-ink`, tittel 15 px/700 og valgfri brødtekst 14 px. Står over totalsummen i kurven, aldri som toast.

### Sale Success
- Fullskjerm i `success`, hvit tekst. Hvit 112 px sirkel med grønt hake-ikon som spretter inn, «Salg registrert», beløpet i display-sale, ordrenummer, og en hvit pilleknapp «Neste kunde» med grønn tekst. Lukkes automatisk etter 6 s.

## Do's and Don'ts

### Do:
- **Do** hent all handlingsfarge fra `--action` / `--action-ink`, og test nye flater med minst én lys og én mørk temafarge.
- **Do** avled nye tonede flater med `color-mix(in oklab, var(--action) N%, <krem>)` i stedet for faste krem-hex.
- **Do** gi alt som kan trykkes `press`-fjæren og minst 48 px trykkflate (64 px for primærhandlinger).
- **Do** bruk tabelltall på alle beløp og antall.
- **Do** bær tilstander med mer enn farge: tekst («Utsolgt», «Alle i kurven»), ring, overstreking eller nedtoning.
- **Do** respekter `prefers-reduced-motion`: alle animasjoner kollapser til 1 ms.

### Don't:
- **Don't** bruk handlingsfargen på overskrifter, dekor, bakgrunner eller ikoner som ikke kan trykkes.
- **Don't** hardkod oransje (#f07c23) eller hvit/svart tekst på handlingsfargen i komponenter.
- **Don't** skjul utsolgte varer; grå dem ut og sorter dem sist.
- **Don't** legg kantlinjer rundt kort eller bruk grå/svarte skygger; dybde er varm skygge på tonet grunn.
- **Don't** bruk toasts for feil i salgsflyten; varsler står i kurven, ved siden av beløpet de gjelder.
- **Don't** innfør en ny font eller en ny mettet farge ved siden av handlingsfargen og statusfargene.
