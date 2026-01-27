/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: { extend: {} },
  plugins: [],
};

module.exports = {
  theme: {
    extend: {
      colors: {
        caribbean: {
          DEFAULT: '#00B8A9', // base
          light: '#33CFC1',   // hover/light variants
          dark: '#008C80',    // darker for active/focus
        },
      },
    },
  },
};
