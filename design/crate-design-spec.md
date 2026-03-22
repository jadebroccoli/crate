# CRATE — Design Specification
> Hand-off document for Claude Code. Implement each section exactly as described. All colour values, spacing, and typography reference `crate-design-tokens.css` — import that file at the app root before touching any component.

---

## 0. Setup

### Font imports
Loaded via `@import` in `design-tokens.css`. Three typefaces are in use:

| Role | Family | Weights | Usage |
|---|---|---|---|
| Wordmark | Fraunces | 600 italic | App name / logo only |
| UI labels | Barlow Condensed | 700, 800 | All tabs, badges, buttons, section headers, track titles, stat numbers |
| Metadata | JetBrains Mono | 400, 500 | BPM, key, file size, paths, artist names, timestamps |

**Rule:** never use Fraunces for anything except the wordmark. Never use a system font anywhere visible.

### Tauri window
- Minimum window size: 680 × 520px
- Default window size: 800 × 640px
- Frameless window with custom titlebar is preferred; if not, use native frame
- Background colour: `#0e0c08` (set in `tauri.conf.json` as `backgroundColor`)

### Layout
```
┌─────────────────────────────────────────┐
│  Topbar (56px)                          │
│  ├── Logo mark (24px) + Wordmark        │
│  └── [future: search / user avatar]    │
├─────────────────────────────────────────┤
│  Tab bar (40px)                         │
│  └── Discover │ Queue [n] │ Library │ Taste profile
├─────────────────────────────────────────┤
│  Content area (flex: 1, overflow-y auto)│
│  padding: 20px 24px                     │
└─────────────────────────────────────────┘
```
Max content width: `760px`, centred.

---

## 1. Topbar

**Height:** 56px  
**Background:** `var(--color-bg)` with `border-bottom: var(--border-subtle)`  
**Padding:** `0 24px`

### Logo mark (SVG icon)
Render as inline SVG. A 3×3 grid of rectangles fading diagonally top-left → bottom-right. Exact values:

```
viewBox="0 0 24 24"
Cell size: 6px × 6px, border-radius: 1px, gap: 2px
Grid starts at x=2, y=2

Row 1: opacity 1.0 / 0.7 / 0.4
Row 2: opacity 0.7 / 0.4 / 0.2
Row 3: opacity 0.4 / 0.2 / 0.08
All cells: fill="#e8a020"
```

```jsx
// Icon component — copy this exactly
export function CrateIcon({ size = 24 }: { size?: number }) {
  const cells = [
    [2,  2,  1.0], [10, 2,  0.7], [18, 2,  0.4],
    [2,  10, 0.7], [10, 10, 0.4], [18, 10, 0.2],
    [2,  18, 0.4], [10, 18, 0.2], [18, 18, 0.08],
  ]
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {cells.map(([x, y, opacity], i) => (
        <rect key={i} x={x} y={y} width="6" height="6" rx="1"
          fill="#e8a020" opacity={opacity} />
      ))}
    </svg>
  )
}
```

### Wordmark
```jsx
<span style={{
  fontFamily: 'var(--font-wordmark)',
  fontStyle: 'italic',
  fontWeight: 600,
  fontSize: '20px',
  color: 'var(--color-text-primary)',
  letterSpacing: '-0.01em',
}}>Crate</span>
```

---

## 2. Tab bar

**Height:** 40px  
**Background:** `var(--color-bg)`  
**Border bottom:** `1px solid rgba(240, 234, 216, 0.07)`  
**Padding left:** `24px`

### Tab item
```
font-family: Barlow Condensed
font-size: 11px
font-weight: 700
text-transform: uppercase
letter-spacing: 0.08em
padding: 0 16px (first tab: padding-left 0)
height: 100%
display: flex, align-items: center
cursor: pointer
```

