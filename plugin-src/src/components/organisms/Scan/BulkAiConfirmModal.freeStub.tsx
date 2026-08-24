import React from "react";

/**
 * Free-edition stub for BulkAiConfirmModal.tsx (ARS Round D, D-K-1, WP.org
 * R4 F-01). Wired via vite.config.ts's resolve.alias, active only when
 * EDITION === 'free'.
 *
 * Always renders nothing. This dialog can only open via the bulk
 * AI-analyze controls (AiAnalyzeFileButton / BulkAiAnalyzeButton), both of
 * which are themselves aliased away in this build — so the state that
 * would set `open` to true can never be set in a genuine Free install.
 * Per doctrine ("Free bundle must contain zero padlocked/dead controls")
 * this stub carries no edition-mismatch copy, no download CTA, and no "AI"
 * wording at all — the whole surface is physically absent, not merely
 * relabeled (superseding the 2026-08-13 "KEEP-BUT-RENAME" treatment this
 * dialog previously received — see scanResultProCopy.freeStub.ts's
 * BULK_AI_FREE_EDITION_NOTICE for that prior approach, now unused by this
 * stub).
 */
export interface BulkAiConfirmModalProps {
  open: boolean;
  totalSelected: number;
  cap: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export const BulkAiConfirmModal: React.FC<BulkAiConfirmModalProps> = (_props) =>
  null;
