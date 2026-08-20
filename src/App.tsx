import { useState, useEffect, useRef } from "react";

import { AppShell, type TabId } from "./components/layout/AppShell";

import { MenuSheet } from "./components/layout/MenuSheet";
import { UpdatesSheet } from "./components/layout/UpdatesSheet";

import { SetupScreen } from "./components/telemetry/SetupScreen";

import { GarageScreen } from "./components/garage/GarageScreen";

import { SessionsScreen } from "./components/telemetry/SessionsScreen";

import { TelemetryScreen } from "./components/telemetry/TelemetryScreen";

import { SaveTunesSheet } from "./components/tune/SaveTunesSheet";
import { AiSettingsSheet } from "./components/tune/AiSettingsSheet";
import { QuickTuneSheet } from "./components/tune/QuickTuneSheet";
import { TuneCompareSheet } from "./components/tune/TuneCompareSheet";
import { listSavedTunes } from "./lib/tuneSaves";
import { listBuildProfiles, buildProfileToDraft } from "./lib/buildProfiles";
import { ensureFavoriteProfile } from "./lib/favoriteProfiles";
import { loadSliderLimitsFile } from "./lib/sliderLimits";
import { loadManualDraft, slugFromMakeModel } from "./lib/manualDraft";

import { DEFAULT_CAR } from "./data/constants";

import { TelemetryProvider, useTelemetryContext } from "./context/TelemetryContext";
import { ForzaGarageProvider } from "./context/ForzaGarageContext";

import { useCarPhoto } from "./hooks/useCarPhoto";
import { useCarDatabase } from "./hooks/useCarDatabase";
import { useForzaGarage } from "./hooks/useForzaGarage";

import type { SavedTune } from "./lib/tuneSaves";
import { tuneDraftFromTelemetry } from "./lib/tuneFromTelemetry";
import { tuneDraftFromGarage, mergeGarageIntoDraft } from "./lib/tuneFromGarage";
import { buildAutoTuneConfig } from "./lib/autoTuneConfig";
import type { ForzaGarageCar } from "./lib/forzaGarage";

import { ThemeProvider } from "./themes/ThemeProvider";
import { useUnits } from "./hooks/useUnits";
import { useAppRefresh } from "./hooks/useAppRefresh";
import { useDesktopAutoUpdate } from "./hooks/useDesktopAutoUpdate";
import { isElectronShell } from "./lib/appUpdates";
import { convertValuesForUnits, resolveTuneUnits } from "./lib/units";

import { TuneInputScreen, type TuneConfig } from "./components/tune/TuneInputScreen";

import { TuneResultsScreen } from "./components/tune/TuneResultsScreen";



type TuneView = "input" | "results";



const FALLBACK_CONFIG: TuneConfig = {

  make: DEFAULT_CAR.make,

  model: DEFAULT_CAR.model,

  driveType: DEFAULT_CAR.driveType,

  weight: DEFAULT_CAR.weight,

  weightDist: DEFAULT_CAR.weightDist,

  pi: DEFAULT_CAR.pi,

  carClass: DEFAULT_CAR.carClass,

  tuneId: DEFAULT_CAR.tuneId,

  mode: "quick",

};



