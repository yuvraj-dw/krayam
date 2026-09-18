/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Official Indian Government Procurement Portal Color Palette
        'gov-green': {
          900: '#063B2A', // Sidebar, branding
          800: '#075E43', // Primary nav & headers
          700: '#0B6B4F', // Primary buttons
          600: '#16845F', // Active states, accents
          100: '#E7F3EC', // Light green backgrounds
          50:  '#F3F9F5', // Subtle sections
        },
        'saffron': {
          600: '#D97706', // Important notices
          500: '#EA8A0A', // Warning icons
          100: '#FFF3DC', // Notice backgrounds
          50:  '#FFF9ED', // Subtle notice panel
        },
        'gov-text': {
          900: '#17231F', // Main headings
          700: '#34443D', // Body text
          500: '#66736D', // Secondary text
        },
        'gov-border': {
          DEFAULT: '#CBD8D1',
          light: '#E2ECE6',
          notice: '#F0D7A7',
          status: '#B7DCC5',
        },
        'gov-surface': {
          DEFAULT: '#FFFFFF',
          muted: '#EDF3EF',
          light: '#F4FAF6',
        },
        'gov-bg': '#F5F8F6',
        'status': {
          success: '#16803C',
          warning: '#B45309',
          error:   '#B42318',
          info:    '#175CD3',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans Devanagari', 'Arial', 'sans-serif'],
      },
      borderRadius: {
        'gov-sm': '6px',
        'gov-md': '8px',
        'gov-lg': '10px',
      },
      boxShadow: {
        'gov-card': '0 1px 3px rgba(0, 0, 0, 0.06)',
        'gov-dropdown': '0 4px 12px rgba(0, 0, 0, 0.08)',
      },
    },
  },
  plugins: [],
}
