/**
 * The Security page's section lists.
 *
 * SecurityHub.tsx owns the page shell, the dashboard card grid and the data
 * every section reads. The lists below say which sections that shell renders
 * and in what order, so a section is added or taken out in one place instead of
 * in the middle of the page.
 */

import type React from "react";

/** A manual fix guide the page can show in its guide dialog. */
export interface SecurityFixGuide {
  /** What the finding is. */
  what: string;
  /** Why it matters. */
  why: string;
  /** The ordered steps that fix it. */
  how: string[];
}

/** Actions a section delegates back to the Security page. */
export interface SecurityDataReviewActions {
  /** Add an IP address to the firewall ban list. */
  banIp: (ip: string) => void;
  /** Add a file to the safe list. */
  ignoreFile: (file: string) => void;
  /** Move a file into quarantine. */
  quarantineFile: (file: string) => void;
  /** Drop a file from the current scan result once it has been cleared. */
  fileCleared: (file: string) => void;
  /** Switch the page to the security-log tab. */
  goToLogs: () => void;
  /** Switch the page to the hardening tab. */
  goToHardening: () => void;
  /** Ask the page to show its confirmation dialog before running a callback. */
  confirmAction: (message: string, onConfirm: () => void) => void;
}

/** Page state a section that reviews security data reads. */
export interface SecurityDataReviewProps {
  /** IP addresses already on the ban list. */
  bannedIps: string[];
  /** Increments whenever a ban lands, so an open report can refresh itself. */
  banRevision: number;
  /** True while a scan that owns file findings is still running. */
  scanInFlight: boolean;
  /** Actions the section delegates back to the page. */
  actions: SecurityDataReviewActions;
}

/** What a control offered for a recommended-action sentence is given. */
export interface RecommendedActionContext {
  /** The recommended action sentence, lower-cased. */
  action: string;
  /** Turn one of the site's security options on or off. */
  onToggleOption: (option: string, value: boolean) => void;
  /** Show a manual fix guide in the page's guide dialog. */
  onOpenGuide: (guide: SecurityFixGuide) => void;
  /** Close the report the control was rendered in. */
  onDone: () => void;
}

/** Sections above the dashboard card grid, in render order. */
export const securityDashboardLeadSections: React.FC[] = [];

/** Cards inside the dashboard card grid, in render order. */
export const securityDashboardCards: React.FC[] = [];

/** Rows inside the Login Safeguard card, in render order. */
export const loginSafeguardRows: React.FC[] = [];

/** Sections below the dashboard card grid, in render order. */
export const securityDataReviewSections: React.FC<SecurityDataReviewProps>[] =
  [];

/**
 * Controls offered for a recommended-action sentence, tried in order. The
 * first one that returns a node wins.
 */
export const recommendedActionControls: Array<
  (context: RecommendedActionContext) => React.ReactNode | null
> = [];
