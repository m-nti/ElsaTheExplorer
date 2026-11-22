/**
 * WCAG 2.2 contrast maths — pure, DOM-free, dependency-free.
 *
 * This module is the measurement engine for the token gate (ADR-0002). It is
 * deliberately independent of the token file: the gate must be able to reject a
 * fixture, not merely echo the value it was given. `design/tokens/tokens.ts`
 * declares the production usage pairs; the tests feed both the production set
 * and known-bad fixtures through the same functions.
 *
 * References: WCAG 2.2 §1.4.3 (contrast minimum) and the relative-luminance
 * definition in WCAG 2.2 §relative-luminance.
 */

export interface Rgba {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  /** 0–1 */
  readonly a: number;
}

export type ContrastRole = "text" | "large-text" | "ui" | "border" | "progress";

export interface ContrastPair {
  /** Stable identifier used in failure output and test assertions. */
  readonly id: string;
  /** Foreground colour, any CSS colour this module can parse. */
  readonly fg: string;
  /** Background colour; must be opaque (alpha is composited if it is not). */
  readonly bg: string;
  /** WCAG threshold for this pair. Text is 4.5, large text / UI is 3.0. */
  readonly minimum: number;
  readonly role: ContrastRole;
  /** Why the pair exists; printed in the failure report. */
  readonly note?: string;
}

export interface ContrastFailure extends ContrastPair {
  readonly ratio: number;
  readonly message: string;
}

export class InvalidColorError extends Error {
  constructor(input: string) {
    super(`Unsupported or malformed colour: ${JSON.stringify(input)}`);
    this.name = "InvalidColorError";
  }
}

export class ContrastGateError extends Error {
  readonly failures: readonly ContrastFailure[];

  constructor(failures: readonly ContrastFailure[]) {
    super(
      [
        `Contrast gate failed: ${failures.length} pair(s) below minimum.`,
        ...failures.map((failure) => failure.message),
      ].join("\n"),
    );
    this.name = "ContrastGateError";
    this.failures = failures;
  }
}

const HEX = /^#([0-9a-f]{3,8})$/i;
const RGB = /^rgba?\(([^)]+)\)$/i;

function clampChannel(value: number): number {
  return Math.min(255, Math.max(0, value));
}

