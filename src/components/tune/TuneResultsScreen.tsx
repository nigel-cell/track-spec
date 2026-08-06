import { useMemo, useState } from "react";

import { FEEL_PRESETS, TUNE_MODES, TUNE_TAB_ORDER } from "../../data/constants";

import { applyFixNudge, type FixNudge } from "../../lib/fineTuneFixes";

import { formatTuneText, shareTuneText } from "../../lib/tuneShare";
import { buildTuneFileData, downloadTextFile, serializeTuneFile, tuneExportFileName } from "../../lib/tuneImportExport";

import { computeTunePages } from "../../lib/tuneFromConfig";

import type { TuneUnits } from "../../lib/units";
import { resolveTuneUnits, weightLabel } from "../../lib/units";

import type { CarPhotoStatus } from "../../lib/carPhoto";

import { Button } from "../ui/Button";

import { Card, DataValue, Label } from "../ui/Card";

import { FineTuneFlow } from "./FineTuneFlow";

import { SaveTunesSheet } from "./SaveTunesSheet";
import { useForzaGarage } from "../../hooks/useForzaGarage";
import { configToBuildProfile, saveBuildProfile } from "../../lib/buildProfiles";

import type { TuneConfig } from "./TuneInputScreen";
import { TuneSummaryChips } from "./TuneSectionNav";



interface TuneResultsScreenProps {

  config: TuneConfig;

  photoStatus: CarPhotoStatus;

  photoUrl: string | null;

  showFineTuneOnMount?: boolean;

  liveFineTuneProblem?: string | null;

  initialBalance?: number;

  initialAggression?: number;

  onFineTuneDismiss?: () => void;

  onBack: () => void;

  onLoadSaved?: (entry: import("../../lib/tuneSaves").SavedTune) => void;

  onOpenAiSettings?: () => void;

  onCompare?: () => void;

  units: TuneUnits;

}



