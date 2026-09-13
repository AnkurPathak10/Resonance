# Resonance — Progress Tracker & Technical Documentation

> Living documentation for what has been built, how it works, and which tools/packages power each part of the app.
>
> Last updated: August 30, 2026

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
6. User is redirected to `/text-to-speech/[generationId]` to play back audio using an interactive waveform player powered by **WaveSurfer.js**
7. User plays back audio and accesses generation history

**Current state:** Core TTS pipeline is **fully functional end-to-end** — text input → GPU inference → R2 storage → DB tracking → detail page redirect → interactive WaveSurfer audio waveform playback + download.

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

### Audio & Waveform Visualization

| Package | Purpose |
|---------|---------|
| `wavesurfer.js` | Interactive audio waveform rendering, audio decoding, playback controls |
| `date-fns` | Timestamp & audio duration formatting (`mm:ss`) |

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
│   │   │   ├── layout.tsx         # Dashboard sidebar layout
│   │   │   ├── page.tsx           # Dashboard home page
│   │   │   └── text-to-speech/    # TTS editor & generation playback
│   │   │       ├── layout.tsx     # TTS layout wrapper
│   │   │       ├── page.tsx       # Main TTS creation page
│   │   │       └── [generationId]/ # Playback & detail view route
│   │   ├── sign-in/, sign-up/     # Clerk auth pages
│   │   ├── org-selection/         # Clerk org picker
│   │   └── api/
│   │       ├── trpc/              # tRPC HTTP handler
│   │       └── audio/             # Audio proxy & streaming route
│   │           └── [generationId]/ # GET /api/audio/[generationId]
│   ├── features/                  # Feature-based modules
│   │   ├── dashboard/             # Home page components & views
│   │   ├── text-to-speech/        # TTS editor, player & detail view
│   │   │   ├── components/        # Form, sliders, selector, waveform player (panel & mobile)
│   │   │   ├── contexts/          # TTS voices context
│   │   │   ├── data/              # Constants, slider configurations
│   │   │   ├── hooks/             # useWaveSurfer audio player hook
│   │   │   └── views/             # TextToSpeechView, TextToSpeechDetailView
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

- **Feature-based organization** — Each domain (`dashboard`, `text-to-speech`, `voices`) has its own `components/`, `views/`, `data/`, `hooks/`, and optionally `contexts/`
- **tRPC + TanStack Query** — Single API endpoint at `/api/trpc`; type-safe calls from client and server
- **Org-scoped multi-tenancy** — All business data filtered by Clerk `orgId` via `orgProcedure`
- **shadcn/ui** — Radix-based components in `src/components/ui/`
- **Prisma 7 driver adapter** — Client generated to `src/generated/prisma`, connects via `@prisma/adapter-pg`
- **OpenAPI-typed external API** — `openapi-fetch` client + auto-generated `chatterbox-api.d.ts`
- **WaveSurfer.js Visualizer** — Custom React hook (`useWaveSurfer`) for interactive canvas waveform decoding and synchronized audio controls

### App Routes

| Route | File | Status |
|-------|------|--------|
| `/` | `src/app/(dashboard)/page.tsx` | ✅ Built |
| `/text-to-speech` | `src/app/(dashboard)/text-to-speech/page.tsx` | ✅ Built (Create Form) |
| `/text-to-speech/[generationId]` | `src/app/(dashboard)/text-to-speech/[generationId]/page.tsx` | ✅ Built (Detail View & WaveSurfer Player) |
| `/sign-in/*` | `src/app/sign-in/[[...sign-up]]/page.tsx` | ✅ Built |
| `/sign-up/*` | `src/app/sign-up/[[...sign-up]]/page.tsx` | ✅ Built |
| `/org-selection` | `src/app/org-selection/page.tsx` | ✅ Built |
| `/api/trpc/*` | `src/app/api/trpc/[trpc]/route.ts` | ✅ Built |
| `/api/audio/[generationId]` | `src/app/api/audio/[generationId]/route.ts` | ✅ Built (Authenticated WAV Stream from R2) |
| `/voices` | — | ❌ Not built (sidebar link exists) |

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

