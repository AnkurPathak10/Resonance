# Resonance — Progress Tracker & Technical Documentation

> Living documentation for what has been built, how it works, and which tools/packages power each part of the app.
>
> Last updated: August 26, 2026

---

## Table of Contents

1. [App Overview](#1-app-overview)
2. [Tech Stack Map](#2-tech-stack-map)
3. [Project Architecture](#3-project-architecture)
4. [Database Schema](#4-database-schema)
5. [Authentication & Organizations](#5-authentication--organizations)
6. [Features](#6-features)
7. [tRPC API Reference](#7-trpc-api-reference)
8. [External Services & Integrations](#8-external-services--integrations)
9. [Scripts & Tooling](#9-scripts--tooling)
10. [Environment Variables](#10-environment-variables)
11. [What's Done vs. Pending](#11-whats-done-vs-pending)

---

## 1. App Overview

**Resonance** is an AI-powered **text-to-speech and voice cloning platform** for teams/organizations.

**Intended user flow:**
1. Sign in with Clerk → select an organization
2. Pick a voice (20 built-in system voices + org-specific custom voices)
3. Enter text and tune generation parameters (temperature, top-p, etc.)
4. Backend calls the **Chatterbox TTS API** (GPU service on Modal) using reference audio stored in **Cloudflare R2**
5. Generated WAV is saved to R2 and tracked in **PostgreSQL** as a `Generation`
6. User plays back audio from generation history

**Current state:** The UI shell, auth, database layer, voice listing, and backend generation logic are largely built. The full generate → store → playback loop is **not wired end-to-end yet** (see [§11](#11-whats-done-vs-pending)).

---

## 2. Tech Stack Map

### Core Framework

| Package | Version | Purpose in Resonance |
|---------|---------|----------------------|
| `next` | 16.1.6 | App framework — App Router, RSC, API routes |
| `react` / `react-dom` | 19.2.3 | UI rendering |
| `typescript` | ^5 | Type safety across the codebase |

### API & Data Layer

| Package | Purpose |
|---------|---------|
| `@trpc/server`, `@trpc/client`, `@trpc/tanstack-react-query` | Type-safe API layer between frontend and backend |
| `@tanstack/react-query` | Server/client data fetching, caching, suspense |
| `@tanstack/react-form` | TTS form state, validation, field binding |
| `@prisma/client`, `@prisma/adapter-pg`, `pg` | ORM + PostgreSQL (Prisma 7 with driver adapter) |
| `prisma` (dev) | Schema management, client generation, seeding |
| `superjson` | tRPC serializer (handles Dates, etc.) |
| `zod` | Input validation (tRPC inputs, form schemas, env vars) |

### Auth & Multi-tenancy

| Package | Purpose |
|---------|---------|
| `@clerk/nextjs` | Authentication, user sessions, organization management |
| `@clerk/themes` | Custom styling for Clerk sign-in/up components |

### Storage & External APIs

| Package | Purpose |
|---------|---------|
| `@aws-sdk/client-s3` | Cloudflare R2 uploads, deletes (S3-compatible API) |
| `@aws-sdk/s3-request-presigner` | Presigned URLs for private audio playback |
| `openapi-fetch` | Typed HTTP client for the Chatterbox TTS API |
| `openapi-typescript` (dev) | Generates TypeScript types from Chatterbox OpenAPI spec |

### UI & Styling

| Package | Purpose |
|---------|---------|
| `tailwindcss`, `@tailwindcss/postcss`, `tw-animate-css` | Utility-first CSS |
| `shadcn`, `radix-ui`, `@base-ui/react` | Component library (shadcn/ui on Radix primitives) |
| `class-variance-authority`, `clsx`, `tailwind-merge` | Conditional/merged Tailwind classes |
| `lucide-react` | Icons throughout the app |
| `@dicebear/core`, `@dicebear/collection` | Deterministic voice avatars (`glass` style, seeded by voice ID) |
| `next-themes` | Dark/light theme support |
| `sonner` | Toast notifications |
| `simplex-noise` | Animated wavy background on dashboard hero |
| `recharts`, `embla-carousel-react`, `react-day-picker`, `cmdk`, `vaul`, `react-resizable-panels`, `input-otp`, `react-error-boundary` | Additional UI utilities (available in component library) |

### Config & Dev Tools

| Package | Purpose |
|---------|---------|
| `@t3-oss/env-nextjs` | Validated, type-safe environment variables (`src/lib/env.ts`) |
| `client-only` / `server-only` | Enforce client/server module boundaries |
| `dotenv` (dev) | Load `.env` in scripts |
| `tsx` (dev) | Run TypeScript scripts (`sync-api`, seed) |
| `eslint`, `eslint-config-next` | Linting |

### Python TTS Service (separate from Node)

| Package | Purpose |
|---------|---------|
| `modal` | Serverless GPU deployment |
| `chatterbox-tts` | ChatterboxTurboTTS voice cloning model |
| `fastapi` | HTTP API (`POST /generate`) |
| `peft`, `torchaudio` | Model inference dependencies |

---

## 3. Project Architecture

### Folder Structure

```
resonance/
├── prisma/
│   └── schema.prisma              # PostgreSQL schema (Voice, Generation)
├── prisma.config.ts               # Prisma 7 config + seed command
├── scripts/
│   ├── seed-system-voices.ts      # Seed 20 system voices → DB + R2
│   ├── sync-api.ts                # OpenAPI → TypeScript types
│   └── system-voices/             # .wav reference files (gitignored)
├── chatterbox_tts.py              # Modal GPU TTS service
├── src/
│   ├── app/                       # Next.js App Router (pages + API)
│   │   ├── (dashboard)/           # Authenticated dashboard routes
│   │   ├── sign-in/, sign-up/     # Clerk auth pages
│   │   ├── org-selection/         # Clerk org picker
│   │   └── api/trpc/              # tRPC HTTP handler
│   ├── features/                  # Feature-based modules
│   │   ├── dashboard/             # Home page components & views
│   │   ├── text-to-speech/        # TTS editor UI
│   │   └── voices/                # Voice data/constants (no page yet)
│   ├── components/                # Shared UI (shadcn) + voice-avatar
│   ├── hooks/                     # useAppForm, useMobile
│   ├── lib/                       # db, env, r2, chatterbox-client, utils
│   ├── trpc/                      # init, routers, client, server
│   ├── types/                     # Generated Chatterbox OpenAPI types
│   ├── generated/prisma/          # Prisma client output (gitignored)
│   └── proxy.ts                   # Clerk middleware logic (see §5 — not active yet)
└── public/                        # Static assets (logo.svg, etc.)
```

### Patterns Used

- **Feature-based organization** — Each domain (`dashboard`, `text-to-speech`, `voices`) has its own `components/`, `views/`, `data/`, and optionally `contexts/`
- **tRPC + TanStack Query** — Single API endpoint at `/api/trpc`; type-safe calls from client and server
- **Org-scoped multi-tenancy** — All business data filtered by Clerk `orgId` via `orgProcedure`
- **shadcn/ui** — Radix-based components in `src/components/ui/`
- **Prisma 7 driver adapter** — Client generated to `src/generated/prisma`, connects via `@prisma/adapter-pg`
- **OpenAPI-typed external API** — `openapi-fetch` client + auto-generated `chatterbox-api.d.ts`

### App Routes

| Route | File | Status |
|-------|------|--------|
| `/` | `src/app/(dashboard)/page.tsx` | ✅ Built |
| `/text-to-speech` | `src/app/(dashboard)/text-to-speech/page.tsx` | ✅ Built (UI only) |
| `/sign-in/*` | `src/app/sign-in/[[...sign-up]]/page.tsx` | ✅ Built |
| `/sign-up/*` | `src/app/sign-up/[[...sign-up]]/page.tsx` | ✅ Built |
| `/org-selection` | `src/app/org-selection/page.tsx` | ✅ Built |
| `/api/trpc/*` | `src/app/api/trpc/[trpc]/route.ts` | ✅ Built |
| `/voices` | — | ❌ Not built (sidebar link exists) |
| `/api/audio/[id]` | — | ❌ Not built (referenced in generations router) |

---

## 4. Database Schema

**File:** `prisma/schema.prisma`  
**Database:** PostgreSQL via Prisma 7 + `@prisma/adapter-pg`

### Enums

**`VoiceVariant`**
- `SYSTEM` — Global built-in voices (`orgId` is null)
- `CUSTOM` — Organization-owned cloned voices

**`VoiceCategory`**
- `AUDIOBOOK`, `CONVERSATIONAL`, `CUSTOMER_SERVICE`, `GENERAL`, `NARRATIVE`, `CHARACTERS`, `MEDITATION`, `MOTIVATIONAL`, `PODCAST`, `ADVERTISING`, `VOICEOVER`, `CORPORATE`

### Models

#### `Voice`

| Field | Type | Notes |
|-------|------|-------|
| `id` | String (cuid) | Primary key |
| `orgId` | String? | Null for SYSTEM voices |
| `name` | String? | Display name |
| `description` | String? | Voice description |
| `variant` | VoiceVariant | SYSTEM or CUSTOM |
| `category` | VoiceCategory | Default: GENERAL |
| `language` | String? | Default: `"en-US"` |
| `r2ObjectKey` | String? | Reference audio path in R2 |
| `generations` | Generation[] | One-to-many relation |
| `createdAt`, `updatedAt` | DateTime | Timestamps |

#### `Generation`

| Field | Type | Notes |
|-------|------|-------|
| `id` | String (cuid) | Primary key |
| `orgId` | String | Required — org-scoped |
| `voiceId` | String? | FK → Voice (onDelete: SetNull) |
| `text` | String | Input prompt used for TTS |
| `voiceName` | String | Denormalized snapshot of voice name at generation time |
| `r2ObjectKey` | String? | Output audio path in R2 |
| `temperature` | Float | Generation parameter |
| `topP` | Float | Generation parameter |
| `topK` | Int | Generation parameter |
| `repetitionPenalty` | Float | Generation parameter |
| `createdAt`, `updatedAt` | DateTime | Timestamps |

### R2 Key Conventions

| Purpose | Key Pattern | Example |
|---------|-------------|---------|
| System voice reference audio | `voices/system/{voiceId}` | `voices/system/clxyz123` |
| Generated audio output | `generations/orgs/{orgId}/{generationId}` | `generations/orgs/org_abc/clxyz456` |

---

## 5. Authentication & Organizations

### How It Works

Resonance uses **Clerk** for authentication and **Clerk Organizations** for multi-tenancy. Every piece of business data (generations, custom voices) is scoped to an organization.

### Key Files

| File | Role |
|------|------|
| `src/app/layout.tsx` | Wraps app in `ClerkProvider` |
| `src/app/sign-in/[[...sign-in]]/page.tsx` | Clerk `<SignIn>` component |
| `src/app/sign-up/[[...sign-up]]/page.tsx` | Clerk `<SignUp>` component |
| `src/app/org-selection/page.tsx` | `<OrganizationList>` — user picks/creates org |
| `src/features/dashboard/components/dashboard-sidebar.tsx` | `OrganizationSwitcher` + `UserButton` |
| `src/trpc/init.ts` | `orgProcedure` — enforces `userId` + `orgId` on API calls |
| `src/proxy.ts` | Clerk middleware logic (redirect to org-selection if no org) |

### Auth Flow

```
User visits protected route
  → Clerk checks session (userId)
  → If no session → redirect to /sign-in
  → If session but no orgId → redirect to /org-selection
  → If session + orgId → allow access
```

### tRPC Auth Procedures

| Procedure | Requires | Used For |
|-----------|----------|----------|
| `baseProcedure` | Nothing | Public endpoints (none yet) |
| `authenticatedProcedure` | `userId` | User-only endpoints (none yet) |
| `orgProcedure` | `userId` + `orgId` | All business logic (voices, generations) |

### ⚠️ Middleware Not Active

`src/proxy.ts` contains the Clerk middleware logic but there is **no `middleware.ts`** at the project root or in `src/`. Next.js only runs middleware from those paths, so **org redirects may not happen automatically** until `proxy.ts` is renamed/moved to `src/middleware.ts`.

---

## 6. Features

---

### 6.1 Dashboard (Home Page)

**Status:** ✅ UI complete

**What it does:**
- Personalized greeting using Clerk user data
- Text input that redirects to `/text-to-speech?text=...` with pre-filled text
- 6 "quick action" cards linking to TTS with sample prompts
- Animated hero background (wavy pattern)

**Key files:**
- `src/app/(dashboard)/page.tsx` — Route entry
- `src/features/dashboard/views/dashboard_view.tsx` — Main view
- `src/features/dashboard/components/dashboard-header.tsx` — Greeting
- `src/features/dashboard/components/text-input-panel.tsx` — Text input → navigate to TTS
- `src/features/dashboard/components/quick-actions-panel.tsx` — Quick action cards
- `src/features/dashboard/components/quick-action-card.tsx` — Individual card
- `src/features/dashboard/components/hero-pattern.tsx` — Wavy background
- `src/features/dashboard/data/quick-actions.ts` — Sample prompt data

**Data flow:**
```
User types text → clicks submit
  → router.push("/text-to-speech?text=...")
  → No API/DB call — pure client navigation
```

**Packages used:** `@clerk/nextjs` (useUser), Next.js navigation, shadcn UI, `simplex-noise` (wavy bg)

---

### 6.2 Text-to-Speech Editor

**Status:** ✅ UI complete · ❌ Generate not wired to backend

**What it does:**
- Full TTS editor with text input, voice selector, 4 parameter sliders, settings/history tabs, and cost estimate
- Accepts URL search params: `?text=` and `?voiceId=` (from dashboard quick actions)
- **Generate button exists but `onSubmit` is a stub** — does not call the API yet

**Key files:**

| File | Role |
|------|------|
| `src/app/(dashboard)/text-to-speech/page.tsx` | Server page — prefetches voices, passes search params |
| `src/features/text-to-speech/views/text-to-speech-view.tsx` | Main client view — loads voices, wraps form |
| `src/features/text-to-speech/views/text-to-speech-layout.tsx` | Layout wrapper |
| `src/features/text-to-speech/components/text-to-speech-form.tsx` | TanStack Form setup + validation schema |
| `src/features/text-to-speech/components/text-input-panel.tsx` | Textarea + character count + cost estimate |
| `src/features/text-to-speech/components/voice-selector.tsx` | Voice dropdown (custom + system groups) |
| `src/features/text-to-speech/components/settings-panel.tsx` | Settings/History tab container |
| `src/features/text-to-speech/components/settings-panel-settings.tsx` | Temperature, topP, topK, repetition penalty sliders |
| `src/features/text-to-speech/components/settings-panel-history.tsx` | History tab (placeholder empty state) |
| `src/features/text-to-speech/components/generate-button.tsx` | Submit button |
| `src/features/text-to-speech/components/voice-preview-placeholder.tsx` | Audio preview area (placeholder) |
| `src/features/text-to-speech/contexts/tts-voices-context.tsx` | React context sharing voice lists |
| `src/features/text-to-speech/data/constants.ts` | `TEXT_MAX_LENGTH=5000`, `COST_PER_UNIT=0.0003` |
| `src/features/text-to-speech/data/sliders.ts` | Slider min/max/step config |

**Form schema (Zod):**
```typescript
{
  text: string (min 1),
  voiceId: string (min 1),
  temperature: number (default 0.8),
  topP: number (default 0.95),
  topK: number (default 1000),
  repetitionPenalty: number (default 1.2),
}
```

**Current data flow:**
```
Server page → prefetch(trpc.voices.getAll)
  → Client: useSuspenseQuery(trpc.voices.getAll)
  → TTSVoicesProvider wraps form with voice lists
  → User fills form → clicks Generate
  → form.onSubmit() → (empty stub — nothing happens)
```

**Intended data flow (once wired):**
```
User clicks Generate
  → trpc.generations.create.mutate({ text, voiceId, temperature, topP, topK, repetitionPenalty })
  → Backend validates voice → calls Chatterbox API → saves to R2 + DB
  → Returns { id } → client plays audio via /api/audio/{id}
```

**Packages used:** `@tanstack/react-form`, `@tanstack/react-query`, tRPC, Zod, shadcn UI

**Cost estimation:** `characterCount × $0.0003` displayed in UI

---

### 6.3 Voices

**Status:** ✅ Backend complete · ✅ Used in TTS selector · ❌ No dedicated `/voices` page · ❌ No voice upload/clone API

**What it does:**
- Stores voice metadata in PostgreSQL and reference audio in R2
- 20 built-in **SYSTEM** voices (seeded via script)
- Supports **CUSTOM** voices per organization (schema ready, no create API yet)
- Voice selection dropdown in TTS editor groups custom vs system voices

**Key files:**

| File | Role |
|------|------|
| `src/trpc/routers/voices.ts` | `getAll` and `delete` procedures |
| `src/features/voices/data/voice-scoping.ts` | 20 canonical system voice names |
| `src/features/voices/data/voice-categories.ts` | Category labels for UI |
| `src/components/voice-avatar/voice-avatar.tsx` | DiceBear avatar component |
| `src/components/voice-avatar/use-voice-avatar.ts` | Generates deterministic avatar from voice ID |
| `src/features/text-to-speech/contexts/tts-voices-context.tsx` | Shares voice lists to TTS components |
| `scripts/seed-system-voices.ts` | Seeds system voices to DB + R2 |

**Data flow — listing voices:**
```
TTS page prefetch → GET /api/trpc/voices.getAll
  → orgProcedure (requires orgId)
  → Parallel Prisma queries:
      CUSTOM voices WHERE orgId = ctx.orgId
      SYSTEM voices (global, no org filter)
  → Returns { custom: Voice[], system: Voice[] }
  → Client renders in VoiceSelector dropdown
```

**Data flow — deleting a custom voice:**
```
trpc.voices.delete.mutate({ id })
  → Find CUSTOM voice owned by org
  → Delete from PostgreSQL
  → Best-effort delete from R2 (deleteAudio)
  → Returns { success: true }
```

**Voice avatars:** Generated with `@dicebear/core` using the `glass` style, seeded by voice ID for consistency.

---

### 6.4 Generations (Audio Generation & History)

**Status:** ✅ Backend router written · ❌ Not mounted in app router · ❌ UI is placeholder · ❌ Audio playback route missing

**What it does (intended):**
- Creates a generation record, calls Chatterbox TTS, uploads WAV to R2, updates DB
- Lists past generations for the org
- Returns audio URL for playback

**Key files:**
- `src/trpc/routers/generations.ts` — Full CRUD logic (not mounted yet)
- `src/features/text-to-speech/components/settings-panel-history.tsx` — Static "No generations yet" placeholder

**Create generation data flow:**
```
trpc.generations.create.mutate(input)
  │
  ├─ 1. Load voice from DB (SYSTEM or CUSTOM for org)
  │     → Validate r2ObjectKey and name exist
  │
  ├─ 2. Call Chatterbox API
  │     POST /generate {
  │       prompt: text,
  │       voice_key: voice.r2ObjectKey,
  │       temperature, top_p, top_k, repetition_penalty,
  │       norm_loudness: true
  │     }
  │     → Returns WAV as ArrayBuffer
  │
  ├─ 3. Create Generation row in PostgreSQL (without r2ObjectKey yet)
  │
  ├─ 4. Upload WAV buffer to R2
  │     Key: generations/orgs/{orgId}/{generationId}
  │
  ├─ 5. Update Generation row with r2ObjectKey
  │
  └─ 6. Return { id: generationId }

  On failure after step 3: rollback — delete the Generation row
```

**Get generation data flow:**
```
trpc.generations.getById({ id })
  → Find by id + orgId
  → Return fields + audioUrl: "/api/audio/{id}"
  (audio route not built yet)
```

**Packages used:** tRPC, Prisma, `openapi-fetch` (Chatterbox client), `@aws-sdk/client-s3` (R2 upload)

---

### 6.5 Dashboard Layout & Sidebar

**Status:** ✅ Complete

**What it does:**
- Collapsible sidebar with navigation, org switcher, user menu
- Sidebar open/closed state persisted in `sidebar_state` cookie
- Navigation items: Dashboard, Explore voices, Text to speech, Voice cloning (no URL), Settings (opens Clerk org profile)

**Key files:**
- `src/app/(dashboard)/layout.tsx` — `SidebarProvider` + `DashboardSidebar`
- `src/features/dashboard/components/dashboard-sidebar.tsx` — Full sidebar with Clerk components

**Packages used:** shadcn `Sidebar`, `@clerk/nextjs` (`OrganizationSwitcher`, `UserButton`, `useClerk`)

---

### 6.6 Chatterbox TTS Service (Python / Modal)

**Status:** ✅ Deployed on Modal

**What it does:**
- GPU-powered text-to-speech with voice cloning
- Runs **ChatterboxTurboTTS** on Modal (A10G GPU)
- Reads reference voice audio from R2 bucket mount (read-only)
- Returns generated WAV audio stream

**File:** `chatterbox_tts.py`

**Architecture:**
```
Modal App "chatterbox-tts"
  ├── CloudBucketMount → R2 bucket mounted at /r2 (read-only)
  ├── GPU class (A10G, max 10 concurrent inputs, 5-min scaledown)
  └── FastAPI ASGI app
        ├── Auth: x-api-key header
        └── POST /generate → reads voice from /r2/{voice_key} → returns WAV
```

**Request body:**
```json
{
  "prompt": "Text to speak",
  "voice_key": "voices/system/{voiceId}",
  "temperature": 0.8,
  "top_p": 0.95,
  "top_k": 1000,
  "repetition_penalty": 1.2,
  "norm_loudness": true
}
```

**Modal secrets required:** `hf-token`, `chatterbox-api-key`, `cloudflare-r2`

**Local test:**
```bash
modal run chatterbox_tts.py --prompt "Hello" --voice-key "voices/system/<voice-id>"
```

**Type sync:** Run `npm run sync-api` to regenerate TypeScript types from the live OpenAPI spec.

---

### 6.7 Cloudflare R2 Storage

**Status:** ✅ Upload/delete/signed URL helpers built

**File:** `src/lib/r2.ts`

| Function | Purpose |
|----------|---------|
| `uploadAudio({ buffer, key, contentType? })` | PutObject — upload WAV to R2 |
| `deleteAudio(key)` | DeleteObject — remove file from R2 |
| `getSignedAudioUrl(key)` | Presigned GET URL (1-hour expiry) — **defined but not used yet** |

**Client:** `@aws-sdk/client-s3` pointed at `https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com`

**Used by:**
- `generations.create` — uploads generated audio
- `voices.delete` — cleans up custom voice audio
- `seed-system-voices.ts` — uploads system voice reference files

---

## 7. tRPC API Reference

**Handler:** `src/app/api/trpc/[trpc]/route.ts`  
**App router:** `src/trpc/routers/_app.ts`

### Currently Mounted

#### `voices.getAll` — Query (`orgProcedure`)

- **Input:** `{ query?: string }` (optional search filter)
- **Returns:** `{ custom: Voice[], system: Voice[] }`
- **Logic:** Parallel Prisma queries — CUSTOM filtered by orgId, SYSTEM global; optional case-insensitive name/description search
- **Fields returned:** `id`, `name`, `description`, `category`, `language`, `variant` (no `r2ObjectKey`)

#### `voices.delete` — Mutation (`orgProcedure`)

- **Input:** `{ id: string }`
- **Returns:** `{ success: true }`
- **Logic:** Delete CUSTOM voice owned by org; best-effort R2 cleanup

---

### Written But NOT Mounted

> These exist in `src/trpc/routers/generations.ts` but are **not imported** in `_app.ts`. Add `generations: generationsRouter` to enable them.

#### `generations.getAll` — Query (`orgProcedure`)

- **Returns:** All org generations, newest first (omits `orgId`, `r2ObjectKey`)

#### `generations.getById` — Query (`orgProcedure`)

- **Input:** `{ id: string }`
- **Returns:** Generation fields + `audioUrl: "/api/audio/{id}"`

#### `generations.create` — Mutation (`orgProcedure`)

- **Input:**
  ```typescript
  {
    text: string,          // 1–5000 chars
    voiceId: string,
    temperature: number,   // 0–2, default 0.8
    topP: number,          // 0–1, default 0.95
    topK: number,          // 0–10000, default 1000
    repetitionPenalty: number  // 1–2, default 1.2
  }
  ```
- **Returns:** `{ id: string }`
- **Flow:** Validate voice → Chatterbox API → create DB row → upload R2 → update DB row (with rollback on failure)

---

## 8. External Services & Integrations

| Service | Role | How It's Connected |
|---------|------|--------------------|
| **PostgreSQL** | Primary database | Prisma 7 + `@prisma/adapter-pg` via `DATABASE_URL` |
| **Clerk** | Auth + organizations | `@clerk/nextjs` — reads standard Clerk env vars |
| **Cloudflare R2** | Object storage for voice reference + generated audio | `@aws-sdk/client-s3` S3-compatible API |
| **Chatterbox TTS (Modal)** | GPU inference for voice cloning TTS | `openapi-fetch` client with `x-api-key` auth |

### Chatterbox Client

**File:** `src/lib/chatterbox-client.ts`

```typescript
// openapi-fetch client typed against generated OpenAPI spec
createClient<paths>({
  baseUrl: env.CHATTERBOX_API_URL,
  headers: { "x-api-key": env.CHATTERBOX_API_KEY },
})
```

**Types:** Auto-generated at `src/types/chatterbox-api.d.ts` via `npm run sync-api`

---

## 9. Scripts & Tooling

### `npm run sync-api`

**File:** `scripts/sync-api.ts`

Fetches `{CHATTERBOX_API_URL}/openapi.json` and generates TypeScript types to `src/types/chatterbox-api.d.ts` using `openapi-typescript`.

Run whenever the Chatterbox API changes:
```bash
npm run sync-api
```

### Seed System Voices

**File:** `scripts/seed-system-voices.ts`  
**Configured in:** `prisma.config.ts` as the Prisma seed command

**What it does:**
1. Reads 20 `.wav` files from `scripts/system-voices/{Name}.wav` (gitignored)
2. For each name in `CANONICAL_SYSTEM_VOICE_NAMES`:
   - Upserts a SYSTEM `Voice` row in PostgreSQL (with description, category, language metadata)
   - Uploads reference audio to R2 at `voices/system/{voiceId}`
   - Stores `r2ObjectKey` on the voice record

**Run:**
```bash
npx prisma db seed
```

**Requires:** `DATABASE_URL`, `R2_*` env vars + `.wav` files in `scripts/system-voices/`

---

## 10. Environment Variables

**Validated in:** `src/lib/env.ts` (via `@t3-oss/env-nextjs` + Zod)

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `APP_URL` | Server-side tRPC base URL (used in `src/trpc/client.tsx`) |
| `R2_ACCOUNT_ID` | Cloudflare account ID for R2 endpoint |
| `R2_ACCESS_KEY_ID` | R2 API credentials |
| `R2_SECRET_ACCESS_KEY` | R2 API credentials |
| `R2_BUCKET_NAME` | R2 bucket name |
| `CHATTERBOX_API_URL` | Modal TTS API base URL |
| `CHATTERBOX_API_KEY` | TTS API authentication key |

**Also used (not in `env.ts`):**

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk frontend |
| `CLERK_SECRET_KEY` | Clerk backend |
| `SKIP_ENV_VALIDATION` | Bypass env validation (CI/testing) |
| `NODE_ENV` | Prisma singleton, middleware clock skew |

---

## 11. What's Done vs. Pending

### ✅ Done

| Area | Details |
|------|---------|
| **Project scaffolding** | Next.js 16 App Router, TypeScript, Tailwind, shadcn/ui |
| **Auth** | Clerk sign-in, sign-up, org selection page, org switcher in sidebar |
| **Database schema** | Voice + Generation models with enums, indexes, relations |
| **tRPC setup** | Client, server, React Query integration, superjson transformer |
| **Org-scoped procedures** | `orgProcedure` enforces userId + orgId on all business API calls |
| **Voices API** | `getAll` (with search) and `delete` mounted and working |
| **System voice seeding** | Script to upload 20 voices to DB + R2 |
| **Dashboard UI** | Home page with greeting, text input, quick actions, hero animation |
| **TTS editor UI** | Full form with text input, voice selector, 4 sliders, settings/history tabs, cost estimate |
| **Voice avatars** | DiceBear glass-style avatars seeded by voice ID |
| **Generations backend** | Full create/getAll/getById router with Chatterbox + R2 integration |
| **R2 storage helpers** | Upload, delete, presigned URL functions |
| **Chatterbox TTS service** | Modal GPU deployment with FastAPI, R2 mount, API key auth |
| **OpenAPI type sync** | Script to generate TS types from Chatterbox API spec |
| **Env validation** | Type-safe env vars via `@t3-oss/env-nextjs` |

### ❌ Pending / Not Wired

| Area | What's Missing | Files to Touch |
|------|----------------|----------------|
| **Generate button** | `onSubmit` in TTS form is empty stub | `src/features/text-to-speech/components/text-to-speech-form.tsx` |
| **Generations router** | Not imported in `_app.ts` — API unreachable | `src/trpc/routers/_app.ts` |
| **Generation history UI** | Static "No generations yet" placeholder | `src/features/text-to-speech/components/settings-panel-history.tsx` |
| **Audio playback** | `/api/audio/[id]` route doesn't exist | Create `src/app/api/audio/[id]/route.ts` using `getSignedAudioUrl` |
| **Voices page** | `/voices` linked in sidebar but no page | Create `src/app/(dashboard)/voices/page.tsx` |
| **Voice cloning** | Sidebar item has no URL or implementation | New feature — upload reference audio, create CUSTOM voice |
| **Clerk middleware** | `src/proxy.ts` exists but no `middleware.ts` | Rename/move to `src/middleware.ts` |
| **Voice preview** | Placeholder component, no audio playback | `src/features/text-to-speech/components/voice-preview-placeholder.tsx` |
| **Prisma migrations** | Only schema file, no migration history in repo | Run `npx prisma migrate dev` |

### Next Steps (Suggested Order)

1. **Activate middleware** — Move `src/proxy.ts` → `src/middleware.ts`
2. **Mount generations router** — Add to `_app.ts`
3. **Wire generate button** — Call `trpc.generations.create` in form `onSubmit`
4. **Build audio route** — `GET /api/audio/[id]` → presigned R2 URL redirect/stream
5. **Build history UI** — Fetch `generations.getAll`, display list with playback
6. **Build `/voices` page** — Browse/search all voices
7. **Voice cloning flow** — Upload reference audio → create CUSTOM voice

---

*This document should be updated as features are completed. When you finish a pending item, move it to the Done section and add implementation notes.*
