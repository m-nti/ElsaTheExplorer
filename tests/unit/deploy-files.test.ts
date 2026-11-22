/**
 * Deploy-file gate — the versioned server-side files ADR-0007 §1 names.
 *
 * `docs/adr/ADR-0007-release-deploy.md` §1 fixes the release unit: `dist/`, plus a small set
 * of server-side files "versioned in the repo, uploaded only when changed" in deploy step 0 —
 * `photos.php`, `.htaccess`, `robots.txt`, `photos.json` and the `photos/.cache/` skeleton.
 * Ticket #39 found the last three missing from the tree, so the documented deploy order could
 * not be followed and this gate did not exist. It exists now to keep them from disappearing
 * again, and to prove the rules rather than trust them:
 *
 * 1. **Existence and provenance.** Every path §1 names is present at the root, `.htaccess` and
 *    `robots.txt` name the ADR they implement in a header comment, and the cache skeleton has
 *    the 16 shards + `locks/` that §8.8 of the pipeline spec requires because an FTP upload
 *    has no shell and the request path may never call `mkdir()`.
 * 2. **The deny rules, evaluated.** The `RewriteRule` sets of the root file and of
 *    `photos/.htaccess` are parsed and applied to real request paths, with Apache's `NC` flag
 *    honoured. Assertions run in both directions: an original is forbidden, and the static
 *    fallback (`photos/thumbs/`, `photos/derived/`) plus the runtime service (`photos.php`)
 *    stay reachable — a rule that catches those breaks the PHP-less deployment (ADR-0004 §3).
 * 3. **The header set.** PRD §5/§7 and ADR-0009 §3 name nosniff, `Referrer-Policy`,
 *    `X-Frame-Options`, the webmanifest MIME type and a revalidated `sw.js`. Every
 *    module-dependent directive must sit inside an `<IfModule>` guard, because a host without
 *    the module answers 500 to the whole site.
 * 4. **`photos.json` is manifest v2.** ADR-0004 §2/§4: same `pipeline` as `photos.php`, same
 *    ladder as `scripts/photo-ladder.json`, no transmitted `srcset`, and no URL that addresses
 *    an original. JSON has no comment syntax, so this paragraph is the file's provenance note:
 *    the body is data, and this gate is what ties it to its ADR.
 *
 * One deliberate deviation, recorded in issue #39 and in the PR: the emitter refuses an empty
 * source directory (`scripts/photo-derivatives.mjs`, "no photos … nothing to derive"), and the
 * repository intentionally carries no owner photo (`.gitignore`). The committed body is
 * therefore the empty-catalogue shape of that same contract; the owner's run over a populated
 * `photos/` rewrites it before an upload, which is exactly the "uploaded only when changed"
 * rule of ADR-0007 §1.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));

function read(path: string): string {
  return readFileSync(join(ROOT, path), "utf8");
}

/** One `RewriteRule` as the server would apply it in that directory. */
interface ApacheRule {
  readonly pattern: RegExp;
  readonly flags: readonly string[];
}

function rewriteRules(path: string): ApacheRule[] {
  const rules: ApacheRule[] = [];
  for (const line of read(path).split("\n")) {
    const match = /^\s*RewriteRule\s+"([^"]+)"\s+-\s+\[([^\]]+)\]/.exec(line);
    const source = match?.[1];
    const flagText = match?.[2];
    if (source === undefined || flagText === undefined) continue;

    const flags = flagText.split(",").map((flag) => flag.trim().toUpperCase());
    // `NC` is Apache's case-insensitive match; without it a `RewriteCondition`-style probe
    // would pass on the server and quietly fail here.
    rules.push({ pattern: new RegExp(source, flags.includes("NC") ? "i" : ""), flags });
  }
  return rules;
}

let ruleset: { readonly root: ApacheRule[]; readonly photos: ApacheRule[] } | null = null;

function rules() {
  ruleset ??= {
    root: rewriteRules(".htaccess"),
    photos: rewriteRules("photos/.htaccess"),
  };
  return ruleset;
}

function forbiddenBy(ruleList: readonly ApacheRule[], path: string): boolean {
  return ruleList.some((rule) => rule.flags.includes("F") && rule.pattern.test(path));
}

/**
 * What Apache would answer for a request path: the root file sees the path without its
 * leading slash, then the `photos/` file sees it relative to its own directory.
 */