**Status:** ✅ Fully built & wired end-to-end

**What it does:**
- Full TTS editor with text input, voice selector, 4 parameter sliders, settings/history tabs, and real-time cost estimate
- Accepts URL search params: `?text=` and `?voiceId=` (from dashboard quick actions)
- Submitting triggers `trpc.generations.create.mutateAsync`, displays loading state on button with `Spinner`, shows toast notification on success/error, and redirects to `/text-to-speech/[generationId]`

**Key files:**

| File | Role |
|------|------|
| `src/app/(dashboard)/text-to-speech/page.tsx` | Server page — prefetches voices, passes search params |
| `src/features/text-to-speech/views/text-to-speech-view.tsx` | Main client view — loads voices, wraps form |
| `src/features/text-to-speech/views/text-to-speech-layout.tsx` | Layout wrapper (header + children) |
| `src/features/text-to-speech/components/text-to-speech-form.tsx` | TanStack Form setup + Zod validation schema + `createMutation` execution & toast feedback |
| `src/features/text-to-speech/components/text-input-panel.tsx` | Textarea + character count + cost estimate + submit trigger |
| `src/features/text-to-speech/components/voice-selector.tsx` | Voice dropdown (custom + system groups) |
| `src/features/text-to-speech/components/settings-panel.tsx` | Settings/History tab container (sidebar) |
| `src/features/text-to-speech/components/settings-panel-settings.tsx` | Temperature, topP, topK, repetition penalty sliders |
| `src/features/text-to-speech/components/settings-panel-history.tsx` | History tab (placeholder empty state) |
| `src/features/text-to-speech/components/generate-button.tsx` | Submit button with `onClick` handler and loading spinner |
| `src/features/text-to-speech/components/voice-preview-placeholder.tsx` | Audio preview placeholder before generation |
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

**Data flow:**
```
1. User enters text, selects voice, adjusts sliders
2. Click "Generate speech" → form.handleSubmit()
3. Form validates via Zod schema (ttsFormSchema)
4. Calls trpc.generations.create.mutateAsync(...)
5. Backend invokes Chatterbox GPU on Modal → receives WAV → uploads to R2 → stores Generation in DB
6. Toast shows "Audio generated successfully"
7. router.push(`/text-to-speech/${data.id}`)
```

**Packages used:** `@tanstack/react-form`, `@tanstack/react-query`, tRPC, Zod, `sonner`, shadcn UI

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

### 6.4 Generations, WaveSurfer Audio Player & Detail View

**Status:** ✅ Fully built & mounted

**What it does:**
- Generates speech via Chatterbox on Modal GPU, uploads WAV to Cloudflare R2, records `Generation` in PostgreSQL with denormalized voice name snapshots
- Dynamic generation page (`/text-to-speech/[generationId]`) that hydrates generation data and preserves form parameters
- Interactive audio waveform visualizer using **WaveSurfer.js** with theme-matched color styling
- Playback controls: play/pause toggle, skip 10s backward/forward, dynamic time counter (`mm:ss / mm:ss`), and WAV download
- Responsive mobile playback bar using native HTML5 audio
- Authenticated audio stream proxy route at `/api/audio/[generationId]`

**Key files:**

| File | Role |
|------|------|
| `src/trpc/routers/generations.ts` | Backend router (`create`, `getById`, `getAll`) |
| `src/trpc/routers/_app.ts` | App router mounting `generations: generationsRouter` |
| `src/app/(dashboard)/text-to-speech/[generationId]/page.tsx` | Server page — prefetches generation and voice queries |
| `src/features/text-to-speech/views/text-to-speech-detail-view.tsx` | Detail view — syncs form state with generation data, renders waveform player |
| `src/features/text-to-speech/hooks/use-wavesurfer.ts` | Custom hook for WaveSurfer.js lifecycle, canvas rendering, autoplay & seeking |
| `src/features/text-to-speech/components/voice-preview-panel.tsx` | Desktop audio waveform player, duration display, controls & download button |
| `src/features/text-to-speech/components/voice-preview-mobile.tsx` | Mobile compact audio player bar with native `<audio>` element |
| `src/app/api/audio/[generationId]/route.ts` | Route Handler serving authenticated WAV audio via presigned R2 URL |

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

