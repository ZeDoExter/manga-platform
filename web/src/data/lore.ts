export interface LoreNode {
  id: string;
  name: string;
  kind: "place" | "artifact" | "faction" | "character" | "theme";
  desc: string;
  stories: string[];
}

// Empty - lore universe links are populated when stories link universes.
export const LORE: LoreNode[] = [];
