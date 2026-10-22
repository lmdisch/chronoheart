// Chapter Three, the mountain observatory: the look and sound of this chapter. Plain data, no
// engine imports (see src/chapter.js). For now this chapter is a visual test of the setting.

/**
 * Sky, fog and light for each age.
 *  Past, the First Age: a clear winter night, the aurora over the peaks, the observatory still
 *    being built by torchlight.
 *  Present: golden hour above the clouds, long shadows, the town lit up.
 *  Future: the age the borrowed hours ran out. Time has stopped: the clouds stand still, the snow
 *    hangs in the air, the stars don't twinkle, and the moon has come far too close.
 */
const ATMOS = [
  {
    skyTop: 0x060b22, skyHorizon: 0x1c3a5a, fog: 0x14284a, fogNear: 140, fogFar: 900,
    sun: 0x9fc0ff, sunI: 1.25, sunDir: [0.4, 0.7, 0.65],
    hemiSky: 0x5a86c8, hemiGround: 0x1a2440, hemiI: 1.15, exposure: 1.08, emissive: 1.9, glow: 3.0, bloom: 0.62, stars: 1.2, twinkle: 1,
    aurora: 1.15, auroraA: 0x3affb0, auroraB: 0xa86aff,
    cloudTop: 0x8aa8d8, cloudShade: 0x1c2a4c, cloudGlow: 0x3affb0, cloudGlowAmt: 0.22, cloudSpeed: 1, handSpeed: 0, handShadow: 0,
  },
  {
    skyTop: 0x3a5f9a, skyHorizon: 0xffc690, fog: 0xf0b88a, fogNear: 200, fogFar: 1000,
    // (the light comes in low from the left; the sun itself is drawn low in the sky ahead, over the clouds)
    sun: 0xffcf96, sunI: 3.0, sunDir: [-0.85, 0.32, 0.45], sunSky: [-0.42, 0.1, -0.9],
    // (warm where the sun reaches, and the shade cool and blue, as snow is at sunset)
    hemiSky: 0xa8b8f0, hemiGround: 0x6a5a78, hemiI: 1.15, exposure: 1.0, emissive: 1.6, glow: 2.6, bloom: 0.55, stars: 0,
    cloudTop: 0xfff0dc, cloudShade: 0xa0687e, cloudGlow: 0xff9a5a, cloudGlowAmt: 0.12, cloudSpeed: 1, handSpeed: 1, handShadow: 0.5,
  },
  {
    skyTop: 0x0a0618, skyHorizon: 0x4a4a78, fog: 0x2c2c50, fogNear: 140, fogFar: 900,
    sun: 0xd8e4ff, sunI: 1.6, sunDir: [0.55, 0.75, 0.6],
    hemiSky: 0xa8b8ff, hemiGround: 0x2a2440, hemiI: 1.25, exposure: 1.04, emissive: 1.4, glow: 2.2, bloom: 0.5, stars: 1.4, twinkle: 0,
    moon: 1, moonDir: [0.3, 0.17, -1], moonSize: 0.16, moonCol: 0xf0f2ff, rings: 1, ringCol: 0xc8c0e8,
    cloudTop: 0xd8dcf4, cloudShade: 0x3a3a68, cloudGlow: 0x8a9aff, cloudGlowAmt: 0.06, cloudSpeed: 0, handSpeed: 0, handShadow: 0.35,
  },
];

/** Color grade for each age. */
const GRADES = [
  // First Age: cold blue night, the aurora's green and violet kept rich
  { tint: [0.92, 1.0, 1.08], shadowTint: [0.82, 0.9, 1.12], saturation: 1.2, contrast: 1.08, vignette: 0.4, rays: 0.0, rayColor: [0.6, 1.0, 0.8] },
  // Present: golden hour, long warm shafts of light
  { tint: [1.08, 1.0, 0.88], shadowTint: [0.86, 0.84, 1.04], saturation: 1.14, contrast: 1.07, vignette: 0.34, rays: 0.7, rayColor: [1.0, 0.78, 0.5] },
  // Future: silver and still, a little drained of color
  { tint: [0.97, 0.99, 1.06], shadowTint: [0.9, 0.86, 1.1], saturation: 0.86, contrast: 1.04, vignette: 0.42, rays: 0.15, rayColor: [0.8, 0.85, 1.0] },
];

/** Snow in every age (the motes follow the camera up the mountain). In the Future it hangs in the air, not falling. */
const AMBIENT = [
  { count: 900, colors: [0xdfe8ff, 0xbfd8ff, 0xa8ffd8], size: 0.11, vy: -0.7, drift: 0.6, glow: 0.9, follow: true, height: 18 },
  { count: 800, colors: [0xfff4e0, 0xffe0b0, 0xffffff], size: 0.1, vy: -0.55, drift: 0.7, glow: 0.9, follow: true, height: 18 },
  { count: 900, colors: [0xe8ecff, 0xc8d0ff, 0xffffff], size: 0.1, vy: 0, drift: 0, glow: 1.2, follow: true, height: 18 },
];

/** The music: D minor, slow and high. One chord per bar (16 steps), a melody over 64 steps. */
const MUSIC = {
  tempo: 72,
  chords: [
    [50, 53, 57],
    [46, 50, 53],
    [48, 52, 55],
    [45, 49, 52],
  ],
  roots: [38, 34, 36, 33],
  penta: [62, 65, 67, 69, 72, 74, 77, 79, 81],
  melody: {
    0: 3, 6: 4, 8: 5, 12: 4,
    16: 2, 22: 3, 24: 1,
    32: 3, 36: 5, 38: 6, 40: 7, 44: 6,
    48: 5, 52: 4, 56: 2, 60: 1,
  },
  melody2: { 4: 7, 14: 6, 20: 5, 30: 4, 36: 8, 46: 7, 54: 6, 62: 5 },
};

