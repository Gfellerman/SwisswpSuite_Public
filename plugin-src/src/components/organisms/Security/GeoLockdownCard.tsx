/**
 * GeoLockdownCard — Geo-Blocking dashboard card (Pro-local, physically
 * excluded from the Free zip).
 *
 * Extracted from components/SecurityHub.tsx (2026-08-12, WP.org frontend
 * physical-exclusion sweep) so it can be aliased to
 * GeoLockdownCard.freeStub.tsx in the Free Vite build — see
 * plugin/vite.config.ts's resolve.alias block for the exclusion mechanism.
 * Prior to this extraction the geo-blocking JSX (toggle, mode selector,
 * country picker) was written directly inline inside the SecurityHub.tsx
 * monolith, gated only by a runtime `isProEditionBuild ? (...) : null`
 * ternary — a real physical file boundary is needed for a Vite alias to
 * redirect, which inline JSX cannot provide.
 *
 * REVISED 2026-08-13 (regression fix, WP.org B12a/B12b): the original
 * 2026-08-12 extraction was presentational-only — it moved the JSX here
 * but left `fetchGeoSettings()`/`saveGeoCountries()` and the country-picker
 * state (geoSettings, allCountries, showGeoPicker, geoSearch,
 * filteredCountries, savingGeo) behind in SecurityHub.tsx. Since
 * SecurityHub.tsx ships in BOTH editions (it is not itself aliased), those
 * two functions' compiled strings — including the literal
 * "Geo-Lockdown countries saved." toast — still shipped inside the Free
 * edition's JS bundle even though nothing in the Free render tree could
 * ever call them. A compiled-JS fingerprint scan (the exact check this
 * extraction was originally meant to satisfy) caught it. Fixed by moving
 * that state + those two functions into THIS file, so they are excluded
 * from the Free build exactly like the JSX already was.
 *
 * What stays in the parent, deliberately (see component_extraction PRE-mode
 * check, 2026-08-12, still valid): `geoEnabled` is also read elsewhere in
 * SecurityHub.tsx (the "Geo-Lock Active" tab status badge) and
 * `globalGeoBlock`/`onToggleGeo`/`onToggleGlobalBlock` route through
 * SecurityHub.tsx's shared `handleToggle()` generic-hardening-toggle
 * mechanism (used for many unrelated options besides geo-blocking) — both
 * would require unwinding a shared subsystem to move, for no WP.org-
 * compliance benefit (`handleToggle` and its option map are Free-agnostic
 * plumbing, not Pro-only strings). Only the geo-blocking-SPECIFIC data
 * (settings, country list, picker UI state) moved.
 */
import React, { useEffect, useMemo, useState } from "react";
import { Globe, Lock } from "lucide-react";
import { Button } from "../../ui/Button";
import { wpApi } from "../../../services/api";
import { toast } from "sonner";

export interface GeoCountry {
  code: string;
  name: string;
  flag: string;
}

interface GeoLockdownCardProps {
  geoEnabled: boolean;
  hasSecurity: boolean;
  globalGeoBlock: boolean;
  onToggleGeo: () => void;
  onToggleGlobalBlock: (checked: boolean) => void;
}

