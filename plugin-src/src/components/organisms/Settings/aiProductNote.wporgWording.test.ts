/**
 * Source-content regression lock for aiProductNote.tsx, added for
 * v2.9.33.61 NAMES-A (owner ruling 2026-09-23, Telegram 3313/3324): the
 * Free edition's display name is "SwissSuite Security Backup and SEO" and
 * the paid product is "SwissSuite AI" — this is the ONE place in the Free
 * plugin's UI allowed to name the paid product (WP.org Guideline 11 one
 * pointer, Settings > General only). The word "Pro" is never used.
 *
 * Pattern follows BackupControl.wporgWording.test.ts (plain source-content
 * assertions via readFileSync, no component render needed).
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, it, expect } from "vitest";

const NOTE_SOURCE = readFileSync(
  path.join(
    process.cwd(),
    "src/components/organisms/Settings/aiProductNote.tsx"
  ),
  "utf-8"
);

const LAYOUT_SOURCE = readFileSync(
  path.join(process.cwd(), "src/components/templates/DashboardLayout.tsx"),
  "utf-8"
);

describe("aiProductNote.tsx (Free) — the one permitted pointer to the paid product", () => {
  it("names the paid product with the exact ruled sentence", () => {
    // The JSX text wraps across source lines, so compare with whitespace
    // collapsed.
    const text = NOTE_SOURCE.replace(/\s+/g, " ");
    expect(text).toContain(
      "AI-assisted security analysis, AI rewriting of WooCommerce product descriptions, a firewall that also inspects cookies, form submissions and uploads, and rules written to .htaccess for you are available in SwissSuite AI Plus, a separate plugin described at"
    );
  });

  it("links to the product page", () => {
    expect(NOTE_SOURCE).toContain(
      'PRODUCT_PAGE_URL = "https://swisswpsecure.com/products/"'
    );
  });

  it('names "SwissSuite AI" exactly once (no repeated upsell)', () => {
    const hits = NOTE_SOURCE.match(/SwissSuite AI/g) || [];
    expect(hits.length).toBe(1);
  });

  it('never uses "Pro" or edition/upgrade vocabulary', () => {
    expect(NOTE_SOURCE).not.toMatch(/\bPro\b/);
    expect(NOTE_SOURCE.toLowerCase()).not.toMatch(
      /\b(edition|upgrade|unlock|subscription|tier|trial)\b/
    );
  });
});

describe("DashboardLayout.tsx — the paid product name never leaks outside Settings", () => {
  it('never names "SwissSuite AI" in the shared chrome/navigation', () => {
    expect(LAYOUT_SOURCE).not.toContain("SwissSuite AI");
  });
});
