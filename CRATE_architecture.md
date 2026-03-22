# CRATE — Architecture Document
> AI-powered music curation, queue management, and library organization for open-format DJs

---

## 1. Product Overview

CRATE is a taste-intelligence layer that sits on top of a DJ's existing platform subscriptions (DJCity, Beatport, SoundCloud). It reads their Spotify/Apple Music listening history to build a taste profile, uses that profile to surface personalized track recommendations from DJ-focused sources, and organizes downloaded tracks into a tagged, searchable local library with optional stem processing.

**Core loop:** Discover → Queue → Download → Organize

**MVP scope (v1.0):**
- Spotify OAuth integration for taste profiling
- AI-driven track recommendations surfaced from Beatport (public API) and SoundCloud
- Download queue manager (user must be logged into source platform)
- Auto-tagging of downloaded files (BPM, key, energy, genre, mood)
- Local library browser with filtering

**Post-MVP (v2.0+):**
- DJCity integration (partnership-dependent)
- Client-side stem separation via Demucs
- Rekordbox / Serato XML export
- Apple Music taste profile support
- Mobile companion app

---

## 2. Tech Stack

### Frontend
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **State management:** Zustand
- **Data fetching:** TanStack Query (React Query)
- **Desktop shell:** Tauri v2 (wraps the Next.js app for native file system access)

> Tauri is required for v1 because we need direct filesystem access for writing downloaded files and running local audio analysis. A pure web app cannot do this without a backend intermediary.

### Backend
- **Runtime:** Node.js with Fastify
- **Language:** TypeScript
- **ORM:** Drizzle ORM
- **Database:** SQLite (local, via better-sqlite3) — no cloud DB in v1, everything is local-first
- **Queue/jobs:** BullMQ with Redis (local Redis via embedded `ioredis`)
- **Auth:** Lucia Auth (handles Spotify OAuth token storage)

### AI / Audio Analysis
- **Taste profiling:** Anthropic Claude API (claude-sonnet-4-6) — used to synthesize Spotify listening data into a structured taste profile
- **Track recommendations:** Claude API — given taste profile + catalog metadata, ranks and explains picks
- **Audio analysis (local):** `music-metadata` npm package for BPM/key/duration extraction from downloaded files
- **Stem separation (v2):** Python subprocess calling Meta Demucs (runs locally, no API)

### External APIs
| Service | Usage | Auth method |
|---|---|---|
| Spotify Web API | Listening history, saved tracks, top artists | OAuth 2.0 PKCE |
| Beatport API | Track catalog search, metadata | API key (public) |
| SoundCloud API | Track search, stream URLs | OAuth 2.0 |
| Anthropic API | Taste profiling, recommendations | API key (user-provided or app key) |

---

## 3. System Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Tauri Desktop Shell                 │
│  ┌───────────────────────────────────────────────┐  │
│  │           Next.js Frontend (UI Layer)          │  │
│  │  Discover │ Queue │ Library │ Taste Profile    │  │
│  └──────────────────┬────────────────────────────┘  │
│                     │ HTTP / IPC                     │
│  ┌──────────────────▼────────────────────────────┐  │
│  │         Fastify Backend (Local Server)         │  │
│  │                                               │  │
│  │  ┌──────────┐  ┌──────────┐  ┌────────────┐  │  │
│  │  │  Taste   │  │Discovery │  │  Download  │  │  │
│  │  │ Service  │  │ Service  │  │   Queue    │  │  │
│  │  └────┬─────┘  └────┬─────┘  └─────┬──────┘  │  │
│  │       │             │               │          │  │
│  │  ┌────▼─────────────▼───────────────▼──────┐  │  │
│  │  │           SQLite (local DB)              │  │  │
│  │  └──────────────────────────────────────────┘  │  │
│  │                                               │  │
│  │  ┌──────────────────────────────────────────┐  │  │
│  │  │       BullMQ Job Queue (Redis local)     │  │  │
│  │  │  download-worker │ analysis-worker       │  │  │
│  │  └──────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │            Local Filesystem                   │  │
│  │  ~/Music/CRATE/                               │  │
│  │    ├── Hip-Hop/                               │  │
│  │    ├── R&B/                                   │  │
│  │    ├── Afrobeats/                             │  │
│  │    └── _stems/                                │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
         │                    │                │
    Spotify API         Beatport API     SoundCloud API
    (taste data)        (catalog)        (catalog)
         │
    Anthropic API
    (taste synthesis
     + ranking)
