import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: 'var(--c-bg)',
        surface: 'var(--c-surface)',
        'surface-2': 'var(--c-surface-2)',
        border: 'var(--c-border)',
        'border-hover': 'var(--c-border-hover)',
        accent: 'var(--c-accent)',
        'accent-bg': 'var(--c-accent-bg)',
        'accent-border': 'var(--c-accent-border)',
        'text-primary': 'var(--c-text-primary)',
        'text-secondary': 'var(--c-text-secondary)',
        'text-muted': 'var(--c-text-muted)',
        'text-dim': 'var(--c-text-dim)',
        // Genre
        'genre-hiphop': 'var(--c-genre-hiphop)',
        'genre-hiphop-bg': 'var(--c-genre-hiphop-bg)',
        'genre-hiphop-border': 'var(--c-genre-hiphop-border)',
        'genre-rnb': 'var(--c-genre-rnb)',
        'genre-rnb-bg': 'var(--c-genre-rnb-bg)',
        'genre-rnb-border': 'var(--c-genre-rnb-border)',
        'genre-afro': 'var(--c-genre-afro)',
        'genre-afro-bg': 'var(--c-genre-afro-bg)',
        'genre-afro-border': 'var(--c-genre-afro-border)',
        'genre-pop': 'var(--c-genre-pop)',
        'genre-pop-bg': 'var(--c-genre-pop-bg)',
        'genre-pop-border': 'var(--c-genre-pop-border)',
        // Status
        'status-downloading': 'var(--c-status-downloading)',
        'status-downloading-bg': 'var(--c-status-downloading-bg)',
        'status-downloading-border': 'var(--c-status-downloading-border)',
        'status-done': 'var(--c-status-done)',
        'status-done-bg': 'var(--c-status-done-bg)',
        'status-done-border': 'var(--c-status-done-border)',
        'status-pending': 'var(--c-status-pending)',
        'status-pending-bg': 'var(--c-status-pending-bg)',
        'status-pending-border': 'var(--c-status-pending-border)',
        'status-error': 'var(--c-status-error)',
        'status-error-bg': 'var(--c-status-error-bg)',
        'status-error-border': 'var(--c-status-error-border)',
        // Progress / wave
        'progress-track': 'var(--c-progress-track)',
        'progress-fill': 'var(--c-progress-fill)',
        'progress-done': 'var(--c-progress-done)',
        'wave-active': 'var(--c-wave-active)',
        'wave-inactive': 'var(--c-wave-inactive)',
      },
      fontFamily: {
        wordmark: ['var(--font-wordmark)'],
        ui: ['var(--font-ui)'],
        meta: ['var(--font-meta)'],
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        full: 'var(--radius-full)',
      },
      maxWidth: {
        app: 'var(--app-max-width)',
      },
      transitionDuration: {
        fast: '120ms',
        base: '180ms',
      },
    },
  },
  plugins: [],
};

export default config;
