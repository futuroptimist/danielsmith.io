# Localization architecture

User-visible HUD, Settings, POI chrome, scene overlay, and future panel copy must
flow through `src/assets/i18n/types.ts` and every supported locale catalog in
`src/assets/i18n/locales/`.

Runtime modules may keep stable ids, CSS classes, storage keys, debug ids, and
brand or project names as literals. Display labels, descriptions, aria labels,
titles, live-region announcements, and panel chrome belong in locale data.

Future HUD panels must add typed locale keys before rendering text, include
pseudo-locale coverage, and add zh-Hans regression assertions for newly exposed
settings or panel copy. The localization guard test scans selected HUD,
Settings, accessibility, and POI modules for accidental hardcoded English UI
strings.
