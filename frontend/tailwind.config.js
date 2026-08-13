/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      screens: {
        xs: '400px',
      },
      colors: {
        // Palette Bashkush : vert (#567A56) — couleur de marque
        brand: {
          50: '#edf3ed',
          100: '#d2e0d1',
          200: '#a6c2a5',
          300: '#7ca37b',
          400: '#648d63',
          500: '#567A56',
          600: '#466546',
          700: '#3a543b',
          800: '#314732',
          900: '#283a29',
        },
        accent: {
          500: '#a3b18a',
          600: '#567A56',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
        soft: '0 4px 16px rgba(0,0,0,0.08)',
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.25rem',
      },
      maxWidth: {
        app: '480px',
      },
    },
  },
  plugins: [],
};
