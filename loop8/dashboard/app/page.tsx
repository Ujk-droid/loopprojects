"use client";

import { useEffect, useState, useCallback } from "react";
import EstimateCard from "@/components/EstimateCard";
import WaveBackground from "@/components/WaveBackground";
import { Estimate } from "@/lib/format";

export default function Home() {
  const [estimates, setEstimates] = useState<Estimate[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/drafts", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load drafts");
      setEstimates(data.estimates);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load drafts");
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [load]);

  function handleFinalized(id: string) {
    setEstimates((prev) => (prev ? prev.filter((e) => e.id !== id) : prev));
  }

  return (
    <main className="relative z-10 mx-auto min-h-screen w-full max-w-6xl px-6 py-12">
      <WaveBackground />

      <header className="mb-10">
        <p className="label-caps">Kamran Steel Works</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[color:var(--text-primary)] sm:text-4xl">
          Estimate Drafts
        </h1>
        <p className="mt-2 max-w-xl text-sm text-[color:var(--text-muted)]/80">
          Live from <code className="text-accent">drafts/</code> — set a profit % and
          finalize to move an estimate into <code className="text-accent">approved/</code>.
        </p>
      </header>

      {error && (
        <p className="mb-6 rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-300">
          {error}
        </p>
      )}

      {estimates === null && !error && (
        <p className="text-sm text-[color:var(--text-muted)]">Loading drafts…</p>
      )}

      {estimates && estimates.length === 0 && (
        <div className="glass-card p-8 text-center text-sm text-[color:var(--text-muted)]">
          No drafts waiting right now. New estimates from the order watcher will
          appear here automatically.
        </div>
      )}

      {estimates && estimates.length > 0 && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {estimates.map((estimate) => (
            <EstimateCard key={estimate.id} estimate={estimate} onFinalized={handleFinalized} />
          ))}
        </div>
      )}
    </main>
  );
}
