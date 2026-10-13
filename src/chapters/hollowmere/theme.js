// Chapter One, Hollowmere: the look and sound of this chapter. Plain data, no engine imports (see src/chapter.js).

/** Sky, fog and light for each age: Past, Present, Future. */
const ATMOS = [
  {
    // Ancient: warm golden afternoon
    skyTop: 0x5e9fd6, skyHorizon: 0xf7cf94, fog: 0xeac590, fogNear: 34, fogFar: 150,
    sun: 0xffd39c, sunI: 3.1, sunDir: [-0.55, 1.0, 0.75],
    hemiSky: 0xffe8c4, hemiGround: 0x8a6a3a, hemiI: 1.05, exposure: 1.0, emissive: 1.3, glow: 2.6, bloom: 0.5, stars: 0,
  },
  {
    // Medieval: misty green-gold morning (like the reference)
    skyTop: 0x88b6d2, skyHorizon: 0xe2e8cf, fog: 0xc9d5bb, fogNear: 30, fogFar: 135,
    sun: 0xfff0d2, sunI: 2.2, sunDir: [0.45, 1.0, 0.8],
    hemiSky: 0xe4f0ff, hemiGround: 0x5a6a3a, hemiI: 0.85, exposure: 0.92, emissive: 1.6, glow: 2.6, bloom: 0.5, stars: 0,
  },
  {
    // Future: neon dusk
    skyTop: 0x0b0a26, skyHorizon: 0x6a2c86, fog: 0x2c2152, fogNear: 22, fogFar: 115,
    sun: 0x9fb2ff, sunI: 0.9, sunDir: [-0.3, 1.0, 0.6],
    hemiSky: 0x6a7cff, hemiGround: 0x3a2a4a, hemiI: 1.3, exposure: 1.02, emissive: 1.25, glow: 1.35, bloom: 0.26, stars: 1,
  },
];

/** Color grade for each age. */
const GRADES = [
  // Past: warm golden hour, strong god rays
  { tint: [1.07, 0.99, 0.86], shadowTint: [0.86, 0.84, 1.0], saturation: 1.14, contrast: 1.07, vignette: 0.36, rays: 0.55, rayColor: [1.0, 0.82, 0.55] },
  // Present: warm highlights / teal shadows
  { tint: [1.04, 1.0, 0.92], shadowTint: [0.8, 0.94, 1.0], saturation: 1.1, contrast: 1.05, vignette: 0.34, rays: 0.4, rayColor: [1.0, 0.94, 0.78] },
  // Future: neon, magenta shadows, no sun shafts
  { tint: [0.96, 0.98, 1.04], shadowTint: [0.95, 0.82, 1.08], saturation: 1.08, contrast: 1.05, vignette: 0.38, rays: 0.0, rayColor: [0.6, 0.7, 1.0] },
];

/** Drifting motes in the air of each age. */
const AMBIENT = [
  { count: 220, colors: [0xffe6a0, 0xffd070, 0xfff4d0], size: 0.12, vy: 0.08, drift: 0.25, glow: 2.0 },
  { count: 220, colors: [0xfff6d8, 0xffd9a0, 0xe0884a], size: 0.11, vy: -0.05, drift: 0.35, glow: 1.6 },
  { count: 260, colors: [0x36f0ff, 0xff3fd2, 0xa0e8ff], size: 0.09, vy: 0.25, drift: 0.15, glow: 1.6 },
];

/** The music: one chord per bar (16 steps per bar), and a hand-written melody (step -> scale index, 64 steps). */
const MUSIC = {
  tempo: 84,
  // A minor progression: Am - F - C - G (one chord per bar, 16 steps per bar)
  chords: [
    [57, 60, 64],
    [53, 57, 60],
    [48, 52, 55],
    [55, 59, 62],
  ],
  roots: [45, 41, 48, 43],
  penta: [57, 60, 62, 64, 67, 69, 72, 74, 76],
  // hand-authored melody (step -> scale index), 64 steps
  melody: {
    0: 5, 4: 4, 6: 3, 8: 4, 12: 2,
    16: 3, 20: 2, 22: 1, 24: 2, 28: 0,
    32: 1, 34: 2, 36: 4, 40: 5, 42: 6, 44: 5,
    48: 4, 52: 3, 54: 2, 56: 3, 60: 1,
  },
  melody2: { 2: 7, 10: 6, 18: 5, 26: 4, 34: 6, 38: 7, 46: 8, 50: 7, 58: 5, 62: 4 },
};

export default {
  width: 346, // level length (x): the valley, then the Gearworks inside the clock
  eraNames: ['Ancient Age', 'Medieval Age', 'Age of Chrome'],
  eraCss: ['#ffc060', '#bff6ff', '#ff5fe0'],
  eraRing: [0xffc060, 0xbff6ff, 0xff4fd8],
  atmos: ATMOS,
  grades: GRADES,
  ambient: AMBIENT,
  music: MUSIC,
  bell: { partials: [1, 2.76, 5.4], gain: 0.12, release: 3.5 },
  playerSheet: 'vivienne',
  shrine: [[0xc9935a, 0xd29e64], [0x8a8378, 0x9a958a], [0x4a5260, 0x6a7484]],
  enemyBurst: { drone: [0x36f0ff, 0xff3fd2], rat: [0xaaaaaa, 0xffffff], other: [0x8ab04a, 0xffd070] },
  voices: { michelle: 20, zach: 420, vivienne: 140, louise: 40, samaria: 120, aria: -80, callie: 60, sheng: -70, lillian: 160, eugene: -20, tick: 300, brn: 250, megan: 500, hobb: -60, tamsin: 80 },
  keyBadge: 'Era Key',
  lapse: { shine: [0xffd070, 0xffffff], splash: null, motes: [0xffe6a0, 0x9aff7a], motesDrop: 0 }, // sparkle during a time-lapse
  camFloor: 0, // the camera never looks lower than this
  titleCam: { x: 16, sway: 10 },
};
