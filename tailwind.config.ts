import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
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
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        violet: {
          50: "hsl(270, 80%, 98%)",
          100: "hsl(270, 80%, 95%)",
          200: "hsl(270, 80%, 90%)",
          300: "hsl(270, 80%, 80%)",
          400: "hsl(270, 80%, 70%)",
          500: "hsl(270, 80%, 60%)",
          600: "hsl(270, 80%, 50%)",
          700: "hsl(270, 80%, 40%)",
          800: "hsl(270, 80%, 30%)",
          900: "hsl(270, 80%, 20%)",
        },
        pink: {
          50: "hsl(320, 80%, 98%)",
          100: "hsl(320, 80%, 95%)",
          200: "hsl(320, 80%, 90%)",
          300: "hsl(320, 80%, 80%)",
          400: "hsl(320, 80%, 70%)",
          500: "hsl(320, 80%, 60%)",
          600: "hsl(320, 80%, 50%)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        "2xl": "1.5rem",
        "3xl": "2rem",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "wiggle": {
          "0%, 100%": { transform: "rotate(-10deg)" },
          "50%": { transform: "rotate(10deg)" },
        },
        "scale-in": {
          "0%": { transform: "scale(0.5)", opacity: "0" },
          "50%": { transform: "scale(1.2)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "float-away": {
          "0%": { transform: "translateY(0) scale(1)", opacity: "1" },
          "100%": { transform: "translateY(-100vh) scale(0.5)", opacity: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "wiggle": "wiggle 0.5s ease-in-out infinite",
        "scale-in": "scale-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
        "float-away": "float-away 3s ease-out forwards",
      },
      boxShadow: {
        glow: "0 0 40px hsla(270, 80%, 60%, 0.3)",
        "glow-lg": "0 0 60px hsla(270, 80%, 60%, 0.4)",
        soft: "0 10px 40px hsla(270, 50%, 30%, 0.1)",
        "soft-lg": "0 20px 60px hsla(270, 50%, 30%, 0.15)",
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;