/**
 * After the hours go home. The Golden Hour that never ended gives way at last to a midwinter
 * night, and the Stopped Age thaws into the Waking Age (see SummitGame.setMood).
 */
export const ATMOS_GOLDEN = JSON.parse(JSON.stringify(ATMOS[1]));
export const ATMOS_STOPPED = JSON.parse(JSON.stringify(ATMOS[2]));
export const GRADE_GOLDEN = GRADES[1];
export const GRADE_STOPPED = GRADES[2];
export const ATMOS_NIGHT = {
  skyTop: 0x081430, skyHorizon: 0x2a4070, fog: 0x1c2c50, fogNear: 140, fogFar: 900,
  sun: 0xb8ccff, sunI: 1.35, sunDir: [-0.5, 0.85, 0.5],
  hemiSky: 0x7a96d8, hemiGround: 0x2a2a44, hemiI: 1.2, exposure: 1.06, emissive: 2.0, glow: 3.0, bloom: 0.62, stars: 1.3, twinkle: 1,
  aurora: 0.4, auroraA: 0x7affc8, auroraB: 0xffd08a,
  cloudTop: 0x9ab0e0, cloudShade: 0x1c2a50, cloudGlow: 0xffc870, cloudGlowAmt: 0.1, cloudSpeed: 1, handSpeed: 1, handShadow: 0.25,
};
export const ATMOS_WAKING = {
  skyTop: 0x3a5aa0, skyHorizon: 0xffc8b8, fog: 0xd8b8c0, fogNear: 160, fogFar: 950,
  sun: 0xffe0c8, sunI: 2.4, sunDir: [0.55, 0.5, 0.6], sunSky: [0.4, 0.12, -0.9],
  hemiSky: 0xffe0e8, hemiGround: 0x5a5a7a, hemiI: 1.05, exposure: 1.0, emissive: 1.5, glow: 2.4, bloom: 0.5, stars: 0.3, twinkle: 1,
  moon: 0.55, moonDir: [-0.45, 0.25, -1], moonSize: 0.1, moonCol: 0xfff0f0, rings: 0.6, ringCol: 0xf0c8d8,
  cloudTop: 0xfff0f4, cloudShade: 0x9a7a9a, cloudGlow: 0xffb0a0, cloudGlowAmt: 0.1, cloudSpeed: 0.7, handSpeed: 1, handShadow: 0.4,
};
export const GRADE_NIGHT = { tint: [0.94, 0.98, 1.08], shadowTint: [0.84, 0.88, 1.12], saturation: 1.12, contrast: 1.06, vignette: 0.42, rays: 0.0, rayColor: [0.8, 0.9, 1.0] };
export const GRADE_WAKING = { tint: [1.04, 1.0, 1.0], shadowTint: [0.9, 0.86, 1.06], saturation: 1.1, contrast: 1.05, vignette: 0.34, rays: 0.4, rayColor: [1.0, 0.86, 0.8] };

export default {
  width: 140, // the road is 100 long (x 20..120); the mountain's shoulders either side
  yMax: 100, // the summit stands 74 above Base Camp
  zMin: -112, // the road climbs back up the mountainside, 16 further back for each leg
  zMax: 14,
  openDepth: true, // the road winds back into the scene: rock and barriers wall it, not the usual strip
  slopes: true, // walk up and down a step at a time
  eraNames: ['The First Age', 'Golden Hour', 'The Stopped Age'], // (after the ending: Midwinter Night, and the Waking Age)
  eraCss: ['#7affc8', '#ffd08a', '#c8c0ff'],
  eraRing: [0x7affc8, 0xffd08a, 0xc8c0ff],
  atmos: ATMOS,
  grades: GRADES,
  ambient: AMBIENT,
  music: MUSIC,
  bell: { partials: [1, 2.4, 3.8, 6.2], gain: 0.12, release: 5 },
  playerSheet: 'vivienneWinter',
  shrine: [[0x6e7584, 0x8a92a2], [0x8a8378, 0x9a958a], [0x7a80a8, 0x9aa0c8]],
  enemyBurst: { wolf: [0xd8e0f0, 0xffffff], beetle: [0xf2cf5a, 0xc8963a, 0xffffff], wisp: [0xa8d8ff, 0xffffff], other: [0xc8e8ff, 0xffffff] },
  voices: { vivienne: 140, eugene: -20, eugeneWinter: -20, eugeneYoung: 60, christopher: -40, christopherYoung: 50, orinOld: -50, michelle: 20, michelleWinter: 20, ingrid: 90, tobin: -80, sela: 30, anwen: 40, porterKit: 70, porterBram: -60, zachWinter: 420, meganWinter: 500 },
  keyBadge: 'Hour',
  lapse: { shine: [0xffe6a0, 0xffffff], splash: null, motes: [0xdfe8ff, 0xffffff], motesDrop: 0 },
  camFloor: 0,
  titleCam: { x: 50, sway: 14, y: 76, z: -86 }, // the summit, and the view
  // a lower camera than the valley's, so the sky shows; it dips lower still at each viewpoint
  camera: { fov: 34, pitch: 24, dist: 34, lift: 4.5, far: 1100, blur: 0.4 },
  // the sea of clouds below the mountain, the openings onto the valley and the harbor far below,
  // and the summit's shadow sweeping across it like a clock hand
  clouds: { y: -9, holes: [[14, -300, 74], [162, -318, 80], [-150, 60, 40]], hand: { x: 38, z: -84, len: 170, angle: -2.2 }, fadeNear: 140, fadeFar: 900 },
};
