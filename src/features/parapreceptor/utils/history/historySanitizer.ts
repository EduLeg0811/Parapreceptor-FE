export const sanitizeNonBreakingSpaces = (text: string | null | undefined): string => {
  if (!text) return "";
  return text.replace(/[\u00A0\xa0]/g, " ").replace(/&nbsp;/g, " ");
};

export const sanitizeHistoryValue = <T>(value: T): T => {
  if (value === null || value === undefined) {
    return value;
  }
  if (typeof value === "string") {
    return sanitizeNonBreakingSpaces(value) as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeHistoryValue(item)) as unknown as T;
  }
  if (typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      result[key] = sanitizeHistoryValue(val);
    }
    return result as T;
  }
  return value;
};
