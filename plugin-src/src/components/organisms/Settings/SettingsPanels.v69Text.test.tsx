/**
 * Signed screen texts of three Settings panels: Maintenance (U34, U35, U36),
 * Scan Coverage (U37) and Backup Encryption (U38). Each panel is the real
 * component; only `wpApi` and the toast module are mocked. No JSX.
 */
import { createRequire } from "node:module";
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, afterEach, beforeAll, vi } from "vitest";

vi.mock("../../../lib/toast", () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));

vi.mock("../../../services/api", () => ({
  wpApi: vi.fn(),
}));

type TL = typeof import("@testing-library/react");
let React: typeof import("react");
let render: TL["render"];
let screen: TL["screen"];
let cleanup: TL["cleanup"];
let waitFor: TL["waitFor"];
let MaintenanceSettings: any;
let ScanCoverageSettings: any;
let EncryptionSettings: any;
let wpApi: any;

beforeAll(async () => {
  const nodeRequire = createRequire(import.meta.url);
  window.React = nodeRequire("react");
  window.ReactDOM = {
    ...nodeRequire("react-dom"),
    ...nodeRequire("react-dom/client"),
  };
  ({ MaintenanceSettings } = await import("./MaintenanceSettings"));
  ({ ScanCoverageSettings } = await import("./ScanCoverageSettings"));
  ({ EncryptionSettings } = await import("./EncryptionSettings"));
  ({ render, screen, cleanup, waitFor } =
    await import("@testing-library/react"));
  ({ wpApi } = await import("../../../services/api"));
  React = await import("react");
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const flat = (el: Element | null) =>
  (el?.textContent ?? "").replace(/\s+/g, " ").trim();

function mountMaintenance() {
  (wpApi as any).mockImplementation((url: string) => {
    if (url === "/system-logs") return Promise.resolve({ logs: [] });
    if (url === "/cache/status")
      return Promise.resolve({ detected: [], active: false });
    return Promise.resolve({});
  });
  return render(React.createElement(MaintenanceSettings));
}

/** The description paragraph that sits next to a maintenance action's label. */
function rowText(container: HTMLElement, label: string): string {
  const labelEl = screen.getByText(label);
  const row = labelEl.closest("div")!.parentElement!;
  return flat(row);
}

describe("MaintenanceSettings — signed texts U34-U36", () => {
  it("positive control: the panel rendered both rows", async () => {
    const { container } = mountMaintenance();
    expect(screen.getByText("Clear Transients")).toBeInTheDocument();
    expect(screen.getByText("Drop Orphaned Tables")).toBeInTheDocument();
    expect(container.textContent).toContain("System Logs");
  });

  it("U34: Clear Transients says it removes this plugin's own temporary data, expired or not", () => {
    const { container } = mountMaintenance();
    expect(rowText(container, "Clear Transients")).toContain(
      "Removes this plugin's own temporary data from the database, expired or not."
    );
    expect(container.textContent).not.toContain(
      "Removes expired temporary data from the database."
    );
  });

  it("U35: the System Logs badge states the real 15 second refresh", () => {
    const { container } = mountMaintenance();
    expect(flat(container)).toContain("Live · 15s refresh");
    expect(flat(container)).not.toMatch(/Live · 5s refresh/);
  });

  it("U36: Drop Orphaned Tables says the match is by name and that a table can still belong to a plugin", () => {
    const { container } = mountMaintenance();
    expect(rowText(container, "Drop Orphaned Tables")).toContain(
      "Drops database tables whose names match no installed plugin. WordPress core tables are never touched. A table can still belong to a plugin with a different name, so review the list before confirming. Back up your database first."
    );
    expect(container.textContent).not.toContain("left behind by uninstalled");
  });
});

describe("ScanCoverageSettings — signed text U37", () => {
  it("U37: the core integrity row says what is compared and what is not checked", () => {
    const onSave = vi.fn().mockResolvedValue({ success: true });
    const { container } = render(
      React.createElement(ScanCoverageSettings, {
        settings: { coreIntegrityEnabled: true } as never,
        onSave,
      })
    );
    // positive control: the row exists
    expect(
      screen.getByText("WordPress Core Integrity Check")
    ).toBeInTheDocument();
    expect(flat(container)).toContain(
      "Compares WordPress core files with the official WordPress.org checksums and reports files that were changed or are missing. New files added to the site, and the plugins and themes you installed, are not checked."
    );
    expect(flat(container)).not.toContain("Detects any tampering");
  });
});

describe("EncryptionSettings — signed text U38", () => {
  it("U38: the subtitle says the password is one the user chooses", () => {
    const onSave = vi.fn().mockResolvedValue({ success: true });
    const { container } = render(
      React.createElement(EncryptionSettings, {
        settings: {
          hasEncryptionPassword: false,
          encryptionPasswordCorrupted: false,
        } as never,
        onSave,
      })
    );
    expect(screen.getByText("Backup Encryption")).toBeInTheDocument();
    expect(flat(container)).toContain(
      "Encrypt every backup archive at rest with a password you choose"
    );
    expect(flat(container)).not.toContain("password only you know");
  });
});
