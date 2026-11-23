/** Types for `scripts/photo-urls.mjs`, imported by the unit suite. */

/** True when `rel` is a relative path that stays inside the root it came from. */
export declare function isRepoRelativePrefix(rel: string): boolean;

/** Public manifest prefix: `<out>` relative to `root` (POSIX), else its basename. */
export declare function defaultUrlPrefix(root: string, out: string): string;
