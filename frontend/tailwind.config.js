/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'ink-black': 'var(--color-ink-black)',
        'paper-white': 'var(--color-paper-white)',
        'mist-gray': 'var(--color-mist-gray)',
        'fog-white': 'var(--color-fog-white)',
        'slate-gray': 'var(--color-slate-gray)',
        'ash-gray': 'var(--color-ash-gray)',
        'smoke-gray': 'var(--color-smoke-gray)',
        'blush-peach': '#fbe1d1',
        'sienna-brown': '#5d2a1a',
      },
      fontFamily: {
        signifier: ['Newsreader', 'Source Serif 4', 'Georgia', 'serif'],
        sohne: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        'caption': ['15px', { lineHeight: '1.5' }],
        'body': ['17px', { lineHeight: '1.35' }],
        'body-lg': ['20px', { lineHeight: '1.35' }],
        'subheading': ['22px', { lineHeight: '1.5' }],
        'heading-sm': ['26px', { lineHeight: '1.18', letterSpacing: '-0.23px' }],
        'heading': ['44px', { lineHeight: '1.3', letterSpacing: '-0.66px' }],
        'heading-lg': ['64px', { lineHeight: '1.3', letterSpacing: '-0.96px' }],
        'display': ['90px', { lineHeight: '1.3', letterSpacing: '-2.25px' }],
      },
      borderRadius: {
        'cards': '24px',
        'elevated': '20px',
        'inputs': '16px',
        'buttons': '9999px',
      },
      boxShadow: {
        'subtle': 'oklab(0 0 0 / 0.05) 0px 0px 0px 1px, rgba(0, 0, 0, 0.08) 0px 4px 24px 0px',
        'subtle-2': 'oklab(0 0 0 / 0.05) 0px 0px 0px 1px, rgba(0, 0, 0, 0.1) 0px 8px 40px 0px',
        'artifact': 'rgba(4, 23, 43, 0.05) 0px 0px 0px 1px, rgba(0, 0, 0, 0.1) 0px 20px 25px -5px, rgba(0, 0, 0, 0.1) 0px 8px 10px -6px',
      }
    },
  },
  plugins: [],
}
