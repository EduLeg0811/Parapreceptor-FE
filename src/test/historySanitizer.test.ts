import { describe, it, expect } from "vitest";
import { sanitizeNonBreakingSpaces, sanitizeHistoryValue } from "@/features/parapreceptor/utils/history/historySanitizer";

describe("historySanitizer", () => {
  it("replaces non-breaking space (\\u00A0 and &nbsp;) with standard spaces", () => {
    const input = "Texto\u00A0com\u00A0espaço\xa0não\xa0quebrável e &nbsp;entidade";
    const result = sanitizeNonBreakingSpaces(input);
    expect(result).toBe("Texto com espaço não quebrável e  entidade");
    expect(result).not.toContain("\u00A0");
    expect(result).not.toContain("\xa0");
    expect(result).not.toContain("&nbsp;");
  });

  it("handles null, undefined and empty strings", () => {
    expect(sanitizeNonBreakingSpaces(null)).toBe("");
    expect(sanitizeNonBreakingSpaces(undefined)).toBe("");
    expect(sanitizeNonBreakingSpaces("")).toBe("");
  });

  it("sanitizes complex nested objects and arrays in history payloads", () => {
    const rawPayload = {
      kind: "lexical_overview",
      term: "termo\u00A0com\u00A0nbsp",
      groups: [
        {
          bookLabel: "Livro\u00A01",
          matches: [
            {
              title: "Título\u00A0Léxico",
              text: "Trecho\u00A0de\u00A0texto\u00A0com\xa0espaços.",
              data: {
                campo1: "Valor\u00A01",
              },
            },
          ],
        },
      ],
    };

    const sanitized = sanitizeHistoryValue(rawPayload);
    expect(sanitized.term).toBe("termo com nbsp");
    expect(sanitized.groups[0].bookLabel).toBe("Livro 1");
    expect(sanitized.groups[0].matches[0].title).toBe("Título Léxico");
    expect(sanitized.groups[0].matches[0].text).toBe("Trecho de texto com espaços.");
    expect(sanitized.groups[0].matches[0].data.campo1).toBe("Valor 1");
  });
});