export function TuneResultsScreen({

  config,

  photoStatus,

  photoUrl,

  showFineTuneOnMount = false,

  liveFineTuneProblem = null,

  initialBalance = 40,

  initialAggression = 45,

  onFineTuneDismiss,

  onBack,

  onLoadSaved,

  onOpenAiSettings,

  onCompare,

  units,

}: TuneResultsScreenProps) {

  const [tab, setTab] = useState<(typeof TUNE_TAB_ORDER)[number]>("Tires");

  const [balance, setBalance] = useState(initialBalance);

  const [aggression, setAggression] = useState(initialAggression);

  const [showFineTune, setShowFineTune] = useState(showFineTuneOnMount || !!liveFineTuneProblem);

  const [saveOpen, setSaveOpen] = useState(false);

  const [enhanceOpen, setEnhanceOpen] = useState(false);

  const [showActions, setShowActions] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const { lookup: lookupGarage } = useForzaGarage();



  const pages = useMemo(
    () => computeTunePages(config, balance, aggression, units),
    [config, balance, aggression, units],
  );



  const visibleTabs = useMemo(

    () => TUNE_TAB_ORDER.filter((name) => pages[name]?.values?.length),

    [pages],

  );



  const activeTab = visibleTabs.includes(tab) ? tab : visibleTabs[0] ?? "Tires";

  const mode = TUNE_MODES.find((m) => m.id === config.tuneId);
  const effectiveUnits = resolveTuneUnits(config.units, units);

  const data = pages[activeTab];



  const showToast = (msg: string) => {

    setToast(msg);

    setTimeout(() => setToast(null), 2500);

  };



  const handleShare = async () => {
    const text = formatTuneText(config, pages, balance, aggression, units);
    const result = await shareTuneText(text);
    showToast(result === "shared" ? "Shared!" : "Copied to clipboard");
  };

  const handleSaveBuildProfile = () => {
    const garage = lookupGarage(config.make, config.model.split(" '")[0]);
    if (!garage) {
      showToast("Car not found in garage for build profile");
      return;
    }
    saveBuildProfile(
      configToBuildProfile(config, garage.slug, `${config.make} ${config.model}`, `${config.tuneId} build`),
    );
    showToast("Build profile saved");
  };

  const handleExportFile = () => {
    const entry = {
      name: `${config.make} ${config.model} — ${config.tuneId}`,
      config,
      balance,
      aggression,
      tunePages: pages,
    };
    const data = buildTuneFileData(entry);
    downloadTextFile(serializeTuneFile(data), tuneExportFileName(entry.name, config, "json"));
    showToast("Tune file downloaded");
  };



  const handleNudge = (nudge: FixNudge) => {

    applyFixNudge(nudge, {

      balance,

      aggression,

      onBalance: setBalance,

      onAggression: setAggression,

      onPage: (page) => {

        const name = page as (typeof TUNE_TAB_ORDER)[number];

        if ((TUNE_TAB_ORDER as readonly string[]).includes(name)) setTab(name);

      },

    });

  };



  return (

    <>

      {showFineTune && (

        <FineTuneFlow

          initialProblemId={liveFineTuneProblem ?? undefined}

          liveHint={!!liveFineTuneProblem}

          onClose={() => {

            setShowFineTune(false);

            onFineTuneDismiss?.();

          }}

          onApplyNudge={handleNudge}

        />

      )}



      <SaveTunesSheet

        open={saveOpen}

        config={config}

        pages={pages}

        balance={balance}

        aggression={aggression}

        units={units}

        onClose={() => setSaveOpen(false)}

        onLoad={(entry) => onLoadSaved?.(entry)}

        onCompare={onCompare}

      />



      <EnhancePromptSheet

        open={enhanceOpen}

        config={config}

        pages={pages}

        balance={balance}

        aggression={aggression}

        units={units}

        onClose={() => setEnhanceOpen(false)}

        onOpenAiSettings={() => onOpenAiSettings?.()}

      />



      {toast && (

        <div className="pointer-events-none fixed bottom-24 left-1/2 z-40 -translate-x-1/2 rounded-[var(--ts-radius-sm)] border border-[var(--ts-accent-border)] bg-[var(--ts-accent-soft)] px-4 py-2 font-[family-name:var(--ts-font-mono)] text-[10px] uppercase tracking-wider text-[var(--ts-accent)]">

          {toast}

        </div>

      )}



      <div className="mx-auto max-w-[820px] px-4 py-4 pb-28">

        <header className="sticky top-0 z-10 -mx-4 border-b border-[var(--ts-border)] bg-[var(--ts-bg)]/95 px-4 py-3 backdrop-blur-md">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button variant="ghost" className="h-9 px-2 text-xs" onClick={onBack}>
              ← Edit setup
            </Button>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="primary" className="h-9 px-3 text-xs" onClick={() => setSaveOpen(true)}>
                Save
              </Button>
              <Button variant="outline" className="h-9 px-3 text-xs" onClick={() => void handleShare()}>
                Share
              </Button>
              <Button variant="ghost" className="h-9 px-2 text-xs" onClick={() => setShowActions((v) => !v)}>
                More
              </Button>
            </div>
          </div>
          {showActions && (
            <div className="mt-2 flex flex-wrap gap-2 border-t border-[var(--ts-border)] pt-2">
              <Button variant="outline" className="h-8 px-3 text-xs" onClick={handleExportFile}>
                Export file
              </Button>
              {onCompare && (
                <Button variant="outline" className="h-8 px-3 text-xs" onClick={onCompare}>
                  Compare tunes
                </Button>
              )}
              <Button variant="ghost" className="h-8 px-3 text-xs" onClick={handleSaveBuildProfile}>
                Save build profile
              </Button>
              <Button variant="ghost" className="h-8 px-3 text-xs" onClick={() => setEnhanceOpen(true)}>
                AI enhance
              </Button>
            </div>
          )}
        </header>

        <div className="mt-4">
          <TuneSummaryChips
            items={[
              { label: "Car", value: `${config.make} ${config.model}`.slice(0, 24) },
              { label: "PI", value: `${config.carClass} ${config.pi}` },
              { label: "Drive", value: config.driveType },
              { label: "Mode", value: mode?.label ?? config.tuneId, accent: mode?.color },
              { label: "Weight", value: `${Math.round(config.weight)} ${weightLabel(effectiveUnits)}` },
            ]}
          />
        </div>

        <div className="mt-4 -mx-4 sticky top-[52px] z-[9] border-b border-[var(--ts-border)] bg-[var(--ts-bg)]/95 px-4 backdrop-blur-md">
          <div className="flex gap-0.5 overflow-x-auto pb-px">
            {visibleTabs.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setTab(name)}
                className={[
                  "shrink-0 px-3 py-2.5 font-[family-name:var(--ts-font-heading)] text-[10px] font-semibold uppercase tracking-[0.14em]",
                  activeTab === name
                    ? "border-b-2 border-[var(--ts-accent)] text-[var(--ts-accent)]"
                    : "text-[var(--ts-muted)] hover:text-[var(--ts-text)]",
                ].join(" ")}
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        {data && (
          <Card className="mt-4 overflow-hidden p-0" padding={false}>
            <div className="border-b border-[var(--ts-border)] px-4 py-2 font-[family-name:var(--ts-font-mono)] text-[10px] uppercase tracking-[0.2em] text-[var(--ts-accent)]">
              {activeTab}
            </div>
            {data.values.map((row, i) => (
              <div
                key={row.key}
                className={[
                  "flex items-start justify-between gap-4 px-4 py-3",
                  i < data.values.length - 1 ? "border-b border-[var(--ts-border)]" : "",
                ].join(" ")}
              >
                <span className="text-sm text-[var(--ts-text)]">{row.key}</span>
                <DataValue>{row.value}</DataValue>
              </div>
            ))}
            {data.tip && (
              <div className="border-t border-[var(--ts-border)] bg-[var(--ts-accent-soft)] px-4 py-3 text-sm text-[var(--ts-muted)]">
                {data.tip}
              </div>
            )}
          </Card>
        )}

        <Card className="mt-4 space-y-4">
          <Label>Feel adjuster</Label>
          <div className="flex flex-wrap gap-2">
            {FEEL_PRESETS.map((p) => {
              const active = balance === p.balance && aggression === p.aggression;
              return (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => {
                    setBalance(p.balance);
                    setAggression(p.aggression);
                  }}
                  className={[
                    "rounded-full border px-3 py-1.5 font-[family-name:var(--ts-font-mono)] text-[10px] uppercase tracking-wider",
                    active
                      ? "border-[var(--ts-accent-border)] bg-[var(--ts-accent-soft)] text-[var(--ts-accent)]"
                      : "border-[var(--ts-border)] text-[var(--ts-muted)]",
                  ].join(" ")}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
          <div>
            <div className="mb-1 flex justify-between text-xs">
              <span>Balance</span>
              <span className="text-[var(--ts-accent)]">{balance}%</span>
            </div>
            <input type="range" min={0} max={100} value={balance} onChange={(e) => setBalance(+e.target.value)} className="w-full" />
          </div>
          <div>
            <div className="mb-1 flex justify-between text-xs">
              <span>Aggression</span>
              <span className="text-[var(--ts-accent)]">{aggression}%</span>
            </div>
            <input type="range" min={0} max={100} value={aggression} onChange={(e) => setAggression(+e.target.value)} className="w-full" />
          </div>
        </Card>

        <div className="mt-4">
          <Button variant="primary" full onClick={() => setShowFineTune(true)}>
            Fine tune handling
          </Button>
        </div>

      </div>

    </>

  );

}


