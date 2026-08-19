export interface Estimate {
  id: string;
  orderType: string;
  sourceFile: string;
  sender: string | null;
  subject: string | null;
  materialSubtotal: number | null;
  labourCost: number | null;
  electricity: number | null;
  subtotalBeforeProfit: number | null;
  assumptionsCount: number;
  awaitingProfit: boolean;
}

export function formatRs(n: number): string {
  return (
    "Rs " +
    n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  );
}