function clampAlpha(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function parseHex(input: string): Rgba {
  const match = HEX.exec(input);
  if (!match) throw new InvalidColorError(input);

  const digits = match[1];
  if (!digits) throw new InvalidColorError(input);

  const expand = (hex: string): number => Number.parseInt(hex, 16);

  switch (digits.length) {
    case 3: {
      const [r, g, b] = digits;
      return { r: expand(`${r}${r}`), g: expand(`${g}${g}`), b: expand(`${b}${b}`), a: 1 };
    }
    case 4: {
      const [r, g, b, a] = digits;
      return {
        r: expand(`${r}${r}`),
        g: expand(`${g}${g}`),
        b: expand(`${b}${b}`),
        a: expand(`${a}${a}`) / 255,
      };
    }
    case 6:
      return {
        r: expand(digits.slice(0, 2)),
        g: expand(digits.slice(2, 4)),
        b: expand(digits.slice(4, 6)),
        a: 1,
      };
    case 8:
      return {
        r: expand(digits.slice(0, 2)),
        g: expand(digits.slice(2, 4)),
        b: expand(digits.slice(4, 6)),
        a: expand(digits.slice(6, 8)) / 255,
      };
    default:
      throw new InvalidColorError(input);
  }
}

function parseRgb(input: string): Rgba {
  const match = RGB.exec(input);
  if (!match) throw new InvalidColorError(input);

  const body = match[1];
  if (!body) throw new InvalidColorError(input);

  const slash = body.split("/");
  if (slash.length > 2) throw new InvalidColorError(input);

  const channels = (slash[0] ?? "")
    .trim()
    .split(/\s*,\s*|\s+/)
    .filter(Boolean);
  if (channels.length !== 3) throw new InvalidColorError(input);

  const numbers = channels.map((channel) => Number.parseFloat(channel));
  if (numbers.some((channel) => Number.isNaN(channel))) throw new InvalidColorError(input);

  const alphaPart = slash[1]?.trim();
  let alpha = 1;
  if (alphaPart !== undefined) {
    const parsed = Number.parseFloat(alphaPart);
    if (Number.isNaN(parsed)) throw new InvalidColorError(input);
    alpha = alphaPart.endsWith("%") ? parsed / 100 : parsed;
  }

  return {
    r: clampChannel(numbers[0] ?? 0),
    g: clampChannel(numbers[1] ?? 0),
    b: clampChannel(numbers[2] ?? 0),
    a: clampAlpha(alpha),
  };
}

/** Parse `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`, `rgb(...)` and `rgb(... / a)`. */
export function parseColor(input: string): Rgba {
  if (typeof input !== "string") throw new InvalidColorError(String(input));
  const value = input.trim();
  if (value.startsWith("#")) return parseHex(value);
  if (/^rgba?\(/i.test(value)) return parseRgb(value);
  throw new InvalidColorError(input);
}

/** Source-over alpha compositing of `fg` onto opaque `bg`. */
export function composite(fg: Rgba, bg: Rgba): Rgba {
  const alpha = clampAlpha(fg.a);
  return {
    r: fg.r * alpha + bg.r * (1 - alpha),
    g: fg.g * alpha + bg.g * (1 - alpha),
    b: fg.b * alpha + bg.b * (1 - alpha),
    a: 1,
  };
}

function channelToLinear(channel: number): number {
  const value = clampChannel(channel) / 255;
  return value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
}

/** WCAG 2.2 relative luminance of an opaque colour. */
export function relativeLuminance(color: Rgba): number {
  if (color.a < 1) throw new InvalidColorError("relativeLuminance requires an opaque colour");
  const r = channelToLinear(color.r);
  const g = channelToLinear(color.g);
  const b = channelToLinear(color.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function opaqueBackground(input: string): Rgba {
  const color = parseColor(input);
  if (color.a < 1) {
    throw new InvalidColorError(
      `Background must be opaque for a deterministic measurement (received ${input})`,
    );
  }
  return color;
}

/**
 * WCAG contrast ratio between a foreground and an opaque background.
 * A translucent foreground is composited onto the background first, so a token
 * written as `rgb(245 240 234 / 14%)` is measured as the reader sees it.
 */
export function contrastRatio(foreground: string, background: string): number {
  const bg = opaqueBackground(background);
  const rawFg = parseColor(foreground);
  const fg = rawFg.a < 1 ? composite(rawFg, bg) : rawFg;
  const lighter = Math.max(relativeLuminance(fg), relativeLuminance(bg));
  const darker = Math.min(relativeLuminance(fg), relativeLuminance(bg));
  return (lighter + 0.05) / (darker + 0.05);
}

export function meetsMinimum(ratio: number, minimum: number): boolean {
  return ratio >= minimum;
}

export function formatRatio(ratio: number): string {
  return `${ratio.toFixed(2)}:1`;
}

function describeFailure(pair: ContrastPair, ratio: number): string {
  const rounded = formatRatio(ratio);
  const minimum = formatRatio(pair.minimum);
  const note = pair.note ? ` — ${pair.note}` : "";
  return (
    `[${pair.id}] ${pair.role}: ${pair.fg} on ${pair.bg} = ${rounded}` +
    ` (minimum ${minimum})${note}`
  );
}

/** Evaluate every declared pair; returns failures, never throws for a failing pair. */
export function evaluateContrastPairs(
  pairs: readonly ContrastPair[],
): readonly ContrastFailure[] {
  const failures: ContrastFailure[] = [];

  for (const pair of pairs) {
    const ratio = contrastRatio(pair.fg, pair.bg);
    if (!meetsMinimum(ratio, pair.minimum)) {
      failures.push({ ...pair, ratio, message: describeFailure(pair, ratio) });
    }
  }

  return failures;
}

/**
 * The gate: throws `ContrastGateError` when any pair is below its minimum.
 * The error carries structured failures so CI logs and tests can both assert on
 * token id, colours, measured ratio and threshold — never on a bare boolean.
 */
export function assertContrastPairs(pairs: readonly ContrastPair[]): void {
  const failures = evaluateContrastPairs(pairs);
  if (failures.length > 0) throw new ContrastGateError(failures);
}
