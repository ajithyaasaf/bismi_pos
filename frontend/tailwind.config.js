/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#FFF5F5',
          100: '#FEE2E2',
          200: '#FECACA',
          500: '#FB2C36', // Primary Brand Color
          600: '#D91B24', // Accessible Dark Variant
          700: '#B91C1C', // Deep Red
          900: '#7F1D1D',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          muted: '#F9FAFB',
          subtle: '#F3F4F6',
        },
        ink: {
          primary: '#111827',
          secondary: '#374151',
          muted: '#6B7280',
          light: '#9CA3AF',
        },
        border: {
          DEFAULT: '#E5E7EB',
          subtle: '#F3F4F6',
          strong: '#D1D5DB',
        },
        status: {
          success: '#16A34A',
          warning: '#D97706',
          danger: '#B91C1C',
          info: '#2563EB',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        cardHover: '0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -1px rgba(0, 0, 0, 0.04)',
        modal: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        brand: '0 4px 14px 0 rgba(251, 44, 54, 0.25)',
      },
    },
  },
  plugins: [],
}
