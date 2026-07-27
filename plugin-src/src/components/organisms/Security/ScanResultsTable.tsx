import { AlertTriangle, Sparkles, Lock, EyeOff, Archive } from "lucide-react";
import { Button } from "../../ui/Button";
import { Badge } from "../../ui/Badge";

interface ScanResult {
  file: string;
  issue: string;
  /**
   * v2.9.29.0 — Per-finding detection sources from the Deep Malware Scan
   * pipeline. Optional: quick-mode malware results have no sources, so the
   * badge column renders empty for them. Values: 'vps_hash' | 'local' |
   * 'wpscan' | 'patchstack' | 'ai'.
   */
  sources?: string[];
}

/**
 * v2.9.29.0 — Visual styling for per-source badges. Each detection source
 * has a distinct color so users can tell at a glance which layer caught
 * what. Order roughly matches detection severity (hash DB hits = highest
 * confidence; AI = inferred). Unknown sources render with a neutral fallback.
 */
const SOURCE_BADGE_STYLES: Record<
  string,
  { label: string; className: string }
> = {
  vps_hash: {
    label: "Hash DB",
    className: "bg-red-100 text-red-800 border-red-300",
  },
  local: {
    label: "Pattern",
    className: "bg-amber-100 text-amber-800 border-amber-300",
  },
  wpscan: {
    label: "WPScan",
    className: "bg-blue-100 text-blue-800 border-blue-300",
  },
  patchstack: {
    label: "Patchstack",
    className: "bg-green-100 text-green-800 border-green-300",
  },
  ai: {
    label: "AI",
    className: "bg-purple-100 text-purple-800 border-purple-300",
  },
};

interface ScanResultsTableProps {
  results: ScanResult[];
  selectedThreats: string[];
  hasSentinelPro: boolean;
  analyzingFile: string | null;
  onToggleSelectAll: () => void;
  onToggleSelection: (file: string) => void;
  onBulkAction: (action: string) => void;
  onAnalyze: (file: string) => void;
  onIgnore: (file: string) => void;
  onQuarantine: (file: string) => void;
  /** Optional: when provided, renders a "Close Results" button at the bottom */
  onClose?: () => void;
  /** Tailwind margin class applied to the outer wrapper div (e.g. "mt-8" or "mt-12") */
  className?: string;
}

