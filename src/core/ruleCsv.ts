import { countryFromBasedIn } from "./countries";
import { handleKey, type BlockLogEntry, type RegionInfo, type RegionRule, type RuleAccount } from "./settings";

/** Reads quoted fields, embedded newlines, and CRLF without splitting CSV records prematurely. */
function rowsFromCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], field = "", quoted = false, closed = false;
  const input = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (quoted) {
      if (c === '"' && input[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') { quoted = false; closed = true; }
      else field += c;
    } else if (c === '"' && !field && !closed) quoted = true;
    else if (c === "," || c === "\n" || c === "\r") {
      row.push(field); field = ""; closed = false;
      if (c !== ",") {
        if (row.some((v) => v.trim())) rows.push(row);
        row = [];
        if (c === "\r" && input[i + 1] === "\n") i++;
      }
    } else {
      if (closed || c === '"') throw new Error("Malformed CSV quotation marks.");
      field += c;
    }
  }
  if (quoted) throw new Error("The CSV contains an unclosed quoted field.");
  row.push(field);
  if (row.some((v) => v.trim())) rows.push(row);
  return rows;
}

export function parseRuleCsv(text: string): RuleAccount[] {
  const [header, ...rows] = rowsFromCsv(text);
  const columns = header?.map((v) => v.trim().toLowerCase()) ?? [];
  if (columns.length !== 3 || new Set(columns).size !== 3 ||
      !["handle", "country", "region"].every((name) => columns.includes(name))) {
    throw new Error("Use a CSV with the columns: handle,country,region.");
  }
  if (!rows.length) throw new Error("The CSV contains no accounts.");
  const accounts = new Map<string, RuleAccount>();
  for (const [i, row] of rows.entries()) {
    if (row.length !== columns.length) throw new Error(`CSV record ${i + 2} has the wrong number of fields.`);
    const handle = row[columns.indexOf("handle")].trim().replace(/^@/, "").toLowerCase();
    if (!/^[a-z0-9_]{1,15}$/.test(handle)) throw new Error(`CSV record ${i + 2} has an invalid X handle.`);
    const country = row[columns.indexOf("country")].trim();
    const region = row[columns.indexOf("region")].trim();
    if (country.length > 200 || region.length > 200) throw new Error(`CSV record ${i + 2} has an overly long location.`);
    accounts.set(handle, { handle, country, region });
  }
  return [...accounts.values()];
}

export function mergeRuleAccounts(existing: RuleAccount[], incoming: RuleAccount[]): RuleAccount[] {
  return [...new Map([...existing, ...incoming].map((a) => [handleKey(a.handle), a])).values()];
}

/** Exports listed accounts plus confirmed, still-active blocks belonging to this exact rule. */
export function exportRuleCsv(rule: RegionRule, log: BlockLogEntry[], regions: Record<string, RegionInfo>): string {
  const accounts = new Map((rule.accounts ?? []).map((a) => [handleKey(a.handle), { ...a }]));
  for (const entry of log) {
    if (entry.undone || entry.reason.kind !== "rule" || entry.reason.ruleId !== rule.id) continue;
    const handle = handleKey(entry.handle);
    if (!accounts.has(handle)) accounts.set(handle, {
      handle, country: countryFromBasedIn(entry.reason.basedIn)?.name ?? "", region: entry.reason.basedIn,
    });
  }
  const cell = (value: string) => {
    // Keep untrusted location metadata from becoming a spreadsheet formula.
    const safe = /^[\s]*[=+\-@]/.test(value) ? `'${value}` : value;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  const rows = [...accounts].sort(([a], [b]) => a.localeCompare(b)).map(([handle, account]) => {
    const info = Object.hasOwn(regions, handle) ? regions[handle] : undefined;
    const region = info ? info.basedIn ?? "" : account.region;
    const country = info ? countryFromBasedIn(region)?.name ?? "" : account.country;
    return [handle, country, region].map(cell).join(",");
  });
  return ["handle,country,region", ...rows].join("\r\n") + "\r\n";
}
