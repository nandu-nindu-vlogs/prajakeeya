/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: '#0D1B2A',
        teal: { DEFAULT: '#0891B2', dark: '#0E7490', light: '#CFFAFE' },
        gold: { DEFAULT: '#F59E0B', dark: '#B45309', light: '#FEF3C7' },
      },
      fontFamily: {
        kn: ['Noto Sans Kannada', 'Arial Unicode MS', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
