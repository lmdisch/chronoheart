// The on-screen goal. Each step has a gentle nudge (always shown) and a direct hint
// (revealed only when the player asks for it), based on where the player is and what
// they've done. Bells still unrung are named when they block the end of the game.
import { L, WELL, COG_TOTAL } from './level.js';

const step = (goal, hint) => ({ goal, hint });

/** -> { goal, hint } */
export function currentGoal(game) {
  const s = game.state, f = s.flags, inv = s.inventory;
  const b = game.player.body, x = b.x;
  const k = inputNames();
  const hasClapper = inv.includes('clapper') || f.clapperFitted;
  const missing = [
    !f.noonRung && 'the <b>Noon Bell</b> (Bell Rock, at the end of the Long Pier, in the Present)',
    !f.dawnRung && "the <b>Dawn Bell</b> (off the lighthouse gallery at Keeper's Light, in the Past)",
    !f.duskRung && "the <b>Dusk Bell</b> (the Warden's Wharf, in the Future)",
  ].filter(Boolean);

  // ---- after the story
  if (f.finished) {
    if (f.ownWatch) return step('The tide is in.', 'Saltwick is yours to wander, in all three ages. Go and see what the sea has done to the Future.');
    const n = s.cogs.length;
    if (n >= COG_TOTAL) return step('Take the twelve Lost Cogs to Donald Eugene.', 'He is on the quay, at the west end of Saltwick, in the <b>Present</b>.');
    return step('The tide is in.', `Saltwick is yours to wander, in all three ages. Donald Eugene could build you a watch of your own from all twelve Lost Cogs: you have ${n}.`);
  }
  if (f.heartPlaced) return step('Ride the tide out of the Well.', `The water is rising. ${k.swim} to swim up with it, then head west, back up to the door you came in by.`);

  // ---- The Tide Well
  if (x >= L.wellX0) {
    const [A, B, C] = WELL.terraces;
    if (x <= A.x1 + 1 && b.y >= A.top - 0.5) {
      if (f.gateA) return step('Go down into the Well.', 'The first gate stands open. Drop down to the next terrace.');
      return step(
        'Open the first gate.',
        "Only the Present's gates still move, and this one's lever is on a builders' scaffold high on the back wall, in the <b>Past</b>. Nothing climbs that high in the Past or the Present: but in the <b>Future</b>, fallen masonry by the door makes a stair. Climb it. At the top, step back to the <b>Present</b> (two planks of the old scaffold still hold), then on into the <b>Past</b>, and throw the lever.",
      );
    }
    if (x <= B.x1 + 1 && b.y >= B.top - 0.5) {
      if (f.gateB) return step('Go down into the Well.', 'The second gate stands open. Drop down to the next terrace.');
      if (!f.crankTaken) return step('Open the second gate.', `Its winch is walled into an alcove in the <b>Past</b>, and the winch's crank is locked in a cage in the <b>Future</b>. In the <b>Present</b>, stand where the cage is (the front of the terrace, near the gate), ${k.lens} on the Future, and ${k.reach} to take the crank out through the lens.`);
      return step('Open the second gate.', `Now the winch: in the <b>Present</b>, stand at the back of the terrace where the Past's alcove is, ${k.lens} on the Past, and ${k.reach} to fit the crank and wind it.`);
    }
    if (x <= C.x1 + 1 && b.y >= WELL.pit.floor - 0.5) {
      if (f.gateCPassed) return step("Reach the Tide Clock's heart.", 'The last gate stands open. Drop down to the bottom of the Well.');
      return step(
        'Get through the last gate.',
        `Its lever holds it open for only a few seconds, and the lever is in a pit in the <b>Future</b>, with no way out. Stand by the gate in the <b>Present</b> first. Walk west to the middle of the terrace, step into the <b>Future</b>, and drop into the pit. Pull the lever, then ${k.rewind}: the watch runs you back up, back into the Present, and back to the gate.`,
      );
    }
    return step("Reach the Tide Clock's heart.", "The heart's cradle is at the foot of the great wheel, at the bottom of the Well, in the <b>Present</b>.");
  }

  // ---- Gull's Head
  if (x >= L.headX0) {
    if (f.wellOpen) return step('Enter the Tide Well.', 'The door at the top of the stair is open, in the <b>Present</b>.');
    if (missing.length) return step('The Well will only open to three bells.', `You still need ${missing.join(', and ')}.`);
    return step('Open the Tide Well.', "Climb the long stair. The Well's door only opens in the <b>Present</b>: the tide folk haven't finished it in the Past, and the Dry Age has salted it shut.");
  }

  // ---- The Warden's Wharf
  if (x >= L.wharfX0) {
    if (f.duskRung) return step('Keep heading east.', "Gull's Head, and the Tide Well, are just along the shore.");
    if (!hasClapper) return step('The Dusk Bell has no clapper.', 'The Dusk Bell stands on the <b>Future</b> wharf, and has never rung. Its clapper is in Salvage Pit 3, back west in the Saltings, in the <b>Future</b>: a pit with no way out. Jump in anyway, take it, and let the pocketwatch run you back out.');
    if (!f.clapperFitted) return step('Fit the clapper to the Dusk Bell.', "The bell hangs in the middle of the <b>Future</b> wharf, and a Warden walks a loop around it. Stay out of its sight cone and the searchlight. In the Present that spot is inside the boathouse, so walk most of the way in the <b>Present</b>, along the back or the front of the road, then step into the Future beside the bell.");
    if (f.duskStroke1 && !f.wardenKeyStruck) {
      return step("Stun the Harbor Warden through the lens.", `The Warden's shield blocks the Dusk Bell! Slip into the <b>Present</b> and walk along the front of the boathouse road (near the Warden's spot), ${k.lens} on the <b>Future</b>, and swing your wrench (${k.attack}) to strike its wind-up key.`);
    }
    if (f.duskStroke2 && !f.wardenCrashed) {
      return step("Bait the Harbor Warden's charge.", `The shield is back up! In the <b>Future</b>, let the Warden charge toward you near a stone bollard, then ${k.rewind} so it crashes and drops its shield.`);
    }
    return step('Ring the Dusk Bell.', `Three strokes of your wrench (${k.attack}). After the first stroke, strike the Warden's wind-up key from the <b>Present</b> through the lens; after the second, bait its charge in the <b>Future</b> and ${k.rewind} so it crashes into a bollard.`);
  }

  // ---- The Dry Lock
  if (x >= L.lockX0) {
    if (x > L.chanX1 + 1 || f.lockPassed) return step('Keep heading east.', f.lockPassed ? "The bridge's door stands open now, in the <b>Future</b>. The Warden's Wharf is beyond it." : "The Warden's Wharf is just ahead.");
    if (!f.hasReach) return step('Find a way across the lock.', "Only the Future's bridge crosses the channel, and its door's control panel hangs out over the drop, where nobody can stand. You'll need a way to touch what you can only see. Odalys, back at the lighthouse, has a glass for that: help her light her lamp.");
    return step(
      'Get through the door on the bridge.',
      `In the <b>Future</b>, climb the ladder to the walkway and stand at the door first. Step off the walkway's edge, travel to the <b>Present</b>, and walk out along the old jetty to its end. There, ${k.lens} on the Future: the control panel hangs right in front of you. ${k.reachCap} to press it, then ${k.rewind}. The watch runs you back along the jetty, back into the Future, and up to the door while it is still open.`,
    );
  }

  // ---- Keeper's Light
  if (x >= L.lightX0) {
    if (f.dawnRung) return step('Keep heading east.', 'The Dry Lock is just along the shore.');
    if (f.lampLit) {
      if (b.y >= L.galleryY - 0.5) return step('Ring the Dawn Bell.', `In the Past, the Dawn Bell hangs right here, out over the water, with nothing beneath it to stand on. Stand near the end of the gallery, ${k.lens} on the <b>Past</b>, and swing your wrench through it (${k.attack}), three times.`);
      return step("Climb to the lighthouse gallery.", "The Keeper's stair is open now, in the <b>Present</b>: the ladder up the front of the sea stack, then the one up the side of the tower.");
    }
    if (inv.includes('pearl')) return step('Bring the pearl to Odalys.', 'She is at the foot of the lighthouse, in the <b>Present</b>.');
    if (f.clamSeeded) return step('See what the Mother Clam has made.', 'Six hundred years on, the pool is dry. Climb down the ladder into it in the <b>Present</b>, and look inside the fossil clam.');
    if (f.gotChip) return step('Grow a pearl for the lighthouse lamp.', `A pearl grows around a seed, given three lifetimes. In the <b>Past</b>, the pool beside the sea stack is full of water, and the Mother Clam lies on its floor. Dive down (let go of ${k.jumpKey} to sink) and give her the chip.`);
    return step('Find the Dawn Bell.', 'Isha says it hangs from a mast on a lone rock, out over the water, in the Past. In the Present, a lighthouse stands on that rock. Talk to its keeper.');
  }

  // ---- The Saltings
  if (x >= L.saltX0) {
    if (x > L.wallX1 + 1) return step('Keep heading east.', "Keeper's Light is just along the shore.");
    const pit = hasClapper ? '' : ' (And Salvage Pit 3, just here in the Future, has something in it you will want later. It has no way out. You have a pocketwatch.)';
    if (f.fenceBuilt) return step('Get over the sea wall.', `Three hundred years of wind have heaped a dune against your nets. In the <b>Future</b>, walk up it and over the wall.${pit}`);
    if (inv.includes('nets')) return step('Give the wind something to pile sand against.', `String the nets across the drying posts by the wall, in the <b>Present</b>.${pit}`);
    return step('Find a way over the sea wall.', `The wall is too sheer to climb in any age, though it is lowest in the Future, where a little sand has drifted against it. Sand piles up behind anything that stands in the wind for long enough: the drying posts beside the wall, in the Present, would hold a net. There are old nets on the deck of the Marigold, the boat aground in the Mudflats.${pit}`);
  }

  // ---- The Long Pier
  if (x >= L.pierX0) {
    if (x > L.rockX1 + 1) return step('Keep heading east.', f.noonRung ? 'The Saltings are just along the shore.' : 'The Saltings are just along the shore. (You walked straight past the Noon Bell, on top of Bell Rock.)');
    if (x >= L.rockX0 && b.y > 3) {
      if (!f.noonRung) return step('Ring the Noon Bell.', `It hangs in its frame on top of Bell Rock. Three good swings of your wrench (${k.attack}).`);
      return step('Keep heading east.', 'Steps lead down the far side of Bell Rock.');
    }
    if (!f.hasRewind) return step('Find a way out to Bell Rock.', 'The stranger in the shawl is waiting at the head of the pier. She has something to say about that watch.');
    if (!f.tideGatePassed) {
      return step(
        'Get through the tide gate.',
        `The gate at the end of the quay deck opens for a few seconds when its lever is pulled, but the lever is down on the shore, and the only way back up is the ladder at the far end. So: climb the ladder and walk to the gate first. Step off the front of the deck beside it, pull the lever below, then ${k.rewind}. The watch runs you straight back up to the gate.`,
      );
    }
    return step('Head out onto Bell Rock.', 'The tide gate stands open now. Climb the ladder at the west end of the quay deck and walk through.');
  }

  // ---- The Mudflats
  if (x >= L.flatsX0) {
    if (x > L.basinX1) return step('Keep heading east.', 'The Long Pier is just ahead.');
    return step('Find a way across the harbor.', `In the Present it is sinking mud. In the <b>Past</b> it is clean, deep sea: walk in and swim across (${k.swim} to rise). Or, in the <b>Future</b>, it is dry: ladders lead down to the harbor floor and up the far side.`);
  }

  // ---- Saltwick Quay
  if (!f.metBrannoch) return step('Ask where the three bells hang.', 'Harbormaster Brannoch is on the quay, a little way east of the barge.');
  return step('Head east, toward the Noon Bell.', 'Follow the quay east, past the Mudflats, to the Long Pier.');
}

/** Key / button names for the current input method. */
function inputNames() {
  const touch = document.body.classList.contains('touch');
  return touch
    ? {
        rewind: 'hold <b>Rewind</b>', lens: 'hold the amulet to open the time lens', reach: 'tap <b>Interact</b>', reachCap: 'Tap <b>Interact</b>',
        attack: 'the <b>Attack</b> button', swim: 'Hold <b>Jump</b>', jumpKey: '<b>Jump</b>',
      }
    : {
        rewind: 'hold <kbd>R</kbd>', lens: 'hold <kbd>Tab</kbd> to open the time lens (<kbd>Q</kbd> / <kbd>E</kbd> choose the age)', reach: 'press <kbd>F</kbd>', reachCap: 'Press <kbd>F</kbd>',
        attack: '<kbd>X</kbd>', swim: 'Hold <kbd>Space</kbd>', jumpKey: '<kbd>Space</kbd>',
      };
}
