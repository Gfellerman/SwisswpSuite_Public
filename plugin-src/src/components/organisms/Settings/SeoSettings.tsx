/**
 * AGENT: frontend-specialist
 * Skills: react-patterns, ui-ux-pro-max
 * Date: 2026-04-02
 *
 * SEO Settings — Default Open Graph image picker
 * Uses the WordPress native media library (window.wp.media) for attachment selection.
 * AJAX-first: no "Save Settings" button — calls onSave immediately on selection/removal.
 */

import { useQuery } from "@tanstack/react-query";
import { Card } from "../../ui/Card";
import { Button } from "../../ui/Button";
import { toast } from "sonner";
import { Image, X, Upload } from "lucide-react";
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

export function SeoSettings({ settings, onSave }: SeoSettingsProps) {
  const attachmentId = settings.seoDefaultOgImage ?? 0;

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
    </div>
  );
}
