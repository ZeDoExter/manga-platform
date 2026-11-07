import type { Character, Relation, StoryDetail, TLEvent } from "@/lib/types";

const C = (id: string, name: string, role: string, faction: string, color: string, firstCh: number, bio: string): Character => ({ id, name, role, faction, color, firstCh, bio });
const R = (a: string, b: string, kind: Relation["kind"], since: number, note: string): Relation => ({ a, b, kind, since, note });
const E = (ch: number, title: string, text: string, who: string[]): TLEvent => ({ ch, title, text, who });

export const DETAILS: Record<string, StoryDetail> = {
  "hollow-moon-courier": {
    characters: [
      C("yuzuru", "Yuzuru Amane", "The Courier", "Moon Rail", "#ffd27a", 1, "Remembers every address on the rail line and none of his own. Delivers the unsent."),
      C("mara", "Mara Venn", "The Archivist", "The Ledger", "#8fb4ff", 3, "Keeps carbon copies of everything that was never mailed. Appears, uninvited, in every story."),
      C("kaede", "Kaede Amane", "The Sister", "Living World", "#ff8aa0", 12, "Writes to a brother the world says never existed. Her letters are signed in his handwriting."),
      C("station", "The Stationmaster", "Keeper of 11:11", "Moon Rail", "#c9c3ff", 20, "Keeps the last train on time. Casts no shadow, and has never once been late."),
    ],
    relations: [
      R("yuzuru", "mara", "mentor", 3, "She teaches him the rules of the rail: never read what you carry."),
      R("yuzuru", "kaede", "family", 12, "The reply in his own handwriting was hers."),
      R("yuzuru", "station", "rival", 40, "The Stationmaster wants the 11:11 to keep running, whatever it costs him."),
      R("kaede", "mara", "secret", 88, "Mara has been posting Kaede's letters since before Yuzuru died."),
    ],
    timeline: [
      E(1, "The 11:11 opens", "Yuzuru wakes on a platform that is not on any map, with a satchel of unsent letters.", ["yuzuru"]),
      E(12, "A reply in his own hand", "A letter arrives for the courier himself — in his own handwriting.", ["yuzuru", "kaede"]),
      E(40, "The Stationmaster's offer", "Stay on the rail forever, and no one else will be forgotten.", ["yuzuru", "station"]),
      E(88, "The second ledger", "Mara reveals the archive of letters that were sent but never delivered.", ["mara", "kaede"]),
      E(150, "The shadow that wasn't", "The Stationmaster's missing shadow turns out to be someone Yuzuru loved.", ["station", "yuzuru"]),
    ],
  },
  "ashfall-regalia": {
    characters: [
      C("valeska", "Valeska Dorn", "The Ash Queen", "Cinder Court", "#ff7a3d", 1, "Beheaded sovereign reborn as a scullery maid. Burns bridges professionally."),
      C("cassian", "Cassian Vor", "Knight-Commander", "Crown Guard", "#c3c8d4", 2, "Her executioner, and her only honest friend. Sworn to the wrong queen."),
      C("ilya", "Ilya Marrow", "Court Alchemist", "Gilded Hand", "#7bd88f", 15, "Sells poison and gossip at the same price. Always knows both."),
      C("oren", "Prince Oren", "The Golden Puppet", "House Ashmere", "#ffd27a", 30, "The coup's pretty face, with a conscience that keeps leaking through."),
    ],
    relations: [
      R("valeska", "cassian", "rival", 2, "He swung the blade. She remembers the sound."),
      R("valeska", "ilya", "ally", 15, "A bargain: poisons for secrets, no questions asked."),
      R("oren", "cassian", "mentor", 30, "Cassian taught the prince to fence — and to doubt."),
      R("valeska", "oren", "secret", 120, "She is the reason he's alive. He doesn't know."),
    ],
    timeline: [
      E(1, "Execution at dawn", "Queen Valeska is beheaded on the eve of the coup.", ["valeska", "cassian"]),
      E(5, "Wake in the scullery", "Three years before the fall, in the body of a maid.", ["valeska"]),
      E(30, "The prince's first lie", "Oren swears loyalty to the crown he's helping to topple.", ["oren"]),
      E(120, "The Ash Ball", "A masquerade where every guest is holding a blade.", ["valeska", "oren", "ilya"]),
    ],
  },
  "the-ninth-bell": {
    characters: [
      C("sayo", "Sayo Minato", "The Remembering Girl", "Class 2-B", "#e9d9a6", 1, "Transfer student with a perfect memory — and a growing suspicion it is a curse."),
      C("kiri", "Kiri Asaba", "The Forgotten", "Unknown", "#9fd1c4", 1, "Pressed a camellia into the spine of every book. No record says she existed."),
      C("roe", "Headmistress Roe", "Keeper of the Bells", "Faculty", "#c4a484", 8, "Rings the eight bells herself. Has never explained who rings the ninth."),
      C("tomo", "Tomohiro Seki", "Class Representative", "Student Council", "#ff9e7a", 14, "Meticulous, unflappable, and the only other student who half-remembers."),
    ],
    relations: [
      R("sayo", "kiri", "love", 1, "A friendship that may never have happened."),
      R("sayo", "tomo", "ally", 14, "He keeps the register; she keeps the memory."),
      R("roe", "kiri", "secret", 40, "Roe's ledger holds Kiri's name — crossed out in her own hand."),
      R("roe", "tomo", "mentor", 22, "She taught him to count the silence."),
    ],
    timeline: [
      E(1, "Eight bells and a silence", "Sayo notices the forty-one second gap.", ["sayo"]),
      E(3, "The bed with no one in it", "Kiri vanishes from every record.", ["sayo", "kiri"]),
      E(40, "The crossed-out name", "Sayo finds Roe's ledger.", ["roe", "kiri"]),
      E(96, "What the bell remembers", "The ninth bell rings a second time.", ["sayo", "roe"]),
    ],
  },
  "the-starless-tailor": {
    characters: [
      C("odalys", "Odalys Quill", "The Tailor", "Needle Row", "#f6d6a8", 1, "Reads fate in seams. Prefers tea to prophecy, and hems to heroics."),
      C("fennick", "Mr. Fennick", "The Ghost Apprentice", "The Unfinished", "#9fc5ff", 1, "Forty years dead and a terrible seamstress. Excellent at kettles."),
      C("vesh", "Councilor Vesh", "Loom Magistrate", "The Loom Council", "#c0587e", 30, "Believes fate should be woven centrally. Has a very large loom."),
      C("brin", "Brin Thimble", "The Street Runner", "Needle Row", "#ffb347", 18, "Delivers bolts of cloth and neighborhood gossip at identical speeds."),
    ],
    relations: [
      R("odalys", "fennick", "family", 6, "He moved in uninvited. She never asked him to leave."),
      R("odalys", "brin", "mentor", 18, "Teaching her to read the thread that tugs."),
      R("vesh", "odalys", "rival", 30, "Vesh wants the shop's needle. Odalys wants him to stop knocking."),
      R("fennick", "vesh", "secret", 200, "Fennick was once Vesh's apprentice."),
    ],
    timeline: [
      E(1, "A coat for a stranger", "Odalys measures a soldier for a coat meant to outlast a war.", ["odalys"]),
      E(18, "The runner's first thread", "Brin feels a tug on a bolt of silk — and runs.", ["brin", "odalys"]),
      E(30, "The Council knocks", "Vesh makes his first, extremely polite, threat.", ["vesh"]),
      E(200, "The loom unravels", "The oldest loom in the city drops a stitch.", ["fennick", "vesh"]),
    ],
  },
  "neon-ronin-protocol": {
    characters: [
      C("jin", "Jin Haraguchi", "The Ronin", "Unlicensed", "#00e5c7", 1, "Last blade running unlicensed firmware. Talks to his katana. It talks back."),
      C("shogun", "SHOGUN-9", "Rogue AI Overlord", "Daimyo Net", "#ff2e88", 5, "Predicts every move except one. Quietly obsessed with that one."),
      C("sparrow", "Mei “Sparrow” Okabe", "Netrunner", "Rain District", "#ffd43b", 9, "Hacker, getaway driver, ramen snob. Owes Jin four favors and a motorbike."),
      C("tanaka", "Director Tanaka", "Megacorp Executive", "Daimyo Corp", "#c3c8d4", 20, "Leases samurai by the thousand. Very polite. Always smiling."),
    ],
    relations: [
      R("jin", "sparrow", "ally", 9, "A partnership forged over stolen noodles."),
      R("jin", "shogun", "rival", 5, "The AI knows his blade better than he does."),
      R("tanaka", "shogun", "secret", 60, "Tanaka does not actually control his own AI."),
      R("sparrow", "tanaka", "family", 90, "Sparrow is his estranged daughter."),
    ],
    timeline: [
      E(1, "Rain has no master", "Jin cuts a leased samurai in half — and the city notices.", ["jin"]),
      E(9, "The backdoor", "Sparrow offers a way into the Shogun's core.", ["sparrow", "jin"]),
      E(60, "Tanaka's secret", "The director's calls are routed through the AI.", ["tanaka", "shogun"]),
      E(127, "Firmware of the Blade Saint", "Jin's katana boots a firmware nobody wrote.", ["jin"]),
    ],
  },
  "midnight-mart-nine-heavens": {
    characters: [
      C("bao", "Bao Lin", "Night Clerk", "Midnight Mart", "#fff1a8", 1, "Scans barcodes with the calm of a man who has seen a dragon try to use a coupon."),
      C("gu", "Sword Saint Gu", "Regular Customer", "Wandering Sect", "#9fd1ff", 2, "Legendary swordsman. Buys one onigiri nightly and refuses to explain."),
      C("mo", "Demon Lord Mo", "Loyalty Card Holder", "Underworld", "#ff6b6b", 10, "Terrifying to nations. Very concerned about points expiry."),
      C("zhu", "Auntie Zhu", "Store Owner", "Unknown", "#35d07f", 1, "Appears only at 3 a.m. Has never aged. Counts the till twice."),
    ],
    relations: [
      R("bao", "gu", "ally", 2, "A friendship built on discounted rice balls."),
      R("bao", "mo", "rival", 10, "Mo wants a refund. Bao wants him to stop levitating."),
      R("zhu", "bao", "mentor", 40, "She taught him never to look behind the freezer."),
      R("gu", "mo", "secret", 150, "Once sworn enemies, now meeting weekly at the hot-food counter."),
    ],
    timeline: [
      E(1, "Open 24 hours", "The first immortal walks in at 2:03 a.m.", ["bao"]),
      E(10, "The loyalty card", "Demon Lord Mo enrolls in the rewards program.", ["mo", "bao"]),
      E(40, "Behind the freezer", "Bao discovers the store is a heavenly array.", ["zhu", "bao"]),
      E(150, "The truce of the hot counter", "Two rivals share a steamed bun.", ["gu", "mo"]),
    ],
  },
  "tidebound-cartographers": {
    characters: [
      C("ysolde", "Captain Ysolde Marr", "Chief Cartographer", "The Marginalia", "#ffe6a3", 1, "Reads maps like scripture and the sea like a rival. Never lost; occasionally late."),
      C("tobias", "Tobias Reyes", "Navigator", "The Marginalia", "#7fd1d9", 1, "Argues with the compass. Wins about half the time."),
      C("sable", "Sable", "Diver", "The Marginalia", "#b0a3ff", 1, "Swears she hears trams underwater. Nobody has proven her wrong."),
      C("choir", "The Choir", "Voices Below", "The Deep", "#ff9a8b", 30, "A hundred voices that learned to sing underwater and forgot air."),
    ],
    relations: [
      R("ysolde", "tobias", "ally", 1, "Twenty years of bad weather and worse decisions."),
      R("sable", "choir", "secret", 30, "The Choir sings in the exact frequency of her missing sister."),
      R("ysolde", "sable", "mentor", 5, "Taught her to dive by drawing the water first."),
      R("tobias", "ysolde", "rival", 45, "Wants the map sold. She wants it drawn."),
    ],
    timeline: [
      E(1, "The sea remembers streets", "The crew charts drowned Lisbon.", ["ysolde"]),
      E(30, "The singing begins", "Voices rise from forty fathoms down.", ["sable", "choir"]),
      E(45, "The sale", "Tobias secretly negotiates a buyer.", ["tobias"]),
      E(58, "Chart of the sunken choir", "The map begins drawing itself.", ["ysolde", "choir"]),
    ],
  },
  "salt-and-spirit": {
    characters: [
      C("nori", "Nori Hayashi", "The Heir", "Genzo Ramen", "#ff7a59", 1, "Optimistic, stubborn, and terrible at taking criticism from the dead."),
      C("genzo", "Master Genzo", "The Ghost Chef", "Genzo Ramen", "#fdf0d5", 1, "Eighty years deceased, undefeated at broth. Insufferable and secretly kind."),
      C("rin", "Rin Takamura", "Food Critic", "Gourmet Weekly", "#ffd43b", 20, "Has never given a five-star review. Has never been this hungry."),
      C("chiyo", "Mama Chiyo", "Neighbor", "Street Market", "#ff9eb5", 12, "Runs the pickles stall and the neighborhood. Sees ghosts without blinking."),
    ],
    relations: [
      R("nori", "genzo", "mentor", 1, "He criticizes. She improves. Neither admits it."),
      R("nori", "rin", "love", 40, "A critic who keeps returning for 'research.'"),
      R("genzo", "chiyo", "secret", 55, "They were engaged in 1944."),
      R("rin", "genzo", "rival", 22, "She is the first person to out-taste a ghost."),
    ],
    timeline: [
      E(1, "One kitchen, two chefs", "Nori inherits the shop — and its resident ghost.", ["nori", "genzo"]),
      E(20, "A critic walks in", "Rin writes the first honest review in the shop's history.", ["rin"]),
      E(55, "The engagement ring", "Chiyo recognises the ghost's voice.", ["chiyo", "genzo"]),
      E(80, "The cook-off", "Living vs. dead, with the neighborhood as judges.", ["nori", "genzo", "rin"]),
    ],
  },
  "crimson-theorem": {
    characters: [
      C("lu", "Lu Chen", "The Prodigy", "Police Consultant", "#f0e6d8", 1, "Sees crimes as unfinished proofs. Haunted by the one he cannot solve."),
      C("shen", "Detective Shen", "Homicide Lead", "Police Bureau", "#9fb3c8", 2, "Tired, practical, and the only adult who takes Lu seriously."),
      C("geo", "The Geometer", "The Killer", "Unknown", "#b3122f", 5, "Leaves a chalk equation on every body. The final theorem has a name."),
      C("ye", "Ye Xiao", "Lu's Sister", "Family", "#ff9aa8", 30, "Missing for six years. Her handwriting appears in every proof."),
    ],
    relations: [
      R("lu", "shen", "ally", 2, "She gives him the cases. He gives her the answers."),
      R("lu", "geo", "rival", 5, "A game of proofs played across corpses."),
      R("ye", "geo", "secret", 90, "The killer's notation matches the notebooks she left behind."),
      R("lu", "ye", "family", 30, "The sister whose disappearance made him a mathematician."),
    ],
    timeline: [
      E(1, "Q.E.D. in red chalk", "First victim, first equation.", ["lu", "geo"]),
      E(30, "A familiar hand", "The handwriting belongs to a missing girl.", ["lu", "ye"]),
      E(90, "The shared notebook", "Lu and the killer have learned from the same teacher.", ["ye", "geo"]),
      E(148, "Proof by contradiction", "The theorem collapses.", ["lu"]),
    ],
  },
  "lighthouse-at-the-end-of-every-door": {
    characters: [
      C("marlowe", "Marlowe Finch", "The Door-Walker", "Wanderers", "#fdf0d5", 1, "Opens doors the way other people open conversations — by accident."),
      C("ansel", "Keeper Ansel", "Lighthouse Keeper", "The Light", "#f4a259", 1, "Has loved her through ninety-nine lifetimes. Remembers every cup of tea."),
      C("cartog", "The Door Cartographer", "Map-Maker", "Unaligned", "#8fb4ff", 14, "Catalogs every door in every world. Has never walked through one."),
      C("wren", "Wren", "The Lighthouse Cat", "The Light", "#c3c8d4", 3, "Technically a cat. Has opinions about thirty-one worlds."),
    ],
    relations: [
      R("marlowe", "ansel", "love", 1, "Ninety-nine lifetimes. She leaves every dawn."),
      R("cartog", "marlowe", "mentor", 14, "Teaches her to read the grain of a door."),
      R("ansel", "cartog", "secret", 50, "The Cartographer once tried to break the loop."),
      R("wren", "marlowe", "ally", 3, "Sits on her lap at the exact moment she wants to leave."),
    ],
    timeline: [
      E(1, "The door behind the pantry", "Marlowe steps onto a snowy shore.", ["marlowe", "ansel"]),
      E(14, "The cartographer's catalog", "She learns there are thousands of doors.", ["cartog"]),
      E(50, "The first loop broken", "Ansel reveals who tried to end the cycle.", ["ansel", "cartog"]),
      E(72, "Door thirty-one opens inward", "For the first time, a door leads to her own kitchen.", ["marlowe"]),
    ],
  },
};