**States:**
- Default: `color: rgba(240,234,216,0.28)`, no border
- Active: `color: #e8a020`, `border-bottom: 2px solid #e8a020`
- Hover (non-active): `color: rgba(240,234,216,0.55)`, transition 0.15s

### Queue badge (count pill)
Sits inline right of "Queue" label text.
```
background: rgba(108,140,196,0.12)
color: #6c8cc4
border: 1px solid rgba(108,140,196,0.25)
font-size: 9px
font-weight: 700
padding: 1px 5px
border-radius: 3px
margin-left: 5px
font-family: Barlow Condensed
text-transform: uppercase
```
Only visible when queue count > 0.

---

## 3. Discover view

### 3.1 Taste banner

Full-width card at top of content area.  
```
background: var(--color-surface)
border: var(--border-subtle)
border-left: 2px solid var(--color-accent)
border-radius: var(--radius-lg)
padding: 11px 14px
margin-bottom: 16px
display: flex, align-items: center, gap: 12px
```

**Avatar:**
```
width: 34px, height: 34px
border-radius: 50%
background: #221e14
font-family: Barlow Condensed, font-size: 9px, font-weight: 800
color: #e8a020, letter-spacing: 0.05em, text-transform: uppercase
```

**Connection label:**
```
font-family: Barlow Condensed
font-size: 13px, font-weight: 700
text-transform: uppercase, letter-spacing: 0.03em
color: var(--color-text-primary)
```

**Sub-label (track count + sync time):**
```
font-family: JetBrains Mono
font-size: 10px
color: rgba(240,234,216,0.35)
margin-top: 2px
```

**Genre badges:** use `.badge .badge-accent`, `.badge .badge-rnb`, `.badge .badge-afro` from tokens. Displayed right-aligned, flex-wrap allowed.

### 3.2 Filter row

```
display: flex, gap: 8px, flex-wrap: wrap
align-items: center
margin-bottom: 16px
```

**"Source:" label:**
```
font-family: Barlow Condensed
font-size: 11px, font-weight: 700
text-transform: uppercase, letter-spacing: 0.06em
color: var(--color-text-muted)
```

**Filter chips:**  
Same markup as `.badge`. Toggle between `.badge-solid` (active) and `.badge-pending` (inactive) on click.

Right-aligned chips ("Stems only", "New this week") use `margin-left: auto` on the first one.

### 3.3 Section label
```
font-family: Barlow Condensed
font-size: 9px, font-weight: 700
text-transform: uppercase, letter-spacing: 0.12em
color: rgba(240,234,216,0.28)
margin-bottom: 10px
```
Format: `AI PICKS FOR YOU · {n} TRACKS`

### 3.4 Track card

```
background: var(--color-surface)
border-radius: var(--radius-md) [5px]
padding: 9px 12px
display: flex, align-items: center, gap: 12px
transition: background 0.12s
```
Hover: `background: var(--color-surface-2)`

**"Top pick" variant:** add `border-left: 2px solid var(--color-accent)` (or `--color-genre-rnb` if the top pick is an R&B track).

**Layout left → right:**

1. **Art thumbnail**
   ```
   width: 36px, height: 36px
   background: var(--color-surface-2)
   border-radius: 4px, flex-shrink: 0
   ```
   When artwork available: `<img>` with `object-fit: cover`.  
   When no artwork: show `CrateIcon` at 16px centred, `opacity: 0.2`.

2. **Title + artist block** (`flex: 1, min-width: 0`)
   - Title: `font-family: Barlow Condensed, font-size: 14px, font-weight: 700, color: var(--color-text-primary), letter-spacing: 0.01em` — truncate with ellipsis
   - Artist: `font-family: JetBrains Mono, font-size: 10px, color: rgba(240,234,216,0.38), margin-top: 1px`

3. **"Top pick" badge** (conditional): `.badge .badge-accent`, text "TOP PICK"

