import { describe, test, expect } from "vite-plus/test";
import { transform } from "../index.mjs";

// Base64 VLQ alphabet (decoder mirror of the encoder in src/pipeline.mjs).
const VLQ_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/**
 * Decode one base64 VLQ string into its signed values.
 * @param segment Encoded segment
 * @returns Decoded signed values
 */
function decodeVLQ(segment: string): number[] {
  const values: number[] = [];
  let i = 0;
  while (i < segment.length) {
    let value = 0;
    let shift = 0;
    let digit: number;
    do {
      digit = VLQ_CHARS.indexOf(segment[i++]!);
      value |= (digit & 31) << shift;
      shift += 5;
    } while (digit & 32);
    values.push(value & 1 ? -(value >> 1) : value >> 1);
  }
  return values;
}

/**
 * Decode a source map's mappings string into absolute segment positions
 * (0-based generated line/column, 0-based original line/column).
 * @param mappings Encoded mappings field
 * @returns Decoded segments
 */
function decodeMappings(
  mappings: string,
): { genLine: number; genCol: number; origLine: number; origCol: number }[] {
  const segments: { genLine: number; genCol: number; origLine: number; origCol: number }[] = [];
  let genLine = 0;
  let origLine = 0;
  let origCol = 0;
  for (const line of mappings.split(";")) {
    let genCol = 0;
    for (const segment of line.split(",")) {
      if (!segment) continue;
      const fields = decodeVLQ(segment);
      genCol += fields[0]!;
      origLine += fields[2] ?? 0;
      origCol += fields[3] ?? 0;
      segments.push({ genLine, genCol, origLine, origCol });
    }
    genLine++;
  }
  return segments;
}

/**
 * Resolve the original position for a generated position: the nearest segment
 * at or before it on the same generated line.
 * @param segments Decoded segments
 * @param genLine Generated line (0-based)
 * @param genCol Generated column (0-based)
 * @returns The governing segment, or undefined
 */
function originalFor(
  segments: { genLine: number; genCol: number; origLine: number; origCol: number }[],
  genLine: number,
  genCol: number,
) {
  return segments
    .filter((segment) => segment.genLine === genLine && segment.genCol <= genCol)
    .sort((a, b) => b.genCol - a.genCol)[0];
}

describe("sourcemaps", () => {
  test("maps a dynamic expression to its original position at the ast target", () => {
    const code = "const el = (\n  <div>\n    {count()}\n  </div>\n);";
    const result = transform(code, { filename: "app.jsx", target: "ast" })!;
    expect(result.map).not.toBeNull();
    const map = result.map as { version: number; sources: string[]; mappings: string };
    expect(map.version).toBe(3);
    expect(map.sources).toEqual(["app.jsx"]);
    const out = result.code;
    const index = out.indexOf("count()");
    const lines = out.slice(0, index).split("\n");
    const segment = originalFor(
      decodeMappings(map.mappings),
      lines.length - 1,
      lines[lines.length - 1]!.length,
    )!;
    // `{count()}` sits at input line 3, column 5 (0-based).
    expect(segment.origLine).toBe(2);
    expect(segment.origCol).toBe(5);
  });

  test("maps a dynamic expression to its original position at the dom target", () => {
    const code = "const el = (\n  <div>\n    {count()}\n  </div>\n);";
    const result = transform(code, { filename: "app.jsx", target: "dom" })!;
    const map = result.map as { mappings: string };
    const out = result.code;
    const index = out.indexOf("count()");
    const lines = out.slice(0, index).split("\n");
    const segment = originalFor(
      decodeMappings(map.mappings),
      lines.length - 1,
      lines[lines.length - 1]!.length,
    )!;
    expect(segment.origLine).toBe(2);
    expect(segment.origCol).toBe(5);
  });

  test("ships the print map alone for jsx input", () => {
    const result = transform('<div class="x">{count()}</div>', {
      filename: "app.jsx",
      target: "dom",
    })!;
    const map = result.map as { sources: string[]; sourcesContent?: string[]; mappings: string };
    expect(map.sources).toEqual(["app.jsx"]);
    expect(map.sourcesContent?.[0]).toBe('<div class="x">{count()}</div>');
    expect(map.mappings.length).toBeGreaterThan(0);
  });

  test("composes the strip map with the print map for tsx input without throwing", () => {
    const code =
      'import type { A } from "./a";\nimport { signal } from "@hellajs/core";\nconst f = <T,>(x: T): T => x;\nconst el = <div>{f(1)}</div>;';
    const result = transform(code, { filename: "app.tsx", lang: "tsx", target: "dom" })!;
    const map = result.map as { version: number; sources: string[]; mappings: string };
    // The composed map resolves through the strip stage back to the original
    // file: `f(1)` in the output maps to its authored line 4.
    expect(map.version).toBe(3);
    expect(map.sources).toEqual(["app.tsx"]);
    const segments = decodeMappings(map.mappings);
    expect(segments.length).toBeGreaterThan(0);
    const out = result.code;
    const index = out.indexOf("f(1)");
    const lines = out.slice(0, index).split("\n");
    const segment = originalFor(segments, lines.length - 1, lines[lines.length - 1]!.length)!;
    expect(segment.origLine).toBe(3);
  });
});
