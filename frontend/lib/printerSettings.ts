export type PrinterRule = {
  id: string;
  barName: string;
  tableFrom: number | null;  // null = no lower table bound
  tableTo: number | null;    // null = no upper table bound
  categories: string[];       // empty = all categories
  accountId: string;          // empty = all accounts
};

export type PrinterSettings = {
  printBarOrders: boolean;
  rules: PrinterRule[];
};

export const DEFAULT_SETTINGS: PrinterSettings = {
  printBarOrders: true,
  rules: [{ id: "1", barName: "Bar 1", tableFrom: null, tableTo: null, categories: [], accountId: "" }],
};

export async function fetchPrinterSettings(): Promise<PrinterSettings> {
  try {
    const res = await fetch("/settings/printer/");
    if (!res.ok) return DEFAULT_SETTINGS;
    const data = await res.json();
    // Normalise: ensure every rule has a categories array
    return {
      ...DEFAULT_SETTINGS,
      ...data,
      rules: (data.rules ?? []).map((r: PrinterRule) => ({
        ...r,
        categories: r.categories ?? [],
        accountId: r.accountId ?? "",
      })),
    };
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