function requestDecision(requestPath: string): "forbidden" | "allowed" {
  const relative = (requestPath.replace(/^\/+/, "").split("?")[0] ?? "").replace(/\/+$/, "");
  const { root, photos } = rules();

  if (forbiddenBy(root, relative)) return "forbidden";

  if (relative === "photos" || relative.startsWith("photos/")) {
    const inner = relative.slice("photos/".length);
    if (inner !== "" && forbiddenBy(photos, inner)) return "forbidden";
  }

  return "allowed";
}

/** Directives that only resolve when their module is loaded. */
const MODULE_DIRECTIVES = [
  /^RewriteEngine\b/,
  /^RewriteRule\b/,
  /^AddType\b/,
  /^ExpiresActive\b/,
  /^ExpiresByType\b/,
  /^Header\b/,
] as const;

/** Lines of a module-dependent directive that sit outside an `<IfModule>` guard. */
function unguardedDirectives(path: string): string[] {
  const offenders: string[] = [];
  let depth = 0;

  for (const raw of read(path).split("\n")) {
    const line = raw.trim();
    if (/^<IfModule\b/i.test(line)) {
      depth += 1;
      continue;
    }
    if (/^<\/IfModule>/i.test(line)) {
      depth = Math.max(0, depth - 1);
      continue;
    }
    if (depth === 0 && MODULE_DIRECTIVES.some((directive) => directive.test(line))) {
      offenders.push(line);
    }
  }

  return offenders;
}

interface RobotsGroup {
  readonly agents: string[];
  readonly rules: string[];
}

/** robots.txt groups, `#` comments dropped. */
function robotsGroups(text: string): RobotsGroup[] {
  const groups: RobotsGroup[] = [];
  let current: RobotsGroup | null = null;
  let lastKey = "";

  for (const raw of text.split("\n")) {
    const line = raw.replace(/#.*$/, "").trim();
    if (line === "") continue;

    const separator = line.indexOf(":");
    if (separator === -1) continue;

    const key = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();

    if (key === "user-agent") {
      // A new group begins only when the previous record was not also a user-agent line.
      if (current === null || lastKey !== "user-agent") {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value);
    } else if (current !== null) {
      current.rules.push(`${key}: ${value}`);
    }

    lastKey = key;
  }

  return groups;
}

const RUNGS = ["tile", "pack", "detail", "download"] as const;

interface ManifestEntry {
  readonly [key: string]: unknown;
}

interface Manifest {
  readonly generated?: unknown;
  readonly source?: unknown;
  readonly pipeline?: unknown;
  readonly ladder?: unknown;
  readonly photos?: unknown;
}

function manifest(): Manifest {
  return JSON.parse(read("photos.json")) as Manifest;
}

function ladderEdges(): Record<string, number> {
  const ladder = JSON.parse(read("scripts/photo-ladder.json")) as Record<
    string,
    { edge?: unknown }
  >;

  return Object.fromEntries(
    RUNGS.map((rung) => [rung, Number(ladder[rung]?.edge)]),
  );
}

function runtimePipelineVersion(): number {
  const match = /const PHOTO_PIPELINE_VERSION\s*=\s*(\d+)\s*;/.exec(read("photos.php"));
  const value = match?.[1];
  if (value === undefined) throw new Error("photos.php: PHOTO_PIPELINE_VERSION not found");
  return Number(value);
}

describe("ADR-0007 §1 — the versioned server-side files", () => {
  it("carries every path the ADR's release unit names", () => {
    const adr = read("docs/adr/ADR-0007-release-deploy.md");
    const start = adr.indexOf("server-side files versioned in the repo");
    expect(start, "ADR-0007 §1 no longer names the server-side files").toBeGreaterThan(-1);

    const bullet = adr.slice(start, adr.indexOf("\n\n", start));
    for (const name of ["photos.php", ".htaccess", "robots.txt", "photos.json"]) {
      // The gate is the second reader of this list: editing the ADR without the file (or the
      // file without the ADR) fails here, naming the disagreement.
      expect(bullet, `ADR-0007 §1 does not name ${name}`).toContain(name);
    }

    for (const file of [".htaccess", "robots.txt", "photos.json", "photos.php"]) {
      expect(existsSync(join(ROOT, file)), `${file} is missing from the repository root`).toBe(
        true,
      );
    }
  });

  it("names the ADR it implements in a header comment", () => {
    expect(read(".htaccess").split("\n").slice(0, 8).join("\n")).toContain("ADR-0007");
    expect(read("robots.txt").split("\n").slice(0, 8).join("\n")).toContain("ADR-0007");
  });

  it("ships the derivative-cache skeleton deploy step 0 needs", () => {
    // ADR-0007 §1 + pipeline spec §8.8: an FTP deploy has no shell and the request path may
    // never mkdir(), so 16 shards and locks/ must arrive as committed directories.
    const cache = join(ROOT, "photos", ".cache");
    expect(existsSync(cache), "photos/.cache is missing").toBe(true);

    const shards = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "a", "b", "c", "d", "e", "f"];
    for (const shard of shards) {
      expect(readdirSync(cache), `photos/.cache/${shard} is missing`).toContain(shard);
      expect(
        existsSync(join(cache, shard, ".gitkeep")),
        `photos/.cache/${shard}/.gitkeep is missing`,
      ).toBe(true);
    }

    expect(existsSync(join(cache, "locks", ".gitkeep")), "photos/.cache/locks is missing").toBe(
      true,
    );
    expect(existsSync(join(cache, ".htaccess")), "photos/.cache/.htaccess is missing").toBe(true);
  });

  it("guards every module-dependent directive with IfModule", () => {
    expect(unguardedDirectives(".htaccess")).toEqual([]);
  });

  it("forbids directory listing", () => {
    expect(read(".htaccess")).toMatch(/^Options\s+-Indexes\s*$/m);
  });
});