export const GeoLockdownCard: React.FC<GeoLockdownCardProps> = ({
  geoEnabled,
  hasSecurity,
  globalGeoBlock,
  onToggleGeo,
  onToggleGlobalBlock,
}) => {
  const [geoSettings, setGeoSettings] = useState<{
    list_mode: "blacklist" | "whitelist";
    countries: string[];
  }>({ list_mode: "blacklist", countries: [] });
  const [allCountries, setAllCountries] = useState<GeoCountry[]>([]);
  const [geoSearch, setGeoSearch] = useState("");
  const [showGeoPicker, setShowGeoPicker] = useState(false);
  const [savingGeo, setSavingGeo] = useState(false);

  const filteredCountries = useMemo(
    () =>
      allCountries.filter(
        (c) =>
          c.name.toLowerCase().includes(geoSearch.toLowerCase()) ||
          c.code.toLowerCase().includes(geoSearch.toLowerCase())
      ),
    [allCountries, geoSearch]
  );

  const fetchGeoSettings = async () => {
    try {
      const [settingsData, countriesData] = await Promise.all([
        wpApi<{
          settings: {
            list_mode: "blacklist" | "whitelist";
            countries: string[];
          };
        }>("/geo/settings"),
        wpApi<{ countries: GeoCountry[] }>("/geo/countries"),
      ]);
      setGeoSettings({
        list_mode: settingsData.settings?.list_mode || "blacklist",
        countries: settingsData.settings?.countries || [],
      });
      setAllCountries(countriesData.countries || []);
    } catch (e) {
      console.error("Failed to fetch geo settings", e);
    }
  };

  const saveGeoCountries = async (
    countries: string[],
    list_mode: "blacklist" | "whitelist"
  ) => {
    setSavingGeo(true);
    try {
      const data = await wpApi<{ success: boolean; message?: string }>(
        "/geo/settings",
        {
          method: "POST",
          body: JSON.stringify({ countries, list_mode }),
        }
      );
      if (data.success) {
        setGeoSettings({ list_mode, countries });
        toast.success("Geo-Lockdown countries saved.");
      } else {
        toast.error("Failed to save: " + (data.message || "Unknown error"));
      }
    } catch (e) {
      toast.error("Network error saving geo settings.");
    } finally {
      setSavingGeo(false);
    }
  };

  // This component only ever mounts when isProEditionBuild && hasSecurity
  // (see SecurityHub.tsx's call site), so a plain mount-time fetch is safe
  // — no edition check needed here, the parent's render gate already is one.
  useEffect(() => {
    if (hasSecurity) {
      void fetchGeoSettings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasSecurity]);

  return (
    <div className="glass-panel premium-card relative overflow-hidden p-6 transition-all">
      <div className="bg-brand-accent/5 absolute top-0 right-0 -mt-12 -mr-12 h-24 w-24 rounded-full" />
      <div className="relative z-10 mb-6 flex items-start justify-between">
        <div
          className={`rounded-2xl p-3 ${geoEnabled && hasSecurity ? "bg-swiss-red shadow-brand-accent/20 text-white shadow-lg" : "bg-secondary text-neutral-700"}`}
        >
          <Globe size={24} />
        </div>
        {hasSecurity && (
          <div
            role="switch"
            aria-checked={geoEnabled}
            aria-label="Toggle Geo-Lockdown"
            tabIndex={0}
            className={`h-6 w-12 cursor-pointer rounded-full p-1 ring-1 transition-all duration-300 ring-inset ${geoEnabled ? "bg-green-500 ring-green-600" : "bg-red-500 ring-red-600"}`}
            onClick={onToggleGeo}
            onKeyDown={(e) =>
              e.key === "Enter" || e.key === " " ? onToggleGeo() : undefined
            }
          >
            <div
              className="h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-300"
              style={{
                transform: geoEnabled ? "translateX(1.5rem)" : "translateX(0)",
              }}
            />
          </div>
        )}
      </div>
      <h3 className="text-swiss-navy relative z-10 mb-2 text-xs font-black tracking-widest uppercase">
        Geo-Lockdown
      </h3>
      <p className="relative z-10 mb-4 text-sm leading-relaxed font-medium text-neutral-700">
        Restrict site access based on visitor location. Prevent traffic from
        high-risk regions.
      </p>

      {!hasSecurity ? (
        <div className="border-border relative z-10 flex flex-col items-center justify-center border-t py-6 pt-4 opacity-60">
          <Lock size={24} className="mb-2 text-neutral-500" />
          <span className="text-xs font-black tracking-widest text-neutral-500 uppercase">
            PRO FEATURE
          </span>
          <p className="mt-1 text-center text-xs text-neutral-500">
            Upgrade to unlock Geo-Lockdown
          </p>
          <a
            href="https://swisswpsecure.com/products"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-accent mt-2 inline-block text-xs font-bold hover:underline"
          >
            swisswpsecure.com/products
          </a>
        </div>
      ) : (
        <div className="border-border relative z-10 space-y-3 border-t pt-4">
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="globalGeo"
              checked={globalGeoBlock}
              onChange={(e) => onToggleGlobalBlock(e.target.checked)}
              className="border-border text-brand-accent focus:ring-brand-accent mt-0.5 h-4 w-4 shrink-0 rounded-md transition-all"
            />
            <div>
              <label
                htmlFor="globalGeo"
                className="hover:text-brand-accent mb-0.5 block cursor-pointer text-sm font-black tracking-widest text-slate-600 uppercase transition-colors"
              >
                Block High-Risk Zones
              </label>
              <p className="text-xs leading-relaxed font-medium text-neutral-500">
                Automatically blocks countries that are the most common sources
                of WordPress attacks. Uses the country list below.
              </p>
            </div>
          </div>

          {/* Mode selector */}
          <div className="flex gap-2">
            {(["blacklist", "whitelist"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() =>
                  setGeoSettings((prev) => ({ ...prev, list_mode: mode }))
                }
                className={`flex-1 rounded-lg border py-1.5 text-xs font-black tracking-widest uppercase transition-all ${geoSettings.list_mode === mode ? "bg-swiss-navy border-swiss-navy text-white" : "bg-secondary border-border hover:border-swiss-navy text-neutral-700"}`}
              >
                {mode === "blacklist" ? "Block List" : "Allow List"}
              </button>
            ))}
          </div>

          {/* Country picker toggle */}
          <button
            onClick={() => setShowGeoPicker(!showGeoPicker)}
            className="text-swiss-navy hover:text-brand-accent flex w-full items-center justify-between py-1 text-xs font-black tracking-widest uppercase transition-colors"
          >
            <span>
              {geoSettings.countries.length > 0
                ? `${geoSettings.countries.length} ${geoSettings.list_mode === "blacklist" ? "Blocked" : "Allowed"}`
                : "Select Countries"}
            </span>
            <span>{showGeoPicker ? "▲" : "▼"}</span>
          </button>

          {showGeoPicker && (
            <div className="border-border overflow-hidden rounded-xl border">
              <input
                type="text"
                placeholder="Search countries..."
                value={geoSearch}
                onChange={(e) => setGeoSearch(e.target.value)}
                className="bg-background border-border focus:ring-swiss-navy w-full border-b px-3 py-2 text-xs font-bold focus:ring-1 focus:outline-none"
              />
              <div className="max-h-40 overflow-y-auto">
                {filteredCountries.map((country) => (
                  <label
                    key={country.code}
                    className="hover:bg-secondary flex cursor-pointer items-center gap-2 px-3 py-1.5 text-xs font-bold"
                  >
                    <input
                      type="checkbox"
                      checked={geoSettings.countries.includes(country.code)}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setGeoSettings((prev) => ({
                          ...prev,
                          countries: checked
                            ? [...prev.countries, country.code]
                            : prev.countries.filter((c) => c !== country.code),
                        }));
                      }}
                      className="h-3 w-3 rounded"
                    />
                    <span>{country.flag}</span>
                    <span>{country.name}</span>
                  </label>
                ))}
              </div>
              <div className="border-border border-t p-2">
                <Button
                  variant="primary"
                  onClick={() =>
                    saveGeoCountries(
                      geoSettings.countries,
                      geoSettings.list_mode
                    )
                  }
                  loading={savingGeo}
                  disabled={savingGeo}
                >
                  Save Countries
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
