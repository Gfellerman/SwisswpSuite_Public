/**
 * Authored by: Frontend Specialist
 * Skills: react-patterns, typescript-expert
 * Date: 2026-08-01 (upsell redesign 2026-08-04)
 *
 * WP.org compliance sprint F3 (register row #23, owner decision (b)) —
 * FREE-EDITION-ONLY BUILD-TIME REPLACEMENT for
 * components/organisms/Settings/ApiConfig.tsx (BYO-AI / "Test AI
 * Connection" panel).
 *
 * `public/readme.txt` states the Free plugin "does no AI processing, and
 * makes no AI calls" and that WordPress.org is "the only external service
 * it contacts". The built Free bundle contradicted this: ApiConfig.tsx's
 * `useCustomApi`/`customApiUrl` state and its `wpApi("/settings/
 * test-connection", ...)` POST were both present in
 * `assets/chunks/SettingsPage-*.js`, because `SettingsPage.tsx` already
 * gates the real component's RENDER behind `isProEdition()` (a Free
 * visitor sees the "Editions & AI" informational section instead — see
 * SettingsPage.tsx's "api" tab branch), but per the same Rollup
 * static-analysis reasoning documented in AIContentPage.freeStub.tsx and
 * the four Sprint W2c stubs, a runtime-only gate does not stop Rollup from
 * still emitting ApiConfig's code (including the literal
 * "/settings/test-connection" string) inside the shipped SettingsPage
 * chunk — it's a plain top-level `import { ApiConfig } from
 * "../components/organisms/Settings/ApiConfig"` (static, not
 * React.lazy).
 *
 * `plugin/vite.config.ts` aliases the exact specifier
 * "../components/organisms/Settings/ApiConfig" (as written at
 * SettingsPage.tsx's one call site) to THIS file only when built with
 * EDITION=free. Vite's alias resolution happens at module-resolve time,
 * before Rollup ever parses the real ApiConfig.tsx — so in a Free build
 * the real file, and everything it transitively imports, never enters the
 * module graph at all. Pro builds never add the alias.
 *
 * Upsell redesign (2026-08-04): mirrors SettingsPage.tsx's own "api" tab
 * Free branch, which now renders `EditionsAiInfo` (informational only — no
 * "Upgrade"/"Download" CTA pair, no connect/test/input controls) instead
 * of the removed `ProUpsellPlaceholder`. This component is never actually
 * mounted at runtime in Free (SettingsPage's own `isProEdition()` ternary
 * never reaches this branch) — kept for the same graceful-degradation
 * parity as before, in case a future refactor of SettingsPage.tsx ever
 * reaches this branch directly. Zero network code: no wpApi import, no
 * fetch, no "/settings/test-connection" string, no useCustomApi/
 * customApiUrl/customModelId reads, no "Test AI Connection" label.
 */
import React from "react";
import { EditionsAiInfo } from "./EditionsAiInfo";
import { SwissSettings } from "../../../hooks/useSettings";

interface ApiConfigProps {
  settings: SwissSettings;
  onSave: (settings: Partial<SwissSettings>) => Promise<any>;
  isSaving: boolean;
}

export function ApiConfig(_props: ApiConfigProps) {
  return <EditionsAiInfo />;
}
