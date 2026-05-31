/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "16px",
        sm: "20px",
        lg: "24px",
      },
    },
    extend: {
      colors: {
        brand: {
          teal: "#2A9D8F",
          orange: "#F4A261",
          bg: "#F8F9FA",
        },
        ink: {
          950: "#0B1220",
          700: "#2D3648",
          500: "#55627A",
          200: "#E7ECF2",
        },
      },
      fontFamily: {
        display: ["Fraunces", "ui-serif", "Georgia", "serif"],
        sans: ["IBM Plex Sans", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
      },
      boxShadow: {
        card: "0 18px 50px rgba(15, 23, 42, 0.08)",
        glow: "0 0 0 6px rgba(42, 157, 143, 0.12)",
      },
    },
  },
  plugins: [],
};
