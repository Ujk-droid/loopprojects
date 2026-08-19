"use client";

import { useState } from "react";
import { Estimate, formatRs } from "@/lib/format";

export default function EstimateCard({
  estimate,
  onFinalized,
}: {
  estimate: Estimate;
  onFinalized: (id: string) => void;
}) {
  const [profitPercent, setProfitPercent] = useState("30");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ profit: number; final: number } | null>(null);

  const { materialSubtotal, labourCost, electricity, subtotalBeforeProfit } = estimate;
  const laboursElectricity =
    labourCost != null || electricity != null
      ? (labourCost ?? 0) + (electricity ?? 0)
      : null;

  const parsedProfit = parseFloat(profitPercent);
  const canFinalize =
    !busy &&
    !result &&
    subtotalBeforeProfit != null &&
    Number.isFinite(parsedProfit) &&
    parsedProfit >= 0 &&
    parsedProfit <= 200;

  async function handleFinalize() {
    if (!canFinalize) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: estimate.id, profitPercent: parsedProfit }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to finalize");
      setResult({ profit: data.profit, final: data.final });
      setTimeout(() => onFinalized(estimate.id), 1400);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to finalize");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="glass-card animate-fade-in-up flex flex-col gap-4 p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="label-caps truncate">{estimate.orderType} Estimate</p>
          <h3 className="mt-1 truncate text-lg font-semibold text-[color:var(--text-primary)]">
            {estimate.sender ?? "Practice order (walk-in)"}
          </h3>
          {estimate.subject && (
            <p className="mt-0.5 truncate text-xs text-[color:var(--text-muted)]/80">
              {estimate.subject}
            </p>
          )}
        </div>
        <span className="shrink-0 rounded-full border border-[color:var(--card-border)] px-2.5 py-1 text-[0.65rem] font-medium uppercase tracking-wider text-[color:var(--text-muted)]">
          {estimate.id}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-black/20 p-3">
          <p className="label-caps">Material subtotal</p>
          <p className="mt-1 text-base font-semibold text-accent">
            {materialSubtotal != null ? formatRs(materialSubtotal) : "—"}
          </p>
        </div>
        <div className="rounded-lg bg-black/20 p-3">
          <p className="label-caps">Labour + electricity</p>
          <p className="mt-1 text-base font-semibold text-accent">
            {laboursElectricity != null ? formatRs(laboursElectricity) : "—"}
          </p>
        </div>
      </div>

      <div className="flex items-baseline justify-between border-t border-[color:var(--card-border)] pt-3">
        <span className="label-caps">Subtotal before profit</span>
        <span className="text-lg font-bold text-[color:var(--text-primary)]">
          {subtotalBeforeProfit != null ? formatRs(subtotalBeforeProfit) : "—"}
        </span>
      </div>

      {estimate.assumptionsCount > 0 && (
        <p className="text-xs text-[color:var(--text-muted)]/70">
          ⚠️ {estimate.assumptionsCount} assumption
          {estimate.assumptionsCount === 1 ? "" : "s"} flagged in this draft
        </p>
      )}

      {!result ? (
        <div className="mt-1 flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="number"
              min={0}
              max={200}
              step="0.5"
              value={profitPercent}
              onChange={(e) => setProfitPercent(e.target.value)}
              disabled={busy}
              className="w-full rounded-lg border border-[color:var(--card-border)] bg-black/25 px-3 py-2 pr-8 text-sm text-[color:var(--text-primary)] outline-none focus:border-[color:var(--accent-cyan)] disabled:opacity-50"
              aria-label="Set profit percent"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[color:var(--text-muted)]">
              %
            </span>
          </div>
          <button
            onClick={handleFinalize}
            disabled={!canFinalize}
            className="shrink-0 rounded-lg bg-gradient-to-r from-[color:var(--accent-sky)] to-[color:var(--accent-cyan)] px-4 py-2 text-sm font-semibold text-[#04121c] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? "Finalizing…" : "Finalize"}
          </button>
        </div>
      ) : (
        <div className="mt-1 rounded-lg border border-[color:var(--accent-cyan)]/40 bg-[color:var(--accent-cyan)]/10 p-3">
          <p className="text-xs text-[color:var(--text-muted)]">
            Profit {formatRs(result.profit)} · Final total
          </p>
          <p className="text-xl font-bold text-accent">{formatRs(result.final)}</p>
          <p className="mt-1 text-[0.7rem] text-[color:var(--text-muted)]/70">
            Moved to approved/{estimate.id}-estimate.md
          </p>
        </div>
      )}

      {error && <p className="text-xs text-red-300">{error}</p>}
    </div>
  );
}
