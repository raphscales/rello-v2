import type { Config } from "tailwindcss";

const config: Config = {
  content: [
<<<<<<< HEAD
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
=======
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
>>>>>>> 89266a04cca7ff8a13ee8ee470e6894d461b269f
  ],
  theme: {
    extend: {
      colors: {
<<<<<<< HEAD
        background: "var(--background)",
        foreground: "var(--foreground)",
=======
        bg: "#F9FAFB",
        surface: "#FFFFFF",
        border: "#E5E7EB",
        accent: {
          DEFAULT: "#6366F1",
          hover: "#4F46E5",
          light: "#EEF2FF",
        },
        success: "#10B981",
        warning: "#F59E0B",
        destructive: "#EF4444",
        "text-primary": "#111827",
        "text-secondary": "#6B7280",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
>>>>>>> 89266a04cca7ff8a13ee8ee470e6894d461b269f
      },
    },
  },
  plugins: [],
};
export default config;
