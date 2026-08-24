# Velakron Client

The public Velakron frontend is a Next.js Pages Router application organized around the same broad conventions as the Miami Sound Rental reference client:

- Route entrypoints live in `pages/`.
- Reusable view code lives in `components/`.
- Global application chrome lives in `components/layouts/`.
- Page content and repeated data live in `content/`.
- Redux Toolkit and `next-redux-wrapper` provide the state-management foundation.
- Network calls should go through the `apiCallBegan` middleware contract in `store/`.
- Global Sass is assembled through `scss/styles.scss` from token, layout, and component partials.
- Public images and fonts live under `public/`.

Public routes use `MainLayout`; protected `/app/*` and `/admin` routes opt into
`AppLayout` through the Pages Router `getLayout` convention. The portal shell
hydrates the server-validated active organization, supports legitimate
multi-organization switching, builds navigation from effective permissions,
and clears tenant-owned state before switching contexts.

The authenticated portal now includes organization/team administration,
invitation and account lifecycle, supplier onboarding and capability profiles,
facilities, certifications, machines, OEM–supplier relationships, and the
production workflow. OEMs can create and assign awarded commitments;
suppliers receive an action queue, accept with a forecast and machine, and post
controlled production-stage changes. Production data remains tenant-scoped and
is cleared from Redux when the active organization changes. Phase 6 adds
role-specific dashboards, URL-preserved production filters, desktop tables and
mobile cards, breadcrumbs, audited Velakron directories, company support
detail, audit/security activity, and privacy-safe product instrumentation.

The founder workspace also includes **Sales Demo** at `/app/sales-demo`: live prospect monitoring, controlled synthetic interactions, no-logout OEM/Supplier previews, a visual versioned baseline editor, campaign links, and downloadable QR codes. `/sales-demo/:campaign` is the generalized guest entry while `/imts-demo` remains compatible.

## Local development

```bash
npm install
npm run dev
```

The development server runs at [http://localhost:5000](http://localhost:5000).

## Commands

- `npm run dev` — start the development server on port 5000
- `npm run build` — create a production build
- `npm run start` — run the production build on port 5000
- `npm test` — run client state and permission-navigation tests

`npm test` and `npm run build` are the client quality gates.
All new API traffic continues through `apiCallBegan`; organization-scoped calls
should include a stable `requestKey` and `organizationScoped: true` so older
requests are cancelled or ignored after an organization switch.

The production worklist refreshes every 45 seconds while open and when the
browser regains focus. Mutations are saved and confirmed immediately; the MVP
does not require WebSockets.

## Environment

Copy `.env.example` to a local ignored environment file and set the Velakron API
address. Never commit real credentials.
