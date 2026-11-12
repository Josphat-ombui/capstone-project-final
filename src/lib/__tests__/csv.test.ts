import { describe, expect, it } from "vitest";
import { buildCsv } from "../csv";

describe("CSV export", () => {
  it("writes the header and rows in the given column order", () => {
    const text = buildCsv([{ b: 2, a: 1 }], ["a", "b"]);
    expect(text).toBe("a,b\r\n1,2");
  });

  it("quotes values with commas, quotes and line breaks", () => {
    const text = buildCsv([{ name: 'Tablet, "film" coated\nline two' }], ["name"]);
    expect(text).toBe('name\r\n"Tablet, ""film"" coated\nline two"');
  });

  it("writes missing values as empty cells", () => {
    expect(buildCsv([{ a: null }], ["a", "b"])).toBe("a,b\r\n,");
  });
});
