# The story, and ideas for it

Notes from 2026-10-11 on. **Chapter Three, The Borrowed Hour, was built on 2026-10-16** (see docs/chapter-3-highcrest.md); what's below is the record of how the story was decided, and the ideas that weren't used.

## One game, three chapters

Logan's direction: one game with every chapter in it, and one save across them. **Chapters One and Two were combined on 2026-10-13** (one engine, a chapter select, a shared save; see the README). What's left of that goal is the third chapter, and anything that should carry between chapters:

- **Carried rewards.** The save has a `rewards` record that every chapter can read. The first is the **Cog Finder** (all ten of Chapter One's cogs, carried into Chapter Two). A Chapter Two save with all 12 cogs could start Chapter Three with your own watch.
- **Both chapters keep their saves** after the credits (Chapter One did not, until 2026-10-14), so Chapter Three can read what you did in either.
- **Design the third chapter as Chapter Three from the start**, on the hooks in `src/game.js`.

## The story so far: decided on 2026-10-14

Answers to the questions Chapters One and Two leave open. Chapter Three tells them; only the clues below are in the game so far.

- **The clocks are a network.** A first Clockmaker drew every great clock on skins so thin the sun shines through them, and keepers carried the drawings back in time to have the clocks built (Donald Eugene had Oren build the Tower; the tide folk were "handed the drawings"). The clocks lend each other time.
- **Why the tide went out.** The Tide Clock's heart (the pocketwatch) was carried inland generations ago, and the Tower kept the Tide Clock running without it. When the Tower stopped, that support broke; when Vivienne restarted it, the Tower took back what it had been lending, and the heartless Tide Clock ran down.
- **Why the Tower stopped.** Someone has been borrowing hours from the clocks to stay alive, more than a little, and Hollowmere's Tower ran dry first. This is Chapter Three's problem. The borrower is a new character (perhaps Michelle's own master), written as someone you understand.
- **The Lost Cogs.** Donald Eugene's whole parts tray spilled across time the day the Tower stopped and the ages came loose. That is why his cogs turn up in every age of both places. (In the Chapter Two ending.)
- **The Wardens** were built by the first Clockmaker. One wakes in the age after its clock fails and guards what is left (the Escapement Key, the Dusk Bell). Not yet hinted in the game.
- **Michelle the Wise** is Donald Eugene's old master: the keeper of the watch before him ("her master before her"), and the traveler who gave the tide folk their drawings. She is not the borrower. Donald Eugene believes she has been gone for decades; she keeps out of his way. She moves through time out of order ("You are early. Or I am late."). Clue in the game: in Chapter Two she asks whether the watch "*still* runs backward".
- **Chapter One's powers.** The seal ring, the lens and the escape wheel went into the Tower's heart to mend the Chronoheart (Donald Eugene says so in Chapter Two). Getting any of them back in Chapter Three means going back to the Tower.

### Decided on 2026-10-16

- **Vivienne is the first Clockmaker.** The traveler in odd clothes, the small strange boot prints at the Tide Well, and Donald Eugene's "Not yet, perhaps" were all her. The chain of masters is a loop: Vivienne in the oldest age teaches the first keeper, and the craft is handed down through Michelle to Donald Eugene, who teaches Vivienne. Nobody invented it; it was lent around a circle.
- **The borrower is Sir Christopher**, Donald Eugene's first apprentice, long before Vivienne, who was corrupted. He has been borrowing hours from the clocks, and Hollowmere's Tower ran dry first. (This replaces "perhaps Michelle's own master".) **He recognizes Vivienne the moment he sees her; she has no idea who he is.** Still open: what corrupted him, and why he knows her face (he has lived long enough to have met her in the oldest age, as the first Clockmaker?). Donald Eugene has never mentioned another apprentice, which could become a clue in the first two chapters.
- **Why Sir Christopher went wrong (decided 2026-10-16, kept gentle: this is a game for kids).** He was Donald Eugene's first apprentice and his best friend. Their happiest hour was a midwinter night at the observatory, everyone together under the stars. Then things changed, as things do: Donald Eugene grew up and moved on, and when the time came he gave the watch to someone else, because a keeper has to let time go forward and Christopher never could. Hurt and proud, Christopher kept that one golden hour instead, borrowing time from the clocks to replay it, and a little more each year to keep himself from changing too. He is grumpy and grand rather than wicked: he hoards hours the way a dragon hoards gold. Nobody dies. The sadness is only that things end, and the answer Vivienne brings is that endings make room for new things. (Idea to try: the chapter's Golden Hour age is his borrowed hour, the sunset that never quite sets; the Stopped Age is what the world becomes if he gets his way and nothing ever changes again.) The ending can bring the two old friends back together.
- **Chapter Three's shape (decided 2026-10-16).** The place is **Highcrest**: the mountain, its little town and the observatory. Powers: the **Lantern** (a carried bubble of another age, whose floors and ice are real inside it) is the new one, and **Echoes** come back for the final ascent (an echo can hold the Lantern). Donald Eugene **climbs the mountain anyway** for the reunion, slowly, with Zach and Megan "helping". Lost Cogs and three favors, as in the other chapters.
- **The player decides the true ending.** The last era shift is a choice of the age Vivienne lives in, and no choice is marked as the right one. Choosing the oldest age is the one that closes the loop.
- **The setting has to wow.** A mountain observatory above the clouds, with Hollowmere and Saltwick far below, a different sky in each age (aurora night, golden hour, a strange near moon), the summit as the first clock (a sundial whose shadow sweeps the cloud sea), and ages leaking into each other. A visual test of it comes first, before any story or puzzle work.

### Decided on 2026-10-18 (after Logan played all three chapters)

- **The wise woman is a mystery until the very end.** In every chapter she is only the **Mysterious Stranger**: she never gives her name, she is cryptic, and she never says she is an echo. She is Lyra, sending echoes of herself across the years to help Vivienne so that Orin can let go and accept that things end. The only clue is the time lens: look at her through it and she flickers blue, like an echo. In Chapter Three the memory under the orrery only makes Vivienne think she has heard that voice before. Vivienne recognizes her at the reunion, when the real Lyra steps out of the Observatory.
- **The Orin fight happens at the End of Time:** he takes Vivienne from the Needle to a ruined throne room of black marble with gold in its cracks (kintsugi), with nothing outside it. His throne is against the far wall.
- **Nobody up the mountain knows about time travel.** Townsfolk like Bram only know old songs (a warm spring before the ice, falls that froze into a stair).
- **Hearts carry between chapters:** each favor's heart from an earlier chapter is added in the later ones.

**Note on the Chapter Three pitch below:** its main power, Echoes, already exists in Chapter One (the Echo Gallery). A Chapter Three echo has to be clearly more than that, or the main power should be something else.

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
