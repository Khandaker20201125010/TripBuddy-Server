export const getPlanStatus = (start: Date, end: Date) => {
  const now = new Date();
  if (end < now) return "COMPLETED";
  if (start > now) return "UPCOMING";
  return "ONGOING";
};