export function ScanResultsTable({
  results,
  selectedThreats,
  hasSentinelPro,
  analyzingFile,
  onToggleSelectAll,
  onToggleSelection,
  onBulkAction,
  onAnalyze,
  onIgnore,
  onQuarantine,
  onClose,
  className = "",
}: ScanResultsTableProps) {
  if (!results || results.length === 0) return null;

  return (
    <div className={className}>
      <div className="flex justify-between items-end mb-4">
        <h4 className="font-black text-red-600 flex items-center gap-2 uppercase tracking-widest text-sm">
          <AlertTriangle size={18} /> Suspicious Files Found ({results.length})
        </h4>
        {selectedThreats.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              className={
                hasSentinelPro
                  ? "bg-background text-foreground dark:text-foreground hover:bg-secondary rounded-none uppercase font-black text-sm"
                  : "opacity-50 cursor-not-allowed bg-background text-foreground dark:text-foreground rounded-none uppercase font-black text-sm"
              }
              onClick={
                hasSentinelPro ? () => onBulkAction("analyze") : undefined
              }
              disabled={!hasSentinelPro}
              icon={hasSentinelPro ? Sparkles : Lock}
            >
              Analyze ({selectedThreats.length})
              {!hasSentinelPro && (
                <Badge className="ml-1 text-xs uppercase font-black tracking-widest bg-muted text-muted-foreground border-border">
                  PRO
                </Badge>
              )}
            </Button>
            <Button
              size="sm"
              className="bg-card text-black border border-black hover:bg-background rounded-none uppercase font-black text-sm"
              onClick={() => onBulkAction("ignore")}
            >
              Ignore
            </Button>
            <Button
              size="sm"
              className="bg-amber-600 text-white hover:bg-amber-700 rounded-none uppercase font-black text-sm"
              onClick={() => onBulkAction("quarantine")}
              icon={Archive}
            >
              Quarantine
            </Button>
            <Button
              size="sm"
              className="bg-red-600 text-white hover:bg-red-700 rounded-none uppercase font-black text-sm"
              onClick={() => onBulkAction("delete")}
            >
              Delete
            </Button>
          </div>
        )}
      </div>
      <div className="bg-card border-2 border-black overflow-hidden max-h-96 overflow-y-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-background text-foreground dark:text-foreground sticky top-0 font-black uppercase tracking-widest text-xs z-10">
            <tr className="text-left text-xs font-bold text-neutral-700  uppercase tracking-wider bg-background dark:bg-secondary">
              <th className="p-3 w-8 border-b border-border dark:border-border/20">
                <input
                  type="checkbox"
                  checked={selectedThreats.length === results.length}
                  onChange={onToggleSelectAll}
                  className="rounded-none border-border text-black focus:ring-0 w-4 h-4"
                />
              </th>
              <th className="p-3 border-b border-border dark:border-border/20">
                File
              </th>
              <th className="p-3 border-b border-border dark:border-border/20">
                Issue
              </th>
              <th className="p-3 text-right border-b border-border dark:border-border/20">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black">
            {results.map((res, idx) => (
              <tr key={idx} className="hover:bg-red-50 transition-colors group">
                <td className="p-3 align-top bg-card group-hover:bg-red-50">
                  <input
                    type="checkbox"
                    checked={selectedThreats.includes(res.file)}
                    onChange={() => onToggleSelection(res.file)}
                    className="rounded-none border-black text-red-600 focus:ring-0 w-4 h-4"
                  />
                </td>
                <td className="p-3 font-mono text-xs text-black break-all group-hover:bg-red-50 bg-card border-r border-black/10">
                  {res.file}
                </td>
                <td className="p-3 text-red-600 text-xs font-black uppercase tracking-wide whitespace-nowrap bg-card group-hover:bg-red-50 border-r border-black/10">
                  <div className="flex flex-col gap-1.5">
                    <span>{res.issue}</span>
                    {/* v2.9.29.0 — Source badges (deep-malware only). Quick-mode
                                            results have no `sources` array so this row stays empty. */}
                    {res.sources && res.sources.length > 0 && (
                      <div
                        className="flex flex-wrap gap-1"
                        aria-label="Detection sources"
                      >
                        {res.sources.map((src) => {
                          const style = SOURCE_BADGE_STYLES[src] ?? {
                            label: src,
                            className:
                              "bg-gray-100 text-gray-700 border-gray-300",
                          };
                          return (
                            <span
                              key={src}
                              className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-black uppercase tracking-wider ${style.className}`}
                              title={`Detected by ${style.label}`}
                            >
                              {style.label}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </td>
                <td className="p-3 flex justify-end gap-2 bg-card group-hover:bg-red-50">
                  <Button
                    size="sm"
                    className={
                      hasSentinelPro
                        ? "bg-background text-foreground dark:text-foreground hover:bg-red-600 rounded-none h-6 px-2 text-sm uppercase font-bold"
                        : "opacity-40 cursor-not-allowed bg-background text-foreground dark:text-foreground rounded-none h-6 px-2 text-sm uppercase font-bold"
                    }
                    onClick={
                      hasSentinelPro ? () => onAnalyze(res.file) : undefined
                    }
                    disabled={!hasSentinelPro || analyzingFile === res.file}
                    loading={analyzingFile === res.file}
                    icon={hasSentinelPro ? Sparkles : Lock}
                    title={
                      hasSentinelPro
                        ? "Analyze with AI"
                        : "AI Analysis requires Pro license"
                    }
                  >
                    Analyze
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="hover:text-red-600 rounded-none h-6 px-2"
                    onClick={() => onIgnore(res.file)}
                    title="Ignore"
                  >
                    <EyeOff size={14} />
                  </Button>
                  <Button
                    size="sm"
                    className="text-red-600 hover:bg-red-600 hover:text-foreground dark:hover:text-foreground border border-transparent hover:border-black rounded-none h-6 px-2"
                    onClick={() => onQuarantine(res.file)}
                    title="Quarantine"
                  >
                    <Archive size={14} />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="bg-background p-4 text-xs text-black border border-black mt-4 flex items-start gap-4">
        <Archive className="shrink-0 mt-0.5 text-black" size={16} />
        <div>
          <strong className="block mb-1 font-black uppercase tracking-wide">
            Safe Quarantine
          </strong>
          Quarantining a file moves it to a secure, isolated location. It is not
          deleted, and you can restore it at any time.
        </div>
      </div>
      {onClose && (
        <div className="mt-6 flex justify-end">
          <Button
            variant="ghost"
            className="rounded-none uppercase font-black text-xs hover:bg-background hover:text-foreground dark:hover:text-foreground"
            onClick={onClose}
          >
            Close Results
          </Button>
        </div>
      )}
    </div>
  );
}
