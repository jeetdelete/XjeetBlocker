import { describe, expect, it } from "vitest";
import { exportRuleCsv, mergeRuleAccounts, parseRuleCsv } from "../src/core/ruleCsv";
import type { BlockLogEntry, RegionRule } from "../src/core/settings";

const rule: RegionRule = { id: "one", name: "Same name", enabled: true, countries: [], broadRegions: [] };

describe("rule account CSV", () => {
  it("accepts reordered headers, BOM, CRLF, quoted commas and escaped quotes; deduplicates handles", () => {
    const rows = parseRuleCsv('\uFEFFregion,handle,country\r\n"Region, one",@SAM,"A ""country"""\r\nOther,sam,Updated\r\nSouth Asia,ravi,\r\n');
    expect(rows).toEqual([
      { handle: "sam", country: "Updated", region: "Other" },
      { handle: "ravi", country: "", region: "South Asia" },
    ]);
  });

  it.each([
    "name,country,region\nsam,US,America",
    "handle,country,region\nbad/handle,US,America",
    'handle,country,region\nsam,"unclosed,America',
    "handle,country,region\nsam,US,America,extra",
    "handle,country,region\n",
  ])("rejects invalid input before saving: %s", (csv) => {
    expect(() => parseRuleCsv(csv)).toThrow();
  });

  it("exports only this rule's active blocks and listed accounts, with known and unknown locations", () => {
    const log: BlockLogEntry[] = [
      { handle: "SAM", at: 1, reason: { kind: "rule", ruleId: "one", ruleName: "Old name", basedIn: "India" } },
      { handle: "gone", at: 2, reason: { kind: "rule", ruleId: "one", ruleName: "Same name", basedIn: "India" }, undone: true },
      { handle: "other", at: 3, reason: { kind: "rule", ruleId: "two", ruleName: "Same name", basedIn: "India" } },
      { handle: "hand", at: 4, reason: { kind: "hand" } },
    ];
    const csv = exportRuleCsv({ ...rule, accounts: [
      { handle: "sam", country: "Old", region: "Old" },
      { handle: "ghost", country: "", region: "" },
      { handle: "ravi", country: "", region: "South Asia" },
    ] }, log, { sam: { basedIn: "United States", accurate: true, fetchedAt: 1 } });
    expect(parseRuleCsv(csv)).toEqual([
      { handle: "ghost", country: "", region: "" },
      { handle: "ravi", country: "", region: "South Asia" },
      { handle: "sam", country: "United States", region: "United States" },
    ]);
  });

  it("round-trips quoted location metadata and neutralizes spreadsheet formulas", () => {
    const csv = exportRuleCsv({ ...rule, accounts: [
      { handle: "sam", country: 'A, "country"', region: "=HYPERLINK(\"bad\")" },
    ] }, [], {});
    expect(parseRuleCsv(csv)[0]).toEqual({ handle: "sam", country: 'A, "country"', region: "'=HYPERLINK(\"bad\")" });
  });

  it("merges imports without dropping existing accounts and updates duplicate metadata", () => {
    expect(mergeRuleAccounts([
      { handle: "SAM", country: "Old", region: "Old" },
      { handle: "keep", country: "", region: "" },
    ], [{ handle: "sam", country: "New", region: "New" }])).toEqual([
      { handle: "sam", country: "New", region: "New" },
      { handle: "keep", country: "", region: "" },
    ]);
  });
});
