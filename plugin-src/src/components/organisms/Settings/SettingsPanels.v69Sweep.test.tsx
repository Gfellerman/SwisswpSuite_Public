/**
 * Truth-sweep texts of three Settings panels (lane SW-B):
 *
 *  - S41  SEO settings, sitemap description: media attachment pages are left out.
 *  - S35  Maintenance, confirmation before "Drop Orphaned Tables".
 *  - S38  Maintenance, Database Cleanup descriptions and subtitle.
 *
 * Each panel is the real component driven the way the user drives it; only
 * `wpApi` and the toast module are mocked. No JSX.
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
let fireEvent: TL["fireEvent"];
let MaintenanceSettings: any;
let SeoSettings: any;
let QueryClient: any;
let QueryClientProvider: any;
let wpApi: any;

beforeAll(async () => {
  const nodeRequire = createRequire(import.meta.url);
  window.React = nodeRequire("react");
  window.ReactDOM = {
    ...nodeRequire("react-dom"),
    ...nodeRequire("react-dom/client"),
  };
  ({ MaintenanceSettings } = await import("./MaintenanceSettings"));
  ({ SeoSettings } = await import("./SeoSettings"));
  ({ render, screen, cleanup, fireEvent } =
    await import("@testing-library/react"));
  ({ QueryClient, QueryClientProvider } =
    await import("@tanstack/react-query"));
  ({ wpApi } = await import("../../../services/api"));
  React = await import("react");
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const flat = (el: Element | null) =>
  (el?.textContent ?? "").replace(/\s+/g, " ").trim();

function mountMaintenance(
  maintenance: (body: { action: string }) => unknown = () => ({ success: true })
) {
  (wpApi as any).mockImplementation((url: string, opts?: RequestInit) => {
    if (url === "/system-logs") return Promise.resolve({ logs: [] });
    if (url === "/cache/status")
      return Promise.resolve({ detected: [], active: false });
    if (url === "/maintenance")
      return Promise.resolve(maintenance(JSON.parse(String(opts?.body))));
    return Promise.resolve({});
  });
  return render(React.createElement(MaintenanceSettings));
}

/** The text of the row that holds a maintenance action's label. */
function rowText(label: string): string {
  const row = screen.getByText(label).closest("div")!.parentElement!;
  return flat(row);
}

describe("MaintenanceSettings — S38 Database Cleanup descriptions", () => {
  it("states what each cleanup deletes", () => {
    const { container } = mountMaintenance();
    // positive control: the panel rendered the rows
    expect(screen.getByText("Empty Trash")).toBeInTheDocument();

    expect(rowText("Delete Post Revisions")).toContain(
      "Removes all saved post revisions to save space."
    );
    expect(rowText("Empty Trash")).toContain(
      "Permanently deletes the posts, pages and other content items in the trash, together with their comments. Other comments in the trash are not deleted."
    );
    expect(rowText("Delete Auto-Drafts")).toContain(
      "Removes auto-draft posts older than 7 days, created when opening the editor without publishing."
    );
    expect(flat(container)).toContain(
      "Removes data that accumulates over time"
    );

    const text = flat(container);
    expect(text).not.toContain("Removes old post revision history");
    expect(text).not.toContain("all posts and pages currently in the trash");
    expect(text).not.toContain("Removes orphaned data");
  });

  it("the Database Cleanup subtitle is readable in both themes (WCAG 1.4.3)", () => {
    mountMaintenance();
    // 12px text on the card: 4.5:1 needed. neutral-500 was 4.13:1 on the light
    // card and 3.60:1 on the dark card; neutral-700 is 9.06:1, neutral-300 is
    // 10.73:1 on the dark card surface.
    const subtitle = screen.getByText(
      "Removes data that accumulates over time"
    );
    expect(subtitle).toHaveClass("text-neutral-700", "dark:text-neutral-300");
    expect(subtitle).not.toHaveClass("text-neutral-500");
  });
});

describe("MaintenanceSettings — S35 Drop Orphaned Tables confirmation", () => {
  it("says the match is by name and that a table can still belong to a plugin", async () => {
    mountMaintenance(() => ({
      success: true,
      message: "",
      dry_run: true,
      candidates: ["wp_old_plugin_data"],
    }));
    const row = screen
      .getByText("Drop Orphaned Tables")
      .closest("div")!.parentElement!;
    fireEvent.click(row.querySelector("button")!);

    const dialogBody = await screen.findByText(
      /These tables match no installed/
    );
    expect(flat(dialogBody)).toBe(
      "These tables match no installed plugin on this site, but a table can still belong to a plugin with a different name. This cannot be undone — back up your database first."
    );
    expect(screen.getByText("wp_old_plugin_data")).toBeInTheDocument();
    expect(flat(document.body)).not.toContain("left behind by uninstalled");
  });
});

describe("SeoSettings — S41 sitemap description", () => {
  it("names the one kind of content the sitemap leaves out", () => {
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const { container } = render(
      React.createElement(
        QueryClientProvider,
        { client: qc },
        React.createElement(SeoSettings, {
          settings: { emailNotifications: true, loginMaxRetries: 5 },
          onSave: vi.fn(async () => ({ success: true })),
        })
      )
    );
    // positive control: the sitemap row exists
    expect(screen.getByText("XML Sitemap (/sitemap.xml)")).toBeInTheDocument();
    expect(flat(container)).toContain(
      "Lists your published pages so search engines can discover and index them. Includes every public post type on this site except media attachment pages."
    );
  });
});
