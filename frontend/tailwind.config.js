/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        rudhvin: {
          red: '#DC2626',
          darkred: '#B91C1C',
          blue: '#1E3A8A',
          skyblue: '#0284C7',
          gold: '#F59E0B',
          dark: '#0F172A',
          sidebar: '#0B132B'
        }
      }
    },
  },
  plugins: [],
}
