export function escapeSqlLiteral(value: string): string {
  return value.replace(/'/g, "''");
}
