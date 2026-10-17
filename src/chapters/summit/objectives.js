// The goal and hint for wherever you are on the mountain (the Menu shows them; the hint stays
// hidden behind a button until asked for). Kept short, for young players.
import { L, tierAt } from './level.js';

const step = (goal, hint) => ({ goal, hint });

/** Key / button names for the current input method. */
function keys() {
  const touch = document.body.classList.contains('touch');
  return touch
    ? { past: 'swipe right (or tap <b>Past</b>)', future: 'swipe left (or tap <b>Future</b>)', lantern: 'tap <b>Lantern</b>', echo: 'tap <b>Echo</b>', climb: 'push up on the joystick' }
    : { past: '<kbd>Q</kbd>', future: '<kbd>E</kbd>', lantern: '<kbd>R</kbd>', echo: '<kbd>V</kbd>', climb: '<kbd>W</kbd>' };
}
const up = (k, end) => `Keep climbing: at the ${end} end, where the flags are, the road turns back up the mountain. Walk up it (${k.climb}).`;

export function currentGoal(game) {
  const s = game.state, f = s.flags, b = game.player.body, x = b.x;
  const k = keys(), tier = tierAt(b.z);
  const lantern = (age) => `Light the Lantern (${k.lantern}): it always lights on the First Age.${age === 'the First Age' ? '' : ` Swing it forward to <b>${age}</b> with ${k.future}.`} Inside its light, that age is real. Walk across with it lit.`;

  if (f.endingAge !== undefined) {
    const left = game.ch.COG_TOTAL - s.cogs.length;
    return step('The hours are home.', `Highcrest is yours to wander, in the age you chose.${left > 0 ? ` (${left} Lost Cog${left === 1 ? '' : 's'} still hidden on the mountain.)` : ''}`);
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
      return step('Climb Highcrest.', up(k, 'east'));
    case 3:
      if (!f.hasEcho) return step('Talk to Michelle.', 'She is waiting at the east end of the Clockworks.');
      if (!f.clockworksOpen) return step('Open the clockworks door.', `It wants all three green plates held at once. Stand on a plate, press ${k.echo} to record, wait a second, and press ${k.echo} again: your echo stays on that plate. Do it again on the second plate, then stand on the third yourself.`);
      if (!f.gateDPassed) return step('Get through the gold gate.', `It's open only while its gold plate is held, and the plate is too far from the gate to make it through in time. Leave an echo on the plate (stand on it, ${k.echo}, wait, ${k.echo}), and walk through.`);
      return step('Climb Highcrest.', up(k, 'west'));
    case 4:
      if (x <= L.crev1X1) return step('Cross the crevasse.', `Only the First Age has a bridge over it, and the frost won't let you shift. At the edge: ${lantern('the First Age')}`);
      if (x < L.downX0) return step('Get over the rockfall.', `The falls beside it freeze into a stair in the Stopped Age. In the frost, at the foot of the falls: ${lantern('the Stopped Age')} Then climb the ice steps (jump), and over.`);
      return step('Climb to the summit.', up(k, 'east'));
    default:
      if (x > L.frostWallX && !f.hoursReturned) return step('Get through the frozen doors.', `The ice is the Stopped Age's. In the First Age there were no doors here at all. At the ice: ${lantern('the First Age')}`);
      if (f.hoursReturned) return step('Choose where to stay.', 'The Chronoheart has one last shift left in it.');
      if (!f.summitTalk) return step('Find Sir Christopher.', 'He is at the Needle, at the west end of the summit.');
      return step('Show Sir Christopher the Stopped Age.', `He doesn't believe what his hour is turning into. Next to him, light the Lantern (${k.lantern}) and swing it to the Stopped Age (${k.future}). Then talk to him.`);
  }
}