**Playback & Waveform data flow:**
```
1. Detail page loads /text-to-speech/[generationId]
2. Query trpc.generations.getById({ id }) → returns generation data + audioUrl: `/api/audio/${id}`
3. VoicePreviewPanel mounts → useWaveSurfer initializes WaveSurfer on container <div>
4. WaveSurfer loads `/api/audio/${generationId}`
5. GET /api/audio/[generationId] verifies Clerk auth (userId + orgId) → verifies generation in DB → gets presigned R2 URL → streams WAV audio buffer
6. WaveSurfer decodes audio waveform, renders interactive canvas bars, and starts autoplay
7. User can scrub waveform, toggle play/pause, skip ±10s, or download the .wav file
```

**Packages used:** `wavesurfer.js`, `date-fns`, tRPC, Prisma, `@clerk/nextjs`, `openapi-fetch` (Chatterbox client), `@aws-sdk/client-s3` (R2 upload & presigned URL)

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
| **Generations API** | `generations.create`, `generations.getById`, `generations.getAll` mounted in `_app.ts` |
| **System voice seeding** | Script to upload 20 voices to DB + R2 |
| **Dashboard UI** | Home page with greeting, text input, quick actions, hero animation |
| **TTS editor UI & wiring** | Full form with text input, voice selector, 4 sliders, cost estimate, and `onSubmit` calling `generations.create` with Sonner toast feedback |
| **Voice avatars** | DiceBear glass-style avatars seeded by voice ID |
| **Generations backend** | Full create/getAll/getById router with Chatterbox GPU + R2 integration |
| **Audio streaming API route** | `GET /api/audio/[generationId]` authenticated route streaming WAV audio via presigned R2 URLs |
| **WaveSurfer audio visualizer** | Interactive audio waveform player (`useWaveSurfer` hook, `VoicePreviewPanel`, and mobile `VoicePreviewMobile`) |
| **Generation detail page** | `/text-to-speech/[generationId]` route with query prefetching and synchronized parameter form |
| **R2 storage helpers** | Upload, delete, presigned URL functions |
| **Chatterbox TTS service** | Modal GPU deployment with FastAPI, R2 mount, API key auth |
| **OpenAPI type sync** | Script to generate TS types from Chatterbox API spec |
| **Env validation** | Type-safe env vars via `@t3-oss/env-nextjs` |

### ❌ Pending / Not Wired

| Area | What's Missing | Files to Touch |
|------|----------------|----------------|
| **Generation history UI** | History tab lists past generations with click-to-load/play (currently placeholder) | `src/features/text-to-speech/components/settings-panel-history.tsx` |
| **Voices page** | `/voices` linked in sidebar but no dedicated explore/browse page | Create `src/app/(dashboard)/voices/page.tsx` |
| **Voice cloning** | Upload reference audio → create CUSTOM voice | New feature flow |
| **Clerk middleware** | `src/proxy.ts` exists but no active `middleware.ts` | Rename/move to `src/middleware.ts` |
| **Prisma migrations** | Only schema file, no migration history in repo | Run `npx prisma migrate dev` |

### Next Steps (Suggested Order)

1. **Activate middleware** — Move `src/proxy.ts` → `src/middleware.ts`
2. **Build generation history list UI** — Fetch `generations.getAll` in `settings-panel-history.tsx` to list past generations with playback links
3. **Build `/voices` explore page** — Browse/search all available voices
4. **Voice cloning flow** — Upload reference audio → create CUSTOM voice in DB and R2

---

*This document should be updated as features are completed. When you finish a pending item, move it to the Done section and add implementation notes.*

---

## 12. Latest Updates — Generation History, Mobile Drawers & Prompt Suggestions

> **PR Summary:** Complete implementation of generation history listing with direct playback links, responsive mobile drawer controls (Voice Selector, Settings & History bottom sheets), clickable prompt suggestions for quick text input, and TTS route loading skeleton.

