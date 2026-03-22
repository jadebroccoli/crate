# Crate — AI-Powered Music Curation for Open-Format DJs

## Project Overview
Desktop app (Electron-ready) that helps DJs discover and curate music using AI. Built as a pnpm monorepo:
- `apps/web` — Next.js frontend (port 3000)
- `packages/backend` — Fastify API server (port 4242)
- `packages/shared` — Shared types

## Tech Stack
- **Frontend**: Next.js (app router), React Query (TanStack), Zustand (player store), inline CSS with design tokens
- **Backend**: Fastify, Drizzle ORM, SQLite (`@libsql/client`), manual SQL migrations
- **AI**: Anthropic Claude API (`claude-sonnet-4-20250514`) for taste profiling + track ranking
- **Design**: Dark theme (#0e0c08 bg, #e8a020 accent), Barlow Condensed for UI labels, JetBrains Mono for metadata, uppercase section labels

## Running the App
```bash
# Backend (dotenv loads from packages/backend/.env but ANTHROPIC_API_KEY may need explicit passing)
cd C:/Projects/Crate
ANTHROPIC_API_KEY="your-api-key" npx tsx packages/backend/src/index.ts

# Frontend
cd apps/web && pnpm dev
```

## Architecture

### Music Service Integrations (all working)
- **Spotify**: OAuth PKCE flow with Web Playback SDK for full-length playback (Premium required). Scopes: `user-top-read`, `user-read-recently-played`, `user-library-read`, `streaming`, `user-read-playback-state`, `user-modify-playback-state`. Redirect URI: `http://127.0.0.1:3000/callback` (NOT localhost — doesn't work with Spotify). State stored in-memory (lost on restart). Routes in `packages/backend/src/routes/auth.ts`.
- **Beatport**: Reverse-engineered auth (login → scrape client_id → authorize → token exchange). Username/password stored in DB. Has redirect URI mismatch issue but server-side flow works. Client in `packages/backend/src/integrations/beatport.ts`.
- **SoundCloud**: Unofficial API v2. Client_id auto-scraped from web app JS bundles (no config needed). Profile URL linking for taste profiling (likes import). `getSoundCloudClient()` is async, use `getSoundCloudClientSync()` for sync contexts. Client in `packages/backend/src/integrations/soundcloud.ts`.

### Core Pipeline (working end-to-end)
1. User connects Spotify → syncs listening history
2. AI generates taste profile (genre breakdown, BPM range, energy, keys)
3. Discover tab searches Beatport + SoundCloud + Spotify for tracks
4. Pipeline: fetchCandidates → dedup → filter dismissed → filter known → AI rank (max 40)
5. AI ranks tracks against taste profile (score 0-100, mood tags, top picks)

### Music Player
- **Zustand store** (`apps/web/src/stores/player.store.ts`): currentTrack, isPlaying, progress, duration, currentTime, volume, error state
- **Audio player hook** (`apps/web/src/hooks/use-audio-player.ts`): Singleton HTMLAudioElement for SoundCloud/Beatport, delegates to Spotify SDK for Spotify tracks
- **Spotify SDK hook** (`apps/web/src/hooks/use-spotify-sdk.ts`): Web Playback SDK lifecycle — loads SDK script, creates virtual Spotify Connect device, manages playback via Web API, progress polling every 500ms
- **Player bar** (`apps/web/src/components/player/PlayerBar.tsx`): Fixed bottom bar with artwork, title/artist, play/pause, progress bar (seekable), volume slider, error display
- **Stream routes** (`packages/backend/src/routes/stream.ts`): `GET /api/stream/soundcloud/:trackId` resolves stream URL, `GET /api/stream/spotify/token` returns valid access token for SDK

### Discover Feed Features
- **Dismiss track**: "✕" button on each track card, persisted in `dismissed_tracks` DB table, optimistic React Query cache update, fade-out animation
- **Skip known tracks**: `KnownTracksService` (`packages/backend/src/services/known-tracks.service.ts`) syncs Spotify saved tracks + SoundCloud likes into in-memory Sets with 1-hour TTL. Filters by exact ID match and fuzzy title+artist match (strips "(Original Mix)", "(Remix)", etc.)
- **Loading animation**: `CrateLoader` component — 3x3 grid of amber squares stacking up with "DIGGING FOR TRACKS..." text

### Database
- SQLite via Drizzle ORM
- `authSessions` table supports multi-provider: id='spotify'|'beatport'|'soundcloud'
- `dismissedTracks` table: id, externalId, sourcePlatform, dismissedAt (unique index on externalId+sourcePlatform)
- Migrations in `packages/backend/src/db/migrations/` (0000-0003)

### Key Files
- `packages/backend/src/routes/auth.ts` — All auth routes + `initServiceConnections()` boot-time restoration
- `packages/backend/src/routes/discover.ts` — Discover feed + dismiss + search endpoints
- `packages/backend/src/routes/stream.ts` — SoundCloud stream resolution + Spotify token endpoint
- `packages/backend/src/services/discovery.service.ts` — Discover feed pipeline (fetch → dedup → dismiss → known → AI rank)
- `packages/backend/src/services/known-tracks.service.ts` — Known tracks filter (Spotify saved + SoundCloud likes)
- `packages/backend/src/integrations/spotify.ts` — Spotify API client (OAuth, search, saved tracks, recommendations)
- `packages/backend/src/ai/taste-profiler.ts` — Claude-powered taste analysis
- `packages/backend/src/ai/track-ranker.ts` — Claude-powered track scoring
- `apps/web/src/hooks/use-api.ts` — All React Query hooks (including useDismissTrack)
- `apps/web/src/hooks/use-audio-player.ts` — Audio player hook (HTMLAudioElement + Spotify SDK integration)
- `apps/web/src/hooks/use-spotify-sdk.ts` — Spotify Web Playback SDK lifecycle hook
- `apps/web/src/stores/player.store.ts` — Zustand player state store
- `apps/web/src/lib/api-client.ts` — API client with all endpoints
- `apps/web/src/components/discover/TrackCard.tsx` — Track card with play, download, stems, dismiss buttons
- `apps/web/src/components/discover/DiscoverView.tsx` — Main discover page with filters and track list
- `apps/web/src/components/discover/CrateLoader.tsx` — Animated loading spinner
- `apps/web/src/components/player/PlayerBar.tsx` — Fixed bottom player bar
- `apps/web/src/components/layout/Topbar.tsx` — Nav with gear icon for settings
- `apps/web/src/components/taste/TasteView.tsx` — Taste profile with 40+ genre colors
- `apps/web/src/components/settings/SettingsView.tsx` — Settings page with 3 connection cards
- `apps/web/app/callback/page.tsx` — Spotify OAuth callback handler (forwards code to backend)
- `apps/web/src/types/spotify-sdk.d.ts` — TypeScript declarations for Spotify Web Playback SDK

### Design Tokens (from `design/crate-tokens.css`)
- CSS variables: `--c-bg`, `--c-surface`, `--c-accent`, `--c-text-primary`, `--c-border`, etc.
- Font families: `--font-ui` (Barlow Condensed), `--font-meta` (JetBrains Mono)
- Radii: `--radius-md`, `--radius-lg`

## Current Status — What's Done
- [x] Settings page with Spotify/Beatport/SoundCloud connection cards
- [x] Spotify OAuth connect + disconnect (PKCE flow)
- [x] Beatport username/password login + disconnect
- [x] SoundCloud auto-scrape client_id + profile URL linking + disconnect
- [x] Taste profile sync from Spotify listening history
- [x] AI taste profiling (genre breakdown, BPM, energy, keys)
- [x] Discover tab with AI-ranked tracks from Beatport + SoundCloud + Spotify
- [x] Genre color coding (40+ genres with deterministic fallback)
- [x] Track ranker with robust JSON parsing (handles markdown fences, partial responses)
- [x] Boot-time service restoration from DB
- [x] Music player bar with play/pause, progress seek, volume, artwork, error states
- [x] SoundCloud stream playback via backend stream URL resolution
- [x] Spotify Web Playback SDK integration (full-length playback for Premium users)
- [x] Dismiss track button ("✕") with fade animation + DB persistence
- [x] Skip known tracks (Spotify saved + SoundCloud likes, exact + fuzzy matching)
- [x] Animated loading component (CrateLoader)
- [x] Spotify OAuth callback page for web (http://127.0.0.1:3000/callback)

## Next Up — TODO
- [ ] **Taste profile sync after Spotify connect** — Currently need to manually trigger sync; should auto-sync after OAuth callback completes
- [ ] **DJ City integration** — Members-only record pool, no public API. Would need reverse-engineered auth similar to Beatport. Phase 2 item.
- [ ] **PKCE state persistence** — Currently in-memory, lost on backend restart
- [ ] **dotenv loading fix** — API key requires explicit env var on command line
- [ ] **Rekordbox XML export** — 501 stub exists
- [ ] **Serato crate export** — 501 stub exists
- [ ] **Frameless window with custom titlebar** — For Electron packaging

## Known Issues
- Beatport auth has redirect URI mismatch at authorize step (server-side flow works around it)
- Spotify PKCE state stored in-memory Map — lost on backend restart, user must re-click Connect
- Spotify redirect URI MUST use `http://127.0.0.1:3000/callback` (NOT localhost — Spotify rejects localhost)
- ANTHROPIC_API_KEY must be passed as explicit env var (dotenv not loading reliably)
- SoundCloud client_id scraping may break if SoundCloud changes their JS bundle structure
- SoundCloud stream URLs may return 404 (stale/blocked client_id — platform limitation)
- Spotify 30-sec preview URLs are largely deprecated (null in API responses) — Web Playback SDK handles full playback instead
- After HMR changes to hooks (adding/removing hooks in useAudioPlayer), Next.js dev server needs full restart to clear "changed hook order" React error

## Environment Variables (packages/backend/.env)
```
ANTHROPIC_API_KEY=sk-ant-...
SPOTIFY_CLIENT_ID=your-spotify-client-id
SPOTIFY_CLIENT_SECRET=your-spotify-client-secret
SPOTIFY_REDIRECT_URI=http://127.0.0.1:3000/callback
PORT=4242
DATABASE_URL=file:./crate.db
```
