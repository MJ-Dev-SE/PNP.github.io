export const normalizeCSVDate = (value: string) => {
  if (!value) return "";

  const parts = value.split("/");
  if (parts.length !== 3) return "";

  let [dd, mm, yy] = parts;

  if (yy.length === 2) {
    yy = Number(yy) < 50 ? `20${yy}` : `19${yy}`;
  }

  return `${yy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
};
