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
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },

        // overwrite the naive-ui primary color
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

