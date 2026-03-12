export function parseLocalDate(dateValue: string | Date | null | undefined) {
  if (dateValue instanceof Date) {
    return new Date(dateValue.getFullYear(), dateValue.getMonth(), dateValue.getDate());
  }

  if (!dateValue) {
    return new Date(Number.NaN);
  }

  const normalized = String(dateValue).slice(0, 10);
  const [year, month, day] = normalized.split("-").map(Number);

  if (!year || !month || !day) {
    return new Date(Number.NaN);
  }

  return new Date(year, month - 1, day);
}

export function formatDateInputValue(date?: Date | null) {
  if (!date) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