describe("ADR-0008 §3 — no original is reachable, the fallback still is", () => {
  it.each([
    "photos/elsa-01.jpg",
    "photos/elsa-01.jpeg",
    "photos/elsa-01.JPG",
    "photos/elsa-01.png",
    "photos/elsa-01.gif",
    "photos/elsa-01.webp",
    "photos/elsa-01.avif",
    "photos/elsa-01.heic",
    "photos/elsa-01.heif",
  ])("forbids the original at /%s", (path) => {
    expect(requestDecision(path)).toBe("forbidden");
  });

  it.each([
    "photos/.cache",
    "photos/.cache/",
    "photos/.cache/0/0123456789abcdef0123456789abcdef01234567.jpg",
    "photos/.CACHE/0/x.webp",
    "photos/.cache/locks/slot.0",
  ])("forbids the derivative cache at /%s", (path) => {
    expect(requestDecision(path)).toBe("forbidden");
  });

  it.each([
    "photos/tool.php",
    "photos/thumbs/tool.phtml",
    "photos/derived/tile/tool.cgi",
    "photos/page.html",
  ])("forbids executable content at /%s", (path) => {
    expect(requestDecision(path)).toBe("forbidden");
  });

  it.each([".htaccess", ".git/config", "photos/.gitkeep", "photos/.gitignore"])(
    "forbids the control file /%s",
    (path) => {
      expect(requestDecision(path)).toBe("forbidden");
    },
  );

  it.each([
    "photos/thumbs/elsa-01.jpg",
    "photos/derived/tile/elsa-01.jpg",
    "photos/derived/pack/elsa-01.webp",
    "photos/derived/detail/elsa-01.jpg",
    "photos/derived/download/elsa-01.jpg",
    "photos.php",
    "photos.php?list=1",
    "photos.php?image=elsa-01.jpg&size=pack&format=webp&v=abc123",
    "index.html",
    "assets/index-abc123.js",
    "assets/index-abc123.css",
    "fonts/chivo-latin.woff2",
    "icons/icon-192.png",
    "manifest.webmanifest",
    "photos.json",
    "robots.txt",
    "sw.js",
    ".well-known/acme-challenge/token",
  ])("keeps /%s reachable", (path) => {
    expect(requestDecision(path)).toBe("allowed");
  });

  it("denies the original from both layers independently", () => {
    // Either file must hold on its own: photos/.htaccess is part of the same upload, but a
    // root-only deploy must not expose the store.
    expect(forbiddenBy(rules().root, "photos/elsa-01.jpg")).toBe(true);
    expect(forbiddenBy(rules().photos, "elsa-01.jpg")).toBe(true);
  });
});

