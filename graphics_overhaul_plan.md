# Graphics Overhaul: Lumina-style HD-2D

## What makes Lumina look detailed (and Chronoheart not yet)

![Lumina reference](/Users/logandisch/.gemini/antigravity-ide/brain/3322b011-5b03-4b16-b25a-73fd96a9cf9d/scratch/lumina/emberfall-golden-hour.jpg)

| Lumina technique | Chronoheart today |
|---|---|
| Every surface wears a **16 px-per-unit pixel-art texture**: cobbles, grass, plaster, timber, roof tiles, rock strata. Hue-shifted colour ramps, NEAREST filtering. | Flat single-colour cubes |
| **Normal maps** generated from each texture's height field, so the pixels catch the light | None |
| Baked **ambient occlusion**, plus grass lips that hang over cliff edges | One darken step |
| Dense **instanced grass tufts and flowers** that sway in the wind | None |
| Tree canopies built from **leaf-clump cards** that cast dappled shadows | Leaf cubes |
| **Diorama camera**: 28° FOV, ~32° pitch, far away | 30° FOV, low pitch |
| **Lit sprite billboards**: wrap lighting, rim light from lanterns, blob contact shadows | Unlit-ish sprites |
| **Post stack**: bokeh DOF, soft-knee bloom, film grain, slight chromatic aberration, warm/teal grade, god rays | Tilt-shift blur, bloom, grade |
| **Water**: animated pixel ripples, shore foam, depth tint | Translucent box |

> [!NOTE]
> The Lumina repo has **no licence file**, so it isn't open-source licensed. I'll re-implement the techniques in my own code and won't copy its source.

## Approach (gameplay untouched)
The voxel collision grid, puzzles, features and entities stay exactly as they are. Only the **render path** changes.

### 1. Pixel texture library — new `src/render/textures.js`
- A `PixelCanvas` helper with seamless fbm noise, Voronoi, and hue-shift ramps (dark → cool/purple, light → warm/yellow).
- About 24 generated tiles, each with a colour map, a height-derived normal map, and an optional emissive mask:
  - **Past:** sandstone blocks, carved glyph stone, sand, jungle grass, mud brick, palm bark.
  - **Present:** meadow grass top, grass-side with a hanging lip, cobblestone, dirt, plaster, timber frame, clay roof tiles, slate roof, oak planks, mossy stone, cliff strata.
  - **Future:** hex floor plating, riveted metal, rusted panels, glass windows (emissive), overgrowth, neon strip tiles.

### 2. Greedy-meshed voxel geometry — rewrite of `finalizeStatic` and feature visuals in `src/world/world.js`
- Map each palette (`C.cobble`, `C.plaster`, …) to a material, using a reverse lookup on its hex values.
- Emit merged quads per material, with **world-space UVs**. Top and side faces get different textures (grass top vs. grass side).
- Per-vertex **baked AO** and per-cell tint jitter, so repeats don't show.
- About 25 draw calls per era instead of thousands of instanced cubes. Should be faster.

### 3. Foliage and trees — new `src/render/foliage.js`
- Instanced crossed-quad grass tufts and flowers on exposed grass tops, with a wind-sway vertex shader.
  - Past: tall jungle fronds.
  - Present: meadow grass and wildflowers.
  - Future: sparse glowing moss.
- Tree canopies become leaf-clump billboard cards.

### 4. Sprites — `src/render/sprites.js`
- Higher-detail redraws of Wren and the NPCs (more pixels per unit, 1 px dark outline, hue-shifted shading).
- Lit material with wrap lighting, plus soft blob shadows.

### 5. Camera, lighting, post — `renderer.js`, `post.js`
- Diorama camera at FOV 26–28° and a higher pitch, with look-ahead.
- Post stack:
  - bokeh DOF (replaces the tilt-shift blur);
  - soft-knee bloom;
  - grain and chromatic aberration;
  - screen-space god rays in the Past and Present.
- Flickering lantern lights; windows glow in the Future and at dusk.

### 6. Water — `src/render/water.js`
- Shader water with pixel ripples, shore foam and a depth tint.
- The toxic canal in the Future gets bubbling green.

## Verification
- Headless Puppeteer screenshots of every area in all 3 eras, before and after. I can show these side by side.
- Smoke test: console clean, time shifts, river and boulder blocks, snap-back, ending.
- FPS check: target 60 at 1080p on your Mac.

## Open questions
1. **Camera angle:** a higher, Octopath/Lumina-style pitch means seeing more of the ground and less of the building fronts. Is that okay? I'd still keep the side-scrolling feel.
2. **Silhouette:** keep the chunky 1-unit **voxel block** shapes, but textured? Or also add bevels, roof slopes and stairs so it reads less "Minecraft"? Default: textured blocks plus sloped roofs and stair steps.
3. **Scope:** this is a large pass. I'd do it in order 1 → 2 → 5 → 3 → 6 → 4 and show screenshots after steps 2 and 5. Good?
