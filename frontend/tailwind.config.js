/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        base: {
          bg: '#0a0a0a',
          panel: '#141414',
          border: '#2a2a2a',
        },
        accent: {
          DEFAULT: '#d97706',
          hover: '#b96206',
          soft: 'rgba(217, 119, 6, 0.12)',
        },
        status: {
          green: '#22c55e',
          blue: '#3b82f6',
          orange: '#f97316',
          red: '#ef4444',
          gray: '#9ca3af',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