---

### 12.1 Generation History UI in Settings Panel

**Status:** ✅ Complete & Live

**What it does:**
- Replaced the placeholder empty state in the desktop Settings Panel History tab with live query data from PostgreSQL via tRPC.
- Fetches all generations for the current organization using `trpc.generations.getAll.queryOptions()` wrapped in `@tanstack/react-query`'s `useSuspenseQuery`.
- When no generations exist (`generations.length === 0`), displays a custom empty state illustration featuring overlapping angled icons (`AudioLines`, `AudioWaveform`, `Clock`) with background contrasts and helper copy ("No generations yet — Generate some audio and it will appear here").
- When generations exist, renders a vertically scrollable list of past generation cards.
- Each generation item is wrapped in a Next.js `Link` navigating directly to `/text-to-speech/${generation.id}` for playback in the WaveSurfer audio player.
- Each item displays:
  - Truncated prompt text (`generation.text`) with font weighting and theme-aware colors
  - Deterministic voice avatar (`VoiceAvatar`) seeded by `generation.voiceId ?? generation.voiceName`
  - Snapshot voice display name (`generation.voiceName`)
  - Relative timestamp calculated using `date-fns`'s `formatDistanceToNow(new Date(generation.createdAt), { addSuffix: true })` (e.g., "5 minutes ago", "about 2 hours ago")
  - Smooth hover background transitions (`hover:bg-muted`)

**Key file:**
- `src/features/text-to-speech/components/settings-panel-history.tsx`

**Data flow:**
```
SettingsPanel → TabsContent (value="history") → SettingsPanelHistory
  → useSuspenseQuery(trpc.generations.getAll.queryOptions())
  → PostgreSQL returns Generation[] (ordered by createdAt DESC)
  → If empty: renders decorative empty state
  → If populated: renders Link cards to /text-to-speech/${generation.id}
  → Clicking a card routes to generation detail page with WaveSurfer audio visualizer
```

**Packages used:** `@tanstack/react-query`, `@trpc/client`, `date-fns`, `lucide-react`, Next.js `Link`, `@dicebear/core` (via `VoiceAvatar`)

---

### 12.2 Responsive Mobile Layout (Drawers & Adaptive Controls)

**Status:** ✅ Complete & Live

**What it does:**
- Solves the mobile viewport limitation where the desktop sidebar (`SettingsPanel`, `hidden lg:flex w-72`) is hidden on viewports smaller than `lg` (1024px).
- Introduces mobile bottom sheet drawers using shadcn/ui `Drawer` (powered by the `vaul` primitive) to make voice selection, parameter adjustment, and generation history fully accessible on smartphones and tablets.
- Updates `TextInputPanel` with an adaptive mobile control bar (`lg:hidden`) positioned directly above the submit button.

**Key files & components:**

| File | Component | Role |
|------|-----------|------|
| `src/features/text-to-speech/components/voice-selector-button.tsx` | `VoiceSelectorButton` | Mobile trigger button displaying active voice avatar, voice name, and dropdown chevron. Connected to TanStack Form state. |
| `src/features/text-to-speech/components/settings-drawer.tsx` | `SettingsDrawer` | Bottom sheet drawer hosting `SettingsPanelSettings` (voice dropdown + 4 adjustment sliders). |
| `src/features/text-to-speech/components/history-drawer.tsx` | `HistoryDrawer` | Bottom sheet drawer hosting `SettingsPanelHistory` for mobile history browsing. |
| `src/features/text-to-speech/components/text-input-panel.tsx` | `TextInputPanel` | Wires the mobile action bar (`SettingsDrawer` + `HistoryDrawer` + full-width `GenerateButton`). |

**Architecture & Logic:**

1. **`VoiceSelectorButton` (`voice-selector-button.tsx`):**
   - Configured as a `DrawerTrigger asChild` button.
   - Accesses form context via `useTypedAppFormContext(ttsFormOptions)`.
   - Subscribes reactively to `form.store` via `useStore(form.store, (s) => s.values.voiceId)`.
   - Retrieves `allVoices` from `useTTSVoices()`, finding the matching voice object or defaulting to the first available voice.
   - Renders a compact button displaying a `VoiceAvatar` (size 24px), truncated voice name, and `ChevronDown` indicator.

