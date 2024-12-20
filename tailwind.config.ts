/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./components/**/*.{js,vue,ts}",
    "./layouts/**/*.vue",
    "./pages/**/*.vue",
    "./plugins/**/*.{js,ts}",
    "./nuxt.config.{js,ts}",
    "./app.vue",
  ],
  darkMode: 'class', // or 'media' or 'class'
  theme: {
    extend: {
      colors: {
        primary: 'rgba(var(--n-primary-color))',
        'primary-1': 'rgba(var(--n-primary-color-1))',
        'primary-2': 'rgba(var(--n-primary-color-2))',
        'primary-3': 'rgba(var(--n-primary-color-3))',
        // ...
        'primary-10': 'rgba(var(--n-primary-color-10))',
        'primary-hover': 'rgba(var(--n-primary-color-hover))',
        'primary-pressed': 'rgba(var(--n-primary-color-pressed))',
        'primary-focus': 'rgba(var(--n-primary-color-focus))',
        'primary-disabled': 'rgba(var(--n-primary-color-disabled))'
      }
    },
  },
  plugins: [],
}

