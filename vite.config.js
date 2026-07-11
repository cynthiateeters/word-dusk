import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Preloads the self-hosted variable fonts so they fetch in parallel with the
// CSS instead of being discovered only after the stylesheet parses.
function preloadFonts() {
  return {
    name: "preload-fonts",
    transformIndexHtml(html, ctx) {
      const fontFiles =
        (ctx.bundle && Object.keys(ctx.bundle).filter((f) => f.endsWith(".woff2"))) || [];
      const links = fontFiles
        .map(
          (f) => `    <link rel="preload" href="/${f}" as="font" type="font/woff2" crossorigin />`,
        )
        .join("\n");
      return links ? html.replace("</head>", `${links}\n  </head>`) : html;
    },
  };
}

export default defineConfig({
  plugins: [react(), preloadFonts()],
  preview: {
    port: 4173,
    strictPort: true,
  },
});
