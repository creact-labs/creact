import { resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";
import solidPlugin from "vite-plugin-solid";

// The site's version is this package's own version — npm exposes it as
// npm_package_version to the build script, so there is no cross-package
// reach. The commit is the deploying SHA in CI. Both are stamped into the
// deployed HTML head as meta tags so the exact build behind the live site can
// be identified for rollbacks, without putting version chrome on the page.
const version = process.env.npm_package_version ?? "0.0.0";
const commit = (process.env.GITHUB_SHA ?? "dev").slice(0, 7);

function buildStamp(): Plugin {
  return {
    name: "creact-build-stamp",
    transformIndexHtml(html) {
      const tags = [
        `<meta name="creact:version" content="${version}" />`,
        `<meta name="creact:commit" content="${commit}" />`,
      ].join("\n    ");
      return html.replace("</head>", `  ${tags}\n  </head>`);
    },
  };
}

export default defineConfig({
  plugins: [solidPlugin(), buildStamp()],
  base: "/creact/",
  // Allow the Tailscale funnel host to reach the dev/preview server so the
  // running playground can be shared over the tailnet. The StackBlitz IDE runs
  // in its own cross-origin-isolated iframe, so the host page needs no COOP/COEP
  // headers — and must not send COEP:require-corp, which would block the embed.
  server: { allowedHosts: [".ts.net"] },
  preview: { allowedHosts: [".ts.net"] },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  build: {
    target: "esnext",
    outDir: "dist",
  },
});
