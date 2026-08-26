# Digital Family Tapestry

A collaborative, graph-based web application that visualizes a family's entire ancestry as an interactive, living "tapestry" — inspired by the Black family tapestry from Harry Potter.

![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8)
![Supabase](https://img.shields.io/badge/Supabase-Backend-3ecf8e)
![License](https://img.shields.io/badge/License-MIT-green)

## Features

- **Interactive Family Tree** — Drag, zoom, and explore your ancestry on a dark parchment-themed canvas with animated node scatter
- **Automatic Layout** — ELK.js engine positions generations vertically with proper spacing
- **Person Profiles** — Full profiles with bio, birth/death years, profession, location, contact info, and photo avatars
- **Timeline View** — Chronological list of 55+ life events across all family members
- **Map View** — Leaflet-powered map showing birthplaces, residences, and migration arcs
- **Multi-Tree Support** — Create and switch between multiple family trees
- **GEDCOM Import/Export** — Standard genealogy format for sharing data with other tools
- **Source Citations** — Attach historical documents, photos, and references to people
- **Dark/Light Theme** — Toggle between dark parchment and light parchment themes
- **Search** — Fuzzy name search with keyboard shortcuts (`/` to search, `?` for help)
- **Photo Upload** — Client-side image cropping and compression
- **Authentication** — Supabase Auth with role-based access control (viewer/editor/admin)
- **Responsive Design** — Works on desktop and mobile with adaptive layouts

## Architecture

```
src/
  app/                    # Next.js App Router pages
    page.tsx              # Home — interactive tree canvas
    timeline/             # Chronological event view
    map/                  # Geographic map view
    person/[id]/          # Individual person profiles
    auth/login/           # Authentication page
    api/                  # API routes (upload, GEDCOM, audit)
  components/             # React components
    TapestryCanvas.tsx    # Main tree canvas (React Flow + ELK)
    InfoPanel.tsx         # Right-side person detail panel
    PersonNode.tsx        # Custom graph node for people
    UnionNode.tsx         # Custom graph node for unions
    SearchBar.tsx         # Floating search interface
    TapestryBanner.tsx    # Ornamental title banner
    TreeToolbar.tsx       # Stats panel + GEDCOM export
    ThemeProvider.tsx     # Dark/light theme context
    AuthProvider.tsx      # Authentication context
  lib/                    # Utilities
    validation.ts         # Input sanitization & validation
    rate-limit.ts         # In-memory API rate limiting
    supabase/             # Supabase client helpers
    r2/                   # Cloudflare R2 storage client
  data/                   # Static data models & types
    family.ts             # Person, Union, Edge, Source types
supabase/
  schema.sql              # Database schema (run in SQL Editor)
```

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Framework** | Next.js 14 (App Router) | React SSR/SSG, API routes, file routing |
| **Language** | TypeScript (strict) | Type safety, better DX |
| **Styling** | Tailwind CSS + CSS Custom Properties | Utility-first styling with design tokens |
| **Graph** | React Flow (`@xyflow/react` v12) | Interactive node-based UI |
| **Layout** | ELK.js | Automatic hierarchical graph layout |
| **Database** | Supabase (PostgreSQL) | Auth, data storage, row-level security |
| **Maps** | Leaflet + react-leaflet | Interactive geographic visualization |
| **Media** | Cloudflare R2 + sharp | Image storage and processing |
| **Testing** | Vitest | Unit tests for validation and rate limiting |
| **Deployment** | Vercel | Frontend hosting with edge functions |

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- A [Supabase](https://supabase.com) project (free tier works)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy the example environment file and fill in your Supabase credentials:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your values:

```env
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Cloudflare R2 (optional — for photo uploads)
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_ACCESS_KEY_ID=your-r2-access-key
R2_SECRET_ACCESS_KEY=your-r2-secret-key
R2_BUCKET_NAME=your-bucket-name
R2_PUBLIC_URL=https://your-bucket.your-r2.dev
```

### 3. Set up the database

1. Open your Supabase dashboard
2. Go to **SQL Editor**
3. Paste the contents of `supabase/schema.sql`
4. Click **Run**

This creates all required tables (`persons`, `unions`, `parent_edges`, `edit_log`, `family_roles`) with row-level security policies.

### 4. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm test` | Run unit tests (Vitest) |

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

## Data Storage

The app supports three data backends with automatic fallback:

1. **Supabase** (when configured) — persistent cloud storage with auth
2. **localStorage** — per-browser persistence without a server
3. **Static data** — built-in sample family tree for demo/offline use

Tree data is stored as JSON in `localStorage` under the key `family-tapestry-trees`.

## API Routes

| Route | Method | Auth Required | Description |
|-------|--------|---------------|-------------|
| `/api/upload` | POST | Yes | Upload and compress portrait photos |
| `/api/gedcom` | GET | Yes | Export family tree as GEDCOM file |
| `/api/audit` | GET | Yes (admin) | View edit history log |

All API routes are rate-limited (10-20 requests/minute per key).

## Security

- **Row-Level Security** enabled on all database tables
- **Input sanitization** strips HTML tags and enforces field length limits
- **Rate limiting** on all API routes with `Retry-After` headers
- **Security headers** via `vercel.json` (X-Content-Type-Options, X-Frame-Options, Referrer-Policy)
- **Auth checks** on all write operations and API routes

## Testing

```bash
npm test
```

Tests cover input validation, sanitization, email/URL/year validators, and rate limiting.

## Deployment

### Vercel (recommended)

```bash
npx vercel login
npx vercel --yes
```

Vercel auto-detects Next.js and configures everything. Add your environment variables in the Vercel dashboard under **Settings > Environment Variables**.

### Manual

```bash
npm run build
npm start
```

## License

MIT
