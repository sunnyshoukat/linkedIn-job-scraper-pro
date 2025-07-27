/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      width: {
        'popup': '400px',
      },
      maxWidth: {
        'popup': '400px',
      }
    },
  },
  plugins: [],
}