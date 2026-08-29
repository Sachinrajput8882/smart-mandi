/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        mandi: {
          50: '#f2f9f3',
          100: '#e1f2e5',
          500: '#2d8a4e',
          600: '#226f3e',
          700: '#1a5731',
          800: '#144327',
          900: '#0e311d',
        }
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
