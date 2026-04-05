/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#ff0000",
        "primary-dark": "#cc0000",
        dark: "#0f0f0f",
        "dark-card": "rgba(255, 255, 255, 0.05)",
      },
      backdropBlur: {
        xs: "2px",
      }
    },
  },
  plugins: [],
}
