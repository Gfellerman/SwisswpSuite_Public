/** @type {import('tailwindcss').Config} */
import { tokens } from './src/lib/design-tokens';

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Enable dark mode toggle
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: tokens.colors.brand.DEFAULT,
          hover: tokens.colors.brand.hover,
          light: tokens.colors.brand.light,
          dark: tokens.colors.brand.dark
        },
        neutral: tokens.colors.neutral,
        semantic: tokens.colors.semantic
      },
      spacing: tokens.spacing,
      borderRadius: tokens.radius
    }
  },
  plugins: [],
}
