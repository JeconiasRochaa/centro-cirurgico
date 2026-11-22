/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        white: '#F6F8FA',
        brand: { DEFAULT: '#0B3B5C', 50: '#EEF4F9', 100: '#D6E5F1', 200: '#B3CDE3', 600: '#0B3B5C', 700: '#092F4A', 800: '#072438', 900: '#051A29' },
        teal: { DEFAULT: '#00C9B7', 50: '#E6FAF8', 100: '#BFF2EE', 400: '#2DD9CA', 600: '#00A89A', 700: '#008578' },
        surface: '#DCE2E8',
        tv: { bg: '#081A2F', bg2: '#0D2540', card: '#122B46', line: '#1C4268', blue: '#3985FF', green: '#20C878', orange: '#F5A623', red: '#EF6262', text: '#F5F7FA', mute: '#91A8C5' },
        night: { DEFAULT: '#131517', card: '#1b1e22', raised: '#23272c', line: '#31363c' }
      },
      keyframes: { kpi: { from: { opacity: '0.3', transform: 'translateY(-4px)' }, to: { opacity: '1', transform: 'none' } }, 'pulse-soft': { '0%,100%': { boxShadow: '0 0 0 3px rgba(239,68,68,0.18)' }, '50%': { boxShadow: '0 0 0 7px rgba(239,68,68,0.05)' } } },
      animation: { kpi: 'kpi 0.5s ease-out', 'pulse-soft': 'pulse-soft 2s ease-in-out infinite' },
      fontFamily: { sans: ['Inter', 'system-ui', 'Segoe UI', 'Arial', 'sans-serif'] }
    }
  },
  plugins: []
};
