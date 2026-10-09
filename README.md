# Chronoheart

**A time-travel puzzle adventure in one valley, three ages.**

Master Donald Eugene, the clockmaker of Hollowmere, has vanished, and the great Clocktower has stopped for the first time in five hundred years. His apprentice, Vivienne, finds his amulet, the **Chronoheart**, and with it the power to step between three versions of the valley:

| Age | What it looks like | Its colour |
| --- | --- | --- |
| **Past** (the Ancient Age) | sandstone temples, jungle, a young river | amber |
| **Present** (the Medieval Age) | timber houses, cobbled streets, a stopped Clocktower | pale blue |
| **Future** (the Age of Chrome) | neon towers, drones, overgrown steel | magenta |

The valley is one long road, built three times. What you do in one age carries forward into the later ones: plant an acorn in the Past and climb the oak in the Present; divert a spring and find a millpond three centuries on. To restart the Clocktower you need the three **Era Keys** (one from each age) and the **Escapement Key** that opens the Tower's great lock.

Every world, sprite, melody and sound in the game is generated from code: there are no image or audio files.

**Play it:** <https://claude.ai/artifact/YWkr7LD2mZFyBrttFnLMgW>

---

## Contents

- [How to play](#how-to-play)
- [Controls](#controls)
- [Running it locally](#running-it-locally)
- [Walkthrough](#walkthrough) *(spoilers)*
- [All 10 Lost Cogs](#all-10-lost-cogs) *(spoilers)*
- [Favours](#favours) *(spoilers)*
- [Secrets](#secrets) *(big spoilers)*
- [Project structure](#project-structure)
- [Publishing the live page](#publishing-the-live-page)

---

## How to play

- **Travel through time.** Once you have the Chronoheart, you can switch to the era before or after the one you're in. The amulet's ring **drains while you're in the Past or Future** (about 10 seconds) and recharges in the Present. If it runs out, you're pulled back to the Present.
- **You can't switch into something solid**, or over a drop with nothing to stand on: the amulet shakes and refuses. Move a little and try again.
- **Peek** at another era without travelling: hold `Tab` (or hold the amulet dial on touch).
- **After a switch you get a moment's grace**: for 1.5 seconds nothing can hurt or spot you.
- **Hearts:** you start with 5. Each finished favour adds one. Water and hazards cost a heart and put you straight back on solid ground.
- **Clock shrines** are checkpoints. Walking past one saves your progress and heals you. The game also saves after every important step (in your browser's local storage).
- **The Menu** (`I`, or the ☰ button) shows your current goal, a **Hint** if you're stuck, your items and your favours. The game pauses while it's open. A short message pops up whenever your goal changes.
- **Lost Cogs** are optional collectibles: 10 in all. Find them all for a bonus line in the ending.

### Abilities you pick up along the way

| Ability | Where | What it does |
| --- | --- | --- |
| **Stasis Seal** | Donald Eugene's satchel at Tamsin's Crossing (Present) | Hold something in its moment, so it stays exactly the same in every later age. Things that can be sealed shimmer with pale light; stand beside one and a **Seal** prompt appears. |
| **Echo** | Donald Eugene's lectern at the Echo Gallery (Present) | Record up to 5 seconds of your own movement. Your echo replays it on a loop, forever. Present only, up to 3 echoes at once (a 4th replaces the oldest). Stand on an echo and press **Interact** to dispel it. |

---

## Controls

### Keyboard

| Key | Action |
| --- | --- |
| `A` `D` | Move left / right |
| `W` `S` | Move into / out of the scene; climb ladders and vines |
| `Space` | Jump (hold for a higher jump); swim upward |
| `Shift` | Sprint |
| `C` | Dodge-roll |
| `X` | Swing your wrench |
| `F` | Interact: talk to people, use things |
| `Q` / `E` | Travel one era back / forward |
| `Tab` | Hold to peek at another era (`Q`/`E` choose which) |
| `R` | Stasis Seal *(once learned)* |
| `V` | Echo: start / stop recording *(once learned)* |
| `I` | Menu: goal, hint, items, favours |
| `G` | Open the Menu with the hint showing |
| `H` | Controls |
| `Esc` / `P` | Pause |

### Touch (phones and tablets)

On-screen controls appear automatically on touch screens.

- **Joystick:** touch anywhere on the left half and drag. Push all the way to sprint.
- **Buttons:** Jump, Attack, Roll, and **Interact** (it lights up when there's someone to talk to or something to use). **Seal** and **Echo** appear once learned; Seal only lights up beside something sealable.
- **Swipe** anywhere else: left to travel toward the Future, right toward the Past. Drag slowly to preview first. You can also tap the era names at the top.
- **Top-right:** Menu, Help and Pause.
- It plays best in landscape, but portrait works too.

---

## Running it locally

You need [Node.js](https://nodejs.org/) 20.19+ or 22.12+ (what Vite 8 requires).

```bash
npm install
npm run dev      # dev server with hot reload, usually http://localhost:5173
npm run build    # production build into dist/
npm run preview  # serve the production build
```

The only runtime dependency is [three.js](https://threejs.org/). The build tool is [Vite](https://vitejs.dev/).

Handy for debugging: the game object is exposed as `window.__game` in the browser console.

---

## Walkthrough

> **Spoilers ahead.** The in-game **Hint** (Menu → Hint, or `G`) gives the same answers one step at a time.

The road runs west to east. Each area below lists what you need and how to get it.

### 1. Hollowmere Square

- In the **Present**, go into **Donald Eugene's workshop** at the west end and examine the **workbench**. You get the **Chronoheart** and Donald Eugene's note: find the three Era Keys and restart the Tower.
- Elder Karen Louise (Present) has advice about the river, and a favour (see [Favours](#favours)).

### 2. The Old Ford

- The river is too deep to cross in the Present and the Future.
- Switch to the **Past**: stepping stones cross the river.

### 3. Sandstone Cliffs

- In the Present, a cliff blocks the road. Old water stains run down it.
- In the **Past**, pull the **lever** by the temple. A spring starts to trickle down the cliff, and a time-lapse shows it wearing a tunnel through the rock over 600 years.
- Walk through the tunnel in the **Present**.

### 4. Rampart Row

- The town wall is too high to climb.
- **Megan the Squirrel** (Present) is guarding an acorn on top of the crate stack. Take it. (Zach Tiberious's planting advice is... not to be trusted.)
- Then plant it, one of two ways:
  - **In the Past**, in the fertile soil by the wall: it grows into a huge oak in the **Present**. Climb it to get over the wall.
  - **In the Present**, in the planter box: it grows into a giant petrified tree in the **Future**. Climb that instead.
  - Either way, look for a Lost Cog out on the tree's branch.

### 5. Smithy Lane: the Bell Hammer (Era Key of the Present)

- **Aria the Smith** (Present) gives you the Tower's **cracked bell hammer**. Star-iron needs a lifetime to temper.
- Seal it in her **quench vault**. A time-lapse shows three hundred years of tempering.
- In the **Future**, Aria's forge is now **Lillian's repair shop**. The finished **Bell Hammer** rests on her display case: pick it up.

### 6. The Sun Terrace: the Sun Disc (Era Key of the Past)

- The terrace is too high to climb in any age.
- In the **Past**, push the **carved block** onto the **glowing foundation outline** beside the terrace. (Use the rewind glyph nearby if you push it into a corner.) A time-lapse shows a **pillar** built on that foundation.
- In the **Present**, climb **bench → pillar → terrace**.
- Go to the **Past** on top of the terrace: the **Sun Disc** sits on the dark stone dais.

### 7. The Gatehouse: the Fusion Core (Era Key of the Future)

- In the Present, the road beyond the gatehouse is buried under rubble.
- In the **Future**, a security corridor runs through to a vault. Get past the two drones, and hop onto the vault pedestal for the **Fusion Core**.
- The **postern lever** just past the vault (Present) opens a passage back west, in case you missed anything.

### 8. Millrace Hollow

- A dry hollow with a cliff too high to climb on the far side.
- **Past:** a spring falls off the cliff and drains away down a gully. Push the **boulder** into the glowing gully mouth. A time-lapse shows the hollow filling into a millpond.
- **Present:** the pond is shallow, because it drains out through the mill's open **sluice**. Its wheel was sold off generations ago (Hobb the Miller will tell you).
- **Future:** the mill is a pumping station. The old **brass sluice wheel** is in its little museum by the road, with a drone guarding it.
- **Present:** fit the wheel to the sluice on top of the dam. The pond fills to the brim, and the mill's **log boom** floats up level with the banks. Hop across the logs (don't fall in: the water is deep).

### 9. Tamsin's Crossing

- A gorge with a river far below.
- **Present:** look in the reeds on this bank for **Donald Eugene's satchel**. It teaches you the **Stasis Seal**.
- **Past:** **Tamsin the Ropewright** wants to bridge the gorge, but her vine rope always rots.
- **Future:** a scrapyard on this bank has a spool of **steel cable** (drone nearby). Bring it to Tamsin, and she builds the bridge.
- The bridge rots away within a century. Stand by it in the **Past** and use the **Stasis Seal**: it now exists, unchanged, in every age.
- The far bank is a jungle cliff in the Past and a **city wall** in the Present, but only **rubble** in the **Future**. Cross in the Future, hop the rubble, then switch back to the Present once you're past the wall.

### 10. The Echo Gallery

Everything here happens in the **Present**: the gates, the steps and your echoes. In the Past and the Future the gate section is solid wall. You can keep **3 echoes** at once, and recording a 4th makes the oldest fade, so plan which ones you still need.

- **Donald Eugene's lectern** by the entrance gives you the **Echo**.
- **The gold gate** stands open only while the **gold button** is held. Stand on the gold button and record an echo standing still: it holds the gate open for you.
- **The green airlock** is two gates worked by one **green button**. The first (solid green band) is open while the button is held; the second (dashed band) only while it's **not**. Record an echo that stands on the green button for about two seconds and then steps off for two. Walk through the first gate while the echo is on the button, wait in the gap, and go through the second when it steps off.
- **The wall:** three stone steps rise out of the floor up a 4-high wall. Each step is raised by a **row of three buttons**. The dots beside each button show its number (1, 2, 3). A button only lights if the one before it is lit, and stays lit for a few seconds after you step off. The step stands while its **whole row** is lit.
- So: stand on button 1, start recording (`V`), walk the row 1 → 2 → 3 and back, and stop recording. Your echo keeps walking the row, and the step stays up.
- Do this for the ground row (step 1), then the row **on** step 1 (step 2), then the row **on** step 2, which runs the other way (step 3). Then climb up the steps onto the gallery.
- Your gate echoes will fade as you record the row echoes. That's fine: you're past the gates.
- At the top you kick down a rope ladder, and the gates stay open for good, so the way back never needs echoes again.

### 11. The Warden's Courtyard: the Escapement Key

- The **Clocktower door** is locked in every age. Its great lock has **four keyholes**: one for the Escapement Key, and three shaped like the Sun Disc, the Bell Hammer and the Fusion Core. Only the **Present's** lock still turns: in the Past it hasn't been made yet, and in the Future it has rusted solid.
- The **Escapement Key** lies in the **Future** courtyard, guarded by **the Warden**. It patrols a loop around the key, pausing at each corner to turn. Its **sight cone** is painted on the ground: yellow while it patrols, red once it has spotted you.
  - Stay out of the cone. **Pillars block its view.**
  - If it spots you, it winds up and charges. Break line of sight behind a pillar, or **switch to another era** to lose it.
  - If it catches you, you lose a heart and it throws you out to the courtyard gate.
  - In the Present, the key's spot is **inside a fountain**, so you can't just pop into the Future on top of it. You have to cover the last stretch in the Future, and walk clear of the fountain's footprint before switching back.
  - **Tip:** walk most of the way in the **Present** (there's no Warden there). Wait beside the fountain until the Warden's cone points away from you, then pop into the Future, take the key, step back clear of the fountain and switch back.
- With all four keys, open the door in the **Present**. You keep the three Era Keys: the Tower needs them inside.

### 12. The Clocktower

The finale is a climb. Each Era Key goes in higher up, in a different age, using a different power. There's no timer, and placed keys are saved.

1. **The Sun Disc (Past): wake the Tower.** The Sun pedestal stands on a high ledge just inside the door. Nothing reaches it in the Present or the Future, but in the **Past** an ancient stair still climbs to it. Place the disc and the Tower lurches awake: its great gears begin to turn, and the **piston** gets power.
2. **The Bell Hammer (Present): ride the piston.** The bell hangs in the belfry, 12 blocks up. Beside it, the great piston rises only while its **brass button** is held, and sinks when it's released. Record an **echo** that waits beside the button for a few seconds and then stands on it. Stand on the piston's base while it's down, ride it up, and step onto the belfry.
3. **The Fusion Core (Future): seal and climb.** The reactor deck is above the belfry, but only in the **Future**, where the old wooden belfry floor has rotted away. Stand on the belfry in the Present and use the **Stasis Seal**. Then switch to the **Future** and climb the gantry to the reactor.

Every key you place makes the Tower lurch, its gears turn faster, and its time-stutter flare. Then enjoy the ending.

---

## All 10 Lost Cogs

> **Spoilers.** The counter in the top-left shows how many you've found.

| # | Area | Age | Where | Needs |
| --- | --- | --- | --- | --- |
| 1 | Hollowmere Square | **Past** | On top of the three sandstone steps east of the camp. | — |
| 2 | Hollowmere Square | **Present** | On top of the crate stack at the east end of the square. | — |
| 3 | Hollowmere Square | **Future** | On the third of the floating steps east of the plaza. | — |
| 4 | Sandstone Cliffs | **Past** | On top of the sandstone steps beside the temple. | — |
| 5 | Sandstone Cliffs | **Future** | At the bottom of the flooded pit beside the cliff: swim down for it. | The spring opened in the Past |
| 6 | Rampart Row | **Present** or **Future** | On the tree's branch, up level with the top of the town wall. Planted in the Past: the oak's branch in the **Present**. Planted in the Present: the petrified tree's branch in the **Future**. Climb the ladder up the trunk. | The acorn planted |
| 7 | Rampart Row | **Future** | At the foot of the tree by the wall, among its roots. | The acorn planted (either age) |
| 8 | The Sun Terrace | **Past** | On top of the terrace, at its front-right corner. | Getting up the terrace |
| 9 | Millrace Hollow | **Future** | On a lone pontoon one hop off the log boom, on the reservoir. | The sluice closed |
| 10 | The Clocktower | **Present** | Up in the belfry, beside the great bell. | Riding the piston (after the Sun Disc) |

---

## Favours

Three optional side quests. Each completed favour gives you **+1 heart** (and some nice moments). The Menu tracks the ones you've heard about.

| Favour | Starts with | What to do |
| --- | --- | --- |
| **Samaria's star chart** | Samaria the Sun-Keeper (Past, Hollowmere Square) | A storm carried off her star chart. In the **Future**, **TICK** the archivist robot has it in the archive: ask about it and borrow it. Bring it back to Samaria in the Past. |
| **Karen Louise's sun-lilies** | Elder Karen Louise (Present, Hollowmere Square) | Golden sun-lilies grew in the square in the oldest days. In the **Past**, gather seeds from the wild flowers at the front of the square, then plant them in Karen Louise's empty **flower bed** in the Present. |
| **Lillian's keepsake** | Lillian (Future, Smithy Lane) | Lillian has nothing her ancestor Aria ever held. After you've left the hammer in Aria's vault, tell **Aria** (Present) about Lillian: she gives you her **medallion**. Bring it to Lillian. |

---

## Secrets

> **Big spoilers.** Michelle the Wise drops the only hint, in her very first conversation.

### Donald Eugene's hideaway (Rampart Row)

Michelle the Wise mentions that your master "kept a room in the oldest age, behind a door no one would ever think to knock on." While he hopped between the ages trying to fix the Tower, Donald Eugene needed somewhere to rest.

In the **Past**, look closely at the houses along the back of **Rampart Row**. One door looks just like the others, except for a tiny **brass gear** pressed into the wood above the latch. Stand right in front of it and **knock**. Inside is his secret workshop, and on the workbench, the **Everspring**: a mainspring that never runs down. Fit it to the Chronoheart and its ring turns gold and **never drains again**, so you can stay in any age for as long as you like.

Michelle's hint, at the Old Ford: *"Before Hollowmere had any walls, they say the smiths drew their water from a spring that never once ran dry."*

---

## Project structure

```
index.html              the page: HUD, dialogue box, menus (all HTML/CSS over a WebGL canvas)
src/
  main.js               start-up, title screen, the pause / Controls / Menu overlays
  game.js               the game: modes, era shifting, the amulet meter, saving, time-lapses, the ending
  abilities.js          the Stasis Seal, the Echo, and the Echo Gallery's gates, buttons and steps
  objectives.js         the goal and hint for wherever you are and whatever you've done
  story.js              items, favours, all dialogue, and every interaction
  core/                 input (keyboard + virtual keys), small utilities
  levels/hollowmere.js  the whole valley in all three ages: layout, features, spawns, cogs
  world/                voxel world and collision, physics, entities (player, NPCs, enemies, the Warden...)
  render/               renderer, post-processing, procedural textures and sprites, water, foliage, particles
  audio/                procedural music (one layer per age) and sound effects
  ui/                   HUD and dialogue, touch controls, styles
```

### How the level works

The valley is a voxel grid **306 units long**, built once for each age by `src/levels/hollowmere.js`. Things that change with your actions (the eroded cliff, the oak, the bridge, the millpond...) are **features**: small builders keyed on save flags, rebuilt whenever those flags change. Time-lapses grow or drop those features into place.

| x range | Area |
| --- | --- |
| 0 – 37 | Hollowmere Square |
| 38 – 51 | The Old Ford |
| 52 – 78 | Sandstone Cliffs |
| 79 – 104 | Rampart Row |
| 105 – 129 | Smithy Lane |
| 130 – 156 | The Sun Terrace |
| 157 – 181 | The Gatehouse |
| 182 – 206 | Millrace Hollow |
| 207 – 229 | Tamsin's Crossing |
| 230 – 253 | The Echo Gallery |
| 254 – 283 | The Warden's Courtyard |
| 284 – 305 | The Clocktower |

---

## Publishing the live page

The live game is a single self-contained HTML page (a claude.ai artifact), not the `dist/` output. It's assembled like this:

1. Build the game code **unminified**, with `three` left external, as one ES module.
2. Inline `src/ui/style.css` into a `<style>` tag, and copy the `<main id="app">…</main>` markup from `index.html`.
3. Add an import map that loads `three` (and `three/examples/jsm/`) from jsDelivr, version 0.186.0.
4. Add the module script, starting with `document.body.dataset.era = 'present';`.

Smoke-test the assembled page locally (serve it, start a new game) before publishing.
