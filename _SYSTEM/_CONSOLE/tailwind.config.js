import typography from '@tailwindcss/typography'

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0f172a',
        surface: '#1e293b',
        primary: '#38bdf8',
        success: '#22c55e',
        danger: '#ef4444',
        warning: '#eab308'
      }
    },
  },
  plugins: [
    typography,
  ],
}
