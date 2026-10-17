// The on-screen goal. Each step has a gentle nudge (always shown) and a direct hint
// (revealed only when the player asks for it), based on where the player is and what
// they've done. Earlier unfinished steps are named when they block the end of the game.
import { ERA } from '../../core/util.js';
import { L, GEAR } from './level.js';

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
      if (!f.springOpen) return step('Find a way through the Sandstone Cliffs.', 'The cliff\'s old water stains are a clue. In the <b>Past</b>, a lever by the temple lets the spring out, but it has seized: knock it loose with a few hits of your wrench.');
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
      if (!f.shutterBroken) return step('Get through the security shutter.', 'A shutter seals the corridor before the vault, but its lock housing has rusted through. Hit it three times with your wrench, between the drones\' passes.');
      return step('Reach the vault at the end of the gatehouse.', 'Hop onto the vault pedestal for the Fusion Core.');
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
        "The far bank is too high to climb. In the <b>Past</b>, a spring falls into a stone trough at the cliff foot and drains away. The trough has three plugs, and only one of their channels is the old millrace. Hold the time lens open on the <b>Present</b> to see where each channel ends: two stop at sinkholes, one runs to the dam. Knock that plug out with your wrench.",
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
    // one step at a time: which steps are up right now
    const up = (game.abilities?.steps || []).map((s) => s.cur >= s.h);
    const walk = `Stand on its ringed button, start an echo (${keys.echo}), follow the arrows round, and stop it (${keys.echo}).`;
    if (!up[0])
      return step('Raise the first step.', `A button you press yourself goes dark when you step off, but one your echo presses stays lit. The step rises while both ground buttons are lit. ${walk}`);
    if (!up[1]) return step('Raise the second step.', `Climb onto the first step. Its ring rises the second: ${walk}`);
    if (!up[2]) return step('Raise the third step.', `Climb onto the second step and do the same with its ring. You can keep three echoes, so this one is the last you need. (A wrong one? Stand on it and press Interact to dispel it.)`);
    return step('Climb the gallery wall.', 'All three steps are up. Climb them onto the gallery.');
  }
  // ---- The Warden's Courtyard
  if (x < X.tower) {
    if (f.towerUnlocked) return step('Enter the Clocktower.', 'The great door is open.');
    const eraMissing = [!hasDisc && 'the Sun Disc (Sun Terrace, in the Past)', !hasHammer && 'the Bell Hammer (Smithy Lane)', !hasCore && 'the Fusion Core (Gatehouse vault, in the Future)'].filter(Boolean);
    if (!f.hasTempo && !inv.includes('clockKey')) return step('Look around the courtyard gate.', "Donald Eugene left his toolbox just inside the gate, in the <b>Present</b>. Something in it is meant for you.");
    if (!inv.includes('clockKey')) {
      return step(
        "Find the key to the Clocktower's lock.",
        "The door only opens in the <b>Present</b>, but its key lies in the <b>Future</b> courtyard, guarded by the Warden. Stay out of its sight cone: hide behind the pillars, or slip into the Present when it turns your way. In the Present, the key's spot is inside the fountain. Tempo works on everything out there: slow the Warden or a searchlight to slip past it, or speed the Warden up to hurry it off a corner. The moment you lift the key the Warden comes for you, so slow it down and walk away.",
      );
    }
    if (eraMissing.length) {
      const back = f.posternOpen ? 'The postern passage past the gatehouse vault leads back west.' : 'In the <b>Present</b>, pull the old postern lever at the west edge of Millrace Hollow to open a passage back west.';
      return step('The lock needs all three Era Keys too.', `The great lock has four keyholes. You still need ${eraMissing.join(' and ')}. ${back}`);
    }
    if (!f.regulatorsSynced) {
      return step(
        "Bring the door's two regulators into step.",
        `Two brass flywheels stand in the courtyard (<b>Present</b>), one by the Clocktower door and one west of the fountain. The lock won't turn until their markers pass the top together. Tempo only reaches what is near you: stand beside just one and hold ${keys.slow} until its marker comes round level with the other's, then let go.${keys.tempoNote}`,
      );
    }
    return step('Unlock the Clocktower.', 'Use the keys on the Clocktower door, in the <b>Present</b>. The lock has not been made yet in the Past, and it has rusted solid in the Future.');
  }
  // ---- the Gearworks, inside the clock
  if (f.gearworksOpen) {
    const b = game.player.body, G = GEAR;
    const slow = keys.slow, fast = keys.fast;
    if (x < L.gearX0) return step('Climb up into the clock.', 'The glowing doorway on the east wall of the Tower floor (<b>Present</b>) leads up into the Gearworks.');
    if (b.y < G.ledgeA.top - 0.5 && x < G.springs[0].x)
      return step('Climb the Gearworks.', `The hammers slam far too fast to slip under. Hold ${slow} to slow time around you, then run beneath them. Tempo runs on the Chronoheart's ring: let go and it refills.`);
    if (b.y < G.ledgeA.top - 0.5)
      return step('Climb the Gearworks.', `The spring plate kicks harder the faster it runs. Stand on it and hold ${fast}, and steer onto the ledge as it throws you up.`);
    if (b.y < G.floorB.top - 0.5)
      return step('Climb the Gearworks.', `More hammers (slow them with ${slow}), then another spring plate to the level above (speed it up with ${fast}).`);
    if (b.y < G.summit.top - 0.5)
      return step(
        'Reach the great mainspring.',
        `Every few seconds the Tower stutters and throws the lift back down. At normal speed it never reaches the top in time. Stand on it and hold ${fast} to hurry it up, then hold ${slow} at the top so it waits while you step onto the summit.`,
      );
    if (!f.mainspringCalmed)
      return step(
        'Calm the runaway mainspring.',
        `Three brass escapement pins around the summit have popped loose, and their whipping arms spin too fast to approach. Jump or roll over the golden floor pulses, hold ${slow} to slow each escapement arm, and strike each pin three times with your wrench.`,
      );
    return step('Wind the great mainspring.', 'All three escapement pins are locked. Examine the great mainspring to steady the Tower\'s heart.');
  }
  // ---- Clocktower
  const missing = [];
  if (!hasDisc) missing.push('the Sun Disc (Sun Terrace, in the Past)');
  if (!hasHammer) missing.push('the Bell Hammer (Smithy Lane)');
  if (!hasCore) missing.push('the Fusion Core (Gatehouse vault, in the Future)');
  if (missing.length) {
    const back = f.posternOpen ? 'The postern passage leads back west through the rubble.' : 'In the <b>Present</b>, pull the old postern lever at the west edge of Millrace Hollow to open a passage back west.';
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
  return touch
    ? { seal: 'the <b>Seal</b> button', echo: 'the <b>Echo</b> button', slow: 'the <b>Slow</b> button', fast: 'the <b>Fast</b> button', tempoNote: '' }
    : { seal: '<kbd>R</kbd>', echo: '<kbd>V</kbd>', slow: '<kbd>Q</kbd>', fast: '<kbd>E</kbd>', tempoNote: ' (Hold the key down: a quick tap travels an era instead.)' };
}
