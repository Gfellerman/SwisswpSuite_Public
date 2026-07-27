import React, { useState } from "react";
import { AlertTriangle, Copy, X, CheckCircle, Sparkles } from "lucide-react";

interface CriticalNextStepsProps {
  context: "export" | "import";
  onDismiss?: () => void;
}

const CriticalNextSteps: React.FC<CriticalNextStepsProps> = ({
  context,
  onDismiss,
}) => {
  const [copied, setCopied] = useState(false);

  const instructions =
    context === "import"
      ? `CRITICAL POST-MIGRATION STEPS:

Step 1: Flush Permalinks
- Go to Settings > Permalinks in WordPress Admin
- Click "Save Changes" twice (yes, twice!)
- This updates the site structure from subdirectory to root

Step 2: Clear Cache (Auto)
- SwissSuite automatically clears all server caches after migration
- If pages still show old content, go to Settings > Maintenance and click "Clear Cache"
- This purges LiteSpeed, WP Rocket, or any detected caching plugin

Step 3: Run Sentinel Deep Audit
- Go to Security > Sentinel Deep Audit
- Verify the integrity of the migrated site
- Review AI-generated security recommendations

Step 4: Test Critical Functionality
- Test login/logout
- Check image uploads
- Verify frontend displays correctly
- Test contact forms and plugins

IMPORTANT: Do not skip Step 1 (Permalinks) or you may experience 404 errors!`
      : `EXPORT COMPLETED SUCCESSFULLY:

Your migration package is ready. Before importing to the destination site:

Step 1: Backup Destination Site
- Create a full backup of the destination site
- Store it in a safe location
- This allows rollback if needed

Step 2: Prepare Destination Environment
- Ensure PHP version matches or is newer
- Check available disk space (2.5x the SQL file size)
- Verify MySQL/MariaDB is accessible

Step 3: Import Process
- Upload passport.json to destination site
- Use Migration Station to import
- Follow post-import steps carefully

Step 4: Post-Import Verification
- Flush permalinks (Settings > Permalinks, Save twice)
- Clear all caches
- Run Sentinel Deep Audit
- Test critical site functionality`;

  const handleCopy = () => {
    navigator.clipboard.writeText(instructions);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="animate-in slide-in-from-top-4 mb-6 rounded-xl border-2 border-orange-300 bg-gradient-to-br from-orange-50 to-red-50 p-6 shadow-lg">
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="text-foreground dark:text-foreground rounded-lg bg-orange-500 p-2">
            <AlertTriangle size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-orange-900">
              Critical Next Steps
            </h3>
            <p className="text-sm text-orange-700">
              {context === "import"
                ? "Complete these steps to finalize migration"
                : "Follow these steps before importing"}
            </p>
          </div>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="rounded p-1 text-orange-600 transition hover:bg-orange-100 hover:text-orange-800"
            title="Dismiss"
          >
            <X size={20} />
          </button>
        )}
      </div>

      <div className="bg-card dark:bg-secondary mb-4 rounded-lg border border-orange-200 p-4">
        {context === "import" ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-orange-100 font-bold text-orange-700">
                1
              </div>
              <div>
                <h4 className="mb-1 font-semibold text-gray-800">
                  Flush Permalinks
                </h4>
                <p className="mb-2 text-sm text-gray-600">
                  Go to <strong>Settings → Permalinks</strong> and click{" "}
                  <strong>"Save Changes"</strong> twice to update the site
                  structure from subdirectory to root.
                </p>
                <div className="border-l-4 border-red-500 bg-red-50 p-2">
                  <p className="text-xs font-semibold text-red-800">
                    ⚠️ CRITICAL: Skipping this will cause 404 errors!
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-orange-100 font-bold text-orange-700">
                2
              </div>
              <div>
                <h4 className="mb-1 font-semibold text-gray-800">
                  Clear Cache
                </h4>
                <p className="text-sm text-gray-600">
                  Caches were automatically cleared after migration. If pages
                  still show old content, go to{" "}
                  <strong>Settings → Maintenance</strong> and click{" "}
                  <strong>"Clear Cache"</strong>.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-orange-100 font-bold text-orange-700">
                3
              </div>
              <div>
                <h4 className="mb-1 flex items-center gap-2 font-semibold text-gray-800">
                  Run Sentinel Deep Audit
                  <Sparkles size={16} className="text-orange-500" />
                </h4>
                <p className="text-gray-600foreground text-sm">
                  Go to <strong>Security → Sentinel Deep Audit</strong> to
                  verify site integrity and review AI-generated security
                  recommendations.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-orange-100 font-bold text-orange-700">
                4
              </div>
              <div>
                <h4 className="mb-1 font-semibold text-gray-800">
                  Test Critical Functionality
                </h4>
                <ul className="list-inside list-disc space-y-1 text-sm text-gray-600">
                  <li>Test login/logout</li>
                  <li>Check image uploads</li>
                  <li>Verify frontend displays correctly</li>
                  <li>Test contact forms and plugins</li>
                </ul>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3 text-sm text-gray-700">
            <p className="font-semibold text-orange-900">
              Before importing to destination:
            </p>
            <ul className="ml-4 space-y-2">
              <li className="flex items-start gap-2">
                <CheckCircle
                  size={16}
                  className="mt-0.5 flex-shrink-0 text-green-500"
                />
                <span>Create full backup of destination site</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle
                  size={16}
                  className="mt-0.5 flex-shrink-0 text-green-500"
                />
                <span>Verify PHP version and disk space</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle
                  size={16}
                  className="mt-0.5 flex-shrink-0 text-green-500"
                />
                <span>Upload passport.json to destination</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle
                  size={16}
                  className="mt-0.5 flex-shrink-0 text-green-500"
                />
                <span>Follow post-import steps after migration</span>
              </li>
            </ul>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleCopy}
          className="text-foreground dark:text-foreground flex flex-1 items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-2 font-medium transition hover:bg-orange-700"
        >
          {copied ? (
            <>
              <CheckCircle size={18} /> Copied!
            </>
          ) : (
            <>
              <Copy size={18} /> Copy Instructions
            </>
          )}
        </button>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="rounded-lg bg-gray-200 px-6 py-2 font-medium text-gray-700 transition hover:bg-gray-300"
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
};

export default CriticalNextSteps;
