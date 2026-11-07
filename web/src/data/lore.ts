export interface LoreNode {
  id: string;
  name: string;
  kind: "place" | "artifact" | "faction" | "character" | "theme";
  desc: string;
  stories: string[];
}

export const LORE: LoreNode[] = [
  { id: "kasumi", name: "Kasumi City", kind: "place", desc: "A mist-bound rail town that exists in the past, present and neon future of half the platform.", stories: ["hollow-moon-courier", "last-train-to-kasumi", "neon-ronin-protocol", "salt-and-spirit", "kintsugi-heart-clinic"] },
  { id: "moon-rail", name: "The Moon Rail", kind: "place", desc: "An impossible railway that opens at 11:11 and runs between the living and the lost.", stories: ["hollow-moon-courier", "last-train-to-kasumi", "saturday-with-a-void", "echoes-of-a-quiet-god"] },
  { id: "ninth-bell", name: "The Ninth Bell", kind: "artifact", desc: "A bell that has never been heard — until it makes someone forgettable.", stories: ["the-ninth-bell", "hollow-moon-courier", "echoes-of-a-quiet-god", "rainy-season-orchestra", "bone-garden-sonata"] },
  { id: "mara", name: "Mara Venn", kind: "character", desc: "A wandering archivist who keeps the carbon copy of everything that was never sent. Cameos everywhere.", stories: ["hollow-moon-courier", "the-ninth-bell", "tidebound-cartographers", "crimson-theorem", "saturday-with-a-void"] },
  { id: "ashen-court", name: "The Ashen Court", kind: "faction", desc: "A secret society of exiled monarchs, regents and executioners who trade crowns like currency.", stories: ["ashfall-regalia", "eclipse-heir-system", "paper-crane-wars", "echoes-of-a-quiet-god"] },
  { id: "tide-clocks", name: "Tide Clocks", kind: "artifact", desc: "Brass clocks that keep time by the moon and the sea; stopping one changes the tides.", stories: ["tidebound-cartographers", "lighthouse-at-the-end-of-every-door", "copper-sky-pirates", "the-starless-tailor"] },
  { id: "loom", name: "The Loom of Absent Stars", kind: "artifact", desc: "The cosmic loom that wove fate before the stars went out.", stories: ["the-starless-tailor", "the-ninth-bell", "echoes-of-a-quiet-god", "hollow-moon-courier"] },
  { id: "nine-heavens", name: "The Nine Heavens", kind: "place", desc: "The cultivation realms, where even gods pay for noodles.", stories: ["midnight-mart-nine-heavens", "paper-crane-wars", "echoes-of-a-quiet-god"] },
  { id: "halloran", name: "Dr. Halloran", kind: "character", desc: "A cynical physician who appears in every story that needs a diagnosis — and a second opinion.", stories: ["crimson-theorem", "kintsugi-heart-clinic", "bone-garden-sonata"] },
  { id: "firmware", name: "The Firmware Saints", kind: "faction", desc: "Hackers who treat open firmware as scripture and locked firmware as heresy.", stories: ["neon-ronin-protocol", "skyforge-orphans", "velvet-circuit"] },
  { id: "lantern", name: "The Lantern Keepers", kind: "faction", desc: "An order that keeps lights burning in places the dark has claimed.", stories: ["lighthouse-at-the-end-of-every-door", "tidebound-cartographers", "the-wolf-who-read-stars"] },
  { id: "ghost-kitchen", name: "The Ghost Kitchen", kind: "place", desc: "A restaurant run by the dead. Reservations recommended; flesh optional.", stories: ["salt-and-spirit", "midnight-mart-nine-heavens", "monday-is-a-dragon", "dungeon-of-small-mercies"] },
  { id: "star-eater", name: "The Star Eater", kind: "character", desc: "A mythic wolf said to have swallowed the constellations — and the reason the sky went dark.", stories: ["the-wolf-who-read-stars", "echoes-of-a-quiet-god", "hollow-moon-courier", "the-starless-tailor"] },
  { id: "grief", name: "Grief & Memory", kind: "theme", desc: "What we carry, what we forget, and who remembers us.", stories: ["hollow-moon-courier", "the-ninth-bell", "last-train-to-kasumi", "kintsugi-heart-clinic", "saturday-with-a-void", "rainy-season-orchestra"] },
  { id: "found-family", name: "Found Family", kind: "theme", desc: "The crew you choose — usually by accident and over food.", stories: ["the-starless-tailor", "tidebound-cartographers", "skyforge-orphans", "copper-sky-pirates", "midnight-mart-nine-heavens", "dungeon-of-small-mercies"] },
  { id: "second-chance", name: "Second Chances", kind: "theme", desc: "Rebirth, time loops and the stubborn belief that you can get it right.", stories: ["ashfall-regalia", "eclipse-heir-system", "lighthouse-at-the-end-of-every-door", "dungeon-of-small-mercies", "hollow-moon-courier"] },
  { id: "proof", name: "Proof & Pattern", kind: "theme", desc: "Mathematics as mystery, maps as logic, and logic as haunting.", stories: ["crimson-theorem", "tidebound-cartographers", "saturday-with-a-void"] },
];
