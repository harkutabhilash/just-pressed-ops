/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-poppins)', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          green: '#2D7A3E',
          'green-light': '#3A9B4E',
          'green-dark': '#1F5429',
          amber: '#F5A623',
          'amber-light': '#FFB84D',
          'amber-dark': '#E09416',
        },
      },
    },
  },
  plugins: [],
}
