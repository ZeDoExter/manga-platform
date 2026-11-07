import type { Mood } from "@/lib/types";

/** Hand-written chapters for the Top-10 novels. Chapter 1 reads in order; later chapters remix scenes. */
export const NOVEL_POOLS: Record<string, string[]> = {
  "the-ninth-bell": [
    "Hallowmere Academy kept time with eight bells. The first woke the dormitories at six; the last, at ten, sent the lamps out one by one down the long stone corridors. Every student could recite them in their sleep — dawn, lessons, noon, lessons again, tea, supper, study, hush. Eight bells, and in the gaps between them, a silence the older girls pretended not to hear.",
    "Sayo Minato counted the silence on her first night. It lasted exactly forty-one seconds after the eighth bell, and it was not empty. It was the shape of something waiting for its turn.",
    "“You'll get used to it,” said the girl in the next bed, not looking up from her book. “Everyone does.” She had a way of speaking as though each word were a coin she meant to spend carefully. Her name was Kiri Asaba, and she kept a pressed camellia in the spine of every novel she read.",
    "Rain began at seven the following evening and did not stop. By supper the courtyard was a mirror, and the great bell in the clock tower — the one the school called the *Dean*, because it hung in judgment over everything — dripped like a sleeping animal. Sayo watched it from the refectory window. Somewhere beneath her ribs, a number settled into place: nine.",
    "At ten o'clock the eighth bell rang. Sayo counted the silence. Forty-one seconds. Forty-two. Forty-three. And then, from the tower, a sound that was not a sound: a low note she felt in her teeth, as if the air itself had been struck. Every lamp in Hallowmere flickered once, like an eyelid.",
    "---",
    "In the morning, the bed beside hers was made with military precision. There was no book on the pillow, no camellia in its spine. When Sayo asked the housemistress where Kiri had gone, the woman's smile did not falter. “Dear,” she said gently, “there has never been anyone in that bed.”",
  ],
  "the-starless-tailor": [
    "The shop on Needle Row had no sign. Odalys Quill considered signs a form of begging, and in any case the people who needed her always found the door. It was a narrow place, all bolts of cloth and the smell of steam, with a single window that faced a sky the color of a bruised plum. The stars had gone out ninety years ago. Nobody had told the tailors to stop sewing for them.",
    "On the morning the stranger arrived, Odalys was hemming a child's winter coat. Her needle was bone; her thread was nothing she had ever bought. As she drew it through the wool she felt the familiar tug — a faint tightening somewhere behind her sternum, like a stranger plucking a string she hadn't known she had. Someone, somewhere, was about to change their mind.",
    "“I need a coat,” said the man in the doorway. He was soaked through, and he held himself like someone carrying an invisible piano. “The kind you can wear into a war,” he added, “and out of one.”",
    "Odalys looked him over the way a baker looks at flour. “Sit,” she said. “Tea first. Measurements after. Fate takes longer.”",
    "She took his measurements in silence: the span of the shoulders, the length of an arm that had held too many swords. With every number, the thread in her fingers hummed louder. By the time she reached his wrist she knew three things. He would not live to see the coat finished if she sewed it honestly. He would not forgive her if she sewed it any other way. And behind her, in the shadows between the bolts of silk, something that had been dead for forty years had begun, very softly, to laugh.",
    "---",
    "“Mr. Fennick,” Odalys said without turning around. “Put the kettle on.” The kettle, to everyone's mild alarm, obeyed.",
  ],
  "tidebound-cartographers": [
    "The sea remembered streets. That was the first rule of the Cartographers' Guild, painted in flaking white across the prow of the *Marginalia*: *the water forgets nothing and forgives less.* Captain Ysolde Marr read it every dawn, the way other captains prayed.",
    "Below the hull, forty fathoms of green silence hid the skyline of what had once been Lisbon. Sable, the crew's diver, swore she could still hear trams. Tobias, the navigator, swore Sable was lying. Ysolde let them argue; arguments kept the crew awake, and wakefulness kept them alive.",
    "“Depth reading's wrong,” Tobias said, squinting at the brass sounding-line. “We're over a canyon that isn't on any chart.” “Then it isn't on any chart *yet*,” said Ysolde, and unrolled a fresh sheet of vellum. A cartographer's whole religion could be summed up in that sentence.",
    "She drew the first line at sunrise: a trembling coast of ink, hesitant, then sure. Beneath the boat, something large turned over in its sleep, and the water shivered all the way to the horizon.",
    "---",
    "That was when the singing began. It rose from below — not a voice but a hundred voices, stacked and strange, voices that had learned to sing underwater and forgotten what air was. Sable pulled off her goggles. “That,” she said very quietly, “is not a tram.”",
    "The map in Ysolde's hands began, impossibly, to draw itself.",
  ],
  "lighthouse-at-the-end-of-every-door": [
    "The door behind the pantry had always been painted shut. Marlowe discovered this the same way she discovered most things — by needing a jar of pickled plums at eleven at night and leaning on the wrong wall.",
    "It opened inward, onto snow. Not cold, exactly — the kind of snow that fell as though politely asking permission. Beyond it lay a black shore, a silver sea, and a lighthouse so tall it seemed to hold up the stars.",
    "“You're late,” said the man at the top of the stairs. He said it without anger, the way you might say *good morning* to someone you'd said it to ten thousand times. His coat was patched at the elbows. His eyes were a color Marlowe could only describe as *lamplight, remembered.*",
    "“I think,” Marlowe said carefully, “you have me confused with someone else.” “No,” said the keeper. “I have you confused with everyone you've ever been. It's a very long list. Come in. The kettle's on.”",
    "His name was Ansel, and he had kept the light for ninety-nine lifetimes. In every one, he explained, a door opened somewhere in the world and a woman stepped through it with a jar of something ridiculous in her hand. In every one, she left by morning, forgetting. “Tonight,” he said, “I'd like to try something new. I'd like to ask you to stay.”",
    "---",
    "Behind her, the pantry door swung quietly shut. When Marlowe turned to look, it was no longer a pantry door. It was thirty-one doors, and every one of them was glowing.",
  ],
};

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
