/**
 * Authored by: Frontend Specialist
 * Skills: react-patterns, typescript-expert
 * Date: 2026-07-27
 *
 * WP.org round-3 remediation, Sprint W2c (Free JS-bundle hygiene) —
 * FREE-EDITION-ONLY BUILD-TIME REPLACEMENT for
 * components/organisms/Backups/CloudStoragePanel.tsx (~73KB — Google
 * Drive/S3/Backblaze B2/Dropbox/FTP-SFTP cloud backup UI, Pro-only).
 *
 * `BackupsPage.tsx` already gates the real component's RENDER behind
 * `isProEditionBuild` (a Free visitor always sees the "Cloud Backup"
 * ProUpsellPlaceholder instead), but per the same Rollup static-analysis
 * reasoning documented in AIContentPage.freeStub.tsx, a runtime-only gate
 * does not stop Rollup from still emitting CloudStoragePanel's ~73KB of
 * code inside the shipped BackupsPage chunk — it's a plain top-level
 * `import { CloudStoragePanel } from
 * "../components/organisms/Backups/CloudStoragePanel"` (static, not
 * React.lazy).
 *
 * `plugin/vite.config.ts` aliases the exact specifier
 * "../components/organisms/Backups/CloudStoragePanel" (as written at
 * BackupsPage.tsx's one call site) to THIS file only when built with
 * EDITION=free. Vite's alias resolution happens at module-resolve time,
 * before Rollup ever parses the real CloudStoragePanel.tsx — so in a Free
 * build the real file, and everything it transitively imports, never enters
 * the module graph at all. Pro builds never add the alias.
 *
 * This component is never actually mounted at runtime in Free (BackupsPage's
 * own `isProEditionBuild` ternary never reaches the branch that renders it),
 * so its content is inert — but it renders a real (compact) upsell rather
 * than `null`, matching this codebase's "graceful degradation" convention
 * (see SyncManager.freeStub.tsx) in case a future refactor of
 * BackupsPage.tsx ever reaches this branch directly. Copy/props below
 * mirror BackupsPage.tsx's own already-shipped Cloud Backup placeholder
 * verbatim (feature/description/bullets/icon, "compact" variant — this
 * sits inline in the Backup section's vertical stack, not as sole page
 * content — default "h3" heading, unchanged from that call site).
 * CloudStoragePanel takes no props, so this stub takes none either.
 * Real file has ONLY a named export (no default) — mirrored exactly below.
 */
import React from "react";
import { ProUpsellPlaceholder } from "../Upsell/ProUpsellPlaceholder";
import { hasEditionMismatch } from "../../../lib/edition";
import { Cloud } from "lucide-react";

export const CloudStoragePanel: React.FC = () => (
  <ProUpsellPlaceholder
    feature="Cloud Backup"
    variant="compact"
    icon={Cloud}
    description="Upload backups automatically to your own Google Drive, Dropbox, S3, Backblaze B2, or FTP/SFTP storage — off-site, so a server issue can't take your backups with it."
    bullets={[
      "Google Drive, S3, Backblaze B2, Dropbox & FTP/SFTP",
      "Automatic upload after every scheduled backup",
      "Your own storage account — nothing passes through our servers",
    ]}
    editionMismatch={hasEditionMismatch()}
  />
);
