/**
 * AGENT: frontend-specialist
 * Skills: react-patterns, ui-ux-pro-max
 * Date: 2026-04-02
 *
 * SEO Settings — Default Open Graph image picker
 * Uses the WordPress native media library (window.wp.media) for attachment selection.
 * AJAX-first: no "Save Settings" button — calls onSave immediately on selection/removal.
 *
 * P1-03/P1-06 fix (ARS Round C, 2026-08-23): added real toggles for the
 * /sitemap.xml and /llms.txt endpoints — both used to be either dead
 * (sitemap: seeded 'no' at activation, no UI/REST path to enable it) or
 * always-on with no setting at all (llms.txt). See sitemapEnabled/
 * llmsTxtEnabled on SwissSettings for the backend handoff note — the PHP
 * read/write side of these two fields lives in class-swisswpsuite-api-
 * settings.php, which this lane does not own.
 *
 * M6 fix (ARS Round D delta, 2026-08-24): added a third toggle for
 * `seoMetaInjectionEnabled` — the Free-tier "basic SEO meta/title
 * injection" gate (class-swisswpsuite-frontend.php's META_INJECTION_OPTION,
 * wp_head/pre_get_document_title/document_title_parts hooks). Backend
 * field contract: handoff/DX1_seo-meta-ui-contract.md. Deliberately a
 * DIFFERENT option from the Pro AI Workbench's separate title-rewrite
 * toggle (`swisswpsuite_seo_rewrite_titles`, SeoAiWorkbench.tsx) — see
 * handoff/L-H_seo-rewrite-titles-ui.md — so the label/description below
 * are worded to avoid implying they are the same setting.
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "../../ui/Card";
import { Button } from "../../ui/Button";
import { toast } from "sonner";
import { Image, X, Upload, Layout } from "lucide-react";
import { SwissSettings } from "../../../hooks/useSettings";

// Type the WordPress media picker API so TypeScript doesn't error on window.wp.media()
declare const window: Window & {
  wp: {
    media: (opts: Record<string, unknown>) => {
      on: (event: string, cb: () => void) => void;
      open: () => void;
      state: () => {
        get: (key: string) => {
          first: () => {
            toJSON: () => { id: number; url: string };
          };
        };
      };
    };
  };
};

interface SeoSettingsProps {
  settings: SwissSettings;
  onSave: (settings: Partial<SwissSettings>) => Promise<any>;
}

interface WpMediaAttachment {
  source_url: string;
  alt_text?: string;
  title?: { rendered: string };
}

// Same accessible switch pattern used by GeneralSettings.tsx's ToggleRow
// (role="switch" + aria-labelledby/aria-describedby, WCAG 4.1.2 — a plain
// div with role="switch" is not a labelable element, so the visible label/
// description must be wired via aria-*, not a wrapping <label>).
type ToggleRowProps = {
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  isSaving?: boolean;
};

function ToggleRow({ label, desc, checked, onChange, isSaving }: ToggleRowProps) {
  const labelId = `seo-toggle-label-${label.replace(/\s+/g, "-").toLowerCase()}`;
  const descId = `seo-toggle-desc-${label.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <div className="border-border dark:border-border flex items-center justify-between border-b py-3 last:border-0">
      <div>
        <p id={labelId} className="text-sm font-medium text-neutral-900 dark:text-foreground">
          {label}
        </p>
        <p id={descId} className="mt-0.5 text-xs text-neutral-700">
          {desc}
        </p>
      </div>
      <div
        role="switch"
        aria-checked={checked}
        aria-labelledby={labelId}
        aria-describedby={descId}
        aria-busy={isSaving}
        tabIndex={0}
        className={`ml-4 h-6 w-11 shrink-0 cursor-pointer rounded-full p-0.5 transition-colors duration-300 ${
          isSaving ? "pointer-events-none opacity-60" : ""
        } ${checked ? "bg-green-500" : "bg-red-500"}`}
        onClick={() => !isSaving && onChange(!checked)}
        onKeyDown={(e) =>
          !isSaving && (e.key === "Enter" || e.key === " ") && onChange(!checked)
        }
      >
        <div
          className="h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-300"
          style={{ transform: checked ? "translateX(1.25rem)" : "translateX(0)" }}
        />
      </div>
    </div>
  );
}

export function SeoSettings({ settings, onSave }: SeoSettingsProps) {
  const attachmentId = settings.seoDefaultOgImage ?? 0;
  // P1-03/P1-06: which endpoint toggle (if any) has an in-flight save, so we
  // can disable/aria-busy just that row rather than the whole card.
  const [savingToggle, setSavingToggle] = useState<
    "sitemapEnabled" | "llmsTxtEnabled" | "seoMetaInjectionEnabled" | null
  >(null);

  const handleToggleSave = async (
    field: "sitemapEnabled" | "llmsTxtEnabled" | "seoMetaInjectionEnabled",
    value: boolean
  ) => {
    setSavingToggle(field);
    try {
      await onSave({ [field]: value });
      const messages: Record<typeof field, [string, string]> = {
        sitemapEnabled: ["Sitemap enabled", "Sitemap disabled"],
        llmsTxtEnabled: [
          "AI Assistant Guide enabled",
          "AI Assistant Guide disabled",
        ],
        seoMetaInjectionEnabled: [
          "Basic SEO meta tags enabled",
          "Basic SEO meta tags disabled",
        ],
      };
      const [onMsg, offMsg] = messages[field];
      toast.success(value ? onMsg : offMsg);
    } catch {
      toast.error("Failed to save setting");
    } finally {
      setSavingToggle(null);
    }
  };

  // Fetch the attachment details from WP REST API when an ID is set
  const { data: attachment, isLoading: isLoadingImage } =
    useQuery<WpMediaAttachment>({
      queryKey: ["wp-media-attachment", attachmentId],
      queryFn: async () => {
        const res = await fetch(
          `${window.swisswpsuiteData.root}wp/v2/media/${attachmentId}`,
          {
            headers: {
              "X-WP-Nonce": window.swisswpsuiteData.nonce,
            },
          },
        );
        if (!res.ok) {
          throw new Error("Failed to fetch attachment");
        }
        return res.json() as Promise<WpMediaAttachment>;
      },
      enabled: attachmentId > 0,
      staleTime: 300000, // 5 minutes — media metadata doesn't change often
    });

  const handleSelectImage = () => {
    const frame = window.wp.media({
      title: "Select Default Social Image",
      button: { text: "Use this image" },
      multiple: false,
      library: { type: "image" },
    });

    frame.on("select", async () => {
      const attachment = frame.state().get("selection").first().toJSON();
      try {
        await onSave({ seoDefaultOgImage: attachment.id });
        toast.success("Default social image saved");
      } catch {
        toast.error("Failed to save social image");
      }
    });

    frame.open();
  };

  const handleRemoveImage = async () => {
    try {
      await onSave({ seoDefaultOgImage: 0 });
      toast.success("Default social image removed");
    } catch {
      toast.error("Failed to remove social image");
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <Card className="p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Image
              className="w-5 h-5 text-blue-600 dark:text-blue-400"
              aria-hidden="true"
            />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg text-neutral-900 dark:text-foreground">
              SEO Settings
            </h3>
            <p className="text-xs text-neutral-700">
              Control how your site appears when shared on social media
            </p>
          </div>
        </div>

        {/* Default Social Image section */}
        <div className="space-y-3">
          <div>
            <p className="font-medium text-sm text-neutral-900 dark:text-foreground">
              Default Social Image
            </p>
            <p className="text-xs text-neutral-700 mt-0.5">
              Shown when sharing pages that have no featured image (homepage,
              blog listing, posts without thumbnails). Recommended size:
              1200&times;630px.
            </p>
          </div>

          {/* Image preview */}
          {attachmentId > 0 && (
            <div className="p-4 bg-background dark:bg-card/30 rounded-xl border border-border dark:border-border">
              {isLoadingImage ? (
                <div className="flex items-center gap-2 text-xs text-neutral-700">
                  <span
                    className="inline-block w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"
                    aria-hidden="true"
                  />
                  Loading preview...
                </div>
              ) : attachment ? (
                <img
                  src={attachment.source_url}
                  alt={
                    attachment.alt_text ||
                    attachment.title?.rendered ||
                    "Default social image"
                  }
                  className="rounded-lg object-cover"
                  style={{ maxWidth: "300px", height: "auto" }}
                />
              ) : (
                <p className="text-xs text-neutral-500 italic">
                  Could not load image preview.
                </p>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={handleSelectImage}
              className="min-h-[40px]"
              aria-label="Select default social image from media library"
            >
              <Upload size={14} className="mr-2" aria-hidden="true" />
              {attachmentId > 0 ? "Change Image" : "Select Image"}
            </Button>

            {attachmentId > 0 && (
              <Button
                variant="danger"
                onClick={handleRemoveImage}
                className="min-h-[40px]"
                aria-label="Remove default social image"
              >
                <X size={14} className="mr-2" aria-hidden="true" />
                Remove
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* P1-03/P1-06: Sitemap & AI Assistant Guide endpoint toggles */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
            <Layout
              className="w-5 h-5 text-emerald-600 dark:text-emerald-400"
              aria-hidden="true"
            />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg text-neutral-900 dark:text-foreground">
              Discoverability
            </h3>
            <p className="text-xs text-neutral-700">
              Endpoints that publish site content for search engines and AI
              crawlers — off by default
            </p>
          </div>
        </div>

        <div>
          <ToggleRow
            label="XML Sitemap (/sitemap.xml)"
            desc="Lists your published pages so search engines can discover and index them. Includes every public post type on this site."
            checked={settings.sitemapEnabled ?? false}
            onChange={(v) => handleToggleSave("sitemapEnabled", v)}
            isSaving={savingToggle === "sitemapEnabled"}
          />
          <ToggleRow
            label="AI Assistant Guide (/llms.txt)"
            desc="A plain-text summary of your homepage and recent content, published for AI assistants and crawlers to read. Password-protected and unpublished content is never included."
            checked={settings.llmsTxtEnabled ?? false}
            onChange={(v) => handleToggleSave("llmsTxtEnabled", v)}
            isSaving={savingToggle === "llmsTxtEnabled"}
          />
        </div>
      </Card>

      {/* M6 fix (ARS Round D delta): basic on-page meta injection toggle —
          NOT the same setting as the Pro AI Workbench's title-rewrite
          toggle (SeoAiWorkbench.tsx), see this file's header docblock. */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Layout
              className="w-5 h-5 text-blue-600 dark:text-blue-400"
              aria-hidden="true"
            />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg text-neutral-900 dark:text-foreground">
              Meta Tags
            </h3>
            <p className="text-xs text-neutral-700">
              Basic on-page SEO tags, generated automatically — off by
              default
            </p>
          </div>
        </div>

        <div>
          <ToggleRow
            label="Basic SEO Meta Tags"
            desc="Add title, description, Open Graph, canonical, and schema.org tags to every page using this plugin's built-in templates (opt-in, off by default). This does not use AI and is separate from any AI-generated title rewriting."
            checked={settings.seoMetaInjectionEnabled ?? false}
            onChange={(v) => handleToggleSave("seoMetaInjectionEnabled", v)}
            isSaving={savingToggle === "seoMetaInjectionEnabled"}
          />
        </div>
      </Card>
    </div>
  );
}
