// frontend-specialist fix: atoms/ → ui/ to eliminate cva TDZ in shared chunk
import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Cloud,
  CheckCircle,
  Lock,
  ChevronDown,
  ChevronUp,
  Loader2,
  ExternalLink,
  X,
  RotateCcw,
  Info,
} from "lucide-react";
import { Card } from "../../ui/Card";
import { Button } from "../../ui/Button";
import { Badge } from "../../ui/Badge";
import { wpApi } from "../../../services/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CloudListResponse {
  success: boolean;
  configured: boolean;
}

interface CloudStatus {
  s3Connected: boolean;
}

interface GDriveStatusResponse {
  success: boolean;
  has_keys: boolean;
  connected: boolean;
  client_id_hint: string | null;
  oauth_mode: "vps-proxy" | "self-hosted" | null;
}

interface S3Config {
  access_key: string;
  secret_key: string;
  bucket: string;
  region: string;
  endpoint: string;
}

interface GDriveKeysConfig {
  client_id: string;
  client_secret: string;
}

interface CloudSettingsResponse {
  success: boolean;
  message?: string;
}

interface GDriveAuthUrlResponse {
  success: boolean;
  url?: string;
  mode?: string;
  error?: string;
}

interface DropboxStatusResponse {
  success: boolean;
  has_keys: boolean;
  connected: boolean;
  app_key_hint: string | null;
  oauth_mode: "vps-proxy" | "self-hosted" | null;
}

interface DropboxAuthUrlResponse {
  success: boolean;
  url?: string;
  error?: string;
}

interface FtpStatusResponse {
  success: boolean;
  configured: boolean;
  connected: boolean;
  host_hint: string | null;
}

interface B2StatusResponse {
  success: boolean;
  configured: boolean;
  connected: boolean;
  bucket_hint: string | null;
}

interface FtpConfig {
  host: string;
  port: string;
  username: string;
  password: string;
  remote_path: string;
  use_ssl: boolean;
}

interface B2Config {
  key_id: string;
  application_key: string;
  bucket_name: string;
}

// ---------------------------------------------------------------------------
// Shared input/label styles
// ---------------------------------------------------------------------------

const inputClass =
  "w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-background dark:bg-card text-gray-900 dark:text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all";
const labelClass =
  "block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide";

// ---------------------------------------------------------------------------
// S3 setup sub-component (inline expandable form — no modal)
// ---------------------------------------------------------------------------

interface S3SetupFormProps {
  onSuccess: () => void;
}