function AppContent() {

  const [tab, setTab] = useState<TabId>("tune");

  const [menuOpen, setMenuOpen] = useState(false);
  const [updatesOpen, setUpdatesOpen] = useState(false);

  const [myTunesOpen, setMyTunesOpen] = useState(false);

  const [aiSettingsOpen, setAiSettingsOpen] = useState(false);

  const [tuneView, setTuneView] = useState<TuneView>("input");

  const [config, setConfig] = useState<TuneConfig | null>(null);

  const [feelOverride, setFeelOverride] = useState<{ balance: number; aggression: number } | null>(

    null,

  );

  const [resultsKey, setResultsKey] = useState(0);

  const [showFineTuneOnMount, setShowFineTuneOnMount] = useState(false);

  const [liveFineTuneProblem, setLiveFineTuneProblem] = useState<string | null>(null);

  const [tuneInputDraft, setTuneInputDraft] = useState<Partial<TuneConfig> | null>(null);

  const [tuneInputKey, setTuneInputKey] = useState(0);
  const [tuneInputSlug, setTuneInputSlug] = useState<string | null>(null);

  const [quickTuneOpen, setQuickTuneOpen] = useState(false);
  const [quickTuneDraft, setQuickTuneDraft] = useState<Partial<TuneConfig> | null>(null);
  const [quickTuneLabel, setQuickTuneLabel] = useState("");
  const [quickTuneSlug, setQuickTuneSlug] = useState<string | undefined>();
  const [quickTuneManualHandler, setQuickTuneManualHandler] = useState<"garage" | "telemetry" | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);
  const [dismissedCarOrdinal, setDismissedCarOrdinal] = useState<number | null>(null);
  const [garageVisited, setGarageVisited] = useState(false);

  const { telemetry, lookupCarOrdinal } = useTelemetryContext();

  const { units, setUnits } = useUnits();
  const { updateReady, refreshing, refreshApp } = useAppRefresh();
  const desktopUpdate = useDesktopAutoUpdate();
  const showUpdateReady = updateReady || desktopUpdate.available;
  const prevUnitsRef = useRef(units);

  useEffect(() => {
    if (desktopUpdate.promptOpen) setUpdatesOpen(true);
  }, [desktopUpdate.promptOpen]);

  useEffect(() => {
    if (tab === "garage") setGarageVisited(true);
  }, [tab]);

  useEffect(() => {
    const prev = prevUnitsRef.current;
    if (prev.weight === units.weight && prev.speed === units.speed) {
      prevUnitsRef.current = units;
      return;
    }

    setConfig((current) => {
      if (!current) return current;
      const from = resolveTuneUnits(current.units, prev);
      return {
        ...current,
        ...convertValuesForUnits(
          { weight: current.weight, topspeed: current.topspeed, maxTorque: current.maxTorque },
          from,
          units,
        ),
        units,
      };
    });

    setTuneInputDraft((draft) => {
      if (!draft) return draft;
      const from = resolveTuneUnits(draft.units, prev);
      return {
        ...draft,
        ...convertValuesForUnits(
          { weight: draft.weight, topspeed: draft.topspeed, maxTorque: draft.maxTorque },
          from,
          units,
        ),
        units,
      };
    });

    prevUnitsRef.current = units;
  }, [units]);

  const { cars, makes } = useCarDatabase();
  const { lookup: lookupGarage, lookupByName: lookupGarageByName } = useForzaGarage();

  const photoMake = config?.make ?? DEFAULT_CAR.make;

  const photoModel = config?.model ?? DEFAULT_CAR.model;

  const { status: photoStatus, url: photoUrl } = useCarPhoto(photoMake, photoModel);



  const handleDeploy = (c: TuneConfig) => {

    setConfig({ ...c, units: c.units ?? units });

    setFeelOverride(null);

    setResultsKey((k) => k + 1);

    setShowFineTuneOnMount(true);

    setTuneView("results");

  };



  const handleLoadSaved = (entry: SavedTune) => {

    setConfig({ ...entry.config, units: entry.config.units ?? units });

    setFeelOverride({ balance: entry.balance, aggression: entry.aggression });

    setResultsKey((k) => k + 1);

    setShowFineTuneOnMount(false);

    setLiveFineTuneProblem(null);

    setTuneView("results");

    setTab("tune");

  };



  const handleLiveFineTune = (problemId: string): boolean => {

    if (config) {

      setLiveFineTuneProblem(problemId);

      setTuneView("results");

      setTab("tune");

      return true;

    }

    return false;

  };



  const openTuneEditor = (draft: Partial<TuneConfig>, slug?: string | null) => {
    setTuneInputDraft(draft);
    setTuneInputSlug(slug ?? null);
    setTuneInputKey((k) => k + 1);
    setTuneView("input");
    setTab("tune");
  };

  const quickTune = (draft: Partial<TuneConfig>, tuneId = draft.tuneId ?? "Race") => {
    handleDeploy(buildAutoTuneConfig(draft, { tuneId, mode: "full", units }));
  };

  const mergeBuildProfile = (draft: Partial<TuneConfig>, carSlug?: string): Partial<TuneConfig> => {
    if (!carSlug) return draft;
    const profile = listBuildProfiles(carSlug)[0];
    if (!profile) return draft;
    return { ...draft, ...buildProfileToDraft(profile) };
  };

  const openQuickTuneSheet = (
    draft: Partial<TuneConfig>,
    label: string,
    manualSource: "garage" | "telemetry" | null,
    carSlug?: string,
  ) => {
    setQuickTuneDraft(mergeBuildProfile(draft, carSlug));
    setQuickTuneLabel(label);
    setQuickTuneSlug(carSlug);
    setQuickTuneManualHandler(manualSource);
    setQuickTuneOpen(true);
  };

  const buildTelemetryDraft = (): Partial<TuneConfig> | null => {
    if (!telemetry?.carOrdinal) return null;
    const ordinalName = telemetry.carName ?? lookupCarOrdinal(telemetry.carOrdinal);
    const base = tuneDraftFromTelemetry(telemetry, ordinalName, cars, makes, units);
    const garageCar =
      (ordinalName ? lookupGarageByName(ordinalName) : null) ??
      (base.make && base.model ? lookupGarage(base.make, base.model.split(" '")[0]) : null);
    return mergeGarageIntoDraft(base, garageCar, cars, units);
  };

  const handleQuickTuneFromTelemetry = () => {
    const draft = buildTelemetryDraft();
    if (!draft) return;
    const label = `${draft.make ?? ""} ${draft.model ?? ""}`.trim() || "Current car";
    openQuickTuneSheet(draft, label, "telemetry");
  };

  const handleManualTuneFromTelemetry = () => {
    const draft = buildTelemetryDraft();
    if (draft) openTuneEditor(draft);
  };

  const handleQuickTuneFromGarage = (car: ForzaGarageCar) => {
    openQuickTuneSheet(tuneDraftFromGarage(car, cars, units), car.name, "garage", car.slug);
  };

  const handleManualTuneFromGarage = (car: ForzaGarageCar) => {
    void (async () => {
      const sliderFile = await loadSliderLimitsFile();
      // Full profile: garage weight/speed/torque + measured springs/ride/aero + last edits.
      const draft = ensureFavoriteProfile(car.slug, car, cars, units, sliderFile);
      const stored =
        loadManualDraft(car.slug) ?? loadManualDraft(slugFromMakeModel(car.make, car.model));
      openTuneEditor(stored?.config ? { ...draft, ...stored.config } : draft, car.slug);
    })();
  };



  return (

    <>

      <AppShell
        tab={tab}
        onTabChange={setTab}
        onMenuOpen={() => setMenuOpen(true)}
        onRefresh={refreshApp}
        onUpdates={() => setUpdatesOpen(true)}
        refreshBusy={refreshing}
        updateReady={showUpdateReady}
        lockMainScroll={tab === "telemetry"}
      >

        <div
          className={tab === "tune" && tuneView === "input" ? "contents" : "hidden"}
          aria-hidden={!(tab === "tune" && tuneView === "input")}
        >
          <TuneInputScreen
            key={tuneInputKey}
            onDeploy={handleDeploy}
            onMyTunes={() => setMyTunesOpen(true)}
            onLoadSaved={handleLoadSaved}
            initialDraft={tuneInputDraft}
            resumeSlug={tuneInputSlug}
            units={units}
          />
        </div>

        {tab === "tune" && tuneView === "results" && config && (

          <TuneResultsScreen

            key={resultsKey}

            config={config}

            photoStatus={photoStatus}

            photoUrl={photoUrl}

            initialBalance={feelOverride?.balance}

            initialAggression={feelOverride?.aggression}

            showFineTuneOnMount={showFineTuneOnMount || !!liveFineTuneProblem}

            liveFineTuneProblem={liveFineTuneProblem}

            onLoadSaved={handleLoadSaved}

            onOpenAiSettings={() => setAiSettingsOpen(true)}

            onCompare={() => setCompareOpen(true)}

            onFineTuneDismiss={() => {

              setShowFineTuneOnMount(false);

              setLiveFineTuneProblem(null);

            }}

            onBack={() => {

              setTuneView("input");

              setFeelOverride(null);

              setShowFineTuneOnMount(false);

              setLiveFineTuneProblem(null);

            }}

            units={units}

          />

        )}

        {tab === "telemetry" && (

          <TelemetryScreen

            onSetup={() => setTab("setup")}

            onLiveFineTune={handleLiveFineTune}

            onQuickTune={handleQuickTuneFromTelemetry}

            onManualTune={handleManualTuneFromTelemetry}

            loadedConfig={config}

            dismissedCarOrdinal={dismissedCarOrdinal}

            onDismissCarDetect={(ordinal) => setDismissedCarOrdinal(ordinal)}

          />

        )}

        {garageVisited && (
          <div className={tab === "garage" ? "contents" : "hidden"} aria-hidden={tab !== "garage"}>
            <GarageScreen
              onQuickTune={handleQuickTuneFromGarage}
              onManualTune={handleManualTuneFromGarage}
              onLoadSaved={handleLoadSaved}
              onBrowseTunes={() => setMyTunesOpen(true)}
            />
          </div>
        )}

        {tab === "sessions" && <SessionsScreen />}

        {tab === "setup" && <SetupScreen />}

      </AppShell>



      {showUpdateReady && (
        <button
          type="button"
          onClick={() => {
            if (isElectronShell()) setUpdatesOpen(true);
            else void refreshApp();
          }}
          className="fixed left-3 right-3 top-[env(safe-area-inset-top,0px)] z-[60] mt-2 rounded-[var(--ts-radius-md)] border border-[var(--ts-accent-border)] bg-[var(--ts-accent-soft)] px-4 py-2.5 text-center text-xs font-semibold text-[var(--ts-accent)] shadow-lg md:left-auto md:right-4 md:max-w-sm"
        >
          {isElectronShell()
            ? `Version ${desktopUpdate.check?.remoteVersion ?? "new"} is available — tap to update`
            : "Update ready — tap to refresh"}
        </button>
      )}

      <MenuSheet

        open={menuOpen}

        onClose={() => setMenuOpen(false)}

        onMyTunes={() => {

          setMenuOpen(false);

          setMyTunesOpen(true);

        }}

        onAiSettings={() => {
          setMenuOpen(false);
          setAiSettingsOpen(true);
        }}
        onUpdates={() => setUpdatesOpen(true)}
        units={units}
        onUnitsChange={setUnits}
        onRefresh={refreshApp}
        refreshBusy={refreshing}
        updateReady={showUpdateReady}
      />

      <UpdatesSheet
        open={updatesOpen}
        onClose={() => {
          setUpdatesOpen(false);
          desktopUpdate.dismissPrompt();
        }}
        updateReady={showUpdateReady}
        refreshBusy={refreshing}
        autoStartDownload={desktopUpdate.available}
        onUpdateNow={() => void refreshApp()}
      />



      <SaveTunesSheet

        open={myTunesOpen}

        browseOnly

        config={config ?? FALLBACK_CONFIG}

        pages={{}}

        balance={40}

        aggression={45}

        units={units}

        onClose={() => setMyTunesOpen(false)}

        onLoad={handleLoadSaved}

        onCompare={() => {
          setMyTunesOpen(false);
          setCompareOpen(true);
        }}

      />



      <AiSettingsSheet open={aiSettingsOpen} onClose={() => setAiSettingsOpen(false)} />

      <QuickTuneSheet
        open={quickTuneOpen}
        carLabel={quickTuneLabel}
        onClose={() => setQuickTuneOpen(false)}
        onManual={
          quickTuneManualHandler === "garage"
            ? () => {
                setQuickTuneOpen(false);
                if (!quickTuneDraft) return;
                const stored = quickTuneSlug ? loadManualDraft(quickTuneSlug) : null;
                openTuneEditor(
                  stored?.config ? { ...quickTuneDraft, ...stored.config } : quickTuneDraft,
                  quickTuneSlug,
                );
              }
            : quickTuneManualHandler === "telemetry"
              ? () => {
                  setQuickTuneOpen(false);
                  handleManualTuneFromTelemetry();
                }
              : undefined
        }
        onConfirm={(tuneId) => {
          if (quickTuneDraft) quickTune(quickTuneDraft, tuneId);
        }}
      />

      <TuneCompareSheet
        open={compareOpen}
        tunes={listSavedTunes()}
        units={units}
        onClose={() => setCompareOpen(false)}
      />

    </>

  );

}



export default function App() {
  return (
    <ThemeProvider>
      <TelemetryProvider>
        <ForzaGarageProvider eager={false}>
          <AppContent />
        </ForzaGarageProvider>
      </TelemetryProvider>
    </ThemeProvider>
  );
}


