"use client";
import { useState } from "react";

export default function PricingSyncPage() {
  const [url, setUrl] = useState("");
  const [csv, setCsv] = useState("");
  const [mode, setMode] = useState("update_all");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // PriceCharting sync state
  const [pcApplySell, setPcApplySell] = useState(false);
  const [pcMarkup, setPcMarkup] = useState(15);
  const [pcLoading, setPcLoading] = useState(false);
  const [pcResult, setPcResult] = useState<any>(null);

  // PriceCharting import state
  const [importLimit, setImportLimit] = useState(100);
  const [importStock, setImportStock] = useState(0);
  const [importOverwrite, setImportOverwrite] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  async function runPCImport(dryRun: boolean) {
    setImportLoading(true);
    setImportResult(null);
    try {
      const res = await fetch("/api/admin/pricecharting/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dryRun,
          limit: importLimit,
          defaultStock: importStock,
          overwrite: importOverwrite,
        }),
      });
      const data = await res.json();
      setImportResult(data);
    } catch (e: unknown) {
      setImportResult({ error: e instanceof Error ? e.message : "Failed" });
    } finally {
      setImportLoading(false);
    }
  }

  async function runCSVSync() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/pricing/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url || undefined,
          csv: csv || undefined,
          mode,
        }),
      });
      const data = await res.json();
      setResult(data);
    } catch (e: unknown) {
      setResult({ error: e instanceof Error ? e.message : "Failed" });
    } finally {
      setLoading(false);
    }
  }

  async function runPCSync() {
    setPcLoading(true);
    setPcResult(null);
    try {
      const res = await fetch("/api/admin/pricecharting/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applyToSellPrice: pcApplySell,
          markupPct: pcMarkup,
        }),
      });
      const data = await res.json();
      setPcResult(data);
    } catch (e: unknown) {
      setPcResult({ error: e instanceof Error ? e.message : "Failed" });
    } finally {
      setPcLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-1">Price / Stock sync</h1>
        <p className="text-white/60 text-sm">
          Pull prices, stock, and market references from PriceCharting or any CSV source.
        </p>
      </div>

      {/* PriceCharting — import listings from your custom CSV */}
      <section className="card p-5 space-y-4">
        <div>
          <h2 className="font-semibold text-lg">Import listings from PriceCharting</h2>
          <p className="text-xs text-white/60">
            Pulls your custom PriceCharting price guide (the one your token unlocks)
            and creates a Product for every row — with the PriceCharting ID linked
            and variants pre-populated from loose / CIB / new / box-only / manual-only prices.
            Stock is set to the value below (0 by default; fill it in later on each product).
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-3 items-end">
          <div>
            <label className="label">Row limit</label>
            <input
              type="number"
              className="input"
              value={importLimit}
              min={1}
              max={5000}
              onChange={(e) => setImportLimit(Number(e.target.value) || 0)}
            />
          </div>
          <div>
            <label className="label">Default stock per variant</label>
            <input
              type="number"
              className="input"
              value={importStock}
              min={0}
              onChange={(e) => setImportStock(Number(e.target.value) || 0)}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={importOverwrite}
              onChange={(e) => setImportOverwrite(e.target.checked)}
            />
            Overwrite if PriceCharting ID already linked
          </label>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => runPCImport(true)}
            disabled={importLoading}
            className="btn btn-ghost"
          >
            {importLoading ? "Working…" : "Preview (dry run)"}
          </button>
          <button
            onClick={() => runPCImport(false)}
            disabled={importLoading}
            className="btn btn-primary"
          >
            {importLoading ? "Importing…" : "Run import"}
          </button>
        </div>

        {importResult && (
          <pre className="card p-3 text-xs overflow-x-auto max-h-96">
            {JSON.stringify(importResult, null, 2)}
          </pre>
        )}
      </section>

      {/* PriceCharting live sync */}
      <section className="card p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-lg">PriceCharting live sync</h2>
            <p className="text-xs text-white/60">
              Fetches current loose / CIB / new prices for every product linked to a PriceCharting ID
              (set the link on each product's edit page).
            </p>
          </div>
          <a
            href="/api/admin/pricecharting/custom-csv"
            className="btn btn-ghost text-xs"
            target="_blank"
            rel="noreferrer"
          >
            Download my custom CSV
          </a>
        </div>

        <div className="grid md:grid-cols-3 gap-3 items-end">
          <label className="flex items-center gap-2 text-sm md:col-span-2">
            <input
              type="checkbox"
              checked={pcApplySell}
              onChange={(e) => setPcApplySell(e.target.checked)}
            />
            Also update each variant's <b>selling price</b> (maps condition → PC price)
          </label>
          <div>
            <label className="label">Markup %</label>
            <input
              type="number"
              className="input"
              value={pcMarkup}
              onChange={(e) => setPcMarkup(Number(e.target.value) || 0)}
              disabled={!pcApplySell}
            />
          </div>
        </div>

        <div className="text-xs text-white/60">
          Condition → PC mapping: <b>NEW</b> → new-price, <b>CIB / VG w/ manual</b> → cib-price,
          <b> VG no manual / Good / Well Used / Disc Only</b> → loose-price,
          <b> Box Only</b> → box-only-price, <b>Manual Only</b> → manual-only-price.
        </div>

        <button onClick={runPCSync} disabled={pcLoading} className="btn btn-primary">
          {pcLoading ? "Syncing from PriceCharting…" : "Run PriceCharting sync"}
        </button>

        {pcResult && (
          <pre className="card p-3 text-xs overflow-x-auto">
            {JSON.stringify(pcResult, null, 2)}
          </pre>
        )}
      </section>

      {/* CSV / Google Sheet sync */}
      <section className="card p-5 space-y-4">
        <h2 className="font-semibold text-lg">CSV / Google Sheet sync</h2>
        <p className="text-xs text-white/60">
          Useful if you maintain inventory in your own spreadsheet. Match rows to variants by{" "}
          <code className="font-mono">sku</code>, or to products by <code className="font-mono">slug</code>.
        </p>

        <div>
          <label className="label">
            Published CSV URL (Google Sheet → File → Share → Publish to web → CSV)
          </label>
          <input
            className="input"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://docs.google.com/spreadsheets/d/e/…/pub?output=csv"
          />
          <p className="text-xs text-white/50 mt-1">
            Or leave blank and paste raw CSV below. Defaults to{" "}
            <code className="font-mono">PRICE_SHEET_CSV_URL</code> env var.
          </p>
        </div>

        <div>
          <label className="label">Or paste CSV</label>
          <textarea
            className="textarea font-mono text-xs"
            rows={6}
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
            placeholder={"sku,price,stock,reference_price\nGTA5-PS4-VGCM-001,14.99,3,19.99"}
          />
        </div>

        <div>
          <label className="label">Mode</label>
          <select className="select max-w-sm" value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="update_all">Update price + stock + reference</option>
            <option value="update_price">Update price only</option>
            <option value="update_stock">Update stock only</option>
            <option value="update_reference">Update reference price only</option>
          </select>
        </div>

        <button onClick={runCSVSync} disabled={loading} className="btn btn-ghost">
          {loading ? "Syncing…" : "Run CSV sync"}
        </button>

        {result && (
          <pre className="card p-3 text-xs overflow-x-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        )}

        <div className="card p-4 text-sm text-white/80">
          <h3 className="font-semibold mb-1">Expected CSV columns</h3>
          <ul className="list-disc pl-5 space-y-1 text-xs">
            <li><code className="font-mono">sku</code> (required to match a variant)</li>
            <li><code className="font-mono">price</code> — new selling price</li>
            <li><code className="font-mono">stock</code> — new stock count</li>
            <li><code className="font-mono">reference_price</code> — "market reference" on the listing</li>
            <li><code className="font-mono">slug</code> — use instead of SKU to set reference at the product level</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
