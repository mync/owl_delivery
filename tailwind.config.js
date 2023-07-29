/** @type {import('tailwindcss').Config} */

import plugin from 'tailwindcss/plugin'

export default {
  darkMode : 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [
    plugin(function({ addUtilities }) {
      addUtilities({
        '.content-auto': {
          'content-visibility': 'auto',
        },
        '.break-custom': {
          overflowWrap: 'break-word',
          wordWrap: 'break-word',
          wordBreak: 'break-word',
        },
      })
    })
  ]
}