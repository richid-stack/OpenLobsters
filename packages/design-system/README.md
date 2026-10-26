# Design system

**Status:** 🚧 Partly built  ·  **Plan name:** Web Application (premium, clean interface)  ·  **Milestone:** M1 (core done)

The look and feel: tokens, icons, brand marks and the rules for how things behave and read.

## What exists today

Spread across `design/` (tokens), `apps/web/src/icons/openlobs.ts` (custom icons), `apps/web/shared/brands.ts` (provider and lab logos from Lobe Icons, MIT), `apps/web/src/assets/css/main.css`, and Nuxt UI. Rules are in `docs/DESIGN_NOTES.md`: flat, no cards or borders in the chat, show the work, ask before changing anything.

## Responsibilities

- One place for tokens, icons and brand marks
- Accessibility rules (focus, contrast, target size, reduced motion) that every screen meets
- A short catalogue of the chat patterns (step, approval, tray, file)

## Interface today

`i-openlobs-*` custom icons, `i-brand-*` logos, `i-lucide-*` standard icons.

## Depends on

- (none)

## Security notes

- Brand marks belong to their owners and are used only to identify a provider or lab.

## Done when

- [ ] Extracted so a second app (mobile) can use it
- [ ] A page that shows every pattern in both themes

## Not in scope

- A second, competing component library

---
Part of the architecture map: [`docs/architecture`](../../docs/architecture/README.md). Status legend: ✅ built and tested · 🚧 partly built · 📋 planned (design only, no code).
