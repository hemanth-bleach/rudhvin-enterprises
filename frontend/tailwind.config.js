/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
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
