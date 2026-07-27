/**
 * Authored by: Frontend Specialist + Debugger
 * Skills: react-patterns, ui-ux-pro-max
 * Date: 2026-02-19
 *
 * AI Agent Connection Panel
 *
 * Architecture:
 *   Plugin License Key → SwissSuite secure AI service (api.swisswpsecure.com) → AI
 *
 * NO user-facing API key is required.
 * Authentication is handled by the SwissSuite License Key (managed in License tab).
 * BYO-LLM (Bring Your Own endpoint) remains available for enterprise/dev.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { Card } from "../../ui/Card";
import { Button } from "../../ui/Button";
import { SwissSettings } from "../../../hooks/useSettings";
import { toast } from "sonner";
import {
  Zap,
  Server,
  Globe,
  CheckCircle,
  XCircle,
  Wifi,
  Loader2,
  Sparkles,
} from "lucide-react";
import { wpApi } from "../../../services/api";

interface ApiConfigProps {
  settings: SwissSettings;
  onSave: (settings: Partial<SwissSettings>) => Promise<any>;
  isSaving: boolean;
}

export function ApiConfig({ settings, onSave, isSaving }: ApiConfigProps) {
  const [config, setConfig] = useState<Partial<SwissSettings>>({});
  const [isTesting, setIsTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    "idle" | "success" | "error"
  >("idle");

  // Brand voice: optional tone hint injected into content-facing AI prompts.
  // Blur-save (no "Save Settings" button, per CLAUDE.md UX rule) — mirrors the
  // alertEmail field pattern in GeneralSettings.
  const [brandVoice, setBrandVoice] = useState<string>("");
  const [brandVoiceSaving, setBrandVoiceSaving] = useState(false);
  const prevBrandVoiceRef = useRef<string>("");

  useEffect(() => {
    if (settings) {
      setConfig({
        useCustomApi: settings.useCustomApi,
        customApiUrl: settings.customApiUrl,
        customModelId: settings.customModelId,
      });
      const initialBrandVoice = settings.brandVoice ?? "";
      setBrandVoice(initialBrandVoice);
      prevBrandVoiceRef.current = initialBrandVoice;
    }
  }, [settings]);

  const handleBrandVoiceBlur = useCallback(async () => {
    const trimmed = brandVoice.trim();
    if (trimmed === prevBrandVoiceRef.current) return;
    setBrandVoiceSaving(true);
    try {
      await onSave({ brandVoice: trimmed });
      prevBrandVoiceRef.current = trimmed;
      toast.success("Brand voice saved");
    } catch {
      toast.error("Failed to save brand voice");
      setBrandVoice(prevBrandVoiceRef.current);
    } finally {
      setBrandVoiceSaving(false);
    }
  }, [brandVoice, onSave]);

  const handleChange = (field: keyof SwissSettings, value: any) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      await onSave(config);
      toast.success("AI Configuration Saved");
    } catch (err) {
      toast.error("Failed to save configuration");
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setConnectionStatus("idle");
    try {
      await wpApi("/settings/test-connection", {
        method: "POST",
        body: JSON.stringify({
          useCustomApi: config.useCustomApi,
          customApiUrl: config.customApiUrl,
        }),
      });
      setConnectionStatus("success");
      toast.success(
        "AI Agent Connected — SwissSuite AI service is responding."
      );
    } catch (err: any) {
      setConnectionStatus("error");
      toast.error(
        "AI Agent Unreachable: " + (err.message || "Connection failed")
      );
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Card className="max-w-3xl space-y-6 p-6">
      <div className="border-border dark:border-border flex items-center gap-3 border-b pb-4">
        <div className="rounded-lg bg-blue-100 p-2 text-blue-600/30">
          <Zap className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">AI Agent</h3>
          <p className="text-xs text-neutral-700">
            SwissSuite AI — secure cloud service
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* VPS Connection Status Banner */}
        <div className="bg-background dark:bg-card/30 border-border dark:border-border rounded-lg border p-4">
          <div className="flex items-start gap-3">
            <Wifi className="mt-0.5 h-5 w-5 shrink-0 text-neutral-700" />
            <div className="flex-1">
              <p className="text-sm font-medium">Secure AI Service</p>
              <p className="mt-1 text-xs text-neutral-700">
                All AI requests are routed through the SwissSuite secure AI
                service. Authentication is handled automatically via your active{" "}
                <strong>License Key</strong>. No additional API key is required.
              </p>
            </div>
            {connectionStatus === "success" && (
              <CheckCircle className="h-5 w-5 shrink-0 text-emerald-500" />
            )}
            {connectionStatus === "error" && (
              <XCircle className="h-5 w-5 shrink-0 text-red-500" />
            )}
          </div>
        </div>

        {/* Brand Voice — optional tone hint injected into content-facing AI prompts */}
        <div className="border-border dark:border-border rounded-lg border p-4">
          <div className="mb-2 flex items-center gap-2">
            <Sparkles
              className="h-4 w-4 shrink-0 text-neutral-700"
              aria-hidden="true"
            />
            <label
              htmlFor="brandVoice"
              className="dark:text-foreground text-sm font-medium text-neutral-900"
            >
              Brand voice (optional)
            </label>
          </div>
          <div className="relative">
            <input
              id="brandVoice"
              type="text"
              maxLength={200}
              value={brandVoice}
              onChange={(e) => setBrandVoice(e.target.value)}
              onBlur={handleBrandVoiceBlur}
              placeholder="friendly, expert, no hype — write for busy shop owners"
              disabled={brandVoiceSaving}
              className="border-border bg-background dark:text-foreground w-full rounded-lg border px-3 py-2 text-sm text-neutral-900 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
              aria-describedby="brandVoice-desc"
            />
            {brandVoiceSaving && (
              <Loader2
                className="absolute top-1/2 right-3 -translate-y-1/2 animate-spin text-blue-500"
                size={14}
                aria-hidden="true"
              />
            )}
          </div>
          <p id="brandVoice-desc" className="mt-1 text-xs text-neutral-700">
            One line describing your tone, e.g. &ldquo;friendly, expert, no hype
            — write for busy shop owners&rdquo;. Applied to AI-generated SEO
            metadata, FAQs, rewrites and image alt-text. Saved automatically
            when you leave the field.
          </p>
        </div>

        <div className="flex gap-4 pt-2">
          <Button
            onClick={handleTestConnection}
            loading={isTesting}
            className="min-h-[44px]"
            variant="outline"
          >
            Test AI Connection
          </Button>
        </div>
      </div>
    </Card>
  );
}
