/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: { ink: '#000000', paper: '#FFFFFF', mist: '#F5F5F5' },
      fontFamily: {
        sans: ["'SF Pro Display'", '-apple-system', 'BlinkMacSystemFont', "'SF Pro Text'", 'sans-serif'],
      },
      boxShadow: {
        brut: '6px 6px 0px 0px #000000',
        brutsm: '4px 4px 0px 0px #000000',
      },
      borderRadius: { none: '0px', DEFAULT: '0px' },
    },
  },
  plugins: [],
};
