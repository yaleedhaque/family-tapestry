# Digital Family Tapestry

A collaborative, graph-based web application that visualizes a family's entire ancestry as an interactive, living "tapestry" — inspired by the Black family tapestry from Harry Potter.

**Live:** [family-tapestry-nine.vercel.app](https://family-tapestry-nine.vercel.app)

![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8)
![Supabase](https://img.shields.io/badge/Supabase-Backend-3ecf8e)
![License](https://img.shields.io/badge/License-MIT-green)

## Features

### Core
- **Interactive Family Tree** — Drag, zoom, and explore ancestry on a dark parchment-themed canvas with animated node scatter
- **Automatic Layout** — ELK.js engine positions generations vertically with proper spacing
- **Person Profiles** — Full profiles with bio, life events timeline, relationships, photo gallery, and contact info
- **Timeline View** — Chronological view of 69+ life events with filtering by type, person, year range, and search
- **Map View** — Leaflet/OpenStreetMap showing birthplaces, residences, and migration arcs with OSRM routing
- **Multi-Tree Support** — Create and switch between multiple family trees
- **Search** — Fuzzy name search with keyboard shortcuts (`/` to search, `?` for help)

### Collaboration & Real-time
- **Real-time Presence** — See who's currently viewing the tree via Supabase Realtime
- **Real-time Tree Sync** — Tree changes broadcast to all connected viewers instantly
- **Role-Based Access** — Viewer/editor/admin roles with Supabase Row-Level Security
- **Admin Panel** — User management, approval workflow, audit log viewer

### Import & Export
- **Multi-format Export** — PNG, PDF, JSON, CSV (persons + relationships), and GEDCOM from a single export menu
- **GEDCOM Import** — Import standard genealogy files from Ancestry, MyHeritage, etc.
- **Source Citations** — Attach historical documents, photos, and references to people
- **Photo Upload** — Client-side image compression with Supabase Storage

### Authentication
- **Google OAuth** — Sign in with any Google account (production-ready, no verification needed)
- **Email/Password** — Traditional signup with email verification and password reset
- **Auto-approve** — New signups are automatically approved as editors

### Design & Mobile
- **Dark/Light Theme** — Toggle between dark parchment and light parchment themes with CSS custom properties
- **Mobile-Optimized** — Bottom navigation bar, safe-area insets, touch-friendly 44px tap targets, fluid typography
- **PWA-Ready** — Viewport meta with `viewportFit: cover`, theme-color, standalone capable
- **Harry Potter Aesthetic** — Dark parchment backgrounds, gold thread accents, ember red alerts, living glow/deceased frame indicators

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Framework** | Next.js 14 (App Router) | React SSR/SSG, API routes, file routing |
| **Language** | TypeScript (strict) | Type safety, better DX |
| **Styling** | Tailwind CSS + CSS Custom Properties | Utility-first styling with design tokens |
| **Graph** | React Flow (`@xyflow/react` v12) | Interactive node-based UI |
| **Layout** | ELK.js | Automatic hierarchical graph layout |
| **Database** | Supabase (PostgreSQL) | Auth, data storage, row-level security, realtime |
| **Maps** | Leaflet + react-leaflet | OpenStreetMap (free, no API key needed) |
| **Export** | html-to-image + jsPDF | PNG and PDF client-side generation |
| **Testing** | Vitest | 25 unit tests (validation, sanitization, rate limiting) |
| **Deployment** | Vercel | Frontend hosting with edge functions |
| **Analytics** | Vercel Analytics | Privacy-first usage analytics |

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- A [Supabase](https://supabase.com) project (free tier works)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 3. Set up the database

Run these SQL files in your Supabase SQL Editor, **in order**:

1. `supabase/schema.sql` — Core tables (persons, unions, parent_edges, edit_log, family_roles)
2. `supabase/migration-v2.sql` — Sources, profiles, auth trigger, storage bucket, RLS
3. `supabase/migration-v3.sql` — Life events table, version column, realtime publication

### 4. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
src/
  app/                         # Next.js App Router pages
    page.tsx                   # Home — interactive tree canvas
    timeline/                  # Chronological event view
    map/                       # Geographic map view (Leaflet)
    person/[id]/               # Individual person profiles
    admin/                     # Admin dashboard
    auth/login/                # Authentication page
    auth/callback/             # OAuth + email verification handler
    auth/reset/                # Password reset request
    auth/update-password/      # Password update form
    privacy/                   # Privacy policy
    api/                       # API routes
      tree/                    # GET/PUT tree data
      tree/persons/            # POST/PATCH/DELETE persons
      upload/                  # Photo upload to Supabase Storage
      gedcom/                  # GEDCOM export
      sources/                 # Source citations
      audit/                   # Edit history
      admin/users/             # User management
  components/                  # React components
    TapestryCanvas.tsx         # Main tree canvas (React Flow + ELK + Realtime)
    PersonNode.tsx             # Custom graph node for people
    UnionNode.tsx              # Custom graph node for unions
    InfoPanel.tsx              # Right-side person detail panel
    TreeToolbar.tsx            # Stats panel + tree management
    SearchBar.tsx              # Floating search interface
    ExportMenu.tsx             # Multi-format export dropdown
    MobileNav.tsx              # Bottom navigation bar for mobile
    HelpModal.tsx              # Keyboard shortcuts + about
    Toast.tsx                  # Toast notification system
    AddPersonModal.tsx         # Add new person form
    GedcomImport.tsx           # GEDCOM file import
    AuthProvider.tsx           # Authentication context + RBAC
    Providers.tsx              # Combined providers wrapper
  lib/                         # Utilities
    supabase/                  # Supabase client helpers
      client.ts                # Browser client
      server.ts                # Server client
      service.ts               # Service-role client
      middleware.ts            # Auth middleware
      realtime.ts              # Realtime hooks (tree sync, presence, locks)
    types.ts                   # TypeScript types (DB + app)
    export.ts                  # JSON/CSV/PNG/PDF export utilities
    mobile.ts                  # Mobile detection + long press hooks
    validation.ts              # Input sanitization & validation
    rate-limit.ts              # In-memory API rate limiting
    data.ts                    # Data fetching with fallback
    r2/client.ts               # Cloudflare R2 storage (optional)
  data/
    family.ts                  # Static demo data (12 people, 69 events)
supabase/
  schema.sql                   # Core DB schema
  migration-v2.sql             # Sources, profiles, storage
  migration-v3.sql             # Life events, versioning, realtime
```

## Design System

The app uses a custom "tapestry" design system with CSS custom properties:

| Token | Dark Mode | Light Mode | Usage |
|-------|-----------|------------|-------|
| `--tapestry-bg` | `#0E0B0A` | `#F5F0E8` | Page background |
| `--thread-gold` | `#C9A24B` | `#A67C1A` | Primary accent, headings |
| `--ember-red` | `#8B2E2E` | `#9B3333` | Alerts, divorced unions |
| `--parchment` | `#EFE6D8` | `#2C2520` | Body text |
| `--living-glow` | `#D98B3E` | `#C07830` | Living person indicators |
| `--deceased-frame` | `#5C564C` | `#8A8078` | Deceased person indicators |

Fonts: **Cormorant Garamond** (display headings) + **Inter** (body text).

## API Routes

| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `/api/tree` | GET/PUT | Yes | Full tree data (persons, unions, edges) |
| `/api/tree/persons` | POST/PATCH/DELETE | Yes | Individual person CRUD |
| `/api/upload` | POST | Yes | Photo upload to Supabase Storage |
| `/api/gedcom` | GET | Yes | GEDCOM file export |
| `/api/sources` | POST/PATCH/DELETE | Yes | Source citations |
| `/api/audit` | GET | Admin | Edit history log |
| `/api/admin/users` | GET/PATCH | Admin | User management |

All API routes are rate-limited with `Retry-After` headers.

## Security

- **Row-Level Security** on all database tables
- **Input sanitization** strips HTML tags and enforces field length limits
- **Rate limiting** on all API routes
- **Security headers** (X-Content-Type-Options, X-Frame-Options, Referrer-Policy)
- **Auth checks** on all write operations
- **RBAC** — viewer/editor/admin roles with Supabase RLS
- **Auto-approve** — new signups get editor role automatically

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm test` | Run unit tests (Vitest) |

## Deployment

### Vercel (recommended)

```bash
npx vercel login
npx vercel --yes
```

Add environment variables in the Vercel dashboard under **Settings > Environment Variables**.

### Manual

```bash
npm run build
npm start
```

## License

MIT

---

**Md. Yaleed Haque** — [GitHub](https://github.com/yaleedhaque) · [Portfolio](https://yaleedhaque.github.io) · [Live App](https://family-tapestry-nine.vercel.app)
