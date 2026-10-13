# Ideas for what comes next

Notes from 2026-10-11, after Chapter Two (then a separate game, Chronoheart II) was finished. Nothing below is decided or built unless it says so.

## One game, three chapters

Logan's direction: one game with every chapter in it, and one save across them. **Chapters One and Two were combined on 2026-10-13** (one engine, a chapter select, a shared save; see the README). What's left of that goal is the third chapter, and anything that should carry between chapters:

- **Carried rewards.** The save already records which chapters are finished and keeps each chapter's cogs. Nothing reads across chapters yet: a Chapter Two save with all 12 cogs could start Chapter Three with your own watch.
- **Chapter One keeps nothing.** Its slot is cleared at the credits. If the third chapter wants to know what you did in Hollowmere (cogs, favors), Chapter One needs to keep a summary.
- **Design the third chapter as Chapter Three from the start**, on the hooks in `src/game.js`.

## Chapter Three

### Top pick: *The Borrowed Hour*

- **Echoes (the main power).** Record a few seconds of action, then an echo of yourself replays it while you do something else: she holds the gate while you run through, or rings the Past bell while you ring the Future one. Game one let you move between ages, game two let you move yourself backward, and the third step is working alongside yourself. It is also cheap to build, because Rewind already records your path, and an echo is that recording played forward.
- **Setting.** A mountain observatory town, above the valley of Hollowmere and the harbor of Saltwick. The ages have started leaking into each other, so a street might be Present with a patch of Past in the middle of it.
- **The lantern (second power).** The time lens made physical. It casts a bubble of another age around you, and inside it that age's floors and walls are solid. A bridge that only exists in the Past becomes something you carry across a gap, and an echo can hold the lantern for you.
- **Story.** Who built the clocks. The watch in Saltwick pulled toward an older clock, so there is a first one, and a Clockmaker who is still alive in some age and borrowing hours from the others to stay that way. Written as someone you understand, not a villain you defeat.
- **Ending.** It closes the trilogy by giving time travel up. You stop the first clock, the ages seal, and your last era shift is a choice of which age Vivienne lives in. The post-game is that age, permanently.

If only two things survive from this pitch, they should be Echoes and the ending.

### Alternatives

- **The Long Garden.** A slower game built on cause and effect: plant in the Past, harvest in the Future, divert a stream and watch a town grow or fail. The least action and the most visible world change.
- **The Rival.** Someone else has a Chronoheart and is changing the Past while you play, so the Present rearranges under you. The most dramatic option, and the hardest to make fair.

### Smaller ideas that fit any of them

- **Open structure.** A hub with three objectives you can do in any order, instead of one long road east.
- **A fourth age.** A brief, strange "before the clocks" where none of your powers work.
- **Townsfolk who age.** You meet the same person as a child, an adult and an elder, and favors done for one pay off with another.
- **Carried saves.** A Chapter Two save with all 12 cogs starts you with your own watch.
- **A photo mode for the time-lapses.**
