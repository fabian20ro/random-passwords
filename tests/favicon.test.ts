import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

test("tab icons resolve from Vite public assets without external resources", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  for (const rel of ["icon", "mask-icon"]) {
    const link = html.match(new RegExp(`<link rel="${rel}"[^>]+>`))?.[0];
    expect(link).toBeDefined();
    const href = link!.match(/href="([^"]+)"/)![1];
    expect(href).toMatch(/^\/[^/]+\.svg$/);
    const svg = readFileSync(new URL(`../public${href}`, import.meta.url), "utf8");
    expect(svg).toContain('viewBox="0 0 32 32"');
    expect(svg).not.toMatch(/<(?:script|image|foreignObject|text)\b|(?:href|onload)=/);
  }
});
