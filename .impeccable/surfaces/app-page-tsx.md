---
version: 1
slug: "app-page-tsx"
primary_target: "app/page.tsx"
related_targets: ["components"]
---

# Kasse-skjermen (/)

Scope: kasse-skjermen med produktgrid, variantvelger, kurv, salgsbekreftelse og feiltilstander. Mode: Operate.
Audience/job: frivillige foreldre registrerer et salg på under 10 s i foajé (dempet lys) eller resepsjon; kunden leser totalsummen.
Constraints: temafarge fra STORE_THEME_COLOR (vilkårlig), norsk, trykkflater ≥56 px, telefon (én hånd) og nettbrett (iPad/Samsung Tab).

## Direction contract

THESIS: En varm forbruker-app, ikke et kasseapparat: myke kort på varm grunn, der den ene sterke fargen (butikkens temafarge) alltid er noe du kan trykke på. Nekter den grå/hvite POS-standarden med tette lister og små knapper.

OWN-WORLD: Varm tonet grunn (lys krem avledet mot temafargen), hvite kort med 20 px radius og myk varm skygge, humanistisk avrundet sans (Nunito Sans), mørk varm brun tekst. Temafarge kun på handlinger og aktivt valgt (antall-chip, «Fullfør salg»); utsolgt mister fargen helt og dempes.

STORY: Selgeren ser alle varer som store kort, trykker for å legge i kurven (variant-ark for størrelse/farge), ser totalen vokse i den flytende kurven, viser beløpet til kunden, trykker «Fullfør salg», får grønn bekreftelse med ordrenummer og er klar for neste.

FIRST VIEWPORT: Telefon: butikknavn øverst til venstre (meny til høyre), 2-kolonners kortgrid (bilde i innfelt avrundet ramme, navn, pris, lager), flytende hvit kurvkapsel nederst med «N varer», totalsum 44 px+ og full-bredde avrundet knapp i temafarge. Liggende nettbrett og større (≥1024 px): 3–4 kolonner til venstre, kurvpanel som flytende kort med linjer til høyre. Stående nettbrett (<1024 px) beholder den flytende kapselen, fordi et sidepanel ville presset rutenettet ned til 2 smale kolonner; kapselen kan utvides til linjene. Utlogging ligger bak en bekreftelse, aldri ett trykk.

FORM: digital-design-canon-warm-consumer-app-surface (dealt challenger, bolder-register re-roll 1, valgt av bruker); seed key a3e27091. Signatur: myk fjær-trykk på kortene og en antall-chip som spretter inn; totalsummen ruller til nytt beløp.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
