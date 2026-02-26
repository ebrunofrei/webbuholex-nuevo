// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],

  theme: {
    extend: {
      // =========================
      // 🎨 PALETA INSTITUCIONAL
      // =========================
      colors: {
        /* 🔵 LITIS */
        litis: {
          900: "#1C3D73",
          700: "#274B8F",
        },

        /* ⚡ COGNITIVO */
        cognitive: {
          500: "#00BFFF",
          glow: "#00E5FF",
        },

        /* 📚 NEUTROS ACADÉMICOS */
        neutralAcad: {
          900: "#1A1A1A",
          700: "#4A4A4A",
          400: "#9CA3AF",
          bg: "#FAFAFA",
        },
      },

      // =========================
      // 🧬 TIPOGRAFÍA BASE
      // =========================
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },

      // =========================
      // 🏛️ PROSE: “LITIS”
      // =========================
      typography: (theme) => ({
        litis: {
          css: {
            // Variables internas del plugin
            "--tw-prose-body": theme("colors.neutralAcad.900"),
            "--tw-prose-headings": theme("colors.neutralAcad.900"),
            "--tw-prose-links": theme("colors.litis.900"),
            "--tw-prose-bold": theme("colors.neutralAcad.900"),
            "--tw-prose-counters": theme("colors.litis.900"),
            "--tw-prose-bullets": theme("colors.neutralAcad.400"),
            "--tw-prose-hr": theme("colors.neutralAcad.400"),
            "--tw-prose-quotes": theme("colors.neutralAcad.700"),
            "--tw-prose-quote-borders": theme("colors.litis.700"),
            "--tw-prose-code": theme("colors.neutralAcad.900"),
            "--tw-prose-pre-code": theme("colors.neutralAcad.900"),
            "--tw-prose-pre-bg": theme("colors.neutralAcad.bg"),

            // Tamaño y ritmo editorial (Enterprise)
            maxWidth: "none",
            lineHeight: "1.9",

            // Headings
            h1: {
              color: theme("colors.litis.900"),
              fontWeight: "650",
              letterSpacing: "-0.01em",
            },
            h2: {
              color: theme("colors.litis.900"),
              fontWeight: "650",
              letterSpacing: "0.01em",
              marginTop: "2.2em",
              marginBottom: "0.9em",
            },
            h3: {
              color: theme("colors.litis.900"),
              fontWeight: "600",
              letterSpacing: "0.01em",
              marginTop: "1.8em",
              marginBottom: "0.6em",
            },

            // Paragraphs
            p: {
              marginTop: "0.9em",
              marginBottom: "0.9em",
            },

            // Links
            a: {
              textDecoration: "underline",
              textUnderlineOffset: "3px",
              textDecorationColor: theme("colors.litis.700"),
              fontWeight: "500",
            },
            "a:hover": {
              color: theme("colors.litis.700"),
            },

            // Ordered lists => Roman (I, II, III)
            ol: {
              listStyleType: "upper-roman",
              paddingLeft: "1.35rem",
            },
            "ol > li::marker": {
              color: theme("colors.litis.900"),
              fontWeight: "600",
            },

            // Unordered lists
            ul: {
              paddingLeft: "1.35rem",
            },

            // Blockquote (doctrinal)
            blockquote: {
              borderLeftColor: theme("colors.litis.900"),
              borderLeftWidth: "3px",
              fontStyle: "italic",
              color: theme("colors.neutralAcad.700"),
            },

            // HR separators
            hr: {
              borderColor: theme("colors.neutralAcad.400"),
              marginTop: "2.2em",
              marginBottom: "2.2em",
            },

            // Inline code (sobrio)
            code: {
              backgroundColor: "rgba(0,0,0,0.04)",
              padding: "0.15em 0.35em",
              borderRadius: "0.35rem",
              fontWeight: "500",
            },
            "code::before": { content: '""' },
            "code::after": { content: '""' },

            // Pre code blocks
            pre: {
              backgroundColor: "rgba(0,0,0,0.04)",
              borderRadius: "0.75rem",
              padding: "1rem",
            },
          },
        },
      }),
    },
  },

  plugins: [require("@tailwindcss/typography")],
};