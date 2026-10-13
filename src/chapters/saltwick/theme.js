// Chapter Two, Saltwick: the look and sound of this chapter. Plain data, no engine imports (see src/chapter.js).

/** Sky, fog and light for each age: Past, Present, Future. */
const ATMOS = [
  {
    // Age of Tides: a clear sea morning, turquoise light off the water
    skyTop: 0x3f9fd8, skyHorizon: 0xc8f0e6, fog: 0xb4e2dc, fogNear: 36, fogFar: 150,
    sun: 0xfff0cc, sunI: 3.0, sunDir: [-0.5, 1.0, 0.8],
    hemiSky: 0xd8fff6, hemiGround: 0x5a8a7a, hemiI: 1.0, exposure: 1.0, emissive: 1.3, glow: 2.6, bloom: 0.5, stars: 0,
  },
  {
    // Saltwick: a gray-gold harbor morning, with the mist the tide left behind
    skyTop: 0x7fa6c0, skyHorizon: 0xe6e2cc, fog: 0xc8cfc0, fogNear: 28, fogFar: 130,
    sun: 0xfff0d2, sunI: 2.1, sunDir: [0.45, 1.0, 0.8],
    hemiSky: 0xe4f0ff, hemiGround: 0x6a6a52, hemiI: 0.9, exposure: 0.92, emissive: 1.6, glow: 2.6, bloom: 0.5, stars: 0,
  },
  {
    // The Dry Age: a white-hot, hazy afternoon over salt flats where the sea used to be
    skyTop: 0x6f8fb0, skyHorizon: 0xf4cfa2, fog: 0xe8c8a6, fogNear: 20, fogFar: 105,
    sun: 0xffe2b8, sunI: 2.5, sunDir: [-0.65, 0.8, 0.6],
    hemiSky: 0xffe8d0, hemiGround: 0x9a7a5a, hemiI: 0.95, exposure: 0.92, emissive: 1.3, glow: 2.0, bloom: 0.4, stars: 0,
  },
];

/** Color grade for each age. */
const GRADES = [
  // Age of Tides: clean sea light, cool shadows, soft shafts
  { tint: [1.0, 1.03, 0.98], shadowTint: [0.82, 0.94, 1.02], saturation: 1.16, contrast: 1.06, vignette: 0.34, rays: 0.5, rayColor: [0.9, 1.0, 0.9] },
  // Saltwick: warm highlights / teal shadows
  { tint: [1.04, 1.0, 0.93], shadowTint: [0.8, 0.94, 1.0], saturation: 1.06, contrast: 1.05, vignette: 0.34, rays: 0.4, rayColor: [1.0, 0.94, 0.78] },
  // The Dry Age: bleached and dusty, long amber shafts
  { tint: [1.05, 1.0, 0.92], shadowTint: [0.96, 0.88, 0.9], saturation: 0.9, contrast: 1.06, vignette: 0.4, rays: 0.5, rayColor: [1.0, 0.82, 0.55] },
];

/** Drifting motes in the air of each age. */
const AMBIENT = [
  { count: 220, colors: [0xd8fff4, 0x9fe8dc, 0xffffff], size: 0.11, vy: 0.1, drift: 0.3, glow: 1.8 }, // sea spray
  { count: 200, colors: [0xfff6d8, 0xe8ecd8, 0xd0dcd0], size: 0.11, vy: -0.04, drift: 0.35, glow: 1.4 }, // harbor mist
  { count: 260, colors: [0xffb070, 0xe88a50, 0xffd8a0], size: 0.09, vy: 0.05, drift: 0.9, glow: 1.5 }, // blown salt and dust
];

/** The music: one chord per bar (16 steps per bar), and a hand-written melody (step -> scale index, 64 steps). */
const MUSIC = {
  tempo: 76,
  // D minor, like a slow shanty: Dm - C - Bb - C (one chord per bar, 16 steps per bar)
  chords: [
    [62, 65, 69],
    [60, 64, 67],
    [58, 62, 65],
    [60, 64, 67],
  ],
  roots: [50, 48, 46, 48],
  penta: [62, 65, 67, 69, 72, 74, 77, 79, 81], // D minor pentatonic
  // hand-authored melody (step -> scale index), 64 steps
  // a rocking, long-short tune: out with the tide, and in again
  melody: {
    0: 3, 3: 4, 4: 5, 8: 3, 11: 2, 12: 3,
    16: 2, 19: 3, 20: 4, 24: 2, 28: 1,
    32: 0, 35: 1, 36: 2, 40: 3, 43: 2, 44: 0,
    48: 1, 51: 2, 52: 4, 56: 3, 60: 2,
  },
  melody2: { 2: 6, 6: 7, 10: 5, 18: 4, 22: 6, 26: 5, 34: 7, 38: 8, 46: 6, 50: 5, 58: 4, 62: 3 },
};

/** The Future as first found, and as it becomes once the tide comes home (see SaltwickGame.setMood). */
export const ATMOS_DRY = JSON.parse(JSON.stringify(ATMOS[2]));
export const ATMOS_HEALED = {
  skyTop: 0x0c1840, skyHorizon: 0x3fa6b8, fog: 0x245a78, fogNear: 26, fogFar: 125,
  sun: 0xbfe0ff, sunI: 1.3, sunDir: [-0.3, 1.0, 0.6],
  hemiSky: 0x7ac8ff, hemiGround: 0x2a4a5a, hemiI: 1.3, exposure: 1.02, emissive: 1.4, glow: 1.5, bloom: 0.3, stars: 1,
};
export const GRADE_DRY = GRADES[2];
export const GRADE_HEALED = { tint: [0.95, 1.0, 1.06], shadowTint: [0.8, 0.9, 1.1], saturation: 1.14, contrast: 1.05, vignette: 0.36, rays: 0.0, rayColor: [0.6, 0.8, 1.0] };

export default {
  width: 300, // level length (x): the shore road, then the Tide Well
  eraNames: ['Age of Tides', 'Medieval Age', 'The Dry Age'],
  eraCss: ['#5fe6c8', '#bff6ff', '#ff9a4a'],
  eraRing: [0x5fe6c8, 0xbff6ff, 0xff9a4a],
  atmos: ATMOS,
  grades: GRADES,
  ambient: AMBIENT,
  music: MUSIC,
  bell: { partials: [1, 2.0, 2.76, 5.4], gain: 0.14, release: 4 },
  playerSheet: 'vivienneCoast',
  shrine: [[0x9a917e, 0xb8ae96], [0x8a8378, 0x9a958a], [0x8a5a44, 0xa87a5a]],
  enemyBurst: { drone: [0xffb03a, 0xff5a3a], rat: [0xaaaaaa, 0xffffff], other: [0xe0786a, 0xffd0b0] },
  voices: { michelle: 20, zach: 420, vivienne: 140, eugene: -20, megan: 500, brannoch: -90, odalys: 60, fenwick: -50, isha: 110, pim: 380, maren: 30, digby: 280 },
  keyBadge: 'Tide Note',
  lapse: { shine: [0xffd8f0, 0xffffff, 0xffe9a0], splash: [0x9fe8ff, 0xffffff], motes: [0xffe6a0, 0xe8dcc0], motesDrop: 1 }, // sparkle during a time-lapse
  camFloor: -2, // the camera follows you down onto the sea bed
  titleCam: { x: 20, sway: 12 },
};