4. **BPM + key** (`flex-shrink: 0`, `text-align: right`)
   - BPM number: `font-family: JetBrains Mono, font-size: 13px, font-weight: 700` — colour matches genre accent if top pick, else `rgba(240,234,216,0.45)`
   - "BPM {key}" label: `font-family: JetBrains Mono, font-size: 9px, color: rgba(240,234,216,0.28), margin-top: 2px`

5. **Mini waveform** (5 bars, heights randomised per track but fixed per render — derive from track ID)
   ```
   width: 36px, height: 26px, flex-shrink: 0
   display: flex, align-items: flex-end, gap: 2px
   ```
   Each bar: `width: 5px, border-radius: 1px`  
   Active (top pick): `background: var(--color-accent)` or genre colour  
   Passive: `background: rgba(240,234,216,0.12)`

6. **Source badge**: `.badge` with custom colours:
   - Beatport: `background: rgba(232,160,32,0.1), color: #c89018, border: 1px solid rgba(232,160,32,0.2)`
   - SoundCloud: `background: rgba(196,108,52,0.1), color: #c46c34, border: 1px solid rgba(196,108,52,0.2)`
   - DJCity: `background: rgba(108,140,196,0.1), color: #6c8cc4, border: 1px solid rgba(108,140,196,0.2)`

7. **Stems button (S)**
   ```
   width: 26px, height: 26px
   border-radius: var(--radius-sm)
   border: 1px solid rgba(232,160,32,0.25)
   background: rgba(232,160,32,0.1)
   color: #e8a020
   font-family: Barlow Condensed, font-size: 11px, font-weight: 800
   cursor: pointer
   flex-shrink: 0
   ```
   Hover: `background: #e8a020, color: #0e0c08`

8. **Download button (↓)**
   ```
   width: 26px, height: 26px
   border-radius: var(--radius-sm)
   border: 1px solid rgba(240,234,216,0.14)
   background: transparent
   color: rgba(240,234,216,0.45)
   font-size: 13px
   cursor: pointer
   flex-shrink: 0
   ```
   Hover: `background: var(--color-surface-2), color: var(--color-text-primary), border-color: rgba(240,234,216,0.3)`

### 3.5 Bottom action row
```
margin-top: 14px
display: flex, gap: 8px
```
- "Add all to queue ↓" → `.btn` (ghost)
- "Download all with stems" → `.btn .btn-primary`

---

## 4. Queue view

### 4.1 Header row
```
display: flex, align-items: flex-start, justify-content: space-between
margin-bottom: 14px
```

**Title:**
```
font-family: Barlow Condensed
font-size: 20px, font-weight: 800
text-transform: uppercase, letter-spacing: 0.02em
color: var(--color-text-primary)
```

**Sub-label** (track count + status):
```
font-family: JetBrains Mono, font-size: 10px
color: rgba(240,234,216,0.35), margin-top: 2px
```

**Toggle pills** ("Auto-organize", "Auto-tag") — use `.badge .badge-accent` when on, `.badge .badge-pending` when off. Clickable.

### 4.2 Queue item card
```
background: var(--color-surface)
border-radius: var(--radius-lg)
padding: 12px 14px
border: var(--border-subtle)
margin-bottom: 8px
```

**Item header** (`display: flex, align-items: center, gap: 10px, margin-bottom: 10px`):
- Art thumbnail: 32×32px, `border-radius: 4px`, `background: var(--color-surface-2)`
- Title block (`flex: 1`): title in Barlow Condensed 13px 700, source + filesize in JetBrains Mono 10px muted
- Status badge: `.badge` + state class (`.badge-download` / `.badge-pending` / `.badge-done`)

**Progress bar:** `.progress-track` → `.progress-fill` (or `.progress-fill--done`). Width driven by `progressPct` from store.

**Stem toggle row** (`display: flex, gap: 5px, flex-wrap: wrap, margin-top: 10px`):
Active stems: `.badge .badge-solid`  
Inactive stems: `.badge .badge-pending` (clickable to toggle)

