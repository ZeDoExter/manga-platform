import type { Mood } from "@/lib/types";

/** Hand-written chapters for the Top-10 novels. Chapter 1 reads in order; later chapters remix scenes. */
export const NOVEL_POOLS: Record<string, string[]> = {};

/** Mood-flavoured filler for every other prose title. */
export const MOOD_POOLS: Record<Mood, string[]> = {
  dread: [
    "The hallway was longer than it had been yesterday. Nobody said so. The lights hummed a half-tone flat, and the shadows under the doors seemed to lean toward whoever walked past, listening.",
    "There are silences that are simply the absence of sound, and silences that are somebody holding their breath. This was the second kind. She realized, with the slow cold of a dropped coin, that it was holding its breath for her.",
    "“It's only the pipes,” he said, which is what people say in the minute before the pipes start whispering names.",
  ],
  rain: [
    "Rain had been falling since morning, the thin patient kind that wears a city down to its quiet. The windows blurred; the streetlamps spread themselves into soft gold blots. Everything felt like a memory of itself.",
    "She held her cup with both hands and listened to the gutters. Somewhere in that steady percussion she thought she could hear the tune her mother used to hum — the one she could never quite remember when the sun was out.",
    "“Stay until it stops,” he offered, which both of them understood to be a promise with no end date.",
  ],
  neon: [
    "The signs buzzed over the wet street in every color a lie could be: pink for promises, cyan for contracts, a sick green for debts. He walked through them with his collar up, a silhouette passing through other people's advertisements.",
    "Nothing in the district was quite what it claimed to be. The noodles weren't noodles, the bank wasn't a bank, and the drone circling overhead had been listening to their conversation for at least four blocks.",
    "“Run the numbers again,” she said. “If the odds are that bad, it must be our kind of job.”",
  ],
  ember: [
    "The fire had burned low but not out; embers pulsed in the grate like a slow heart. Beyond the walls, the camp was settling into its uneasy sleep, and every sound of the night felt like a decision about to be made.",
    "He turned the old blade over in his hands. It had never been a symbol, not to him — just a weight that kept his shoulders honest. But the others had begun to look at it differently, as if it were already a legend and he merely the man holding it.",
    "“We ride at dawn,” she said. “Whoever's still afraid by then can ride at noon.”",
  ],
  petal: [
    "Petals drifted past the open window and settled on the table among the teacups. Nobody brushed them away. It was the sort of afternoon that made small kindnesses feel inevitable.",
    "She laughed, and the sound surprised her — it had been a while. The laugh went out across the courtyard and came back changed, lighter, as though even the air wanted to join in.",
    "“Next spring,” he said, “remind me I said this was our best one.”",
  ],
  calm: [
    "The morning arrived without hurry. Steam rose from the kettle, the cat rearranged herself on the windowsill, and for a while nothing in the world was required of anyone. It felt like a small, borrowed eternity.",
    "He sat with the ledger open and did not write. Some days the work was in the doing; other days it was in allowing the day to be exactly as long as it was. Outside, the market slowly woke up.",
    "“There's no rush,” she said. “The tea will wait. So will the rest of it.”",
  ],
  stars: [
    "The sky that night was a spill of cold light, so many stars that the dark between them seemed to be the thing doing the shining. She lay back in the grass and felt the planet turn, slow and enormous, beneath her spine.",
    "Somewhere beyond the ridge a train whistled — a long, low note that belonged to no timetable. He listened until it faded, and was almost sure it had been a name.",
    "“If we're lost,” she said, “at least we're lost in a beautiful place.”",
  ],
  tide: [
    "The tide came in the way it always did: first a rumor along the sand, then a certainty. Water slid up the stones, turned over the shells, and carried a little of the shoreline away with it, politely, as if borrowing it.",
    "The boat rocked once and settled. Far out, the horizon had gone the color of old brass, and the gulls were arguing about it. Everything smelled of salt and wet rope and the promise of somewhere else.",
    "“Sea doesn't care where we're going,” he said. “It just wants to know we're coming back.”",
  ],
  snow: [
    "Snow fell without sound, softening every edge of the town until the rooftops looked like a drawing someone had decided to erase gently. Lamps came on one by one, each a small, stubborn argument for warmth.",
    "Her breath hung in front of her like a sentence she hadn't finished saying. The night was so quiet she could hear the snowflakes landing — a faint, endless whisper of beginnings.",
    "“Come inside,” he said. “The kettle remembers you.”",
  ],
};