const S3SetupForm: React.FC<S3SetupFormProps> = ({ onSuccess }) => {
  const [config, setConfig] = useState<S3Config>({
    access_key: "",
    secret_key: "",
    bucket: "",
    region: "us-east-1",
    endpoint: "",
  });
  const [saving, setSaving] = useState(false);

  const handleChange =
    (field: keyof S3Config) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setConfig((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !config.access_key.trim() ||
      !config.secret_key.trim() ||
      !config.bucket.trim()
    ) {
      toast.error("Access Key, Secret Key, and Bucket Name are required.");
      return;
    }

    setSaving(true);
    try {
      const res = await wpApi<CloudSettingsResponse>("/backup/cloud/settings", {
        method: "POST",
        body: JSON.stringify(config),
      });
      if (res.success) {
        toast.success("Amazon S3 connected successfully!");
        onSuccess();
      } else {
        toast.error(
          res.message ??
            "Connection failed. Check your credentials and try again."
        );
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Network error. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-muted/30 dark:bg-secondary/30 border-border mt-4 space-y-4 rounded-xl border p-4"
      aria-label="Amazon S3 connection setup"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="s3-access-key" className={labelClass}>
            Access Key ID{" "}
            <span className="text-red-500" aria-hidden="true">
              *
            </span>
          </label>
          <input
            id="s3-access-key"
            type="text"
            autoComplete="off"
            spellCheck={false}
            value={config.access_key}
            onChange={handleChange("access_key")}
            placeholder="AKIAIOSFODNN7EXAMPLE"
            className={inputClass}
            required
            aria-required="true"
            minLength={16}
          />
        </div>
        <div>
          <label htmlFor="s3-secret-key" className={labelClass}>
            Secret Access Key{" "}
            <span className="text-red-500" aria-hidden="true">
              *
            </span>
          </label>
          <input
            id="s3-secret-key"
            type="password"
            autoComplete="new-password"
            value={config.secret_key}
            onChange={handleChange("secret_key")}
            placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
            className={inputClass}
            required
            aria-required="true"
          />
        </div>
        <div>
          <label htmlFor="s3-bucket" className={labelClass}>
            Bucket Name{" "}
            <span className="text-red-500" aria-hidden="true">
              *
            </span>
          </label>
          <input
            id="s3-bucket"
            type="text"
            autoComplete="off"
            value={config.bucket}
            onChange={handleChange("bucket")}
            placeholder="my-site-backups"
            className={inputClass}
            required
            aria-required="true"
          />
        </div>
        <div>
          <label htmlFor="s3-region" className={labelClass}>
            Region
          </label>
          <input
            id="s3-region"
            type="text"
            autoComplete="off"
            value={config.region}
            onChange={handleChange("region")}
            placeholder="us-east-1"
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="s3-endpoint" className={labelClass}>
          Custom Endpoint{" "}
          <span className="text-muted-foreground font-normal tracking-normal normal-case">
            (optional — for Cloudflare R2, Wasabi, etc.)
          </span>
        </label>
        <input
          id="s3-endpoint"
          type="url"
          autoComplete="off"
          value={config.endpoint}
          onChange={handleChange("endpoint")}
          placeholder="https://your-account.r2.cloudflarestorage.com"
          className={inputClass}
        />
      </div>

      <div className="flex items-center justify-between pt-2">
        <p className="text-muted-foreground text-xs">
          Your credentials are stored securely on this server only.
        </p>
        <Button
          type="submit"
          variant="primary"
          size="sm"
          loading={saving}
          disabled={saving}
          aria-busy={saving}
          className="min-h-[44px] min-w-[140px]"
        >
          {saving ? "Testing…" : "Test & Connect"}
        </Button>
      </div>
    </form>
  );
};

// ---------------------------------------------------------------------------
// GDrive setup sub-component — 3-step self-hosted OAuth flow
// ---------------------------------------------------------------------------

type GDriveStep = "enter-keys" | "authorize" | "pending";

interface GDriveSetupFlowProps {
  clientIdHint: string | null;
  oauthMode: "vps-proxy" | "self-hosted" | null;
}

const GDriveSetupFlow: React.FC<GDriveSetupFlowProps> = ({
  clientIdHint,
  oauthMode,
}) => {
  // BUG-UI2 FIX: VPS-proxy users have no client credentials to enter — jump straight to 'authorize'.
  // Self-hosted users start at 'enter-keys' until keys are saved (hint present).
  const [step, setStep] = useState<GDriveStep>(
    oauthMode === "vps-proxy" || clientIdHint ? "authorize" : "enter-keys"
  );
  const [keys, setKeys] = useState<GDriveKeysConfig>({
    client_id: "",
    client_secret: "",
  });
  const [savingKeys, setSavingKeys] = useState(false);
  const [fetchingUrl, setFetchingUrl] = useState(false);

  // F1 FIX: Sync step when oauthMode resolves asynchronously (e.g. after VPS probe).
  // useState initializer only runs once — this effect catches late-arriving 'vps-proxy'.
  useEffect(() => {
    if (oauthMode === "vps-proxy") {
      setStep("authorize");
    }
  }, [oauthMode]);

  const handleKeysChange =
    (field: keyof GDriveKeysConfig) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setKeys((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const handleSaveKeys = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keys.client_id.trim() || !keys.client_secret.trim()) {
      toast.error("Both Client ID and Client Secret are required.");
      return;
    }
    setSavingKeys(true);
    try {
      const res = await wpApi<CloudSettingsResponse>(
        "/backup/cloud/gdrive/keys",
        {
          method: "POST",
          body: JSON.stringify(keys),
        }
      );
      if (res.success) {
        toast.success(
          "Credentials saved. Now authorize access to your Google Drive."
        );
        setStep("authorize");
      } else {
        toast.error(res.message ?? "Failed to save credentials.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Network error.");
    } finally {
      setSavingKeys(false);
    }
  };

  const handleAuthorize = async () => {
    setFetchingUrl(true);
    try {
      const res = await wpApi<GDriveAuthUrlResponse>(
        "/backup/cloud/gdrive/auth-url"
      );
      if (res.success && res.url) {
        // Redirect current page — PHP admin_init will handle the callback and redirect back.
        window.location.href = res.url;
      } else {
        toast.error(
          res.error ??
            "Could not generate authorization URL. Check your credentials."
        );
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Network error.");
    } finally {
      setFetchingUrl(false);
    }
  };

  if (step === "enter-keys") {
    return (
      <form
        onSubmit={handleSaveKeys}
        className="bg-muted/30 dark:bg-secondary/30 border-border mt-4 space-y-4 rounded-xl border p-4"
        aria-label="Google Drive OAuth credentials"
      >
        <div>
          <p className="text-muted-foreground mb-3 text-xs">
            Google Drive requires a free Google Cloud OAuth app. Create one at{" "}
            <a
              href="https://console.cloud.google.com/apis/credentials"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline hover:no-underline dark:text-blue-400"
            >
              console.cloud.google.com
            </a>{" "}
            — enable the Drive API and add your site's admin.php URL as a
            redirect URI.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="gdrive-client-id" className={labelClass}>
              Client ID{" "}
              <span className="text-red-500" aria-hidden="true">
                *
              </span>
            </label>
            <input
              id="gdrive-client-id"
              type="text"
              autoComplete="off"
              spellCheck={false}
              value={keys.client_id}
              onChange={handleKeysChange("client_id")}
              placeholder="123456789-abc.apps.googleusercontent.com"
              className={inputClass}
              required
              aria-required="true"
            />
          </div>
          <div>
            <label htmlFor="gdrive-client-secret" className={labelClass}>
              Client Secret{" "}
              <span className="text-red-500" aria-hidden="true">
                *
              </span>
            </label>
            <input
              id="gdrive-client-secret"
              type="password"
              autoComplete="new-password"
              value={keys.client_secret}
              onChange={handleKeysChange("client_secret")}
              placeholder="GOCSPX-…"
              className={inputClass}
              required
              aria-required="true"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <p className="text-muted-foreground text-xs">
            Credentials are stored only on this server.
          </p>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            loading={savingKeys}
            disabled={savingKeys}
            aria-busy={savingKeys}
            className="min-h-[44px] min-w-[160px]"
          >
            {savingKeys ? "Saving…" : "Save & Continue"}
          </Button>
        </div>
      </form>
    );
  }

  // step === 'authorize'
  return (
    <div className="bg-muted/30 dark:bg-secondary/30 border-border mt-4 space-y-3 rounded-xl border p-4">
      {oauthMode === "vps-proxy" ? (
        <p className="text-muted-foreground text-xs">
          Authorization is handled securely via SwissSuite servers — no Google
          Cloud app required.
        </p>
      ) : clientIdHint ? (
        <p className="text-muted-foreground text-xs">
          Saved credentials: <span className="font-mono">{clientIdHint}</span>
        </p>
      ) : null}
      <p className="text-muted-foreground text-sm">
        Click the button below to authorize access to your Google Drive. You'll
        be taken to Google's permission screen and then automatically redirected
        back here.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="primary"
          size="sm"
          onClick={handleAuthorize}
          loading={fetchingUrl}
          disabled={fetchingUrl}
          aria-busy={fetchingUrl}
          className="min-h-[44px] gap-2"
        >
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
          {fetchingUrl ? "Getting link…" : "Authorize with Google"}
        </Button>
        {/* Hide "Change credentials" for VPS-proxy — credentials are managed by SwissSuite servers */}
        {oauthMode !== "vps-proxy" && (
          <button
            type="button"
            onClick={() => setStep("enter-keys")}
            className="text-muted-foreground dark:hover:text-foreground rounded text-xs underline hover:text-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            Change credentials
          </button>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Dropbox setup sub-component — self-hosted OAuth flow (identical structure to GDrive)
// ---------------------------------------------------------------------------

type DropboxStep = "enter-keys" | "authorize";

interface DropboxSetupFlowProps {
  appKeyHint: string | null;
  oauthMode: "vps-proxy" | "self-hosted" | null;
}

const DropboxSetupFlow: React.FC<DropboxSetupFlowProps> = ({
  appKeyHint,
  oauthMode,
}) => {
  // BUG-UI2 FIX: VPS-proxy users have no app credentials to enter — jump straight to 'authorize'.
  const [step, setStep] = useState<DropboxStep>(
    oauthMode === "vps-proxy" || appKeyHint ? "authorize" : "enter-keys"
  );
  const [keys, setKeys] = useState({ app_key: "", app_secret: "" });
  const [saving, setSaving] = useState(false);
  const [fetching, setFetching] = useState(false);

  // F2 FIX: Sync step when oauthMode resolves asynchronously (e.g. after VPS probe).
  useEffect(() => {
    if (oauthMode === "vps-proxy") {
      setStep("authorize");
    }
  }, [oauthMode]);

  const handleSaveKeys = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keys.app_key.trim() || !keys.app_secret.trim()) {
      toast.error("Both App Key and App Secret are required.");
      return;
    }
    setSaving(true);
    try {
      const res = await wpApi<CloudSettingsResponse>(
        "/backup/cloud/dropbox/keys",
        {
          method: "POST",
          body: JSON.stringify(keys),
        }
      );
      if (res.success) {
        toast.success("Credentials saved. Now authorize Dropbox access.");
        setStep("authorize");
      } else {
        toast.error(res.message ?? "Failed to save credentials.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Network error.");
    } finally {
      setSaving(false);
    }
  };

  const handleAuthorize = async () => {
    setFetching(true);
    try {
      const res = await wpApi<DropboxAuthUrlResponse>(
        "/backup/cloud/dropbox/auth-url"
      );
      if (res.success && res.url) {
        window.location.href = res.url;
      } else {
        toast.error(
          res.error ?? "Could not generate Dropbox authorization URL."
        );
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Network error.");
    } finally {
      setFetching(false);
    }
  };

  if (step === "enter-keys") {
    return (
      <form
        onSubmit={handleSaveKeys}
        className="bg-muted/30 dark:bg-secondary/30 border-border mt-4 space-y-4 rounded-xl border p-4"
        aria-label="Dropbox OAuth credentials"
      >
        <p className="text-muted-foreground text-xs">
          Create a free Dropbox app at{" "}
          <a
            href="https://www.dropbox.com/developers/apps"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline hover:no-underline dark:text-blue-400"
          >
            dropbox.com/developers
          </a>
          . Set permissions to "files.content.write" and add your site's
          admin.php as a redirect URI.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="dropbox-app-key" className={labelClass}>
              App Key{" "}
              <span className="text-red-500" aria-hidden="true">
                *
              </span>
            </label>
            <input
              id="dropbox-app-key"
              type="text"
              autoComplete="off"
              spellCheck={false}
              value={keys.app_key}
              onChange={(e) =>
                setKeys((p) => ({ ...p, app_key: e.target.value }))
              }
              placeholder="abc123xyz456"
              className={inputClass}
              required
              aria-required="true"
            />
          </div>
          <div>
            <label htmlFor="dropbox-app-secret" className={labelClass}>
              App Secret{" "}
              <span className="text-red-500" aria-hidden="true">
                *
              </span>
            </label>
            <input
              id="dropbox-app-secret"
              type="password"
              autoComplete="new-password"
              value={keys.app_secret}
              onChange={(e) =>
                setKeys((p) => ({ ...p, app_secret: e.target.value }))
              }
              placeholder="••••••••••••"
              className={inputClass}
              required
              aria-required="true"
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button
            type="submit"
            variant="primary"
            size="sm"
            loading={saving}
            disabled={saving}
            aria-busy={saving}
            className="min-h-[44px] min-w-[160px]"
          >
            {saving ? "Saving…" : "Save & Continue"}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="bg-muted/30 dark:bg-secondary/30 border-border mt-4 space-y-3 rounded-xl border p-4">
      {oauthMode === "vps-proxy" ? (
        <p className="text-muted-foreground text-xs">
          Authorization is handled securely via SwissSuite servers — no Dropbox
          app required.
        </p>
      ) : appKeyHint ? (
        <p className="text-muted-foreground text-xs">
          Saved App Key: <span className="font-mono">{appKeyHint}</span>
        </p>
      ) : null}
      <p className="text-muted-foreground text-sm">
        Click the button below to authorize access to your Dropbox. You'll be
        taken to Dropbox's permission screen and then automatically redirected
        back here.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="primary"
          size="sm"
          onClick={handleAuthorize}
          loading={fetching}
          disabled={fetching}
          aria-busy={fetching}
          className="min-h-[44px] gap-2"
        >
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
          {fetching ? "Getting link…" : "Authorize with Dropbox"}
        </Button>
        {/* Hide "Change credentials" for VPS-proxy — credentials are managed by SwissSuite servers */}
        {oauthMode !== "vps-proxy" && (
          <button
            type="button"
            onClick={() => setStep("enter-keys")}
            className="text-muted-foreground dark:hover:text-foreground rounded text-xs underline hover:text-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            Change credentials
          </button>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// FTP setup sub-component — credential-based form with test button
// ---------------------------------------------------------------------------

interface FtpSetupFormProps {
  onSuccess: () => void;
}

const FtpSetupForm: React.FC<FtpSetupFormProps> = ({ onSuccess }) => {
  const [config, setConfig] = useState<FtpConfig>({
    host: "",
    port: "21",
    username: "",
    password: "",
    remote_path: "/backups/",
    use_ssl: false,
  });
  const [saving, setSaving] = useState(false);

  const handleChange =
    (field: keyof FtpConfig) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const val =
        e.target.type === "checkbox" ? e.target.checked : e.target.value;
      setConfig((prev) => ({ ...prev, [field]: val }));
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !config.host.trim() ||
      !config.username.trim() ||
      !config.password.trim()
    ) {
      toast.error("Host, username, and password are required.");
      return;
    }
    setSaving(true);
    try {
      const res = await wpApi<CloudSettingsResponse>(
        "/backup/cloud/ftp/settings",
        {
          method: "POST",
          body: JSON.stringify({
            ...config,
            port: parseInt(config.port, 10) || 21,
          }),
        }
      );
      if (res.success) {
        toast.success("FTP connected and verified!");
        onSuccess();
      } else {
        toast.error(
          res.message ?? "FTP connection failed. Check your credentials."
        );
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Network error.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-muted/30 dark:bg-secondary/30 border-border mt-4 space-y-4 rounded-xl border p-4"
      aria-label="FTP connection setup"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="ftp-host" className={labelClass}>
            FTP Host{" "}
            <span className="text-red-500" aria-hidden="true">
              *
            </span>
          </label>
          <input
            id="ftp-host"
            type="text"
            autoComplete="off"
            value={config.host}
            onChange={handleChange("host")}
            placeholder="ftp.example.com"
            className={inputClass}
            required
            aria-required="true"
          />
        </div>
        <div>
          <label htmlFor="ftp-port" className={labelClass}>
            Port
          </label>
          <input
            id="ftp-port"
            type="number"
            min="1"
            max="65535"
            value={config.port}
            onChange={handleChange("port")}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="ftp-username" className={labelClass}>
            Username{" "}
            <span className="text-red-500" aria-hidden="true">
              *
            </span>
          </label>
          <input
            id="ftp-username"
            type="text"
            autoComplete="username"
            value={config.username}
            onChange={handleChange("username")}
            placeholder="ftpuser"
            className={inputClass}
            required
            aria-required="true"
          />
        </div>
        <div>
          <label htmlFor="ftp-password" className={labelClass}>
            Password{" "}
            <span className="text-red-500" aria-hidden="true">
              *
            </span>
          </label>
          <input
            id="ftp-password"
            type="password"
            autoComplete="current-password"
            value={config.password}
            onChange={handleChange("password")}
            placeholder="••••••••"
            className={inputClass}
            required
            aria-required="true"
          />
        </div>
        <div>
          <label htmlFor="ftp-path" className={labelClass}>
            Remote Path
          </label>
          <input
            id="ftp-path"
            type="text"
            autoComplete="off"
            value={config.remote_path}
            onChange={handleChange("remote_path")}
            placeholder="/backups/"
            className={inputClass}
          />
        </div>
        <div className="flex items-center gap-2 pt-5">
          <input
            id="ftp-ssl"
            type="checkbox"
            checked={config.use_ssl}
            onChange={handleChange("use_ssl")}
            className="border-border rounded"
          />
          <label
            htmlFor="ftp-ssl"
            className="dark:text-foreground cursor-pointer text-sm text-gray-700 select-none"
          >
            Use FTPS (explicit TLS)
          </label>
        </div>
      </div>
      <div className="flex items-center justify-between pt-2">
        <p className="text-muted-foreground text-xs">
          Connection is tested before saving. Credentials stored on this server
          only.
        </p>
        <Button
          type="submit"
          variant="primary"
          size="sm"
          loading={saving}
          disabled={saving}
          aria-busy={saving}
          className="min-h-[44px] min-w-[140px]"
        >
          {saving ? "Testing…" : "Test & Connect"}
        </Button>
      </div>
    </form>
  );
};

// ---------------------------------------------------------------------------
// Backblaze B2 setup sub-component — API key form
// ---------------------------------------------------------------------------

interface B2SetupFormProps {
  onSuccess: () => void;
}

const B2SetupForm: React.FC<B2SetupFormProps> = ({ onSuccess }) => {
  const [config, setConfig] = useState<B2Config>({
    key_id: "",
    application_key: "",
    bucket_name: "",
  });
  const [saving, setSaving] = useState(false);

  const handleChange =
    (field: keyof B2Config) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setConfig((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !config.key_id.trim() ||
      !config.application_key.trim() ||
      !config.bucket_name.trim()
    ) {
      toast.error("Key ID, Application Key, and Bucket Name are required.");
      return;
    }
    setSaving(true);
    try {
      const res = await wpApi<CloudSettingsResponse>(
        "/backup/cloud/b2/settings",
        {
          method: "POST",
          body: JSON.stringify(config),
        }
      );
      if (res.success) {
        toast.success("Backblaze B2 connected and bucket verified!");
        onSuccess();
      } else {
        toast.error(
          res.message ?? "B2 connection failed. Check your credentials."
        );
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Network error.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-muted/30 dark:bg-secondary/30 border-border mt-4 space-y-4 rounded-xl border p-4"
      aria-label="Backblaze B2 connection setup"
    >
      <p className="text-muted-foreground text-xs">
        Create an Application Key in your{" "}
        <a
          href="https://secure.backblaze.com/b2_buckets.htm"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline hover:no-underline dark:text-blue-400"
        >
          Backblaze B2 console
        </a>
        . Grant "Read and Write Files" permission to the specific bucket.
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="b2-key-id" className={labelClass}>
            Key ID{" "}
            <span className="text-red-500" aria-hidden="true">
              *
            </span>
          </label>
          <input
            id="b2-key-id"
            type="text"
            autoComplete="off"
            spellCheck={false}
            value={config.key_id}
            onChange={handleChange("key_id")}
            placeholder="00abc123def456789012345678"
            className={inputClass}
            required
            aria-required="true"
          />
        </div>
        <div>
          <label htmlFor="b2-app-key" className={labelClass}>
            Application Key{" "}
            <span className="text-red-500" aria-hidden="true">
              *
            </span>
          </label>
          <input
            id="b2-app-key"
            type="password"
            autoComplete="new-password"
            value={config.application_key}
            onChange={handleChange("application_key")}
            placeholder="K0012345abcdef…"
            className={inputClass}
            required
            aria-required="true"
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="b2-bucket" className={labelClass}>
            Bucket Name{" "}
            <span className="text-red-500" aria-hidden="true">
              *
            </span>
          </label>
          <input
            id="b2-bucket"
            type="text"
            autoComplete="off"
            value={config.bucket_name}
            onChange={handleChange("bucket_name")}
            placeholder="my-site-backups"
            className={inputClass}
            required
            aria-required="true"
          />
        </div>
      </div>
      <div className="flex items-center justify-between pt-2">
        <p className="text-muted-foreground text-xs">
          Credentials stored on this server. B2 is cheap ($0.006/GB/month).
        </p>
        <Button
          type="submit"
          variant="primary"
          size="sm"
          loading={saving}
          disabled={saving}
          aria-busy={saving}
          className="min-h-[44px] min-w-[140px]"
        >
          {saving ? "Verifying…" : "Connect B2"}
        </Button>
      </div>
    </form>
  );
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Cross-border data transfer notes (EU/CH legal compliance)
// ---------------------------------------------------------------------------

const CROSS_BORDER_NOTES: Partial<Record<string, string>> = {
  s3: "Storage location: depends on your bucket region. EU/CH users: select an EU region bucket to keep data within the EU.",
  gdrive:
    "Storage location: United States (Google LLC). EU/CH users: data transfer covered under Google\u2019s Data Processing Terms.",
  b2: "Storage location: United States (Backblaze, Inc.). EU/CH users: verify your B2 region settings and applicable transfer mechanism.",
  dropbox:
    "Storage location: United States (Dropbox, Inc.). EU/CH users: data transfer covered under Dropbox\u2019s Data Processing Agreement.",
  // FTP: intentionally omitted — user-controlled server, location unknown
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export const CloudStoragePanel: React.FC = () => {
  // PHP booleans coerce to "1" via wp_localize_script, so check array membership.
  const license = window.swisswpsuiteData?.license;

  const hasCloudFeature =
    (Array.isArray(license?.features) &&
      (license.features.includes("backup_cloud") ||
        license.features.includes("backup_pro"))) ||
    (Array.isArray(license?.capabilities) &&
      (license.capabilities.includes("backup_cloud") ||
        license.capabilities.includes("backup_pro")));

  const queryClient = useQueryClient();
  const [showS3Setup, setShowS3Setup] = useState(false);
  const [showGDriveSetup, setShowGDriveSetup] = useState(false);
  const [showDropboxSetup, setShowDropboxSetup] = useState(false);
  const [showFtpSetup, setShowFtpSetup] = useState(false);
  const [showB2Setup, setShowB2Setup] = useState(false);

  // PII notice — dismissed state persisted in localStorage (EU/CH legal compliance)
  const [showPiiNotice, setShowPiiNotice] = useState<boolean>(
    () =>
      localStorage.getItem("swisswpsuite_cloud_pii_notice_dismissed") !== "1"
  );

  // Detect OAuth callback results from URL params (set by PHP admin_init handlers).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cleanFilter = (prefix: string) =>
      [...params.entries()]
        .filter(([k]) => !k.startsWith(prefix))
        .map(([k, v]) => `${k}=${v}`)
        .join("&");

    const gdriveCallbackStatus = params.get("gdrive_status");
    if (gdriveCallbackStatus === "connected") {
      toast.success("Google Drive connected successfully!");
      queryClient.invalidateQueries({ queryKey: ["gdrive-status"] });
      const cleanedGdrive = cleanFilter("gdrive_");
      window.history.replaceState(
        {},
        "",
        window.location.pathname + (cleanedGdrive ? "?" + cleanedGdrive : "")
      );
    } else if (gdriveCallbackStatus === "error") {
      toast.error(
        `Google Drive authorization failed: ${params.get("gdrive_error") ?? "Unknown error"}`
      );
    }

    const dropboxCallbackStatus = params.get("dropbox_status");
    if (dropboxCallbackStatus === "connected") {
      toast.success("Dropbox connected successfully!");
      queryClient.invalidateQueries({ queryKey: ["dropbox-status"] });
      const cleanedDropbox = cleanFilter("dropbox_");
      window.history.replaceState(
        {},
        "",
        window.location.pathname + (cleanedDropbox ? "?" + cleanedDropbox : "")
      );
    } else if (dropboxCallbackStatus === "error") {
      toast.error(
        `Dropbox authorization failed: ${params.get("dropbox_error") ?? "Unknown error"}`
      );
    }
  }, [queryClient]);

  // S3 configured status
  const { data: cloudStatus, isLoading: statusLoading } = useQuery<CloudStatus>(
    {
      queryKey: ["cloud-status"],
      queryFn: async (): Promise<CloudStatus> => {
        const res = await wpApi<CloudListResponse>("/backup/cloud/list");
        return { s3Connected: res?.configured ?? false };
      },
      enabled: !!hasCloudFeature,
      staleTime: 60_000,
      retry: 1,
    }
  );

  // GDrive connection status
  // _nocache param bypasses LiteSpeed private cache (Hostinger ignores Cache-Control: no-cache from PHP)
  const { data: gdriveStatus, isLoading: gdriveLoading } =
    useQuery<GDriveStatusResponse>({
      queryKey: ["gdrive-status"],
      queryFn: () =>
        wpApi<GDriveStatusResponse>(
          `/backup/cloud/gdrive/status?_nocache=${Date.now()}`
        ),
      enabled: !!hasCloudFeature,
      staleTime: 60_000,
      retry: 1,
    });

  // Dropbox connection status
  const { data: dropboxStatus, isLoading: dropboxLoading } =
    useQuery<DropboxStatusResponse>({
      queryKey: ["dropbox-status"],
      queryFn: () =>
        wpApi<DropboxStatusResponse>(
          `/backup/cloud/dropbox/status?_nocache=${Date.now()}`
        ),
      enabled: !!hasCloudFeature,
      staleTime: 60_000,
      retry: 1,
    });

  // FTP connection status
  const { data: ftpStatus, isLoading: ftpLoading } =
    useQuery<FtpStatusResponse>({
      queryKey: ["ftp-status"],
      queryFn: () =>
        wpApi<FtpStatusResponse>(
          `/backup/cloud/ftp/status?_nocache=${Date.now()}`
        ),
      enabled: !!hasCloudFeature,
      staleTime: 60_000,
      retry: 1,
    });

  // Backblaze B2 connection status
  const { data: b2Status, isLoading: b2Loading } = useQuery<B2StatusResponse>({
    queryKey: ["b2-status"],
    queryFn: () =>
      wpApi<B2StatusResponse>(`/backup/cloud/b2/status?_nocache=${Date.now()}`),
    enabled: !!hasCloudFeature,
    staleTime: 60_000,
    retry: 1,
  });

  type CloudProvider = "s3" | "gdrive" | "dropbox" | "ftp" | "b2";
  const providerLabels: Record<CloudProvider, string> = {
    s3: "Amazon S3",
    gdrive: "Google Drive",
    dropbox: "Dropbox",
    ftp: "FTP",
    b2: "Backblaze B2",
  };

  // Disconnect mutation — shared for all providers.
  const disconnectMutation = useMutation({
    mutationFn: (provider: CloudProvider) =>
      wpApi<CloudSettingsResponse>("/backup/cloud/disconnect", {
        method: "POST",
        body: JSON.stringify({ provider }),
      }),
    onSuccess: (_, provider) => {
      queryClient.invalidateQueries({ queryKey: ["cloud-status"] });
      queryClient.invalidateQueries({ queryKey: ["gdrive-status"] });
      queryClient.invalidateQueries({ queryKey: ["dropbox-status"] });
      queryClient.invalidateQueries({ queryKey: ["ftp-status"] });
      queryClient.invalidateQueries({ queryKey: ["b2-status"] });
      setShowS3Setup(false);
      setShowGDriveSetup(false);
      setShowDropboxSetup(false);
      setShowFtpSetup(false);
      setShowB2Setup(false);
      toast.success(`${providerLabels[provider]} disconnected.`);
    },
    onError: (err: Error) => {
      toast.error(`Disconnect failed: ${err.message}`);
    },
  });

  const handleS3ConnectSuccess = () => {
    setShowS3Setup(false);
    queryClient.invalidateQueries({ queryKey: ["cloud-status"] });
  };

  // ------------------------------------------------------------------
  // FREE USER — upsell card
  // ------------------------------------------------------------------

  if (!hasCloudFeature) {
    return (
      <Card className="border-border border-2 border-dashed p-6" noPadding>
        <div className="p-6">
          <div className="mb-3 flex items-center gap-3">
            <div
              className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/20"
              aria-hidden="true"
            >
              <Cloud className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <h3 className="dark:text-foreground font-semibold text-gray-900">
                Cloud Backup
              </h3>
              <Badge variant="neutral" className="mt-0.5">
                Pro Feature
              </Badge>
            </div>
            <Lock
              className="text-muted-foreground ml-auto h-5 w-5 flex-shrink-0"
              aria-hidden="true"
            />
          </div>

          <p className="text-muted-foreground mb-3 text-sm">
            Your backups are currently saved only on this server. If your server
            crashes or is hacked, your backups could be lost too.
          </p>

          <p className="text-muted-foreground mb-4 text-sm">
            Upgrade to Pro to automatically send backup copies to Google Drive,
            Dropbox, Amazon S3, Backblaze B2, or your own FTP server — a
            separate, safe location outside your server.
          </p>

          <div className="bg-muted/30 dark:bg-secondary/30 flex items-center gap-3 rounded-lg p-3">
            <div className="flex -space-x-1" aria-hidden="true">
              <div className="dark:bg-secondary border-background flex h-8 w-8 items-center justify-center rounded-full border-2 bg-white shadow-sm">
                <span className="text-xs font-bold text-blue-600">GD</span>
              </div>
              <div className="dark:bg-secondary border-background flex h-8 w-8 items-center justify-center rounded-full border-2 bg-white shadow-sm">
                <span className="text-xs font-bold text-orange-500">S3</span>
              </div>
              <div className="dark:bg-secondary border-background flex h-8 w-8 items-center justify-center rounded-full border-2 bg-white shadow-sm">
                <span className="text-xs font-bold text-blue-600">DB</span>
              </div>
              <div className="dark:bg-secondary border-background flex h-8 w-8 items-center justify-center rounded-full border-2 bg-white shadow-sm">
                <span className="text-xs font-bold text-red-500">B2</span>
              </div>
            </div>
            <span className="text-muted-foreground text-xs">
              Google Drive, Dropbox, S3, Backblaze B2 &amp; FTP
            </span>
          </div>
        </div>
      </Card>
    );
  }

  // ------------------------------------------------------------------
  // PRO USER — live cloud status + provider setup
  // ------------------------------------------------------------------

  const s3Connected = cloudStatus?.s3Connected ?? false;
  const gdriveConnected = gdriveStatus?.connected ?? false;
  const dropboxConnected = dropboxStatus?.connected ?? false;
  const ftpConnected = ftpStatus?.connected ?? false;
  const b2Connected = b2Status?.connected ?? false;
  const isDisconnecting = disconnectMutation.isPending;
  const anyLoading =
    statusLoading || gdriveLoading || dropboxLoading || ftpLoading || b2Loading;

  return (
    <Card noPadding>
      <div className="p-6">
        {/* Header */}
        <div className="mb-2 flex items-center gap-2">
          <Cloud className="h-5 w-5 text-blue-500" aria-hidden="true" />
          <h3 className="dark:text-foreground font-semibold text-gray-900">
            Cloud Backup
          </h3>
          {anyLoading && (
            <Loader2
              className="text-muted-foreground ml-auto h-4 w-4 animate-spin"
              aria-label="Loading cloud status"
            />
          )}
        </div>

        <p className="text-muted-foreground mb-5 text-sm">
          Cloud backups automatically copy your saved backups to an external
          storage service. This protects you even if your web host's server
          fails — your backups are stored somewhere completely separate. Backups
          are sent to the cloud after each scheduled backup. Your local copies
          are always kept too.
        </p>

        {/* PII data notice — EU/CH legal compliance (dismissible) */}
        {showPiiNotice && (
          <div
            className="mb-5 flex items-start gap-2.5 rounded-xl border border-blue-200 bg-blue-50 p-3.5 dark:border-blue-800 dark:bg-blue-900/15"
            role="note"
            aria-label="Personal data notice"
          >
            <Info
              size={15}
              className="mt-0.5 flex-shrink-0 text-blue-500"
              aria-hidden="true"
            />
            <p className="flex-1 text-xs leading-relaxed text-blue-800 dark:text-blue-300">
              Your backups contain your WordPress database, which may include
              personal data (user accounts, orders, comments). Ensure your cloud
              storage account complies with your privacy obligations.
            </p>
            <button
              onClick={() => {
                localStorage.setItem(
                  "swisswpsuite_cloud_pii_notice_dismissed",
                  "1"
                );
                setShowPiiNotice(false);
              }}
              className="flex-shrink-0 rounded p-1 text-blue-500 transition-colors hover:bg-blue-100 hover:text-blue-700 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:hover:bg-blue-800/40"
              aria-label="Dismiss personal data notice"
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        )}

        <div className="space-y-3">
          {/* ---- Amazon S3 ---- */}
          <div className="border-border overflow-hidden rounded-xl border">
            <div className="bg-background dark:bg-secondary/50 flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div
                  className="dark:bg-secondary border-border flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border bg-white shadow-sm"
                  aria-hidden="true"
                >
                  <span className="text-xs font-black text-orange-500">S3</span>
                </div>
                <div>
                  <p className="dark:text-foreground text-sm font-medium text-gray-900">
                    Amazon S3
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Also works with Cloudflare R2 and Wasabi
                  </p>
                  <p className="text-muted-foreground/70 mt-0.5 text-xs">
                    {CROSS_BORDER_NOTES.s3}
                  </p>
                </div>
              </div>

              {statusLoading ? (
                <Loader2
                  className="text-muted-foreground h-4 w-4 animate-spin"
                  aria-label="Checking S3 status"
                />
              ) : s3Connected ? (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5" role="status">
                    <CheckCircle
                      className="h-4 w-4 text-emerald-500"
                      aria-hidden="true"
                    />
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      Connected
                    </span>
                  </div>
                  <button
                    onClick={() => disconnectMutation.mutate("s3")}
                    disabled={isDisconnecting}
                    title="Disconnect Amazon S3"
                    aria-label="Disconnect Amazon S3"
                    className="text-muted-foreground rounded-md p-1 transition-colors hover:text-red-500 focus:ring-2 focus:ring-red-400 focus:outline-none disabled:opacity-40"
                  >
                    {isDisconnecting ? (
                      <Loader2
                        className="h-3.5 w-3.5 animate-spin"
                        aria-hidden="true"
                      />
                    ) : (
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowS3Setup((prev) => !prev)}
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-md px-1 text-xs font-semibold text-blue-600 transition-colors hover:text-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none dark:text-blue-400 dark:hover:text-blue-300"
                  aria-expanded={showS3Setup}
                  aria-controls="s3-setup-form"
                >
                  {showS3Setup ? (
                    <>
                      Cancel{" "}
                      <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                    </>
                  ) : (
                    <>
                      Set up Amazon S3 storage{" "}
                      <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                    </>
                  )}
                </button>
              )}
            </div>

            {/* S3 setup form (not connected) */}
            {!s3Connected && showS3Setup && (
              <div id="s3-setup-form" className="px-4 pb-4">
                <S3SetupForm onSuccess={handleS3ConnectSuccess} />
              </div>
            )}

            {/* Reconfigure link (connected) */}
            {s3Connected && (
              <div className="px-4 pt-0 pb-3">
                <button
                  onClick={() => setShowS3Setup((prev) => !prev)}
                  className="text-muted-foreground dark:hover:text-foreground rounded-md px-1 py-0.5 text-xs transition-colors hover:text-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  aria-expanded={showS3Setup}
                  aria-controls="s3-reconfigure-form"
                >
                  {showS3Setup
                    ? "Cancel reconfiguration"
                    : "Reconfigure connection"}
                </button>
                {showS3Setup && (
                  <div id="s3-reconfigure-form" className="mt-1">
                    <S3SetupForm onSuccess={handleS3ConnectSuccess} />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ---- Google Drive ---- */}
          <div className="border-border overflow-hidden rounded-xl border">
            <div className="bg-background dark:bg-secondary/50 flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div
                  className="dark:bg-secondary border-border flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border bg-white shadow-sm"
                  aria-hidden="true"
                >
                  <span className="text-xs font-black text-blue-500">GD</span>
                </div>
                <div>
                  <p className="dark:text-foreground text-sm font-medium text-gray-900">
                    Google Drive
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {gdriveConnected
                      ? "Backups will be sent to your Drive after each scheduled backup"
                      : gdriveStatus?.oauth_mode === "vps-proxy"
                        ? "One-click connection — no setup required"
                        : "Requires your own Google OAuth app (free to create)"}
                  </p>
                  <p className="text-muted-foreground/70 mt-0.5 text-xs">
                    {CROSS_BORDER_NOTES.gdrive}
                  </p>
                </div>
              </div>

              {gdriveLoading ? (
                <Loader2
                  className="text-muted-foreground h-4 w-4 animate-spin"
                  aria-label="Checking Google Drive status"
                />
              ) : gdriveConnected ? (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5" role="status">
                    <CheckCircle
                      className="h-4 w-4 text-emerald-500"
                      aria-hidden="true"
                    />
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      Connected
                    </span>
                  </div>
                  <button
                    onClick={() => disconnectMutation.mutate("gdrive")}
                    disabled={isDisconnecting}
                    title="Disconnect Google Drive"
                    aria-label="Disconnect Google Drive"
                    className="text-muted-foreground rounded-md p-1 transition-colors hover:text-red-500 focus:ring-2 focus:ring-red-400 focus:outline-none disabled:opacity-40"
                  >
                    {isDisconnecting ? (
                      <Loader2
                        className="h-3.5 w-3.5 animate-spin"
                        aria-hidden="true"
                      />
                    ) : (
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowGDriveSetup((prev) => !prev)}
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-md px-1 text-xs font-semibold text-blue-600 transition-colors hover:text-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none dark:text-blue-400 dark:hover:text-blue-300"
                  aria-expanded={showGDriveSetup}
                  aria-controls="gdrive-setup-form"
                >
                  {showGDriveSetup ? (
                    <>
                      Cancel{" "}
                      <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                    </>
                  ) : (
                    <>
                      {gdriveStatus?.oauth_mode === "vps-proxy"
                        ? "Connect Google Drive"
                        : "Set up Google Drive"}{" "}
                      <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                    </>
                  )}
                </button>
              )}
            </div>

            {/* GDrive setup form (not connected) */}
            {!gdriveConnected && showGDriveSetup && (
              <div id="gdrive-setup-form" className="px-4 pb-4">
                <GDriveSetupFlow
                  clientIdHint={gdriveStatus?.client_id_hint ?? null}
                  oauthMode={gdriveStatus?.oauth_mode ?? null}
                />
              </div>
            )}

            {/* Re-authorize link (connected) */}
            {gdriveConnected && (
              <div className="px-4 pt-0 pb-3">
                <button
                  onClick={() => setShowGDriveSetup((prev) => !prev)}
                  className="text-muted-foreground dark:hover:text-foreground inline-flex items-center gap-1 rounded-md px-1 py-0.5 text-xs transition-colors hover:text-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  aria-expanded={showGDriveSetup}
                  aria-controls="gdrive-reauth-form"
                >
                  <RotateCcw className="h-3 w-3" aria-hidden="true" />
                  {showGDriveSetup ? "Cancel re-authorization" : "Re-authorize"}
                </button>
                {showGDriveSetup && (
                  <div id="gdrive-reauth-form" className="mt-1">
                    <GDriveSetupFlow
                      clientIdHint={gdriveStatus?.client_id_hint ?? null}
                      oauthMode={gdriveStatus?.oauth_mode ?? null}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ---- Dropbox ---- */}
          <div className="border-border overflow-hidden rounded-xl border">
            <div className="bg-background dark:bg-secondary/50 flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div
                  className="dark:bg-secondary border-border flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border bg-white shadow-sm"
                  aria-hidden="true"
                >
                  <span className="text-xs font-black text-blue-600">DB</span>
                </div>
                <div>
                  <p className="dark:text-foreground text-sm font-medium text-gray-900">
                    Dropbox
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {dropboxConnected
                      ? `App Key: ${dropboxStatus?.app_key_hint ?? "…"}`
                      : dropboxStatus?.oauth_mode === "vps-proxy"
                        ? "One-click connection — no setup required"
                        : "Requires a free Dropbox app (takes 2 minutes to create)"}
                  </p>
                  <p className="text-muted-foreground/70 mt-0.5 text-xs">
                    {CROSS_BORDER_NOTES.dropbox}
                  </p>
                </div>
              </div>
              {dropboxLoading ? (
                <Loader2
                  className="text-muted-foreground h-4 w-4 animate-spin"
                  aria-label="Checking Dropbox status"
                />
              ) : dropboxConnected ? (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5" role="status">
                    <CheckCircle
                      className="h-4 w-4 text-emerald-500"
                      aria-hidden="true"
                    />
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      Connected
                    </span>
                  </div>
                  <button
                    onClick={() => disconnectMutation.mutate("dropbox")}
                    disabled={isDisconnecting}
                    title="Disconnect Dropbox"
                    aria-label="Disconnect Dropbox"
                    className="text-muted-foreground rounded-md p-1 transition-colors hover:text-red-500 focus:ring-2 focus:ring-red-400 focus:outline-none disabled:opacity-40"
                  >
                    {isDisconnecting ? (
                      <Loader2
                        className="h-3.5 w-3.5 animate-spin"
                        aria-hidden="true"
                      />
                    ) : (
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowDropboxSetup((prev) => !prev)}
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-md px-1 text-xs font-semibold text-blue-600 transition-colors hover:text-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none dark:text-blue-400 dark:hover:text-blue-300"
                  aria-expanded={showDropboxSetup}
                  aria-controls="dropbox-setup-form"
                >
                  {showDropboxSetup ? (
                    <>
                      Cancel{" "}
                      <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                    </>
                  ) : (
                    <>
                      {dropboxStatus?.oauth_mode === "vps-proxy"
                        ? "Connect Dropbox"
                        : "Set up Dropbox"}{" "}
                      <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                    </>
                  )}
                </button>
              )}
            </div>
            {!dropboxConnected && showDropboxSetup && (
              <div id="dropbox-setup-form" className="px-4 pb-4">
                <DropboxSetupFlow
                  appKeyHint={dropboxStatus?.app_key_hint ?? null}
                  oauthMode={dropboxStatus?.oauth_mode ?? null}
                />
              </div>
            )}
            {dropboxConnected && (
              <div className="px-4 pt-0 pb-3">
                <button
                  onClick={() => setShowDropboxSetup((prev) => !prev)}
                  className="text-muted-foreground dark:hover:text-foreground inline-flex items-center gap-1 rounded-md px-1 py-0.5 text-xs transition-colors hover:text-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  aria-expanded={showDropboxSetup}
                  aria-controls="dropbox-reauth-form"
                >
                  <RotateCcw className="h-3 w-3" aria-hidden="true" />
                  {showDropboxSetup
                    ? "Cancel re-authorization"
                    : "Re-authorize"}
                </button>
                {showDropboxSetup && (
                  <div id="dropbox-reauth-form" className="mt-1">
                    <DropboxSetupFlow
                      appKeyHint={dropboxStatus?.app_key_hint ?? null}
                      oauthMode={dropboxStatus?.oauth_mode ?? null}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ---- FTP ---- */}
          <div className="border-border overflow-hidden rounded-xl border">
            <div className="bg-background dark:bg-secondary/50 flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div
                  className="dark:bg-secondary border-border flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border bg-white shadow-sm"
                  aria-hidden="true"
                >
                  <span className="text-xs font-black text-gray-600 dark:text-gray-300">
                    FTP
                  </span>
                </div>
                <div>
                  <p className="dark:text-foreground text-sm font-medium text-gray-900">
                    FTP / FTPS
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {ftpConnected
                      ? `Host: ${ftpStatus?.host_hint ?? "…"}`
                      : "Transfer backups directly to any FTP server"}
                  </p>
                </div>
              </div>
              {ftpLoading ? (
                <Loader2
                  className="text-muted-foreground h-4 w-4 animate-spin"
                  aria-label="Checking FTP status"
                />
              ) : ftpConnected ? (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5" role="status">
                    <CheckCircle
                      className="h-4 w-4 text-emerald-500"
                      aria-hidden="true"
                    />
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      Connected
                    </span>
                  </div>
                  <button
                    onClick={() => disconnectMutation.mutate("ftp")}
                    disabled={isDisconnecting}
                    title="Disconnect FTP"
                    aria-label="Disconnect FTP"
                    className="text-muted-foreground rounded-md p-1 transition-colors hover:text-red-500 focus:ring-2 focus:ring-red-400 focus:outline-none disabled:opacity-40"
                  >
                    {isDisconnecting ? (
                      <Loader2
                        className="h-3.5 w-3.5 animate-spin"
                        aria-hidden="true"
                      />
                    ) : (
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowFtpSetup((prev) => !prev)}
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-md px-1 text-xs font-semibold text-blue-600 transition-colors hover:text-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none dark:text-blue-400 dark:hover:text-blue-300"
                  aria-expanded={showFtpSetup}
                  aria-controls="ftp-setup-form"
                >
                  {showFtpSetup ? (
                    <>
                      Cancel{" "}
                      <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                    </>
                  ) : (
                    <>
                      Set up FTP{" "}
                      <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                    </>
                  )}
                </button>
              )}
            </div>
            {!ftpConnected && showFtpSetup && (
              <div id="ftp-setup-form" className="px-4 pb-4">
                <FtpSetupForm
                  onSuccess={() => {
                    setShowFtpSetup(false);
                    queryClient.invalidateQueries({ queryKey: ["ftp-status"] });
                  }}
                />
              </div>
            )}
            {ftpConnected && (
              <div className="px-4 pt-0 pb-3">
                <button
                  onClick={() => setShowFtpSetup((prev) => !prev)}
                  className="text-muted-foreground dark:hover:text-foreground rounded-md px-1 py-0.5 text-xs transition-colors hover:text-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  aria-expanded={showFtpSetup}
                  aria-controls="ftp-reconfigure-form"
                >
                  {showFtpSetup ? "Cancel" : "Reconfigure FTP connection"}
                </button>
                {showFtpSetup && (
                  <div id="ftp-reconfigure-form" className="mt-1">
                    <FtpSetupForm
                      onSuccess={() => {
                        setShowFtpSetup(false);
                        queryClient.invalidateQueries({
                          queryKey: ["ftp-status"],
                        });
                      }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ---- Backblaze B2 ---- */}
          <div className="border-border overflow-hidden rounded-xl border">
            <div className="bg-background dark:bg-secondary/50 flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div
                  className="dark:bg-secondary border-border flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border bg-white shadow-sm"
                  aria-hidden="true"
                >
                  <span className="text-xs font-black text-red-500">B2</span>
                </div>
                <div>
                  <p className="dark:text-foreground text-sm font-medium text-gray-900">
                    Backblaze B2
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {b2Connected
                      ? `Bucket: ${b2Status?.bucket_hint ?? "…"}`
                      : "Affordable cloud storage — $0.006/GB/month, API key only"}
                  </p>
                  <p className="text-muted-foreground/70 mt-0.5 text-xs">
                    {CROSS_BORDER_NOTES.b2}
                  </p>
                </div>
              </div>
              {b2Loading ? (
                <Loader2
                  className="text-muted-foreground h-4 w-4 animate-spin"
                  aria-label="Checking B2 status"
                />
              ) : b2Connected ? (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5" role="status">
                    <CheckCircle
                      className="h-4 w-4 text-emerald-500"
                      aria-hidden="true"
                    />
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      Connected
                    </span>
                  </div>
                  <button
                    onClick={() => disconnectMutation.mutate("b2")}
                    disabled={isDisconnecting}
                    title="Disconnect Backblaze B2"
                    aria-label="Disconnect Backblaze B2"
                    className="text-muted-foreground rounded-md p-1 transition-colors hover:text-red-500 focus:ring-2 focus:ring-red-400 focus:outline-none disabled:opacity-40"
                  >
                    {isDisconnecting ? (
                      <Loader2
                        className="h-3.5 w-3.5 animate-spin"
                        aria-hidden="true"
                      />
                    ) : (
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowB2Setup((prev) => !prev)}
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-md px-1 text-xs font-semibold text-blue-600 transition-colors hover:text-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none dark:text-blue-400 dark:hover:text-blue-300"
                  aria-expanded={showB2Setup}
                  aria-controls="b2-setup-form"
                >
                  {showB2Setup ? (
                    <>
                      Cancel{" "}
                      <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                    </>
                  ) : (
                    <>
                      Set up Backblaze B2{" "}
                      <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                    </>
                  )}
                </button>
              )}
            </div>
            {!b2Connected && showB2Setup && (
              <div id="b2-setup-form" className="px-4 pb-4">
                <B2SetupForm
                  onSuccess={() => {
                    setShowB2Setup(false);
                    queryClient.invalidateQueries({ queryKey: ["b2-status"] });
                  }}
                />
              </div>
            )}
            {b2Connected && (
              <div className="px-4 pt-0 pb-3">
                <button
                  onClick={() => setShowB2Setup((prev) => !prev)}
                  className="text-muted-foreground dark:hover:text-foreground rounded-md px-1 py-0.5 text-xs transition-colors hover:text-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  aria-expanded={showB2Setup}
                  aria-controls="b2-reconfigure-form"
                >
                  {showB2Setup ? "Cancel" : "Reconfigure B2 connection"}
                </button>
                {showB2Setup && (
                  <div id="b2-reconfigure-form" className="mt-1">
                    <B2SetupForm
                      onSuccess={() => {
                        setShowB2Setup(false);
                        queryClient.invalidateQueries({
                          queryKey: ["b2-status"],
                        });
                      }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ---- MEGA (Coming Soon) ---- */}
          <div className="bg-background dark:bg-secondary/50 border-border flex items-center justify-between rounded-xl border p-4 opacity-60">
            <div className="flex items-center gap-3">
              <div
                className="dark:bg-secondary border-border flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border bg-white shadow-sm"
                aria-hidden="true"
              >
                <span className="text-xs font-black text-red-600">MG</span>
              </div>
              <div>
                <p className="dark:text-foreground text-sm font-medium text-gray-900">
                  MEGA
                </p>
                <p className="text-muted-foreground text-xs">
                  Requires client-side AES encryption library — coming in a
                  future update
                </p>
              </div>
            </div>
            <span className="text-xs font-medium whitespace-nowrap text-amber-600 dark:text-amber-400">
              Coming Soon
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
};
