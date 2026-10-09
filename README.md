# Mobilkasse

Enkel mobilkasse (PWA) for salg over disk. Registrerer salg som ordre i WooCommerce og holder lageret i nettbutikken oppdatert.

## Oppstart

### 1. Opprett prosjektet
```bash
npx create-next-app@latest mobilkasse --ts --tailwind --eslint --app --src-dir=false --import-alias "@/*"
cd mobilkasse
npm i zod
```

### 2. Legg inn startfilene
Kopier inn i prosjektroten: `CLAUDE.md`, `docs/PLAN.md`, `.env.example`, `README.md`.
Kopier `.env.example` til `.env.local` og fyll inn verdier. `.env.local` er ignorert av git som standard.

### 3. Installer design-skills
```bash
npx -y skills add pbakaus/impeccable --skill impeccable --agent claude-code
npx -y skills add emilkowalski/skill --skill emil-design-eng --agent claude-code
npx skills add https://github.com/Leonxlnx/taste-skill --skill "design-taste-frontend" --agent claude-code
```
Skillene havner i `.claude/skills`. Commit den mappen.

### 4. Lag API-nøkkel i WooCommerce
WooCommerce → Innstillinger → Avansert → REST API → Legg til nøkkel (Les/Skriv).
Se «Forberedelser i WooCommerce» i `docs/PLAN.md`.

### 5. Start Claude Code
```bash
code .
claude
```
Trykk Shift+Tab to ganger (plan-modus) og bruk denne prompten:

> Les CLAUDE.md, docs/PLAN.md og .env.example, og se hvilke skills som ligger i .claude/skills.
> Lag en detaljert plan for fase 1: filer, hovedfunksjoner og typer, og rekkefølge.
> Ikke skriv kode før jeg har godkjent planen.
> Første steg etter godkjenning: lib/config.ts, lib/woo.ts og /api/health, så vi kan verifisere tilkoblingen mot WooCommerce før vi bygger UI.

### 6. Deploy
Koble repoet til Vercel, legg inn env-variablene og åpne URL-en på mobilen → «Legg til på Hjem-skjerm».
Ny butikk: nytt Vercel-prosjekt fra samme repo, med egne env-variabler.