2. **`SettingsDrawer` (`settings-drawer.tsx`):**
   - Wraps the voice selector button (or an optional fallback `Settings` icon button) inside `DrawerTrigger`.
   - When tapped, slides up a mobile bottom sheet with `DrawerHeader`, `DrawerTitle` ("Settings"), and a scrollable viewport (`overflow-y-auto`).
   - Renders the complete `SettingsPanelSettings` component inside the drawer, allowing mobile users to choose from custom/system voices and fine-tune temperature, top-p, top-k, and repetition penalty.

3. **`HistoryDrawer` (`history-drawer.tsx`):**
   - Triggered by an outline button with the `History` icon.
   - Opens a mobile bottom sheet containing `SettingsPanelHistory`.
   - Users can scroll through past generations, see relative timestamps and voice avatars, and tap any generation to navigate to its detail/playback page.

4. **`TextInputPanel` Integration (`text-input-panel.tsx`):**
   - Mobile view (`lg:hidden`):
     ```tsx
     <div className="flex items-center gap-2">
       <SettingsDrawer>
         <VoiceSelectorButton />
       </SettingsDrawer>
       <HistoryDrawer />
     </div>
     <GenerateButton className="w-full" disabled={isSubmitting} />
     ```
   - Retains the character counter badge (`{charactersRemaining} characters left`) and dynamic cost estimate badge (`${estimatedCost.toFixed(4)}`).

**Packages used:** `vaul` / shadcn `Drawer`, `@tanstack/react-form`, `lucide-react`, shadcn `Button`

---

### 12.3 Interactive Prompt Suggestions

**Status:** ✅ Complete & Live

**What it does:**
- Provides a curated set of 8 starter prompts with distinct themes and icons to guide users and enable instant one-click testing of voice models.
- Displays below the character count and cost badges on desktop viewports (`hidden lg:block`).
- Clicking any suggestion immediately populates the form textarea via `form.setFieldValue("text", prompt)` without a page reload.

**Key files:**
- `src/features/text-to-speech/components/prompt-suggestions.tsx` — Component with prompt library and badge buttons
- `src/features/text-to-speech/components/text-input-panel.tsx` — Mounted inside desktop textarea footer

**Curated Prompt Library:**

| Category / Label | Icon | Theme & Purpose |
|------------------|------|-----------------|
| **Narrate a story** | `BookOpen` | Mystery/fantasy storytelling with atmospheric pacing |
| **Tell a silly joke** | `Smile` | Lighthearted, conversational dialogue and comedic timing |
| **Record an advertisement** | `Mic` | Commercial copywriting (BrightBean Coffee promotion) |
| **Speak in different languages** | `Languages` | Multilingual greeting (English, French, Spanish, German, Italian) |
| **Direct a dramatic movie scene** | `Clapperboard` | High-tension cinematic dialogue and emotional depth |
| **Hear from a video game character** | `Gamepad2` | Immersive RPG fantasy character briefing |
| **Introduce your podcast** | `Podcast` | High-energy intro for an episodic show |
| **Guide a meditation class** | `Brain` | Soothing, slow-tempo mindfulness instruction |

**Implementation details:**
- Each item is styled using shadcn `Badge` (`variant="outline"`) with `cursor-pointer`, `hover:bg-accent`, and rounded corners.
- Icons from `lucide-react` provide instant visual categorization.
- Integrates with TanStack Form via callback: `(prompt) => form.setFieldValue("text", prompt)`.

---

### 12.4 Text-to-Speech Route Loading Skeleton

**Status:** ✅ Built

