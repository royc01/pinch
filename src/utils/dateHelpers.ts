export function formatMonthDay(dateStr: string | undefined): string {
  if (!dateStr) return '';
  
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  
  return `${date.getMonth() + 1}/${date.getDate()}`;
}