describe("PRD §5/§7 and ADR-0009 §3 — headers, MIME, noindex", () => {
  it("sets the security headers on every response", () => {
    const htaccess = read(".htaccess");
    expect(htaccess).toMatch(/Header\s+always\s+set\s+X-Content-Type-Options\s+"nosniff"/);
    expect(htaccess).toMatch(/Header\s+always\s+set\s+Referrer-Policy\s+"same-origin"/);
    expect(htaccess).toMatch(/Header\s+always\s+set\s+X-Frame-Options\s+"SAMEORIGIN"/);
    expect(htaccess).toMatch(/Header\s+always\s+set\s+X-Robots-Tag\s+"noindex[^"]*"/);
  });

  it("serves the web app manifest as application/manifest+json", () => {
    const htaccess = read(".htaccess");
    expect(htaccess).toMatch(/AddType\s+application\/manifest\+json\s+\.webmanifest/);
    expect(htaccess).toMatch(
      /ExpiresByType\s+application\/manifest\+json\s+"access plus 1 hours"/,
    );
  });

  it("revalidates sw.js so an update is not hidden behind the JS expiry", () => {
    const takes = /<Files\s+"sw\.js">([\s\S]*?)<\/Files>/i.exec(read(".htaccess"));
    expect(takes, "no <Files \"sw.js\"> block").not.toBeNull();
    expect(takes?.[1] ?? "").toMatch(/Cache-Control\s+"no-cache, must-revalidate"/);
  });

  it("leaves derivative TTLs to the ver-keyed emitter", () => {
    // ADR-0008 §1/§6: a derivative URL is immutable only with &v=, so a blanket raster TTL
    // here would serve a replaced photo under the old URL and fight the buster. The icon
    // type (image/svg+xml) is not a photo derivative and keeps its own entry.
    expect(read(".htaccess")).not.toMatch(
      /^\s*ExpiresByType\s+image\/(jpe?g|png|webp|avif|gif|heic|heif)\b/m,
    );
  });

  it("disallows every crawler, matching the noindex header", () => {
    const groups = robotsGroups(read("robots.txt"));
    expect(groups).toHaveLength(1);
    expect(groups[0]?.agents).toEqual(["*"]);
    expect(groups[0]?.rules).toEqual(["disallow: /"]);
    expect(read("robots.txt")).not.toMatch(/^\s*Allow:/m);
    // robots.txt and the header must agree; a page that is disallowed and indexable is the
    // contradiction M8 would find on the live host.
    expect(read(".htaccess")).toMatch(/X-Robots-Tag\s+"noindex/);
  });
});

describe("ADR-0004 §2/§4 — photos.json is manifest v2", () => {
  it("carries the manifest-level contract", () => {
    const body = manifest();
    expect(body.source).toBe("photos");
    expect(typeof body.generated).toBe("string");
    expect(Number.isNaN(Date.parse(String(body.generated)))).toBe(false);
    expect(Number.isInteger(body.pipeline)).toBe(true);
    expect(Array.isArray(body.photos)).toBe(true);
  });

  it("agrees with the runtime emitter", () => {
    const body = manifest();
    expect(body.pipeline, "pipeline drifted from photos.php").toBe(runtimePipelineVersion());
    expect(body.ladder).toEqual(ladderEdges());
  });

  it("advertises no original and no transmitted srcset", () => {
    const body = manifest();
    const entries = (body.photos ?? []) as ManifestEntry[];
    const allowed = /^photos\/derived\/[a-z]+\/[^/]+\.(jpe?g|webp)$/;

    for (const entry of entries) {
      expect(entry, `${String(entry.id)}: srcset must be derived, not transmitted`).not.toHaveProperty(
        "srcset",
      );
      expect(String(entry.ver ?? "").length, `${String(entry.id)}: ver over 32 characters`).toBeLessThanOrEqual(
        32,
      );

      const urls: string[] = [];
      for (const key of ["src", "thumb", "view", "download"]) {
        if (typeof entry[key] === "string") urls.push(entry[key]);
      }

      const images = entry.images;
      if (images !== null && typeof images === "object") {
        for (const rung of RUNGS) {
          const block = (images as Record<string, unknown>)[rung];
          if (block === null || typeof block !== "object") continue;
          for (const format of ["jpeg", "webp"]) {
            const url = (block as Record<string, unknown>)[format];
            if (typeof url === "string") urls.push(url);
          }
        }
      }

      for (const url of urls) {
        expect(url, `${String(entry.id)}: URL is not a bounded rendition`).toMatch(allowed);
      }
    }
  });
});
