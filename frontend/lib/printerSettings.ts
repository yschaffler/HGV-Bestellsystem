export type TablePrinterRule = {
  id: string;
  tableFrom: number;
  tableTo: number;
  barName: string;
};

export type PrinterSettings = {
  printBarOrders: boolean;
  rules: TablePrinterRule[];
};

export const DEFAULT_SETTINGS: PrinterSettings = {
  printBarOrders: true,
  rules: [{ id: "1", tableFrom: 1, tableTo: 99, barName: "Bar 1" }],
};

export async function fetchPrinterSettings(): Promise<PrinterSettings> {
  try {
    const res = await fetch("/settings/printer/");
    if (!res.ok) return DEFAULT_SETTINGS;
    return await res.json();
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function updatePrinterSettings(settings: PrinterSettings): Promise<void> {
  await fetch("/settings/printer/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  });
}

/** Returns the bar name for a given table number, or "" if no rule matches. */
export function getBarNameForTable(table: number, settings: PrinterSettings): string {
  for (const rule of settings.rules) {
    if (table >= rule.tableFrom && table <= rule.tableTo) return rule.barName;
  }
  return "";
}