```

---

## 4. Directory Structure

```
crate/
├── apps/
│   ├── desktop/                  # Tauri shell
│   │   ├── src-tauri/
│   │   │   ├── src/
│   │   │   │   ├── main.rs
│   │   │   │   └── commands/     # Tauri IPC commands (file system, etc.)
│   │   │   └── tauri.conf.json
│   │   └── package.json
│   │
│   └── web/                      # Next.js frontend
│       ├── app/
│       │   ├── layout.tsx
│       │   ├── page.tsx           # Redirects to /discover
│       │   ├── discover/
│       │   │   └── page.tsx
│       │   ├── queue/
│       │   │   └── page.tsx
│       │   ├── library/
│       │   │   └── page.tsx
│       │   └── taste/
│       │       └── page.tsx
│       ├── components/
│       │   ├── track-card/
│       │   ├── queue-item/
│       │   ├── library-grid/
│       │   ├── taste-banner/
│       │   └── filter-chips/
│       ├── stores/
│       │   ├── queue.store.ts
│       │   ├── library.store.ts
│       │   └── taste.store.ts
│       └── lib/
│           └── api-client.ts     # Typed client for local backend
│
├── packages/
│   ├── backend/                  # Fastify local server
│   │   ├── src/
│   │   │   ├── index.ts          # Server entrypoint
│   │   │   ├── routes/
│   │   │   │   ├── discover.ts
│   │   │   │   ├── queue.ts
│   │   │   │   ├── library.ts
│   │   │   │   ├── taste.ts
│   │   │   │   └── auth.ts
│   │   │   ├── services/
│   │   │   │   ├── taste.service.ts
│   │   │   │   ├── discovery.service.ts
│   │   │   │   ├── download.service.ts
│   │   │   │   ├── analysis.service.ts
│   │   │   │   └── library.service.ts
│   │   │   ├── workers/
│   │   │   │   ├── download.worker.ts
│   │   │   │   └── analysis.worker.ts
│   │   │   ├── integrations/
│   │   │   │   ├── spotify.ts
│   │   │   │   ├── beatport.ts
│   │   │   │   └── soundcloud.ts
│   │   │   ├── ai/
│   │   │   │   ├── taste-profiler.ts
│   │   │   │   └── track-ranker.ts
│   │   │   └── db/
│   │   │       ├── schema.ts
│   │   │       ├── migrations/
│   │   │       └── index.ts
│   │   └── package.json
│   │
│   └── shared/                   # Shared types used by both frontend and backend
│       ├── types/
│       │   ├── track.ts
│       │   ├── taste-profile.ts
│       │   ├── queue.ts
│       │   └── library.ts
│       └── package.json
│
├── package.json                  # Monorepo root (pnpm workspaces)
├── pnpm-workspace.yaml
└── turbo.json
```

---

## 5. Data Models

### `tracks` table
```typescript
export const tracks = sqliteTable('tracks', {
  id: text('id').primaryKey(),              // UUID
  title: text('title').notNull(),
  artist: text('artist').notNull(),
  remixer: text('remixer'),
  label: text('label'),
  bpm: integer('bpm'),
  key: text('key'),                          // Camelot notation e.g. "2A"
  energy: real('energy'),                    // 0.0 - 1.0
  durationMs: integer('duration_ms'),
  genre: text('genre'),
  subgenre: text('subgenre'),
  mood: text('mood'),                        // AI-generated: "hype" | "vibes" | "smooth" | "dark" etc.
  sourceUrl: text('source_url'),
  sourcePlatform: text('source_platform'),   // "beatport" | "soundcloud" | "djcity"
  localPath: text('local_path'),             // Absolute path after download
  hasStem_vocals: integer('has_stem_vocals', { mode: 'boolean' }).default(false),
  hasStem_instrumental: integer('has_stem_instrumental', { mode: 'boolean' }).default(false),
  hasStem_drums: integer('has_stem_drums', { mode: 'boolean' }).default(false),
  hasStem_bass: integer('has_stem_bass', { mode: 'boolean' }).default(false),
  artworkUrl: text('artwork_url'),
  releaseDate: text('release_date'),
  downloadedAt: integer('downloaded_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
});
```

### `taste_profile` table
```typescript
export const tasteProfile = sqliteTable('taste_profile', {
  id: text('id').primaryKey().default('singleton'),   // Only one row
  spotifyUserId: text('spotify_user_id'),
  rawListeningData: text('raw_listening_data'),        // JSON blob from Spotify
  genreBreakdown: text('genre_breakdown'),             // JSON: { "Hip-Hop": 0.82, "R&B": 0.61 }
  bpmMin: integer('bpm_min'),
  bpmMax: integer('bpm_max'),
  preferredKeys: text('preferred_keys'),               // JSON: ["2A", "1A", "4A"]
  energyPreference: real('energy_preference'),          // 0.0 - 1.0
  stemPreferences: text('stem_preferences'),            // JSON: ["vocals", "instrumental"]
  editPreferences: text('edit_preferences'),            // JSON: ["clean", "dj-edit", "transition"]
  aiSummary: text('ai_summary'),                        // Claude-generated natural language summary
  lastSyncedAt: integer('last_synced_at', { mode: 'timestamp' }),
  updatedAt: integer('updated_at', { mode: 'timestamp' }),
});
```

### `queue_items` table
```typescript
export const queueItems = sqliteTable('queue_items', {
  id: text('id').primaryKey(),
  trackId: text('track_id').references(() => tracks.id),
  status: text('status').notNull().default('pending'),
    // "pending" | "downloading" | "analyzing" | "done" | "error"
  progressPct: integer('progress_pct').default(0),
  wantFullTrack: integer('want_full_track', { mode: 'boolean' }).default(true),
  wantStemVocals: integer('want_stem_vocals', { mode: 'boolean' }).default(false),
  wantStemInstrumental: integer('want_stem_instrumental', { mode: 'boolean' }).default(false),
  wantStemDrums: integer('want_stem_drums', { mode: 'boolean' }).default(false),
  wantStemBass: integer('want_stem_bass', { mode: 'boolean' }).default(false),
  errorMessage: text('error_message'),
  addedAt: integer('added_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
});
```

### `playlists` + `playlist_tracks` tables
```typescript
export const playlists = sqliteTable('playlists', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: integer('created_at', { mode: 'timestamp' }),
});

export const playlistTracks = sqliteTable('playlist_tracks', {
  playlistId: text('playlist_id').references(() => playlists.id),
  trackId: text('track_id').references(() => tracks.id),
  position: integer('position').notNull(),
});
```

---

## 6. Core Services

### `TasteService`
**Responsibility:** Fetch Spotify data → synthesize taste profile via Claude

```typescript
// packages/backend/src/services/taste.service.ts

class TasteService {
  // Fetches top tracks, top artists, recently played from Spotify API
  async fetchSpotifyListeningData(accessToken: string): Promise<RawListeningData>

  // Calls Claude API to synthesize raw data into structured TasteProfile
  async synthesizeProfile(rawData: RawListeningData): Promise<TasteProfile>

  // Stores profile in SQLite
  async saveProfile(profile: TasteProfile): Promise<void>

  // Returns current profile
  async getProfile(): Promise<TasteProfile | null>
}
```

**Claude prompt strategy for taste synthesis:**
- Send Spotify top tracks/artists as structured JSON
- Ask Claude to extract: dominant genres with confidence scores, BPM range, energy level, preferred Camelot keys (if track audio features available), edit type preferences
- Return as strict JSON matching `TasteProfile` schema
- Use `claude-sonnet-4-6` with `max_tokens: 1000`

### `DiscoveryService`
**Responsibility:** Search catalogs using taste profile, rank and return results

```typescript
class DiscoveryService {
  // Queries Beatport and SoundCloud in parallel based on taste profile
  async fetchCandidates(profile: TasteProfile, filters: DiscoveryFilters): Promise<RawTrack[]>

  // Calls Claude to rank and annotate candidates against the taste profile
  async rankWithAI(candidates: RawTrack[], profile: TasteProfile): Promise<RankedTrack[]>

  // Returns final sorted, annotated feed
  async getDiscoverFeed(filters: DiscoveryFilters): Promise<RankedTrack[]>
}
```

**Claude prompt strategy for ranking:**
- Send taste profile summary + array of candidate track metadata (title, artist, BPM, key, genre)
- Ask Claude to score each 0-100 and add a one-word mood tag
- Flag top 3 as "top pick"
- Return as JSON array

### `DownloadService`
**Responsibility:** Manage the download queue, write files to disk

```typescript
class DownloadService {
  // Adds a track to the queue with selected stem options
  async addToQueue(trackId: string, options: QueueOptions): Promise<QueueItem>

  // Called by download worker — fetches file from source URL and saves to disk
  async downloadTrack(queueItemId: string): Promise<string>  // returns local path

  // Determines target folder based on genre
  resolveTargetPath(track: Track): string

  // Returns all queue items with current status
  async getQueue(): Promise<QueueItem[]>
}
```

**File organization convention:**
```
~/Music/CRATE/
  {Genre}/
    {Artist} - {Title} ({BPM}bpm {Key}).mp3
  _stems/
    {Artist} - {Title}/
      vocals.wav
      instrumental.wav
      drums.wav
      bass.wav
```

### `AnalysisService`
**Responsibility:** Post-download audio analysis and auto-tagging

```typescript
class AnalysisService {
  // Extracts BPM, key, duration from audio file using music-metadata
  async analyzeFile(filePath: string): Promise<AudioMetadata>

  // Uses Claude to infer mood tag from title + artist + genre
  async inferMoodTag(track: Partial<Track>): Promise<string>

  // Updates track record in DB with all extracted metadata
  async tagTrack(trackId: string, filePath: string): Promise<Track>
}
```

---

## 7. Authentication Flow

### Spotify OAuth (PKCE)
1. User clicks "Connect Spotify" in Taste Profile tab
2. App opens Spotify auth URL in system browser via Tauri's `shell.open()`
3. Spotify redirects to `crate://auth/spotify/callback` (custom protocol registered in Tauri)
4. Tauri intercepts the deep link, extracts `code` parameter
5. Backend exchanges code for access + refresh tokens
6. Tokens stored in SQLite via Lucia Auth session table
7. Refresh token rotation handled automatically on each API call

**Scopes required:**
```
user-top-read
user-read-recently-played
user-library-read
```

---

## 8. API Route Definitions

```
GET  /api/taste/profile              — Returns current taste profile
POST /api/taste/sync                 — Triggers fresh Spotify sync + AI synthesis
PUT  /api/taste/preferences          — Manual override of profile fields

GET  /api/discover                   — Returns ranked feed (query: source, bpmMin, bpmMax, genre, stemsOnly)
GET  /api/discover/search            — Free text search against catalogs

GET  /api/queue                      — All queue items with status
POST /api/queue                      — Add track(s) to queue { trackId, options }
DELETE /api/queue/:id                — Remove item from queue
POST /api/queue/:id/retry            — Retry a failed download

GET  /api/library/tracks             — Paginated track list (query: genre, bpmMin, bpmMax, key, mood, hasStems)
GET  /api/library/tracks/:id         — Single track detail
DELETE /api/library/tracks/:id       — Remove from library (does NOT delete file)
GET  /api/library/stats              — { totalTracks, withStems, playlists, genres }

GET  /api/library/playlists          — All playlists
POST /api/library/playlists          — Create playlist
POST /api/library/playlists/:id/export/rekordbox  — Export as Rekordbox XML
POST /api/library/playlists/:id/export/serato     — Export as Serato crate

GET  /api/auth/spotify/login         — Returns Spotify auth URL
GET  /api/auth/spotify/callback      — Handles OAuth callback
DELETE /api/auth/spotify             — Disconnect Spotify
```

---

## 9. Job Queue Architecture

Using BullMQ with two queues:

### `download-queue`
**Concurrency:** 2 (avoids rate limiting on source platforms)
**Jobs:**
```typescript
interface DownloadJob {
  queueItemId: string
  trackId: string
  sourceUrl: string
  targetPath: string
  stemOptions: StemOptions
}
```
**Flow:**
1. Job added when user queues a track
2. Worker fetches file via authenticated HTTP request (user's session cookie for source platform)
3. Streams to disk at `targetPath`
4. On completion, emits `download:complete` event
5. Triggers `analysis-queue` job

### `analysis-queue`
**Concurrency:** 4 (CPU-bound but light)
**Jobs:**
```typescript
interface AnalysisJob {
  trackId: string
  filePath: string
}
```
**Flow:**
1. Triggered after successful download
2. Runs `music-metadata` on the file
3. Calls Claude for mood tag inference
4. Updates `tracks` record in SQLite
5. Emits `analysis:complete` — frontend refreshes library

**Frontend receives real-time updates via:**
Server-Sent Events (SSE) endpoint at `GET /api/events` — streams queue status changes to the frontend without WebSocket complexity.

---

## 10. Beatport Integration Notes

Beatport has a **public catalog API** that doesn't require a user subscription to query metadata and search tracks. Purchasing/downloading still requires the user to be logged into Beatport.

```typescript
// packages/backend/src/integrations/beatport.ts

const BEATPORT_API_BASE = 'https://api.beatport.com/v4'

// Search tracks by genre + BPM range + key
GET /catalog/tracks/?genre_ids={id}&bpm_range={min},{max}&key={camelot}&per_page=50

// Get track detail (includes preview URL, full metadata)
GET /catalog/tracks/{id}/
```

**Key fields available from Beatport API:**
- `bpm`, `key`, `genre`, `sub_genre`, `label`, `release_date`
- `mix_name` (e.g. "Extended Mix", "Club Mix", "Radio Edit") — use to filter DJ-friendly edits
- `preview.mp3_url` — 90-second preview (useful for confirmation before queue)

**Note on downloading:** In v1, the download button opens the Beatport track page in the user's default browser. The user completes the download manually. Full automation (clicking through their authenticated Beatport session) is v2 after formal partnership/API access.

---

## 11. SoundCloud Integration Notes

SoundCloud's public API v2 supports searching and resolving track metadata. Stream URLs require a client ID.

```typescript
// packages/backend/src/integrations/soundcloud.ts

// Search
GET https://api-v2.soundcloud.com/search/tracks?q={query}&filter.genre={genre}&client_id={id}

// Resolve stream URL
GET https://api-v2.soundcloud.com/tracks/{id}/streams?client_id={id}
// Returns { http_mp3_128_url, hls_mp3_128_url, hls_opus_64_url }
```

SoundCloud tracks tagged as "Free Download" can be directly downloaded. Others are stream-only — the worker will stream-to-file in that case. Note: streaming-to-file of non-free tracks is a gray area; document clearly in app ToS that users are responsible for only downloading tracks they are licensed to use.

---

## 12. AI Integration Details

### Anthropic Claude usage points

| Feature | Model | Prompt type | Approx tokens/call |
|---|---|---|---|
| Taste synthesis | claude-sonnet-4-6 | Structured JSON in, JSON out | ~2,000 input / 800 output |
| Track ranking | claude-sonnet-4-6 | Batch candidates in, scored JSON out | ~3,000 input / 500 output |
| Mood tag inference | claude-sonnet-4-6 | Single track metadata in, one word out | ~200 input / 10 output |

### Rate limiting strategy
- Taste synthesis: runs once per sync (user-triggered), not per track
- Track ranking: debounced — runs max once every 30 seconds on discover feed, caches results
- Mood tagging: queued via BullMQ, max 10 concurrent, results cached per track permanently

---

## 13. MVP Build Order

Recommended sequence for Claude Code:

1. **Monorepo scaffolding** — pnpm workspaces, Turbo, shared types package
2. **SQLite schema + migrations** — Drizzle schema, all four tables
3. **Fastify backend skeleton** — all routes stubbed, health check working
4. **Spotify OAuth flow** — PKCE, token storage, refresh rotation
5. **Taste service** — Spotify data fetch + Claude synthesis + DB write
6. **Beatport integration** — search endpoint, metadata normalization
7. **Discovery service** — parallel catalog search + Claude ranking
8. **Next.js frontend — Discover tab** — taste banner, filter chips, track list
9. **Queue service + BullMQ workers** — download worker (browser-open v1), analysis worker
10. **Next.js frontend — Queue tab** — real-time SSE updates, stem toggles
11. **Analysis service** — music-metadata extraction, mood tagging
12. **Library service + frontend** — grid view, filtering, stats
13. **Taste Profile tab** — genre breakdown bars, preference display, resync button
14. **Tauri shell** — wrap Next.js app, register deep link protocol, file system permissions
15. **Rekordbox XML export** — playlist export for DJ software handoff

---

## 14. Environment Variables

```bash
# .env (local development)

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Spotify OAuth
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
SPOTIFY_REDIRECT_URI=crate://auth/spotify/callback

# Beatport
BEATPORT_CLIENT_ID=
BEATPORT_CLIENT_SECRET=

# SoundCloud
SOUNDCLOUD_CLIENT_ID=

# App
PORT=4242
DATABASE_URL=./crate.db
LIBRARY_ROOT_PATH=~/Music/CRATE
REDIS_URL=redis://localhost:6379

# Feature flags
ENABLE_STEMS=false           # v2
ENABLE_DJCITY=false          # partnership-dependent
```

---

## 15. Key Constraints & Notes

- **Local-first:** All data stays on the user's machine. No cloud sync, no user accounts, no telemetry in v1. This sidesteps GDPR complexity and makes the copyright story cleaner.
- **User owns their downloads:** CRATE only processes files the user legitimately acquires through their own subscriptions. State this clearly in ToS and onboarding.
- **No scraping:** v1 uses only public APIs and browser-open for download completion. No session hijacking or automated platform navigation.
- **Stems in v2 only:** Demucs requires Python runtime and ~2GB model weights. Too heavy for v1 onboarding. Introduce as an opt-in feature with clear setup instructions.
- **Beatport/Beatsource merger:** As of March 2026, Beatsource is merging into Beatport. Target Beatport API only — it will cover open-format catalog going forward.
- **Spotify API caveat:** Spotify has historically restricted third-party DJ software integrations. Use only the `user-top-read` and `user-read-recently-played` scopes for taste analysis — do not attempt to play or stream Spotify audio inside CRATE.
