/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Bebas Neue"', '"Arial Narrow"', 'sans-serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace']
      },
      colors: {
        // Theme-driven tokens (uistyle.txt = dark/Beehiiv, light.txt = light/Airbnb).
        // :root holds the light values, `.dark` overrides with dark values.
        canvas: 'rgb(var(--c-canvas) / <alpha-value>)',
        surface1: 'rgb(var(--c-surface1) / <alpha-value>)',
        surface2: 'rgb(var(--c-surface2) / <alpha-value>)',
        primary: {
          DEFAULT: 'rgb(var(--c-primary) / <alpha-value>)',
          hover: 'rgb(var(--c-primary-hover) / <alpha-value>)',
          pressed: 'rgb(var(--c-primary-pressed) / <alpha-value>)'
        },
        secondary: 'rgb(var(--c-secondary) / <alpha-value>)',
        ink: 'rgb(var(--c-ink) / <alpha-value>)',
        inkmuted: 'rgb(var(--c-ink-muted) / <alpha-value>)',
        inktertiary: 'rgb(var(--c-ink-tertiary) / <alpha-value>)',
        inklink: 'rgb(var(--c-ink-link) / <alpha-value>)',
        hairline: 'rgb(var(--c-hairline))',
        hairlinestrong: 'rgb(var(--c-hairline-strong))',
        // legacy aliases (kept so no stale class breaks)
        brand: { 700: 'rgb(var(--c-primary) / <alpha-value>)', 800: 'rgb(var(--c-primary-hover) / <alpha-value>)' },
        accent: { 600: 'rgb(var(--c-secondary) / <alpha-value>)' }
      }
    }
  },
  plugins: []
};