**Done state** — replace progress bar and stem row with:
```
margin-top: 7px
font-family: JetBrains Mono, font-size: 10px
color: var(--color-status-done)
content: "saved to /Library/{genre} · tagged automatically"
```

**Footer note** (below all items):
```
font-family: Barlow Condensed, font-size: 11px
color: rgba(240,234,216,0.28)
margin-top: 8px
```
Text: "Completed files land in your library, tagged and organized by BPM, key, and energy."

---

## 5. Library view

### 5.1 Stats grid
```
display: grid
grid-template-columns: repeat(4, 1fr)
gap: 8px
margin-bottom: 14px
```
Use `.stat-card` from tokens. Four cards: Total tracks / With stems / Playlists / Genres.

### 5.2 Filter chip row
Same pattern as Discover filter row. Chips: All / Hip-Hop / R&B / Afrobeats / Has stems / High energy.
"All" starts as `.badge-solid`. Others start as `.badge-pending`. Single-select behaviour — selecting one deselects others (except "All" which clears all).

### 5.3 Track grid
```
display: grid
grid-template-columns: repeat(auto-fill, minmax(180px, 1fr))
gap: 8px
```
Use `.lib-card` pattern from tokens. Each card shows:
- Art square (full-width, 1:1 aspect ratio, `background: var(--color-surface-2)`)
  - Tint the background with a very faint wash of the track's primary genre colour: e.g. Hip-Hop track → `background: rgba(34,30,20,1)` (warm tint), Afrobeats → `rgba(20,24,30,1)` (cool tint)
  - Centred music note icon at 22px, `opacity: 0.2`, using `CrateIcon` or a simple music note SVG
- `.lib-card__title` — track name
- `.lib-card__artist` — artist in JetBrains Mono
- `.lib-card__tags` — BPM pill, key pill, mood badge
  - Mood badge colours: `hype` → amber, `vibes` → blue, `smooth` → muted cream, `stems` → green accent (`rgba(106,160,96,*)`)
  - Pills: `font-size: 9px, background: rgba(240,234,216,0.06), color: rgba(240,234,216,0.4), border-radius: 2px, padding: 2px 6px, font-family: JetBrains Mono`

---

## 6. Taste profile view

### 6.1 Intro line
```
font-family: JetBrains Mono, font-size: 11px
color: rgba(240,234,216,0.35)
margin-bottom: 16px
```
Text: "Built from your Spotify listening history + manual feedback"

### 6.2 Genre breakdown section

**Section label:** use `.text-section-label`, text "GENRE BREAKDOWN"

**Container card:**
```
background: var(--color-surface)
border-radius: var(--radius-lg)
padding: 14px 16px
margin-bottom: 12px
display: flex, flex-direction: column, gap: 10px
border: var(--border-subtle)
```

**Each genre row** (`display: flex, align-items: center, gap: 12px`):
- Label: `font-family: Barlow Condensed, font-size: 12px, font-weight: 700, text-transform: uppercase, letter-spacing: 0.04em, color: rgba(240,234,216,0.7), width: 120px, flex-shrink: 0`
- Bar track: `.genre-bar-track` (flex: 1)
- Bar fill: `.genre-bar-fill`, width driven by percentage prop, colour per genre:
  - Hip-Hop: `#e8a020`
  - R&B: `#c46c34`
  - Afrobeats: `#6c8cc4`
  - Pop: `rgba(240,234,216,0.3)`
- Percentage: `font-family: JetBrains Mono, font-size: 11px, font-weight: 500, min-width: 32px, text-align: right` — colour matches bar fill

### 6.3 Preferences section

**Section label:** `.text-section-label`, text "PREFERENCES"

**Container card:** same as genre card above

