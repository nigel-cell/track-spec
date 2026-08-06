export type ThemeId = "porsche" | "ferrari";

export interface ThemeDefinition {
  id: ThemeId;
  label: string;
  description: string;
  vars: Record<string, string>;
}
