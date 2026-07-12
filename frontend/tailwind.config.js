/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",

  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],

  theme: {
    extend: {
      colors: {
        /* Base Theme */
        bg: "#0A0A0A",
        panel: "#141414",
        border: "#2A2A2A",

        /* Brand */
        accent: "#D97706",
        accentHover: "#B96206",
        accentSoft: "rgba(217,119,6,0.12)",

        /* Status */
        success: "#22C55E",
        info: "#3B82F6",
        warning: "#F97316",
        danger: "#EF4444",
        muted: "#9CA3AF",

        /* Optional */
        card: "#181818",
        sidebar: "#111111",
      },

      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },

      borderRadius: {
        lg: "12px",
        xl: "16px",
        "2xl": "20px",
      },

      boxShadow: {
        card: "0 8px 24px rgba(0,0,0,.35)",
        glow: "0 0 0 1px rgba(217,119,6,.15), 0 10px 30px rgba(0,0,0,.35)",
      },

      transitionTimingFunction: {
        smooth: "cubic-bezier(0.4, 0, 0.2, 1)",
      },

      animation: {
        fade: "fade .25s ease-in-out",
        slide: "slide .3s ease",
      },

      keyframes: {
        fade: {
          "0%": {
            opacity: "0",
          },
          "100%": {
            opacity: "1",
          },
        },

        slide: {
          "0%": {
            opacity: "0",
            transform: "translateY(10px)",
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
      },
    },
  },

  plugins: [],
};