**What it does:**
- Next.js loading skeleton for `/text-to-speech` that renders instantly while server components and queries are suspended or prefetching.
- Faithfully mirrors the dual-panel desktop and mobile layout:
  - Input area: Large textarea skeleton (`h-full w-full rounded-xl`).
  - Mobile action bar skeleton: Side-by-side button skeletons and full-width generate button skeleton.
  - Desktop footer skeleton: Prompt suggestions bar skeleton and submit button skeleton.
  - Bottom player: Renders `VoicePreviewPlaceholder` for seamless visual continuity.
  - Desktop right sidebar: Tab triggers skeleton, voice dropdown skeleton, and 4 slider rows (creativity, variety, range, flow) with labels and bar skeletons.

**Key file:**
- `src/app/(dashboard)/text-to-speech/loading..tsx`

**Packages used:** shadcn `Skeleton`, `VoicePreviewPlaceholder`

---

### 12.5 Settings Panel Clean-up

**Status:** ✅ Complete

**File:** `src/features/text-to-speech/components/settings-panel-settings.tsx`
- Removed lingering development placeholder text ("coming soon") under `<VoiceSelector />`.

---

### 12.6 Summary of Changed & Untracked Files in this PR

| File Path | Status | Role & Changes |
|-----------|--------|----------------|
| `src/features/text-to-speech/components/settings-panel-history.tsx` | Modified | Wired `useSuspenseQuery(trpc.generations.getAll)` with empty state & interactive history card list linking to detail page |
| `src/features/text-to-speech/components/settings-panel-settings.tsx` | Modified | Cleaned up "coming soon" placeholder text beneath voice selector |
| `src/features/text-to-speech/components/text-input-panel.tsx` | Modified | Activated mobile layout with `SettingsDrawer`, `VoiceSelectorButton`, `HistoryDrawer`, and mounted desktop `PromptSuggestions` |
| `src/features/text-to-speech/components/history-drawer.tsx` | Untracked (New) | Mobile bottom sheet drawer housing `SettingsPanelHistory` |
| `src/features/text-to-speech/components/settings-drawer.tsx` | Untracked (New) | Mobile bottom sheet drawer housing `SettingsPanelSettings` with custom trigger support |
| `src/features/text-to-speech/components/voice-selector-button.tsx` | Untracked (New) | Reactive mobile button displaying current voice avatar & label, acting as `SettingsDrawer` trigger |
| `src/features/text-to-speech/components/prompt-suggestions.tsx` | Untracked (New) | 8 curated starter prompt badges with icons for quick form text population |
| `src/app/(dashboard)/text-to-speech/loading..tsx` | Untracked (New) | Dual-layout loading skeleton for the TTS route |

---

### 12.7 Updated Feature Status

- **Generation history UI:** Moved from ❌ Pending to ✅ Done.
- **Mobile TTS configuration & history:** Moved from ❌ Missing to ✅ Done.
- **Prompt inspiration:** ✅ Added.

---

## 13. Sentry Full-Stack Error Monitoring & Observability

> **PR Summary:** Integrated Sentry across the entire Next.js App Router application (client, server, edge runtimes, tRPC procedures, and global error boundaries), with automated RPC input capture, tunnel routing to circumvent ad-blockers, and structured lifecycle telemetry in the TTS generation pipeline.

---

### 13.1 Overview & Architecture

Resonance now uses **Sentry (`@sentry/nextjs`)** for centralized error tracking, distributed tracing, and runtime observability.

```
┌────────────────────────────────────────────────────────────────────────┐
│                          Sentry Architecture                           │
└────────────────────────────────────────────────────────────────────────┘

    Client Browser                     Next.js Server / Edge               tRPC / Data Layer
 ┌──────────────────────┐            ┌──────────────────────┐            ┌──────────────────────┐
 │ instrumentation-     │            │ sentry.server.config │            │ src/trpc/init.ts     │
 │ client.ts            │            │ sentry.edge.config   │            │ Sentry.trpcMiddleware│
 │ • tracesSampleRate=1 │            │ • DSN & sample rate  │            │ (attachRpcInput:true)│
 └──────────┬───────────┘            └──────────┬───────────┘            └──────────┬───────────┘
            │                                   │                                   │
            ▼                                   ▼                                   ▼
 ┌──────────────────────┐            ┌──────────────────────┐            ┌──────────────────────┐
 │ src/app/global-error │            │ src/instrumentation  │            │ generations.ts       │
 │ • captureException() │            │ • register()         │            │ • Sentry.logger.info │
 └──────────┬───────────┘            │ • onRequestError()   │            │ • Sentry.logger.error│
            │                                   │                        └──────────┬───────────┘
            └─────────────────┬─────────────────┘                                   │
                              ▼                                                     │
                   ┌──────────────────────┐                                         │
                   │ Tunnel: /monitoring  │ ◄───────────────────────────────────────┘
                   │ (bypasses ad-block)  │
                   └──────────┬───────────┘
                              ▼
                   ┌──────────────────────┐
                   │  Sentry Cloud Ingest │
                   │  (nodebase-vh/       │
                   │   resonance)         │
                   └──────────────────────┘
```

