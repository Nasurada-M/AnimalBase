/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Nunito"', 'sans-serif'],
        display: ['"Sora"', 'sans-serif'],
      },
      colors: {
        primary: {
          50:  '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7',
          600: '#9333ea',
          700: '#7e22ce',
          800: '#6b21a8',
          900: '#581c87',
        },
      },
      animation: {
        'fade-in':   'fadeIn 0.5s ease-out both',
        'slide-up':  'slideUp 0.45s ease-out both',
        'slide-in':  'slideIn 0.3s ease-out both',
        'bounce-in': 'bounceIn 0.4s ease-out both',
      },
      keyframes: {
        fadeIn:   { from: { opacity: '0' },                                to: { opacity: '1' } },
        slideUp:  { from: { opacity: '0', transform: 'translateY(24px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideIn:  { from: { opacity: '0', transform: 'translateX(-20px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
        bounceIn: { '0%': { transform: 'scale(0.85)', opacity: '0' }, '60%': { transform: 'scale(1.05)' }, '100%': { transform: 'scale(1)', opacity: '1' } },
      },
    },
  },
  plugins: [],
}