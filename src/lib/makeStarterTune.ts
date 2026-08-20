import type { TuneConfig } from "../components/tune/TuneInputScreen";

export const SERIES4_STARTER_SLUGS = [
  "honda-n600-1970",
  "exomotive-exocet-sport-v8-xp-5-2018",
  "chevrolet-camaro-zl1-2024",
  "toyota-celica-gt-1974",
  "mitsubishi-starion-esi-r-1988",
  "porsche-203-porsche-ag-961-1987",
  "ford-thunderbird-1957",
  "alfa-romeo-autodelta-tipo-33-2-daytona-1968",
  "nissan-skyline-2000-turbo-rs-1983",
] as const;

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
