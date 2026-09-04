/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ground: '#070B12',
        panel: '#0C1420',
        'panel-2': '#111C2C',
        'panel-3': '#16243a',
        hair: '#1E2E44',
        'hair-2': '#2A3E5C',
        ink: '#E6F0FA',
        'ink-2': '#9FB3CC',
        'ink-3': '#647C99',
        accent: '#22D3EE',
        'accent-2': '#0E7490',
        teal: '#2DD4BF',
        caution: '#FBBF24',
        warn: '#FB923C',
        danger: '#F43F5E',
        ok: '#34D399',
        violet: '#A78BFA',
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'DejaVu Sans Mono', 'monospace'],
      },
      fontSize: {
        '2xs': ['10px', '13px'],
        'xs2': ['11px', '14px'],
      },
      boxShadow: {
        glass: 'inset 0 1px 0 0 rgba(255,255,255,0.04)',
      },
    },
  },
  plugins: [],
};
