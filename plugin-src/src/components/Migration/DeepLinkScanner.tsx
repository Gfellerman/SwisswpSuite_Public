import React, { useState, useEffect } from "react";
import {
  Search,
  ShieldCheck,
  AlertTriangle,
  CheckCircle,
  Play,
  Pause,
  RefreshCw,
  X,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";

interface DeepLinkScannerProps {
  oldDomain: string;
  newDomain: string;
}

interface Issue {
  source_id: number;
  location: string;
  original_string: string;
  suggested_fix: string;
  confidence: string;
  status?: "pending" | "fixing" | "fixed" | "failed" | "ignored";
}

const DeepLinkScanner: React.FC<DeepLinkScannerProps> = ({
  oldDomain,
  newDomain,
}) => {
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [scannedCount, setScannedCount] = useState(0);
  const [fixing, setFixing] = useState(false);

  // Config
  const BATCH_SIZE = 5; // Low batch size for deep analysis
  const { apiUrl, nonce } = window.swisswpsuiteData || {};

  const startScan = async () => {
    if (!oldDomain) {
      toast.error("Please specify the Old Domain first.");
      return;
    }

    setScanning(true);
    setIssues([]);
    setScannedCount(0);
    setProgress(0);

    let offset = 0;
    let hasMore = true;
    let errorCount = 0;

    while (hasMore && !window.swisswpsuiteScanStop) {
      // Check global stop flag or ref
      try {
        const res = await fetch(`${apiUrl}/migration/scan`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-WP-Nonce": nonce },
          body: JSON.stringify({
            old_domain: oldDomain,
            offset: offset,
            limit: BATCH_SIZE,
          }),
        });

        if (res.status === 429) {
          console.warn("Rate Limit (429). Pausing for 65s...");
          await new Promise((r) => setTimeout(r, 65000));
          continue; // Retry same batch
        }

        if (!res.ok) throw new Error("API Error");

        const data = await res.json();

        if (data.issues && Array.isArray(data.issues)) {
          setIssues((prev) => [
            ...prev,
            ...data.issues.map((i: any) => ({ ...i, status: "pending" })),
          ]);
        }

        offset += BATCH_SIZE;
        setScannedCount(offset);
        hasMore = data.has_more;

        // Throttling
        await new Promise((r) => setTimeout(r, 2000));
      } catch (e) {
        console.error(e);
        errorCount++;
        if (errorCount > 3) {
          toast.error("Too many errors. Stopping scan.");
          break;
        }
        await new Promise((r) => setTimeout(r, 5000));
      }
    }
    setScanning(false);
  };

  const stopScan = () => {
    // Simple flag mechanism via window or ref would be better in a real app,
    // for now just setting state which won't immediately stop the loop above
    // unless we use a ref.
    // Hack: set a global flag
    window.swisswpsuiteScanStop = true;
    setScanning(false);
    setTimeout(() => {
      window.swisswpsuiteScanStop = false;
    }, 1000);
  };

  const fixIssue = async (index: number) => {
    const issue = issues[index];
    if (issue.status !== "pending") return;

    // Optimistic Update
    const newIssues = [...issues];
    newIssues[index].status = "fixing"; // logic state, visually 'pending' or 'loading'
    setIssues(newIssues);

    try {
      const res = await fetch(`${apiUrl}/migration/fix`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-WP-Nonce": nonce },
        body: JSON.stringify({ fix: issue }),
      });
      const data = (await res.json()) as any;

      if (res.ok && data.success) {
        newIssues[index].status = "fixed";
      } else {
        newIssues[index].status = "failed";
      }
    } catch (e) {
      newIssues[index].status = "failed";
    }
    setIssues([...newIssues]);
  };

  const autoFixAll = async () => {
    setFixing(true);
    // Process sequentially to handle serialized logic safely and not hammer DB
    for (let i = 0; i < issues.length; i++) {
      if (issues[i].status === "pending") {
        await fixIssue(i);
        await new Promise((r) => setTimeout(r, 500)); // Slight delay
      }
    }
    setFixing(false);
  };

  return (
    <div className="bg-card dark:bg-secondary p-6 rounded-xl border border-border mt-6 shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Search size={20} className="text-purple-600" /> AI Deep Link
            Scanner
          </h3>
          <p className="text-sm text-muted-foreground dark:text-foreground">
            Detects hidden links to <strong>{oldDomain || "..."}</strong> inside
            JSON, serialized data, and complex HTML.
          </p>
        </div>
        <div className="flex gap-2">
          {!scanning ? (
            <button
              onClick={startScan}
              className="bg-purple-600 text-foreground dark:text-foreground px-4 py-2 rounded-lg font-bold hover:bg-purple-700 transition flex items-center gap-2 text-sm"
            >
              <Play size={16} /> Start Deep Scan
            </button>
          ) : (
            <button
              onClick={stopScan}
              className="bg-red-100 text-red-600 px-4 py-2 rounded-lg font-bold hover:bg-red-200 transition flex items-center gap-2 text-sm"
            >
              <Pause size={16} /> Stop
            </button>
          )}
        </div>
      </div>

      {/* Progress / Status */}
      {(scanning || issues.length > 0) && (
        <div className="bg-background dark:bg-muted p-4 rounded-lg border border-border mb-6">
          <div className="flex justify-between text-xs font-bold text-gray-600 mb-2">
            <span>Scanned Items: {scannedCount}</span>
            <span className="text-red-500">Issues Found: {issues.length}</span>
          </div>
          {scanning && (
            <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
              <div className="bg-purple-600 h-1.5 rounded-full animate-pulse w-full"></div>
            </div>
          )}
        </div>
      )}

      {/* Results Table */}
      {issues.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-xs font-bold text-muted-foreground uppercase border-b border-border dark:border-border">
                <th className="p-3">Source ID</th>
                <th className="p-3">Original String</th>
                <th className="p-3">AI Suggestion</th>
                <th className="p-3 text-right">
                  {fixing ? (
                    "Fixing..."
                  ) : (
                    <button
                      onClick={autoFixAll}
                      className="text-blue-600 hover:underline"
                    >
                      Auto-Fix All
                    </button>
                  )}
                </th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {issues.map((issue, idx) => (
                <tr
                  key={idx}
                  className="border-b border-border hover:bg-background dark:bg-muted"
                >
                  <td className="p-3 text-gray-600 dark:text-foreground">
                    #{issue.source_id}{" "}
                    <span className="text-xs text-muted-foreground">
                      ({issue.location})
                    </span>
                  </td>
                  <td className="p-3 font-mono text-xs text-red-600 break-all max-w-xs">
                    {issue.original_string}
                  </td>
                  <td className="p-3 font-mono text-xs text-green-600 break-all max-w-xs">
                    {issue.suggested_fix}
                  </td>
                  <td className="p-3 text-right">
                    {issue.status === "fixed" ? (
                      <span className="text-green-600 flex items-center justify-end gap-1">
                        <CheckCircle size={14} /> Fixed
                      </span>
                    ) : issue.status === "failed" ? (
                      <span className="text-red-600 flex items-center justify-end gap-1">
                        <AlertTriangle size={14} /> Failed
                      </span>
                    ) : (
                      <button
                        onClick={() => fixIssue(idx)}
                        disabled={fixing}
                        className="text-muted-foreground hover:text-purple-600 transition"
                      >
                        <ArrowRight size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!scanning && issues.length === 0 && scannedCount > 0 && (
        <div className="text-center py-8 text-muted-foreground dark:text-foreground">
          <CheckCircle size={48} className="mx-auto text-green-500 mb-2" />
          <p>No deep link issues found in scanned batch.</p>
        </div>
      )}
    </div>
  );
};

// Global definition for stop flag
declare global {
  interface Window {
    swisswpsuiteScanStop: boolean;
  }
}

export default DeepLinkScanner;