---

### 13.2 Next.js Build & Tunnel Configuration

**File:** `next.config.ts`

Wrapped the primary Next.js configuration with `withSentryConfig` to enable compile-time source map uploads, tree-shaking, and request tunneling:

```typescript
export default withSentryConfig(nextConfig, {
  org: "nodebase-vh",
  project: "resonance",
  silent: !process.env.CI,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
  webpack: {
    automaticVercelMonitors: true,
    treeshake: {
      removeDebugLogging: true,
    },
  },
});
```

**Key configuration features:**
- **Ad-blocker resilience via `tunnelRoute: "/monitoring"`:** Routes browser telemetry through a Next.js rewrite so client error reports aren't blocked by browser privacy extensions.
- **`widenClientFileUpload: true`:** Generates and uploads comprehensive source maps for readable production stack traces.
- **Tree-shaking (`removeDebugLogging: true`):** Strips debug logs from production bundles to optimize performance and bundle size.
- **Git ignore:** Added `.env.sentry-build-plugin` to `.gitignore` to prevent leaking Sentry build authentication tokens.

---

### 13.3 Runtime Instrumentation & Client Initialization

Sentry hooks into all execution runtimes via Next.js Instrumentation hooks:

| File | Runtime | Purpose |
|------|---------|---------|
| `src/instrumentation.ts` | Server / Edge | Calls `register()` to dynamically load `sentry.server.config` or `sentry.edge.config` based on `process.env.NEXT_RUNTIME`. Exports `onRequestError = Sentry.captureRequestError` for unhandled route handler errors. |
| `sentry.server.config.ts` | Node.js Server | Configures Sentry with project DSN and `tracesSampleRate: 1.0`. |
| `sentry.edge.config.ts` | Edge Runtime | Configures Sentry for edge API routes and middleware. |
| `src/instrumentation-client.ts` | Browser Client | Initializes client-side SDK with DSN, `tracesSampleRate: 1.0`, and exports `onRouterTransitionStart = Sentry.captureRouterTransitionStart` for App Router navigation tracing. |
| `src/app/global-error.tsx` | React Root | Root Next.js error boundary that catches uncaught client-side rendering exceptions, calls `Sentry.captureException(error)`, and renders a fallback `<NextError statusCode={0} />`. |

---

### 13.4 tRPC Middleware Observability

**File:** `src/trpc/init.ts`

Integrated `Sentry.trpcMiddleware` directly into the base procedure chain:

```typescript
import * as Sentry from "@sentry/node";

const sentryMiddleware = t.middleware(
  Sentry.trpcMiddleware({
    attachRpcInput: true,
  }),
);

export const baseProcedure = t.procedure.use(sentryMiddleware);
export const authProcedure = baseProcedure.use(async ({ next }) => { ... });
export const orgProcedure = baseProcedure.use(async ({ next }) => { ... });
```

**How it works:**
- Because `authProcedure` and `orgProcedure` both derive from `baseProcedure`, **every tRPC query and mutation in the application automatically runs through Sentry middleware**.
- `attachRpcInput: true` securely attaches caller arguments (e.g. prompt length, voice ID, generation parameters) to Sentry breadcrumbs and transaction spans for debugging RPC failures.

---

