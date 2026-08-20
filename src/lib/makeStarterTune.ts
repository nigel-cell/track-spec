import type { TuneConfig } from "../components/tune/TuneInputScreen";

export interface StarterTuneRecord {
  slug: string;
  name: string;
  note: string;
  balance: number;
  aggression: number;
  config: TuneConfig;
}

export interface StarterTuneFile {
  version: number;
  updatedAt: string;
  count: number;
  tunes: StarterTuneRecord[];
}
