import type { Config } from 'tailwindcss';

/**
 * Homesprit's design tokens.
 *
 * The STRUCTURE follows hgs-frontend — a `brand-*` ramp with the accent at 600,
 * an `ink` family for headings and dark bands, `font-display` / `font-body`
 * resolving through CSS variables in `globals.css`, class-based dark mode. The
 * VALUES are Homesprit's own: an evergreen brand and a warm sand ground, because
 * a home-search site should not borrow a software agency's purple.
 *
 * Contrast was checked for the pairs the components actually use: `ink` on
 * `sand` and on white, white on `brand-600`/`brand-700`, `brand-700` on white
 * (all ≥ 4.5:1 for body text).
 */
const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#effcf8',
          100: '#d8f6ec',
          200: '#b3ebd9',
          300: '#7fdac1',
          400: '#45c0a3',
          500: '#22a489',
          600: '#15846f',
          700: '#136a5b',
          800: '#13554a',
          900: '#12463e',
          950: '#082823',
        },
        /* Near-black with a green bias, for headings, the footer and dark mode's
           ground. */
        ink: {
          DEFAULT: '#10201c',
          soft: '#1a2e29',
          muted: '#52615d',
          body: '#3d4a47',
        },
        /* The warm off-white the public site sits on. */
        sand: {
          DEFAULT: '#f7f3ec',
          dark: '#ece5d8',
        },
        accent: {
          clay: '#c9603f',
          amber: '#e9a93b',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        body: ['var(--font-body)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        'card-hover': 'var(--shadow-card-hover)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
};

export default config;
