/**
 * V63-V3-4 (sealed spec, lane V3 BACKUP, .63 sweep).
 * Target path: plugin/src/components/organisms/Settings/EncryptionSettings.replaceWarning.v63.test.ts
 *
 * Production flow: Settings > Security renders <EncryptionSettings settings
 * onSave> (pages/settingsPanels.tsx) with onSave = the settings save. When a
 * password is already stored, "Replace password" must first ask the user to
 * confirm, and the question must say that backups made before the change
 * still need the current password to be restored. Declining saves nothing.
 * Setting the FIRST password (nothing stored yet) asks nothing.
 * No JSX (React externalisation, see the other component tests).
 */
import { createRequire } from "node:module";
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, afterEach, beforeAll, vi } from "vitest";

vi.mock("../../../lib/toast", () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));

type TL = typeof import("@testing-library/react");
let React: typeof import("react");
let render: TL["render"];
let screen: TL["screen"];
let cleanup: TL["cleanup"];
let fireEvent: TL["fireEvent"];
let waitFor: TL["waitFor"];
let EncryptionSettings: typeof import("./EncryptionSettings")["EncryptionSettings"];

beforeAll(async () => {
  const nodeRequire = createRequire(import.meta.url);
  window.React = nodeRequire("react");
  window.ReactDOM = {
    ...nodeRequire("react-dom"),
    ...nodeRequire("react-dom/client"),
  };
  ({ EncryptionSettings } = await import("./EncryptionSettings"));
  ({ render, screen, cleanup, fireEvent, waitFor } = await import("@testing-library/react"));
  React = await import("react");
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function mount(hasEncryptionPassword: boolean) {
  const onSave = vi.fn().mockResolvedValue({ success: true });
  render(
    React.createElement(EncryptionSettings, {
      settings: { hasEncryptionPassword, encryptionPasswordCorrupted: false } as never,
      onSave,
    }),
  );
  fireEvent.change(screen.getByLabelText("New password"), {
    target: { value: "a-new-passphrase-2026" },
  });
  fireEvent.change(document.getElementById("encryption-password-confirm-input")!, {
    target: { value: "a-new-passphrase-2026" },
  });
  return onSave;
}

describe("V63-V3-4: replacing the backup encryption password", () => {
  it("asks first, and the question says older backups still need the current password", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const onSave = mount(true);
    fireEvent.click(screen.getByRole("button", { name: "Replace encryption password" }));
    expect(confirmSpy).toHaveBeenCalledTimes(1);
    const question = String(confirmSpy.mock.calls[0][0]);
    expect(question).toMatch(/restore/i);
    expect(question).toMatch(/current password|previous password|old password/i);
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
  });

  it("declining the question saves nothing", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const onSave = mount(true);
    fireEvent.click(screen.getByRole("button", { name: "Replace encryption password" }));
    await new Promise((r) => setTimeout(r, 20));
    expect(onSave).not.toHaveBeenCalled();
  });

  it("setting the first password asks nothing", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const onSave = mount(false);
    fireEvent.click(screen.getByRole("button", { name: "Set encryption password" }));
    expect(confirmSpy).not.toHaveBeenCalled();
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
  });
});
