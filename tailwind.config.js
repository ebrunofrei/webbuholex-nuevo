// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}", // escanea todo tu código React
  ],
  theme: {
    extend: {
      colors: {
        rojo: "#a52e00",     // rojo institucional
        blanco: "#ffffff",   // blanco puro
        marron: "#5C2E0B",   // marrón institucional
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
