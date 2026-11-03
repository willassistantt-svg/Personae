import { describe, expect, it } from "vitest";
import { dictionaries, translate } from "@/lib/i18n";
import { ageLabel, formatPrice, heightLabel } from "@/lib/format";
import { isAdult, passwordIssue } from "@/lib/validation";

describe("dictionaries", () => {
  it("covers the same keys in Portuguese and English", () => {
    expect(Object.keys(dictionaries.pt).sort()).toEqual(Object.keys(dictionaries.en).sort());
  });

  it("falls back to the key only when nothing was written", () => {
    expect(translate("pt", "missing.key")).toBe("missing.key");
  });
});

describe("membership rules", () => {
  const today = new Date(2026, 10, 3);

  it("accepts an eighteenth birthday", () => {
    expect(isAdult("2008-11-03", today)).toBe(true);
  });

  it("rejects the day before eighteen", () => {
    expect(isAdult("2008-11-04", today)).toBe(false);
  });

  it("rejects an impossible date", () => {
    expect(isAdult("2008-02-31", today)).toBe(false);
  });
});

describe("password and money", () => {
  it("asks for a letter and a number", () => {
    expect(passwordIssue("curta")).toBe("short");
    expect(passwordIssue("somenteLetras")).toBe("weak");
    expect(passwordIssue("Casa2026")).toBeNull();
  });

  it("formats a fee in reais", () => {
    expect(formatPrice(450000, "BRL", "pt")).toMatch(/4\.500,00/);
    expect(ageLabel(26, "en")).toBe("26 years");
    expect(heightLabel(178)).toContain("178 cm");
  });
});
