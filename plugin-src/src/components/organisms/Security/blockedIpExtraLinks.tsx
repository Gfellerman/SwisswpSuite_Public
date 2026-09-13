/**
 * Extra reference links rendered next to a blocked IP's ban-type badge on
 * the Quarantine tab's Blocked IPs table.
 */

import type React from "react";

/** Props every extra blocked-IP link receives. */
export interface BlockedIpExtraLinkProps {
  /** The blocked IP address. */
  ip: string;
}

/** Extra links, in render order. Empty in this build. */
export const blockedIpExtraLinks: React.FC<BlockedIpExtraLinkProps>[] = [];
