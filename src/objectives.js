// The on-screen goal. Each step has a gentle nudge (always shown) and a direct hint
// (revealed only when the player asks for it), based on where the player is and what
// they've done. Earlier unfinished steps are named when they block the end of the game.
import { ERA } from './core/util.js';
import { L } from './levels/hollowmere.js';

const X = {
  ford: 38, fordFar: 48, cliff: 66, rampart: 79, wall: 97, smithy: 105, terrace: 130, gate: 157,
  mill: L.millX0, crossing: L.crossingX0, gallery: L.echoX0, yard: L.yardX0, tower: L.towerX0,
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

  if (!f.hasAmulet) return step('Find out what happened to Master Donald Eugene.', 'Search his workshop at the west end of the square. Something on the workbench is glowing.');

  // ---- Hollowmere Square & the Old Ford
  if (x < X.fordFar) {
    if (x < X.ford) return step('Head east, toward the river.', 'Follow the road east to the Old Ford. Elder Karen Louise in the square may have advice.');
    return step('Find a way across the river.', 'Elder Karen Louise said people once crossed on stepping stones in the oldest days. Try the <b>Past</b>.');
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
  // ---- Smithy Lane: the Bell Hammer
  if (x < X.terrace) {
    if (!hasHammer) {
      if (inv.includes('hammerBroken')) return step('Find a way to mend the cracked hammer.', 'Star-iron takes centuries to temper. Seal it in Aria\'s quench-vault, then see what became of it.');
      if (f.hammerLeft) return step('Find out what became of the hammer.', 'Three hundred years later... visit Lillian\'s repair shop in the <b>Future</b>. It rests on her display case.');
      return step('The Clocktower\'s bell is silent. Find out why.', 'Talk to Aria the Smith about the Tower\'s bell hammer.');
    }
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
    return missingEarlier(hasHammer) || step('Keep heading east.', 'The Gatehouse is just past the terrace.');
  }
  // ---- Gatehouse: the Fusion Core
  if (x < X.mill) {
    if (!hasCore) {
      if (game.era !== ERA.FUTURE) return step('Find a way through the Gatehouse.', 'In the <b>Present</b> the road ends in rubble. In the <b>Future</b>, a security corridor runs through to a vault.');
      return step('Reach the vault at the end of the gatehouse.', 'Follow the corridor past the drones, and hop onto the vault pedestal for the Fusion Core.');
    }
    return missingEarlier(hasHammer, hasDisc) || step('Keep heading east.', 'The road goes on past the vault, toward the Clocktower.');
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
    return step('Cross the millpond.', "The full pond floats the mill's log boom up level with the banks. Hop from log to log to the far side, and don't fall in.");
  }
  // ---- Tamsin's Crossing
  if (x < X.gallery) {
    if (x >= L.farWallX1 + 1) return step('Keep heading east.', 'The Echo Gallery is just ahead.');
    if (!f.hasSeal) return step('Look around the old crossing.', "Something of Donald Eugene's was left in the reeds on this bank, in the <b>Present</b>.");
    if (!f.bridgeBuilt) {
      if (inv.includes('cable')) return step('Bring the cable to Tamsin.', 'Tamsin the Ropewright is on this bank in the <b>Past</b>. Steel cable never rots.');
      if (f.bridgeQuest) return step('Find rope that never rots.', 'In the <b>Future</b>, there is a scrapyard on this bank. A spool of steel cable would do nicely.');
      return step('Find a way across the gorge.', 'In the <b>Past</b>, a ropewright named Tamsin is planning a bridge here. Talk to her.');
    }
    if (!f.bridgeSealed) return step('Make the bridge last.', `Tamsin's bridge rots away within a century. Stand by it in the <b>Past</b> and use the Stasis Seal (${keys.seal}).`);
    return step('Cross the gorge.', 'In the <b>Present</b> a city wall blocks the far bank, but in the <b>Future</b> it is only rubble. Cross in the Future, then return to the Present once you are past the wall.');
  }
  // ---- The Echo Gallery
  if (x < X.yard) {
    if (x > L.galleryX1 || b.y >= 3.9) return step('Keep heading east.', "The Clocktower's courtyard is just past the gallery.");
    if (f.galleryClimbed) return step('Climb the gallery wall.', 'Climb the rope ladder you kicked down earlier.');
    if (!f.hasEcho) return step('Find a way up the gallery wall.', "The wall is too high to climb. Donald Eugene left something on the lectern by the entrance, in the <b>Present</b>.");
    if (game.era !== ERA.PRESENT) return step('Get through the gallery.', 'The gates, the steps and your echoes only exist in the <b>Present</b>.');
    if (x < L.gatesX0 + 1) {
      return step(
        'Get through the gold gate.',
        `Gates open while their matching button is held. Stand on the gold button and record an echo there (${keys.echo} to start, again to stop): it keeps holding the gate open for you.`,
      );
    }
    if (x < L.gatesX1 + 1) {
      return step(
        'Get through the green airlock.',
        `The first green gate opens while the green button is held; the dashed one only while it is NOT. Back at the green button, record an echo that stands on it for two seconds, then steps off for two. Walk through each gate as it opens. You can keep up to 3 echoes, and the oldest fades when you record another.`,
      );
    }
    return step(
      'Climb the gallery wall.',
      `Each step rises while its row of three buttons is lit. Buttons light in order (count the dots: 1, 2, 3) and fade a few seconds after you step off. Record an echo walking a row in order (${keys.echo} to start, again to stop, within 5 seconds) and it keeps the row lit. Start on the ground row, then the row on step 1, then step 2, then climb. Your older gate echoes will fade as you record new ones: that's fine, you're past them.`,
    );
  }
  // ---- The Warden's Courtyard
  if (x < X.tower) {
    if (f.towerUnlocked) return step('Enter the Clocktower.', 'The great door is open.');
    const eraMissing = [!hasDisc && 'the Sun Disc (Sun Terrace, in the Past)', !hasHammer && 'the Bell Hammer (Smithy Lane)', !hasCore && 'the Fusion Core (Gatehouse vault, in the Future)'].filter(Boolean);
    if (!inv.includes('clockKey')) {
      return step(
        "Find the key to the Clocktower's lock.",
        "The door only opens in the <b>Present</b>, but its key lies in the <b>Future</b> courtyard, guarded by the Warden. Stay out of its sight cone: hide behind the pillars, or slip into the Present when it turns your way. In the Present, the key's spot is inside the fountain.",
      );
    }
    if (eraMissing.length) {
      const back = f.posternOpen ? 'The postern passage past the gatehouse vault leads back west.' : 'The old postern passage (<b>Present</b>) opens once you reach Millrace Hollow, so you can always walk back west.';
      return step('The lock needs all three Era Keys too.', `The great lock has four keyholes. You still need ${eraMissing.join(' and ')}. ${back}`);
    }
    return step('Unlock the Clocktower.', 'Use the keys on the Clocktower door, in the <b>Present</b>. The lock has not been made yet in the Past, and it has rusted solid in the Future.');
  }
  // ---- Clocktower
  const missing = [];
  if (!hasDisc) missing.push('the Sun Disc (Sun Terrace, in the Past)');
  if (!hasHammer) missing.push('the Bell Hammer (Smithy Lane)');
  if (!hasCore) missing.push('the Fusion Core (Gatehouse vault, in the Future)');
  if (missing.length) {
    const back = f.posternOpen ? 'The postern passage leads back west through the rubble.' : 'The old postern passage (<b>Present</b>) opens once you reach Millrace Hollow, so you can always walk back west.';
    return step('The Tower needs all three Era Keys.', `You still need ${missing.join(' and ')}. ${back}`);
  }
  // the finale climb: one key at a time, each higher up and in a different age
  const sockets = game.sockets;
  if (!sockets.socketSun) {
    return step('Wake the Clocktower.', 'The Sun pedestal stands on the high ledge by the door. Nothing reaches it now, but in the <b>Past</b> an ancient stair still climbs there.');
  }
  if (!sockets.socketBell) {
    return step(
      'Ring the great bell.',
      `The bell hangs in the belfry, high above. In the <b>Present</b>, the great piston rises the moment its brass button is pressed, far too soon to run over and board it. Record an echo that steps on the button (${keys.echo}), then stand on the piston's base while it's down and wait for your echo to send you up. At the top, step west onto the belfry.`,
    );
  }
  if (!f.belfrySealed) {
    return step('Reach the reactor.', `The reactor deck is above the belfry, in the <b>Future</b>, but by then the wooden belfry floor has rotted away. Stand on it in the <b>Present</b> and use the Stasis Seal (${keys.seal}).`);
  }
  return step('Reach the reactor.', 'From the sealed belfry floor, switch to the <b>Future</b> and climb the gantry to the reactor deck.');
}

function missingEarlier(hasHammer, hasDisc = true) {
  // (east of the gatehouse the way back is the Clocktower's postern passage, see above)
  if (!hasHammer) return step('Something\'s still missing back west.', 'You still need the Bell Hammer. Head back to Aria\'s forge in Smithy Lane.');
  if (!hasDisc) return step('Something\'s still missing back west.', 'You still need the Sun Disc from the top of the Sun Terrace, in the Past.');
  return null;
}

/** Key / button names for the current input method. */
function inputNames() {
  const touch = document.body.classList.contains('touch');
  return touch ? { seal: 'the <b>Seal</b> button', echo: 'the <b>Echo</b> button' } : { seal: '<kbd>R</kbd>', echo: '<kbd>V</kbd>' };
}
