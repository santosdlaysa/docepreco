/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#fff0f6',
          100: '#ffe0ee',
          500: '#e91e8c',
          600: '#c71878',
          700: '#a5136a',
        },
      },
    },
  },
  plugins: [],
};
