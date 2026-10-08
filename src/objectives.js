// The on-screen goal. Each step has a gentle nudge (always shown) and a direct hint
// (revealed only when the player asks for it), based on where the player is and what
// they've done. Earlier unfinished steps are named when they block the end of the game.
import { ERA } from './core/util.js';
import { L } from './levels/hollowmere.js';

const X = {
  ford: 38, fordFar: 48, cliff: 66, rampart: 79, wall: 97, smithy: 105, terrace: 130, gate: 157,
  mill: L.millX0, crossing: L.crossingX0, chord: L.chordX0, tower: L.towerX0,
};

const step = (goal, hint) => ({ goal, hint });

/** -> { goal, hint } */
export function currentGoal(game) {
  const s = game.state, f = s.flags, inv = s.inventory, taken = s.taken;
  const b = game.player.body;
  const x = b.x;
  const placed = Object.values(game.sockets || {});
  const has = (item) => inv.includes(item) || placed.includes(item);
  const hasDisc = has('disc') || taken.includes('disc');
  const hasHammer = has('hammer') || taken.includes('hammerGift');
  const hasCore = has('core') || taken.includes('core');
  const hasRod = inv.includes('rod') || taken.includes('rod') || f.winchFixed; // picked up (or already fitted)

  if (!f.hasAmulet) return step('Find out what happened to Master Eugene.', 'Search his workshop at the west end of the square. Something on the workbench is glowing.');

  // ---- Hollowmere Square & the Old Ford
  if (x < X.fordFar) {
    if (x < X.ford) return step('Head east, toward the river.', 'Follow the road east to the Old Ford. Elder Louise in the square may have advice.');
    return step('Find a way across the river.', 'Elder Louise said people once crossed on stepping stones in the oldest days. Try the <b>Past</b>.');
  }
  // ---- Sandstone Cliffs
  if (x < X.rampart) {
    if (x < X.cliff + 1) {
      if (!f.springOpen) return step('Find a way through the Sandstone Cliffs.', 'The cliff\'s old water stains are a clue. Look around the temple in the <b>Past</b> for a way to send water toward it.');
      return step('See what the water has done to the cliff.', 'Centuries of spring water carved a tunnel. Walk through it in the <b>Present</b>.');
    }
    return step('Keep heading east.', 'Rampart Row and the town wall are just ahead.');
  }
  // ---- Rampart Row: the town wall
  if (x < X.smithy) {
    if (x < X.wall) {
      if (f.acornPlanted) return step('Get over the town wall.', 'The acorn you planted in the <b>Past</b> is a huge oak in the <b>Present</b>. Climb it.');
      if (f.acornPlantedM) return step('Get over the town wall.', 'The acorn you planted in the <b>Present</b> is a giant oak in the <b>Future</b>. Climb it.');
      if (inv.includes('acorn')) return step('Find somewhere for the acorn to grow.', 'Plant it in the soil in the <b>Past</b>, or in the planter box in the <b>Present</b>.');
      return step('Find a way over the town wall.', 'Megan the Squirrel guards an acorn. Something that grows for centuries could become a ladder.');
    }
    return step('Keep heading east.', 'Smithy Lane is just ahead.');
  }
  // ---- Smithy Lane: the Bell Hammer (+ the iron rod for later)
  if (x < X.terrace) {
    if (!hasHammer) {
      if (inv.includes('hammerBroken')) return step('Find a way to mend the cracked hammer.', 'Star-iron takes centuries to temper. Seal it in Aria\'s quench-vault, then see what became of it.');
      if (f.hammerLeft) return step('Find out what became of the hammer.', 'Three hundred years later... visit Lillian\'s repair shop in the <b>Future</b>.');
      return step('The Clocktower\'s bell is silent. Find out why.', 'Talk to Aria the Smith about the Tower\'s bell hammer.');
    }
    if (!hasRod) return step('Look around the forge before you go.', 'Grab the iron rod from Aria\'s rack. The gate winch further east needs a handle.');
    return step('Keep heading east.', 'The Sun Terrace is just ahead.');
  }
  // ---- Sun Terrace: the Sun Disc
  if (x < X.gate) {
    if (!hasDisc) {
      const t = game.L.pillarTarget, bp = s.blockPos;
      const pillar = bp.x === t.x && bp.z === t.z;
      if (b.y > 2.5) return step('Search the terrace for an Era Key.', 'The Sun Disc was kept up here long ago. Look for it in the <b>Past</b>.');
      if (!pillar) return step('Find a way up the Sun Terrace.', 'In the <b>Past</b>, push the carved block onto the glowing outline by the terrace. Something will be built on it later.');
      return step('Find a way up the Sun Terrace.', 'In the <b>Present</b>, climb the bench, then the pillar, then the terrace.');
    }
    return missingEarlier(hasHammer, hasRod) || step('Keep heading east.', 'The Gatehouse is just past the terrace.');
  }
  // ---- Gatehouse: the Fusion Core
  if (x < X.mill) {
    if (!hasCore) {
      if (!f.winchFixed) {
        if (!hasRod) return step('Find a way through the Gatehouse.', 'The gate winch has no handle. Aria keeps an iron rod on her rack in Smithy Lane, back west.');
        return step('Find a way through the Gatehouse.', 'Fit the iron rod to the gate winch in the <b>Present</b>.');
      }
      if (!f.gateDown) return step('Something guards the gatehouse in the Future.', 'Lower the portcullis with the winch. Whatever falls now stays down for centuries, maybe on top of something.');
      if (game.era !== ERA.FUTURE) return step('Reach the vault at the end of the gatehouse.', 'The Fusion Core is in the vault, in the <b>Future</b>. Jump over the fallen gate in the corridor.');
      return step('Reach the vault at the end of the gatehouse.', 'Jump over the rusted gate in the corridor, get past the Sentinel, and hop onto the pedestal for the Fusion Core.');
    }
    return missingEarlier(hasHammer, hasRod, hasDisc) || step('Keep heading east.', 'The road goes on past the vault, toward the Clocktower.');
  }
  // ---- Millrace Hollow
  const keys = inputNames();
  if (x < X.crossing) {
    if (x >= L.millCliffX0) return step('Keep heading east.', "Tamsin's Crossing is just ahead.");
    if (!f.millDammed) {
      return step(
        'Find a way across the hollow.',
        'The far bank is too high to climb. In the <b>Past</b>, a spring falls from the cliff and drains away down a gully. Push the boulder into the glowing gully mouth to turn the water into the hollow.',
      );
    }
    if (!f.sluiceClosed) {
      if (inv.includes('wheel')) return step("Close the mill's sluice gate.", 'Fit the brass wheel to the sluice on top of the dam, in the <b>Present</b>.');
      return step('Stop the millpond draining away.', "The sluice on the dam is stuck open and its wheel is gone. In the <b>Future</b> the mill is a pumping station with a little museum by the road. Look there.");
    }
    return step('Swim across the millpond.', `The pond is deep now. Swim to the cliff on the far side (${keys.jump} to swim up) and climb out onto the ledge.`);
  }
  // ---- Tamsin's Crossing
  if (x < X.chord) {
    if (x >= L.farWallX1 + 1) return step('Keep heading east.', 'The Chord Vault is just ahead.');
    if (!f.hasSeal) return step('Look around the old crossing.', "Something of Eugene's was left in the reeds on this bank, in the <b>Present</b>.");
    if (!f.bridgeBuilt) {
      if (inv.includes('cable')) return step('Bring the cable to Tamsin.', 'Tamsin the Ropewright is on this bank in the <b>Past</b>. Steel cable never rots.');
      if (f.bridgeQuest) return step('Find rope that never rots.', 'In the <b>Future</b>, there is a scrapyard on this bank. A spool of steel cable would do nicely.');
      return step('Find a way across the gorge.', 'In the <b>Past</b>, a ropewright named Tamsin is planning a bridge here. Talk to her.');
    }
    if (!f.bridgeSealed) return step('Make the bridge last.', `Tamsin's bridge rots away within a century. Stand by it in the <b>Past</b> and use the Stasis Seal (${keys.seal}).`);
    return step('Cross the gorge.', 'In the <b>Present</b> a city wall blocks the far bank, but in the <b>Future</b> it is only rubble. Cross in the Future, then return to the Present once you are past the wall.');
  }
  // ---- The Chord Vault
  if (x < X.tower && !f.chordOpen) {
    if (!f.hasEcho) return step('Find a way into the vault.', 'The vault door needs three plates pressed at once, one in each age. In the <b>Future</b>, the archive pedestal by the entrance holds something of Eugene\'s.');
    return step(
      'Press all three plates at once.',
      `Each age has one plate. Stand on a plate and record an echo there (${keys.echo} to start and stop): it keeps standing on it in that age. Leave echoes in two ages, then stand on the last plate yourself. The Present plate is up on the stone platform.`,
    );
  }
  if (x < X.tower) return step('Keep heading east.', 'The Clocktower is through the vault.');
  // ---- Clocktower
  const missing = [];
  if (!hasDisc) missing.push('the Sun Disc (Sun Terrace, in the Past)');
  if (!hasHammer) missing.push('the Bell Hammer (Smithy Lane)');
  if (!hasCore) missing.push('the Fusion Core (Gatehouse vault, in the Future)');
  if (missing.length) {
    const back = f.posternOpen ? 'The postern passage leads back west through the rubble.' : 'Pull the old postern lever just past the gatehouse vault (<b>Present</b>) to open a way back west.';
    return step('The Tower needs all three Era Keys.', `You still need ${missing.join(' and ')}. ${back}`);
  }
  return step('Restart the Clocktower.', 'Place all three keys quickly: the Sun pedestal (<b>Past</b>), the great bell (<b>Present</b>) and the reactor socket (<b>Future</b>).');
}

function missingEarlier(hasHammer, hasRod, hasDisc = true) {
  // (east of the gatehouse the way back is the Clocktower's postern passage, see above)
  if (!hasHammer) return step('Something\'s still missing back west.', 'You still need the Bell Hammer. Head back to Aria\'s forge in Smithy Lane.');
  if (!hasDisc) return step('Something\'s still missing back west.', 'You still need the Sun Disc from the top of the Sun Terrace, in the Past.');
  if (!hasRod) return step('Something\'s still missing back west.', 'Don\'t forget the iron rod on Aria\'s rack in Smithy Lane. The gate winch needs it.');
  return null;
}

/** Key / button names for the current input method. */
function inputNames() {
  const touch = document.body.classList.contains('touch');
  return touch ? { jump: 'tap <b>Jump</b>', seal: 'the <b>Seal</b> button', echo: 'the <b>Echo</b> button' } : { jump: '<kbd>Space</kbd>', seal: '<kbd>R</kbd>', echo: '<kbd>V</kbd>' };
}
