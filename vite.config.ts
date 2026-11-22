import { createReadStream, existsSync, statSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath, URL } from "node:url";
import pandacss from "@pandacss/vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig, type Plugin } from "vite";

const here = (path: string): string => fileURLToPath(new URL(path, import.meta.url));

const PHOTO_MIME: Readonly<Record<string, string>> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".gif": "image/gif",
};

/**
 * Dev/preview only: `photos/` is runtime data at the webroot (the owner
 * FTP-drops files and `photos.php` serves them in production). It is
 * deliberately not in `public/`, so Vite would otherwise answer
 * `/photos/<file>` with index.html. This middleware serves the same bounded
 * photo paths for local QA, with the same containment rules as the PHP layer:
 * no dotfiles, no traversal, image extensions only.
 */
function photosDevServer(root: string): Plugin {
  const photosRoot = resolve(root, "photos");
  const handler = (req: IncomingMessage, res: ServerResponse, next: () => void): void => {
    const pathname = new URL(req.url ?? "/", "http://localhost").pathname;
    if (!pathname.startsWith("/photos/")) {
      next();
      return;
    }

    let relativePath: string;
    try {
      relativePath = decodeURIComponent(pathname.slice("/photos/".length));
    } catch {
      res.statusCode = 400;
      res.end("Bad request");
      return;
    }
    const segments = relativePath.split("/");
    if (
      relativePath.includes("\0") ||
      segments.some((segment) => segment === "" || segment.startsWith("."))
    ) {
      res.statusCode = 404;
      res.end("Not found");
      return;
    }

    const file = resolve(photosRoot, relativePath);
    const type = PHOTO_MIME[extname(file).toLowerCase()];
    if (!file.startsWith(`${photosRoot}${sep}`) || type === undefined) {
      res.statusCode = 404;
      res.end("Not found");
      return;
    }

    if (!existsSync(file) || !statSync(file).isFile()) {
      res.statusCode = 404;
      res.end("Not found");
      return;
    }

    res.setHeader("Content-Type", type);
    res.setHeader("Content-Length", String(statSync(file).size));
    res.setHeader("Cache-Control", "no-cache");
    createReadStream(file).pipe(res);
  };

  return {
    name: "elsa-photos-dev-server",
    configureServer(server) {
      server.middlewares.use(handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler);
    },
  };
}

export default defineConfig({
  plugins: [pandacss(), svelte(), photosDevServer(here("./"))],

  resolve: {
    alias: {
      $lib: here("./src/lib"),
      "@tokens": here("./design/tokens/tokens.ts"),
      "@tokens/": here("./design/tokens/"),
      "styled-system": here("./styled-system"),
    },
  },

  build: {
    target: "es2024",
    cssTarget: "chrome120",
    sourcemap: false,
    reportCompressedSize: true,
  },

  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
  },

  preview: {
    host: "127.0.0.1",
    port: 4173,
    strictPort: true,
  },
});