### 13.5 TTS Generation Pipeline Telemetry & Structured Logging

**File:** `src/trpc/routers/generations.ts`

Instrumented the critical `generations.create` procedure with structured Sentry lifecycle logging:

1. **Before GPU inference call:**
   ```typescript
   Sentry.logger.info("Generation started", {
     orgId: ctx.orgId,
     voiceId: input.voiceId,
     textLength: input.text.length,
   });
   ```
2. **On successful R2 upload & DB record update:**
   ```typescript
   Sentry.logger.info("Audio generated", {
     orgId: ctx.orgId,
     generationId: generation.id,
   });
   ```
3. **On caught exception / rollback:**
   ```typescript
   Sentry.logger.error("Generation failed", {
     orgId: ctx.orgId,
     voiceId: input.voiceId,
   });
   ```
   Provides immediate operational insight and context in Sentry dashboards whenever Chatterbox API or R2 storage calls encounter timeouts or errors.

---

### 13.6 Files Changed & Added for Sentry Integration

| File Path | Status | Role |
|-----------|--------|------|
| `package.json` | Modified | Added `@sentry/nextjs` dependency |
| `next.config.ts` | Modified | Wrapped with `withSentryConfig`, configured tunnel route `/monitoring`, source maps, tree-shaking |
| `.gitignore` | Modified | Added `.env.sentry-build-plugin` |
| `src/trpc/init.ts` | Modified | Added `Sentry.trpcMiddleware({ attachRpcInput: true })` to `baseProcedure`, added `authProcedure` |
| `src/trpc/routers/generations.ts` | Modified | Added structured Sentry logger info/error calls during generation creation & rollback |
| `sentry.server.config.ts` | New | Server-side Sentry initialization |
| `sentry.edge.config.ts` | New | Edge runtime Sentry initialization |
| `src/instrumentation.ts` | New | Next.js server/edge runtime registration and `captureRequestError` |
| `src/instrumentation-client.ts` | New | Browser client Sentry initialization and router transition capture |
| `src/app/global-error.tsx` | New | Root React error boundary capturing unhandled exceptions via `Sentry.captureException` |
| `src/app/api/sentry-example-api/route.ts` | New | Sentry test route handler |
| `src/app/sentry-example-page/page.tsx` | New | Sentry test page for manual verification |

---

## 14. Final Billing & Metering Integration

**Status:** ✅ Complete

**Overview:**
Integrated Polar for usage-based billing and metering. Added usage tracking for text-to-speech generations and custom voice creations.

**Key Components & Changes:**

### 14.1 Polar Metering Integration
- **`src/lib/polar.ts`**: Configured Polar SDK for server-side usage ingestion.
- **`src/trpc/routers/generations.ts`**: Integrated `polar.events.ingest` for `tts_generation` events, automatically metering text-to-speech usage by character count (`metadata: { "characters": input.text.length }`).
- **`src/app/api/voices/create/route.ts`**: Implemented `polar.events.ingest` for tracking custom voice creations.

### 14.2 Billing UI and State
- **`src/features/billing/components/usage-container.tsx`**: Added a new usage container to track and display current billing usage metrics to the user.
- **`src/features/billing/hooks/use-checkout.ts`**: Created a hook to manage the Stripe/Polar checkout flow.
- **`src/trpc/routers/billing.ts`**: Implemented the billing tRPC router to handle checkout sessions, subscription management, and fetching usage metrics.
- **`src/features/dashboard/components/dashboard-sidebar.tsx`**: Updated the dashboard sidebar layout to accommodate billing navigation and incorporate the new usage container.

### 14.3 Voice Management UI Updates
- **`src/features/voices/components/voice-card.tsx`**: Created a polished `VoiceCard` component to display created voices.
- **`src/features/voices/components/voice-create-dialog.tsx`**: Implemented a dialog for creating custom voices, hooking into the metered creation route.

### 14.4 Next.js Configuration Updates
- **`package.json` & `package-lock.json`**: Added necessary billing/polar dependencies.
- **`src/lib/env.ts`**: Added environment variables for Polar integration.

