// The goal and hint for wherever you are on the mountain (the Menu shows them; the hint stays
// hidden behind a button until asked for).
import { L, tierAt, inArena } from './level.js';

const step = (goal, hint) => ({ goal, hint });

/** Key / button names for the current input method. */
function keys() {
  const touch = document.body.classList.contains('touch');
  return touch
    ? { past: 'swipe right (or tap <b>Past</b>)', future: 'swipe left (or tap <b>Future</b>)', lantern: 'tap <b>Lantern</b>', echo: 'tap <b>Echo</b>', attack: 'tap <b>Attack</b>', climb: 'push up on the joystick' }
    : { past: '<kbd>Q</kbd>', future: '<kbd>E</kbd>', lantern: '<kbd>R</kbd>', echo: '<kbd>V</kbd>', attack: '<kbd>X</kbd>', climb: '<kbd>W</kbd>' };
}
const up = (k, end) => `Keep climbing: at the ${end} end, where the flags are, the road turns back up the mountain. Walk up it (${k.climb}).`;

export function currentGoal(game) {
  const s = game.state, f = s.flags, inv = s.inventory, b = game.player.body, x = b.x;
  const k = keys(), tier = inArena(b.x, b.y, b.z) ? 5 : tierAt(b.z); // (the End of Time counts as the summit)
  const lantern = (age) => `Light the Lantern (${k.lantern}): it always lights on the First Age.${age === 'the First Age' ? '' : ` Swing it forward to <b>${age}</b> with ${k.future}.`} Inside its light, that age is real. Walk across with it lit.`;

  if (f.finished) {
    const left = game.ch.COG_TOTAL - s.cogs.length;
    if (left === 0 && !f.masterKey) return step('Take all ten Lost Cogs to Orin.', 'He is at the foot of the Needle, at the west end of the summit.');
    return step(
      'Midwinter Night.',
      `Highcrest is yours to wander, in all three ages.${left > 0 ? ` (${left} Lost Cog${left === 1 ? '' : 's'} still hidden on the mountain.)` : " (The Master's Key opens the star-iron door in Hollowmere Square.)"}`,
    );
  }
  switch (tier) {
    case 0:
      if (x < L.pineX + 2) return step('Climb Highcrest.', `Walk east through Base Camp. A great pine has fallen across the path: in the First Age it's only a sapling. ${k.past} to step into the Past, walk past it, then ${k.future} to come back.`);
      return step('Climb Highcrest.', up(k, 'east'));
    case 1:
      if (!f.hasLantern) return step('Find Ingrid the Lamplighter.', 'She is on the Lantern Road, by the houses.');
      if (x > L.ravineX1) return step('Cross the ravine.', `The only bridge across it is in the First Age, and the frost won't let you shift there. At the edge of the ravine: ${lantern('the First Age')}`);
      return step('Climb Highcrest.', up(k, 'west'));
    case 2:
      if (x < L.fallsX1 + 1) return step('Cross the falls.', `They pour right through the road. Only in the Stopped Age are they frozen over, and the frost won't let you shift there. At the edge: ${lantern('the Stopped Age')}`);
      if (!f.christopherMet) return step('Cross the Sundial Terrace.', 'Someone is standing by the statue.');
      if (f.christopherMet && !f.notebooksRead) return step('Climb Highcrest.', `${up(k, 'east')} Orin said Donald Eugene doesn't want you reading something at the top.`);
      return step('Climb Highcrest.', up(k, 'east'));
    case 3:
      if (!f.hasEcho) return step('Talk to the stranger.', 'The old woman in the winter shawl is waiting at the east end of the Clockworks.');
      if (!f.clockworksOpen) {
        return step(
          'Open the clockworks door.',
          `It wants all three green plates held at once, and the third plate is crusted in frost (requiring the <b>First Age</b> Lantern light). Record echoes (${k.echo}) on the first two plates, then light your Lantern (${k.lantern}) on the First Age and stand on the third plate yourself (or record an Echo while holding the lit Lantern!).`,
        );
      }
      if (!inv.includes('masterDrawings') && !f.selaBuilt && x > L.gateDX) {
        return step("Take the Founder's drawings.", 'The parchment rolls lie in the middle of the Clockworks hall. Sela, in the First Age, has been waiting six hundred years for them.');
      }
      if (!f.gateDPassed) {
        return step(
          'Get through the gold gate.',
          `Leave an echo on the gold plate (${k.echo}), OR strike the brass resonance chime three times with your wrench (${k.attack}) to hold the gate open for 9 seconds.`,
        );
      }
      return step('Climb Highcrest.', up(k, 'west'));
    case 4:
      if (x <= L.crev1X1 && !f.selaBuilt) {
        if (inv.includes('masterDrawings')) {
          return step("Give the Founder's drawings to Sela.", `Before the frost, shift to the <b>First Age</b> (${k.past}) and hand the drawings to Sela the Stonecutter, so her masons build a stone bridge across the crevasse (or cross with the First Age Lantern).`);
        }
        return step('Cross the crevasse.', `Only the First Age has a bridge over it, and the frost won't let you shift. At the edge: ${lantern('the First Age')}`);
      }
      if (x < L.downX0) {
        if (f.springOpened) return step('Climb the warm stone terraces.', 'Six hundred years of warm springwater have carved stepped terraces right over the rockfall in the Present.');
        return step(
          'Get over the rockfall.',
          `Before the frost zone, shift to the <b>First Age</b> (${k.past}) and strike the frozen thermal sluice three times with your wrench (${k.attack}) to carve warm terraces over 600 years—OR use the Lantern (${k.lantern} + ${k.future}) in the frost to climb the Stopped Age's frozen cascade.`,
        );
      }
      return step('Climb to the summit.', up(k, 'east'));
    default:
      if (x > L.frostWallX && !f.hoursReturned) return step('Get through the frozen doors.', `He sealed them. In the First Age there were no doors here at all. At the ice: ${lantern('the First Age')}`);
      if (!f.notebooksRead && !f.summitTalk) return step('Find what he sealed in.', "Inside the observatory, on the bench past Tobin's star-books.");
      if (!f.summitTalk) return step('Find Donald Eugene.', 'At the foot of the Needle, at the west end of the summit, the air shimmers.');
      if (!f.orinPhase1) {
        return step(
          'Break the Anchor-Clock (1/3).',
          `At the End of Time, waves of rewritten time roll down the hall. Light the Lantern (${k.lantern}) on the <b>First Age</b>: its old light carries you through them (or jump them). Then strike the Anchor-Clock by the back wall three times with your wrench (${k.attack}).`,
        );
      }
      if (!f.orinPhase2) {
        return step(
          'Hold both of his locks (2/3).',
          `Record an <b>Echo</b> (${k.echo}) standing on one of the two blue lock plates, then stand on the other plate yourself. Jump the gnomon's sweeping shadow as it comes round. The barrier in front of the throne falls.`,
        );
      }
      if (!f.zachHeld || !f.meganHeld) return step('Hold Zach and Megan in their moment (3/3).', `He is rewriting them! Stand close, face them, hold ${k.attack} and let go: a Stasis wave holds them where his rewrites can't reach.`);
      return step('Hold him still (3/3).', `Climb the dais, face Donald Eugene, hold ${k.attack} and let go.`);
  }
}
