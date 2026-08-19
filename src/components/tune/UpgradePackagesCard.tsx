import {
  AERO_PACKAGES,
  BRAKE_PACKAGES,
  CHASSIS_PACKAGES,
  POWER_STAGES,
  TIRE_PACKAGES,
  TRANS_PACKAGES,
  WEIGHT_PACKAGES,
  type AeroPackageId,
  type BrakePackageId,
  type ChassisPackageId,
  type PowerStageId,
  type TirePackageId,
  type TransPackageId,
  type WeightPackageId,
} from "../../data/upgradePackages";
import { CLASSES } from "../../data/constants";
import { Label } from "../ui/Card";
import { Button } from "../ui/Button";

interface UpgradePackagesCardProps {
  weightPackage: WeightPackageId;
  chassisPackage: ChassisPackageId;
  powerStage: PowerStageId;
  tirePackage: TirePackageId;
  transPackage: TransPackageId;
  brakePackage: BrakePackageId;
  aeroPackage: AeroPackageId;
  engineSwapped: boolean;
  estimatedPi?: number;
  estimatedClass?: string;
  targetClass: string;
  onWeight: (id: WeightPackageId) => void;
  onChassis: (id: ChassisPackageId) => void;
  onPower: (id: PowerStageId) => void;
  onTires: (id: TirePackageId) => void;
  onTrans: (id: TransPackageId) => void;
  onBrakes: (id: BrakePackageId) => void;
  onAero: (id: AeroPackageId) => void;
  onTargetClass: (cls: string) => void;
  onApplyClassPlan: () => void;
  classPlanNote?: string;
}

function Picker<T extends string>({
  label,
  value,
  options,
  onChange,
  disabled,
  hint,
}: {
  label: string;
  value: T;
  options: { id: T; label: string; desc: string }[];
  onChange: (id: T) => void;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <div className={disabled ? "opacity-50" : undefined}>
      <Label>{label}</Label>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as T)}
        className="min-h-11 w-full rounded-[var(--ts-radius-sm)] border border-[var(--ts-border)] bg-[var(--ts-surface)] px-3 text-sm"
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
      <p className="mt-1 text-[10px] leading-snug text-[var(--ts-dim)]">
        {hint ?? options.find((o) => o.id === value)?.desc}
      </p>
    </div>
  );
}

export function UpgradePackagesCard({
  weightPackage,
  chassisPackage,
  powerStage,
  tirePackage,
  transPackage,
  brakePackage,
  aeroPackage,
  engineSwapped,
  estimatedPi,
  estimatedClass,
  targetClass,
  onWeight,
  onChassis,
  onPower,
  onTires,
  onTrans,
  onBrakes,
  onAero,
  onTargetClass,
  onApplyClassPlan,
  classPlanNote,
}: UpgradePackagesCardProps) {
  return (
    <div className="space-y-[var(--ts-section-gap)]">
      <div className="grid gap-[var(--ts-section-gap)] md:grid-cols-2">
        <Picker
          label="Weight reduction"
          value={weightPackage}
          options={WEIGHT_PACKAGES}
          onChange={onWeight}
        />
        <Picker
          label="Chassis"
          value={chassisPackage}
          options={CHASSIS_PACKAGES}
          onChange={onChassis}
        />
        <Picker
          label="Power path"
          value={powerStage}
          options={POWER_STAGES}
          onChange={onPower}
          disabled={engineSwapped}
          hint={
            engineSwapped
              ? "Power path applies to the stock engine only — clear the engine swap to use stages."
              : POWER_STAGES.find((p) => p.id === powerStage)?.desc
          }
        />
        <Picker label="Tires & rims" value={tirePackage} options={TIRE_PACKAGES} onChange={onTires} />
        <Picker
          label="Transmission"
          value={transPackage}
          options={TRANS_PACKAGES}
          onChange={onTrans}
        />
        <Picker label="Brakes" value={brakePackage} options={BRAKE_PACKAGES} onChange={onBrakes} />
        <Picker label="Aero kit" value={aeroPackage} options={AERO_PACKAGES} onChange={onAero} />
      </div>

      <div className="rounded-[var(--ts-radius-lg)] border border-[var(--ts-border)] bg-[var(--ts-card)] p-4 space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <Label>PI / class builder</Label>
            <p className="text-[10px] leading-snug text-[var(--ts-dim)]">
              Suggests tires, weight, power, and aero to stay near the top of a class.
              {estimatedPi != null
                ? ` Current estimate ~${estimatedPi} PI (${estimatedClass ?? "—"}).`
                : ""}
            </p>
          </div>
          {estimatedPi != null && (
            <div className="font-[family-name:var(--ts-font-mono)] text-sm text-[var(--ts-accent)]">
              ~{estimatedPi} {estimatedClass}
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {CLASSES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onTargetClass(c)}
              className={[
                "min-h-9 min-w-9 rounded-[var(--ts-radius-sm)] border px-2 font-[family-name:var(--ts-font-mono)] text-xs",
                targetClass === c
                  ? "border-[var(--ts-accent-border)] bg-[var(--ts-accent-soft)] text-[var(--ts-accent)]"
                  : "border-[var(--ts-border)] text-[var(--ts-muted)]",
              ].join(" ")}
            >
              {c}
            </button>
          ))}
        </div>
        <Button variant="outline" full onClick={onApplyClassPlan}>
          Apply build for {targetClass}
        </Button>
        {classPlanNote ? (
          <p className="text-[10px] leading-snug text-[var(--ts-dim)]">{classPlanNote}</p>
        ) : null}
      </div>
    </div>
  );
}
