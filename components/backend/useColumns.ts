export function buildColumnsFromRows(rows: any[], preferOrder: string[] = []) {
  const first = rows?.[0] ?? {};
  const keys = Object.keys(first);

  const ordered = [
    ...preferOrder.filter((k) => keys.includes(k)),
    ...keys.filter((k) => !preferOrder.includes(k)),
  ];

  return ordered.map((k) => ({
    key: k,
    label: k.replace(/_/g, " ").toUpperCase(),
  }));
}
