/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // CRITICAL: Vite checks these files
  ],
  theme: {
    extend: {
      colors: {
        primary: "#00488d",
        "primary-container": "#005fb8",
        background: "#f8f9fa",
        surface: "#f8f9fa",
        "on-surface": "#191c1d",
      },
    },
  },
  plugins: [],
}