**Each preference row** (`display: flex, justify-content: space-between, align-items: center, padding: 5px 0, border-bottom: 1px solid rgba(240,234,216,0.06)`):
- Key: `font-family: Barlow Condensed, font-size: 11px, font-weight: 700, text-transform: uppercase, letter-spacing: 0.05em, color: rgba(240,234,216,0.45)`
- Value: `font-family: JetBrains Mono, font-size: 11px, color: varies`
  - BPM / keys: `color: var(--color-accent)`
  - Energy / edit preference: `color: rgba(240,234,216,0.6)`

Last row has no border-bottom.

### 6.4 Action buttons
```
display: flex, gap: 7px, margin-top: 16px
flex-wrap: wrap
```
Three `.btn` (ghost style): "Re-sync Spotify", "Connect Apple Music", "Add manual preference ↗"

---

## 7. Interaction states & micro-animations

| Element | Interaction | Effect |
|---|---|---|
| Track card | Hover | `background` transitions to `--color-surface-2` over 0.12s |
| Track card | Click | Brief `scale(0.99)` over 0.1s |
| Download / S button | Hover | Fill animates from transparent to accent over 0.12s |
| Tab | Switch | Active underline slides — implement with CSS `transition: left 0.15s` on a positioned indicator, or use Framer Motion `layoutId` |
| Queue item downloading | Progress bar | Animate width update with `transition: width 0.3s ease` |
| Queue item → done | Status badge | Crossfade from blue "Downloading" to green "Done" |
| Filter chip | Toggle | `background` and `color` swap over 0.12s |
| Library card | Hover | `border-color` lightens over 0.12s |

---

## 8. Component file map
Suggested file structure within `apps/web/components/`:

```
components/
├── layout/
│   ├── Topbar.tsx          — logo + wordmark
│   ├── TabBar.tsx          — tab navigation + active state
│   └── AppShell.tsx        — wraps topbar + tabbar + content area
├── icons/
│   └── CrateIcon.tsx       — the 3×3 grid SVG (section 1)
├── discover/
│   ├── TasteBanner.tsx
│   ├── FilterRow.tsx
│   ├── TrackCard.tsx       — core card used in discover feed
│   └── DiscoverView.tsx
├── queue/
│   ├── QueueItem.tsx       — single queue entry with progress + stems
│   └── QueueView.tsx
├── library/
│   ├── StatCard.tsx
│   ├── LibCard.tsx         — album grid card
│   └── LibraryView.tsx
├── taste/
│   ├── GenreBar.tsx
│   └── TasteView.tsx
└── ui/
    ├── Badge.tsx           — reusable badge/chip
    ├── Button.tsx          — .btn variants
    ├── ProgressBar.tsx
    └── Waveform.tsx        — mini 5-bar waveform
```

---

## 9. Notes for Claude Code

1. **All colours come from CSS variables** defined in `crate-design-tokens.css`. Never hardcode hex values in component files except inside `CrateIcon.tsx` (the SVG fill is intentionally hardcoded as `#e8a020`).

2. **Tailwind or CSS modules?** If using Tailwind, configure `tailwind.config.ts` to reference the CSS variables as custom colours so you can use `bg-accent`, `text-cream`, etc. If using CSS modules, import the token file globally and reference vars directly.

3. **Font loading in Tauri** — The Google Fonts `@import` will work in development (Tauri's webview has network access). For production, download the font files and load them locally via `@font-face` to avoid a network dependency on first launch.

4. **Waveform heights** — generate 5 bar heights per track deterministically from the track ID (e.g. a simple hash → 5 values in range 8–26px). This ensures they don't re-randomise on re-render but still look unique per track.

5. **SSE updates in Queue view** — connect to `GET /api/events` on mount. On `download:progress` events, update `progressPct` in the Zustand queue store. The progress bar will animate automatically via its CSS transition.

6. **Active tab underline** — implement using Framer Motion's `<motion.div layoutId="tab-underline">` for a smooth sliding indicator. Fall back to a simple CSS transition if Motion isn't installed.
