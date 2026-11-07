# ARBIX (ex-Arbotag) — PRD

## Original problem
"Привет мой дорогой у нас новый проект — нужно создать приложение" → approved plan: SaaS of digital tree passports for Polish gminas. Tree tag with 2 QR codes (public for residents, service for workers). Multi-tenant, subscription per gmina, PESEL registration, Polish UI, mobile-first PWA.

## Architecture
- FastAPI (core.py, routes_auth/owner/gmina/trees/billing.py, storage.py) + MongoDB + React (CRA, shadcn).
- Custom auth: PESEL or email + bcrypt password, JWT (30d), login lockout (IP+login, 5 tries / 15 min). PESEL stored only as HMAC hash.
- Invite flow: activation code (one-time, hashed) → /activate sets password (also used for password reset by admin/owner).
- Emergent Object Storage for photos (tree photos public; report/work photos ACL by gmina/author).
- Stripe claimable sandbox (Flow A, PL, tax mode "full" w/ fallback), subscriptions in PLN, lookup keys arbotag_{plan}_{month|year}; webhook /api/stripe/webhook (+ status polling fallback).
- QR pairs generated as PNG (qrcode + Pillow) and ZIP batch + CSV.

## Roles
owner, gmina_admin, worker, resident.

## Implemented (2026-10-22, MVP / Etap 1)
- Owner panel: gminas list w/ status, create gmina + admin (code), plan change, manual ON (optional until), disable, admin reset/add.
- Subscription: trial 14 days, Stripe card checkout monthly/yearly auto-renew, renewal via invoice.paid, inactive gating (402) + "Serwis tymczasowo niedostępny".
- Registration wizard (gmina → PESEL → dane → hasło + RODO), PESEL list upload CSV/XLSX with auto-activation, admin approvals.
- Parks, trees CRUD with photo, search/filters, QR pair PNG + ZIP batch.
- Public tree page; resident reports with 1–3 photos; "Moje zgłoszenia".
- Worker service card (/w/:token), work log with before/after photos, condition update, closing reports; reports queue with statuses + notes.
- PWA manifest + service worker + icons.
- Demo seed: "Gmina Zielone Pole (demo)" (see /app/memory/test_credentials.md).

## Implemented (2026-10-22, iteration 2)
- Demo quick-login buttons on /login (admin/worker/resident of demo gmina; owner excluded for security); test data cleaned.
- Demo QR sheet at /demo-qr.png.
- Public park map /mapa (Leaflet + OpenStreetMap, no login): condition-coloured markers, star markers for monuments, park filter, "only monuments" toggle, monuments list.
- Tree fields: history (story), is_monument + name/legal act/date, wiki_title. Public tree page shows monument block, history, Wikipedia species extract (pl.wikipedia REST, cached 7 days, CC BY-SA attribution) + link, link to park map.
- Admin tree form: history, monument checkbox fields, Wikipedia title, "use my location" for coordinates.

- 2026-10-22: Landing redesigned as consumer app for residents (hero, quick actions, monuments carousel, how-to steps, install section, for-gminas section, footer); removed "paszport" wording.

- 2026-10-23: Public/resident part rebuilt as mobile app: AppShell (bottom tabs Start/Mapa/Skanuj/Zgłoszenia/Profil, desktop sidebar), app home (search, tiles, monuments carousel, parks), in-app QR scanner (html5-qrcode) + tag search, Profile, My reports. Staff panels unchanged at /app.

- 2026-10-23: One QR per tree (/t/<token>): staff of the gmina auto-redirected to work card (?widok=mieszkaniec for public view), residents get report form; old /w/ links still work; QR PNG/ZIP/CSV single code; demo sheet regenerated.

- 2026-10-25: Renamed to ARBIX. Guest = tourist mode (tabs Start/Mapa/Atrakcje/Aktualności/Dołącz; no scan, no reports; tree page shows info + join banner). New: places (atrakcje, categories) & news (aktualności) — admin CRUD with photo (routes_content.py), public list/detail pages, places on map. Demo seed: 3 places, 3 news.

- 2026-10-25: Guest start screen = platform-wide discovery: global search (gminas/parks/attractions/monuments), parks near you (geolocation, distance), popular parks feed, gminas list. New /park/:id page and /gmina/:gid (gmina tourist home). API: /api/public/parks, /parks/{id}, /search.

- 2026-11-07: Map-first home (/): full-screen Leaflet map with clustering (leaflet.markercluster), search, chips (only monuments, legend, attractions), zoom/locate buttons, Zgłoś FAB, Google-Maps-like bottom sheet (registered tree / OSM tree / attraction). OpenStreetMap trees for all of Poland loaded on demand at zoom>=15 (routes_osm.py: Overpass mirrors with circuit breaker, fallback api.openstreetmap.org per 0.01 deg cell, cached 30 days in osm_trees/osm_cells; Nominatim gmina name). Reports can target registered tree, OSM tree or lat/lng (must be within 10 km of resident gmina data). /zglos page (guest gate, staff note, choose scan/map/my location). Language switch PL/EN/UK/RU (nav, map, sheet, report page). Atrakcje with gmina selector + link to /odkrywaj (discover page).

- 2026-11-07: Scanner for everyone (guest/staff center tab Skanuj, resident center Zgłoś; staff panel header button 'Skanuj arbotag'); scan -> map focused on tree (/?tree=token). AI species education (routes_species.py, gpt-5.4 via Emergent LLM key, cached per species+language, failure cooldown 30 min; only for species present in DB): summary, birds, insects, facts, season. Guests see it in map sheet and tree page; logged-in users in a collapsible. Admin tab Gatunki to edit (Polish override) / restore / regenerate. Live location tracking for logged-in users on selected tree: distance, direction arrow, dashed line, 'Jesteś przy drzewie'. Staff sheet: Karta serwisowa. Collapsible map sheet.

- 2026-11-08: Code-review hardening: httpOnly cookie sessions (arbix_session, SameSite=Lax, Secure) + X-Requested-With CSRF guard, logout endpoint, demo quick-login via POST /api/auth/demo (no passwords in frontend, demo passwords rotated to DEMO_PASSWORD env), removed ?auth= file URLs, hook deps/empty catches/index keys/nested ternaries fixed, refactors (MapSheet, create_report, species_info, park cards, Stripe webhook handlers), manual_until validated, Polish calendar picker in owner panel.

## Backlog
- P1 (Etap 2): AI photo triage of reports, park map, notifications (workers/residents), reports/export, invoices.
- P2 (Etap 3): Google Play / App Store, Profil Zaufany / mObywatel login, planned works & reminders, RU/UA/EN UI.
- Tech: aggregation instead of N+1 counts, short-lived signed file URLs, Polish date picker, footer with RODO links.
