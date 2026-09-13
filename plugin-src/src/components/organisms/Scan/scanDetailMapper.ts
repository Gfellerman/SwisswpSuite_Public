import type { ScanHistoryDetail } from "../../../types";

/**
 * The scan-history detail response, as it arrives from
 * `GET /security/sentinel/scan-history/{id}`. Indexed so a field the panel
 * does not read can still be present on the wire.
 */
export type ScanDetailResponse = ScanHistoryDetail & Record<string, unknown>;

/**
 * Build the historical-scan panel's detail object from a scan-history
 * response, carrying across every field the panel renders.
 */
export function mapScanDetail(data: ScanDetailResponse): ScanHistoryDetail {
  return {
    record: data.record,
    layer1_findings: data.layer1_findings,
  };
}
