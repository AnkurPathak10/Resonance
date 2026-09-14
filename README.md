# Meet Resonance

**An AI-powered voice cloning and text-to-speech generation platform for teams.**

Resonance lets organizations generate natural-sounding speech from text using cloned or built-in voices, self-hosting the underlying voice model instead of relying on paid third-party APIs like ElevenLabs.

**[Live Demo](https://resonance-five-delta.vercel.app/)**

---

## Overview

Users sign in, select an organization, choose from 20 built-in system voices, enter text, and tune generation parameters (temperature, top-p, top-k, repetition penalty). The backend sends the request to a self-hosted **Chatterbox TTS** model running on serverless GPU infrastructure, stores the generated audio in **Cloudflare R2**, and tracks each generation in PostgreSQL. Users can then play back audio through an interactive waveform player and revisit their generation history at any time.

## Features

- 🎙️ **Text-to-speech generation** with adjustable voice parameters (temperature, top-p, top-k, repetition penalty)
- 🗣️ **20 built-in system voices**, deterministically avatared per voice
- 🌊 **Interactive waveform playback** via WaveSurfer.js, with download support
- 📜 **Generation history** — revisit and replay past generations, with relative timestamps
- 🏢 **Multi-tenant organizations** — auth and data are scoped per organization via Clerk
- 📱 **Responsive design** — dedicated mobile drawers for voice selection, settings, and history
- 🔭 **Full-stack observability** via Sentry (client, server, and edge)

## Architecture

```
Next.js (App Router) ──tRPC──> API layer ──> PostgreSQL (Prisma)
        │                                         │
        │                                    Generation / Voice records
        │
        └──> Chatterbox TTS (self-hosted, Modal GPU) ──> Cloudflare R2 (audio storage)
```

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, shadcn/ui (Radix primitives)
- **API layer:** tRPC (type-safe client-server calls), TanStack Query, TanStack Form + Zod validation
- **Database:** PostgreSQL via Prisma ORM
- **Auth & multi-tenancy:** Clerk (organizations, sessions, sign-in/up)
- **Voice model:** Self-hosted [Chatterbox TTS](https://github.com/resemble-ai/chatterbox) on [Modal](https://modal.com) (serverless GPU), served via FastAPI
- **Object storage:** Cloudflare R2 (S3-compatible) for reference and generated audio, accessed via presigned URLs
- **Audio playback:** WaveSurfer.js for interactive waveform rendering
- **Observability:** Sentry across client, server, and edge runtimes

## Tech Stack

| Layer | Technologies |
|---|---|
| Frontend | Next.js, React, TypeScript, Tailwind CSS, shadcn/ui |
| API | tRPC, TanStack Query, TanStack Form, Zod |
| Database | PostgreSQL, Prisma |
| Auth | Clerk |
| Voice Model | Chatterbox TTS (self-hosted on Modal, FastAPI) |
| Storage | Cloudflare R2 (AWS S3 SDK) |
| Audio | WaveSurfer.js |
| Monitoring | Sentry |

## Getting Started

```bash
# Install dependencies
npm install

# Set up environment variables (see below)
cp .env.example .env

# Run database migrations
npx prisma migrate dev

# Seed system voices (uploads to DB + R2)
npx tsx scripts/seed-system-voices.ts

# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The Chatterbox TTS model runs as a separate Python/Modal service (`chatterbox_tts.py`) and must be deployed independently — see that file for the FastAPI + Modal setup.

## Environment Variables

Key variables (validated via `@t3-oss/env-nextjs` in `src/lib/env.ts`):

- `DATABASE_URL` — PostgreSQL connection string
- Clerk keys (auth)
- Cloudflare R2 credentials (S3-compatible endpoint, access key, secret, bucket)
- Chatterbox TTS API URL and key

## Status

Core pipeline — text input → GPU inference → R2 storage → DB tracking → waveform playback — is fully functional end-to-end, including generation history. Voice cloning (uploading custom reference audio to create org-specific voices) and a dedicated voice browsing page are in progress.

## License

MIT
