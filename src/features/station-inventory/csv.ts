//csv functionalities, rules and adjustments
export const normalizeCSVDate = (value: string) => {
  const raw = String(value ?? "").trim();
  if (!raw) return "";

  // Already in ISO format (YYYY-MM-DD)
  const isoMatch = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const [, yy, mm, dd] = isoMatch;
    return `${yy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  }

  // Legacy CSV format (DD/MM/YY or DD/MM/YYYY)
  const slashMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
  if (slashMatch) {
    let [, dd, mm, yy] = slashMatch;
    if (yy.length === 2) {
      yy = Number(yy) < 50 ? `20${yy}` : `19${yy}`;
    }
    return `${yy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  }

  return "";
};
