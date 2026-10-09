// Story content and all puzzle interactions.
import { audio } from './audio/audio.js';
import { ERA } from './core/util.js';
import { touchActive } from './ui/touch.js';
import { erosionCells } from './levels/hollowmere.js';

export const ITEMS = {
  acorn: { name: 'Acorn', desc: "Megan's finest acorn. It just needs time to grow." },
  hammerBroken: { name: 'Cracked Bell Hammer', desc: 'Star-iron that needs a lifetime of tempering.' },
  hammer: { name: 'Bell Hammer', desc: 'Era Key of the Present. Tempered for three hundred years.', key: true },
  rod: { name: 'Iron Rod', desc: 'A sturdy iron rod.' }, // no longer used; kept so old saves still show it
  disc: { name: 'Sun Disc', desc: 'Era Key of the Past. Warm to the touch.', key: true },
  core: { name: 'Fusion Core', desc: 'Era Key of the Future. It hums with stored time.', key: true },
  starChart: { name: 'Ancient Star Chart', desc: 'Borrowed from the Future archive. It belongs to Samaria, the Sun-Keeper.' },
  lilySeeds: { name: 'Sun-Lily Seeds', desc: 'Golden seeds from a flower that died out long ago.' },
  medallion: { name: "Aria's Medallion", desc: "A smith's medallion stamped with the family mark. For Lillian." },
  wheel: { name: 'Brass Sluice Wheel', desc: "The old mill's sluice wheel, kept in a museum for three hundred years. It winds the sluice gate shut." },
  cable: { name: 'Steel Cable', desc: 'A spool of cable from the scrapyard. It will not fray or rot for a very, very long time.' },
  clockKey: { name: 'Escapement Key', desc: "The key to the Clocktower's great lock. Only a lock that still turns will take it.", showcase: true },
};

/** Kindness side quests. `start` is the flag set when the favour is asked. */
export const FAVOURS = [
  { id: 'chart', title: "Samaria's star chart", start: 'chartQuest', todo: "A storm carried off the Sun-Keeper's star chart. Someone, somewhen, must have found it.", done: 'You returned the star chart to Samaria.' },
  { id: 'lilies', title: "Louise's sun-lilies", start: 'lilyQuest', todo: "Sun-lilies once grew in the square, in the oldest days. Bring some back to Louise's flower bed.", done: 'Sun-lilies bloom in the square again.' },
  { id: 'keepsake', title: "Lillian's keepsake", start: 'keepsakeQuest', todo: 'Lillian has nothing her ancestor Aria ever held. Perhaps Aria could spare something.', done: "Lillian wears Aria's medallion at the bench." },
];

const N = (text) => ({ who: null, name: '', text });
const Wr = (text) => ({ who: 'vivienne', name: 'Vivienne', text });

export const INTRO = [
  N('Hollowmere. A valley where the river bends, and where the great Clocktower has kept time for five hundred years.'),
  N('This morning, for the first time anyone can remember... it stopped.'),
  Wr('Master Eugene? ...Master?'),
  Wr("Three days gone, and now the Tower's gone silent. He'd never leave his workshop this long."),
  Wr("Wait. Something's glowing on his workbench..."),
];

export const ENDING = [
  N('Across three ages at once, the Clocktower shudders... and begins to tick.'),
  { who: 'eugene', name: 'Eugene', text: "Vivienne! I knew you'd find your way. I've been stuck between the ages since the Tower stopped. Your keys pulled me back through." },
  Wr('Master Eugene! You\'re all right! And the amulet... look, the crack is gone!'),
  { who: 'eugene', name: 'Eugene', text: "Mended by the Tower's heart. That means it's yours now, apprentice. Time always needs someone to look after it." },
  { who: 'eugene', name: 'Eugene', text: 'Now then. Shall we go and see what else has come loose?' },
];

function npcLines(game, id) {
  const f = game.state.flags, inv = game.state.inventory;
  const S = (who, name) => (text) => ({ who, name, text });
  switch (id) {
    case 'louise': {
      const m = S('louise', 'Elder Louise');
      if (!f.hasAmulet) return [m("Vivienne, dear. The Tower's stopped and Eugene's vanished. People say the old ages are bleeding through. I saw a lizard the size of a dog in the square at dawn!"), m('Have you looked in his workshop? He always kept his secrets on that bench.')];
      if (game.state.kindness.includes('lilies')) return [m('Look at them, Vivienne. Sun-lilies, right here in the square, just like Grandmother said. Thank you, dear.')];
      if (inv.includes('lilySeeds')) return [m('Are those... sun-lily seeds? But they died out centuries ago! Plant them in my old flower bed by the road, would you?')];
      if (game.player.body.x < 50) {
        const lines = [m("That glow... Eugene's amulet! So you have the gift too."), m("Listen. The river ford washed out long ago, but in the oldest days people crossed it on stepping stones."), Wr('The oldest days... the Past!')];
        if (!f.lilyQuest) {
          f.lilyQuest = true;
          lines.push(m("One more thing, dear, if you have a moment. That empty flower bed by the road was my grandmother's pride."), m('She said golden sun-lilies grew in this square in the oldest days. None have bloomed here in living memory.'), { favour: 'lilies' });
        }
        return lines;
      }
      return [m('Go on, child. The Clocktower is at the far end of the valley, past the gatehouse.')];
    }
    case 'samaria': {
      const y = S('samaria', 'Samaria the Sun-Keeper');
      if (!f.hasAmulet) return [y('...')];
      const disc = y('We keep the Sun Disc in the observatory on the high terrace to the east. Only someone who lays stones for the ages can climb up to it.');
      if (game.state.kindness.includes('chart')) return [y("Every night I mark the sun's path on the chart you brought back. The calendar is whole again."), disc];
      if (inv.includes('starChart'))
        return [
          y("My star chart! Where did you... no. I won't ask. It smells of strange metal and stranger centuries."),
          { take: 'starChart' },
          y('Thank you, traveller. Without it, the planting days would be guesswork, and the village would go hungry.'),
          { kind: 'chart' },
        ];
      if (f.chartQuest) return [y('Still no sign of my star chart? The storm carried it far. Perhaps farther than anyone can walk.'), disc];
      f.chartQuest = true;
      return [
        y('You shimmer like a mirage, traveller. Have you come from another age?'),
        y("Forgive me, I am distracted. Last night a storm tore my star chart from the observatory and carried it off. Without it, I cannot keep the sun's calendar."),
        { favour: 'chart' },
        disc,
      ];
    }
    case 'tick': {
      const t = S('tick', 'TICK');
      if (game.state.kindness.includes('chart'))
        return [t('ARCHIVE NOTE: ITEM 4471, "ANCIENT STAR CHART", HAS BEEN... RETURNED TO ITS OWNER? IN THE DISTANT PAST?'), t('RECORDS NOW SHOW THE ANCIENT SUN CALENDAR WAS NEVER INTERRUPTED. HOW DELIGHTFUL.')];
      if (inv.includes('starChart')) return [t('THE STAR CHART IS ON LOAN TO YOU. ITS ORIGINAL OWNER IS LISTED AS "SAMARIA, SUN-KEEPER".')];
      if (f.chartQuest)
        return [
          t('QUERY: ANCIENT STAR CHART. SEARCHING...'),
          t('ITEM 4471 LOCATED. A STAR CHART RECOVERED FROM THE VALLEY AFTER A GREAT STORM. AGE: VERY.'),
          t('YOU MAY BORROW IT. PLEASE RETURN IT TO ITS OWNER. OR TO US. TIME IS CONFUSING.'),
          { give: 'starChart' },
        ];
      return [t('GREETINGS, VISITOR. WELCOME TO HOLLOWMERE MEMORIAL PLAZA.'), t('ERROR: YOUR TIMESTAMP IS INVALID. ARE YOU... EARLY?'), t('ARCHIVE NOTE: AN AQUEDUCT LIES BENEATH THE SANDSTONE CLIFFS. IT WAS CARVED BY A SPRING THAT DRIPPED FOR CENTURIES.')];
    }
    case 'holo':
      return [N('MEMORIAL: EUGENE THE CLOCKMAKER, WHO RESTARTED THE GREAT TOWER WITH THE HELP OF HIS APPRENTICE, V—[DATA CORRUPTED]'), Wr('...With the help of his apprentice? Does that mean... me?')];
    case 'michelle': {
      const m = S('michelle', 'Michelle the Wise');
      if (f.metMichelle && game.state.kindness.length >= FAVOURS.length)
        return [m("Samaria's calendar, Louise's lilies, Lillian's keepsake... You helped people in every age, Vivienne."), m('Every age remembers a kindness. And so do I.')];
      if (f.metMichelle)
        return [m('Use the power of time wisely, Vivienne. And whatever age you find yourself in, always remember to help others.')];
      f.metMichelle = true;
      return [
        m('Ah. The clockmaker\'s apprentice, right on time. The river has been expecting you.'),
        m('A little advice before you cross. Time is a great power, and great powers are easy to waste. Use it wisely.'),
        m('And whatever age you find yourself in, always remember to help others. Every age remembers a kindness.'),
        Wr("I'll remember. Thank you, Michelle."),
      ];
    }
    case 'zach': {
      const z = S('zach', 'Zach Tiberious');
      if (f.acornPlanted || f.acornPlantedM)
        return [z('A tree?! Well, obviously. That is exactly what happens when you plant an acorn upside down in the river at midnight.'), z('...Which is clearly what you did. You\'re welcome.')];
      return [
        z('Ahem. Zach Tiberious, acorn expert. Seventeen years of experience. Possibly eighteen.'),
        z('Listen closely. To grow an acorn, you plant it upside down, in the river, on a Tuesday. Then you shout at it until it gets embarrassed and grows.'),
        z('Some people say "plant it in soil and wait." Amateurs. Soil is just the ground being lazy.'),
        z("If that fails, eat the acorn. Then YOU become the tree. That's basic botany."),
        N('(Behind Zach, Megan shakes a tiny head very, very slowly.)'),
      ];
    }
    case 'megan': {
      const n = S('megan', 'Megan the Squirrel');
      if (f.acornPlanted) return [n('Chk-chk! (Megan chatters proudly at the enormous oak.)')];
      if (f.acornPlantedM) return [n('Chk! (Megan pats the little sapling in the planter, looks up at the wall, then stares far off into the future.)')];
      if (inv.includes('acorn')) return [n('Chk! (Megan points a tiny paw at the acorn, then at the old planter box, then at the dirt beneath the cobbles, and makes a growing motion.)')];
      return [n('Chk! Chk-chk! (Megan is guarding one perfect acorn, glancing from you, to the acorn, to the high town wall.)')];
    }
    case 'aria': {
      const b = S('aria', 'Aria the Smith');
      if (f.keepsakeQuest && !f.medallionGiven && (f.hammerLeft || inv.includes('hammerBroken')))
        return [
          Wr('Aria, I met someone from your family. Lillian. She runs a shop here, three hundred years from now.'),
          b('Three hundred... ha! So the forge outlives me. Good.'),
          b('Then she should have this. My mother stamped our mark in it. Tell her to wear it at the bench.'),
          { give: 'medallion', flag: 'medallionGiven' },
        ];
      if (f.hammerLeft) return [b("It's in the vault now. My grandkids' grandkids can fish it out, eh?")];
      if (inv.includes('hammerBroken')) return [b("If you know a way to give it a few centuries, my quench-vault's right there.")];
      return [
        b("Eugene's apprentice! You've got his look, like you're late for something that hasn't happened yet."),
        b('The Tower\'s bell hammer cracked last winter. Eugene brought it to me, but tempering star-iron properly takes a lifetime in the quench-vault. Longer than I\'ve got left.'),
        b("Take it. If you know a way to buy it a few centuries, you're welcome to use my vault."),
        { give: 'hammerBroken' },
      ];
    }
    case 'callie': {
      const b = S('callie', 'Callie the Carver');
      return [b('Hm. Callie the carver, at your service, spirit.'), b('Remember this: whatever you lay down now becomes the foundation for everything after. My grandchildren will build their houses on my stones.'), b('The Sun Disc sits up on the terrace. Far too high for most people.')];
    }
    case 'lillian': {
      const k = S('lillian', 'Lillian');
      const wish = [k("Funny thing. We have Aria's shop, her name, her stories... but not one thing she ever actually held."), k('I always wished I had something of hers.')];
      if (inv.includes('medallion'))
        return [
          k("Is this... Aria's medallion? That's our family mark!"),
          { take: 'medallion' },
          k("All we ever had were stories. Now I've got something she actually held. Thank you, Vivienne. Really."),
          { kind: 'keepsake' },
        ];
      if (game.state.kindness.includes('keepsake')) return [k('Ring that bell loud enough for all of us.'), k("(Lillian taps Aria's medallion, pinned proudly to her apron.)")];
      if (game.state.taken.includes('hammerGift')) {
        if (f.keepsakeQuest) return [k('Ring that bell loud enough for all of us.')];
        f.keepsakeQuest = true;
        return [k('Ring that bell loud enough for all of us.'), ...wish, { favour: 'keepsake' }];
      }
      if (f.hammerLeft)
        return [
          k('Wait. Glowing amulet. Dark hair in a bun. Goggles...'),
          k("Family legend says a girl like you would come for THE hammer. It's Aria's last masterwork, and it's been tempering in her vault for three hundred years."),
          k("It's been waiting for you, right there on the display case. Go on, take it."),
          ...(f.keepsakeQuest ? [] : (f.keepsakeQuest = true, [...wish, { favour: 'keepsake' }])),
        ];
      if (!f.keepsakeQuest) {
        f.keepsakeQuest = true;
        return [k("Hey, you're not from around here. Nice goggles."), k("This family shop has been here since my ancestor Aria's forge days. She supposedly left something unfinished... the stories never say what."), ...wish, { favour: 'keepsake' }];
      }
      return [k("Hey, you're not from around here. Nice goggles."), k("This family shop has been here since my ancestor Aria's forge days. She supposedly left something unfinished... the stories never say what.")];
    }
    case 'brn':
      return [{ who: 'brn', name: 'BR-4N', text: 'BZZT. BR-4N ONLINE. LILLIAN SAYS I AM NOT ALLOWED TO HUG CUSTOMERS.' }];
    case 'sheng': {
      const g = S('sheng', 'Sheng the Gatekeeper');
      return [g('The road past this gate collapsed in the quake a hundred years ago. Nothing but rubble now.'), g("My grandsire always said the future's wide open. Ha! Whatever that means.")];
    }
    case 'hobb': {
      const h = S('hobb', 'Hobb the Miller');
      if (f.sluiceClosed) return [h('A full millpond! The wheel turns again, and the old log boom floats like it did in Grandsire\'s day.'), h("You're a marvel, girl. Mind you keep to the logs. That water's deep enough to drown a horse.")];
      if (f.millDammed) {
        return [
          h("The pond came back, just like Grandsire said it once was! But look at it. It runs straight out through the sluice."),
          h('The wheel that winds the gate shut was sold for scrap before I was born. Some fool thought it belonged in a museum.'),
          h("Fill this pond to the brim and that old log boom lying in the mud would float again. You could walk clear across."),
        ];
      }
      return [
        h('Hobb, miller. Or I would be, if this hollow held a drop of water.'),
        h('My great-grandsire swore a spring once ran down that cliff. Then one day it wandered off into the hills, and the pond with it.'),
        Wr('A spring that wandered off... in the Past, maybe it can be turned back this way.'),
      ];
    }
    case 'tamsin': {
      const t = S('tamsin', 'Tamsin the Ropewright');
      if (f.bridgeSealed) return [t('Look at it. Not a fray, not a speck of rot, and it hums like a plucked string.'), t('Whatever you did, spirit, my bridge will outlive us all.')];
      if (f.bridgeBuilt) {
        const lines = [t("Strong as I could make it. Mind, the planks will rot and the posts will go soft. A lifetime, maybe two, and it'll be gone.")];
        if (f.hasSeal) lines.push(Wr("Unless it never ages at all. Eugene's Stasis Seal..."));
        return lines;
      }
      if (inv.includes('cable')) {
        return [
          t("What's this? Rope made of... iron? Cold, and finer than spider silk. It won't fray, will it?"),
          Wr('Not for a very, very long time.'),
          { take: 'cable' },
          N('Tamsin works through the afternoon, threading the cable through her planks and lashing it to the stakes.'),
          { flag: 'bridgeBuilt', refresh: true, sfx: 'socket' },
          t('There. The first bridge over the Thornwater! The far side is nothing but cliff, mind. My grandchildren will have to cut the road.'),
        ];
      }
      if (f.bridgeQuest) return [t("Rope that never rots. That's what I need. Find me some and I'll bridge this gorge.")];
      f.bridgeQuest = true;
      return [
        t('A traveller! Careful near the edge. The Thornwater has taken braver folk than you.'),
        t("I'm Tamsin. I mean to bridge this gorge, but every vine rope I twist frays within a season."),
        t('If only there were rope that never rotted. Spirits\' rope. Ha!'),
        Wr('Rope that never rots... there must be something like that in the Future.'),
      ];
    }
    default:
      return [N('...')];
  }
}

export async function talk(game, npc) {
  npc.talking = true;
  const lines = npcLines(game, npc.id);
  await game.dialogue.run(lines, (cmd) => {
    if (cmd.give) game.giveItem(cmd.give);
    if (cmd.taken) game.state.taken.push(cmd.taken);
    if (cmd.take) game.removeItem(cmd.take);
    if (cmd.flag) game.state.flags[cmd.flag] = true;
    if (cmd.favour) game.startFavour(cmd.favour);
    if (cmd.kind) game.completeKindness(cmd.kind);
    if (cmd.sfx) audio.sfx(cmd.sfx);
    if (cmd.refresh) {
      game.refreshWorld();
      game.save();
    }
  });
  npc.talking = false;
  if (npc.id === 'tick') game.state.flags.metTick = true;
}

/** "a", "a and b", "a, b and c" */
const listOf = (xs) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

export async function interact(game, ent) {
  const s = game.state, f = s.flags, inv = s.inventory;
  const say = (lines) => game.dialogue.run(Array.isArray(lines) ? lines : [lines]);
  switch (ent.id) {
    case 'workbench':
      if (f.hasAmulet) return say(Wr("Eugene's tools, all neatly arranged. Except his favourite wrench, which is in my apron."));
      await say([
        Wr("Eugene's amulet, the Chronoheart! He never let me touch it."),
        N("There's a note folded underneath it:"),
        N('"Vivienne. The Tower\'s heart has stopped and the ages are coming loose. The Chronoheart is cracked, but it will carry you for a little while."'),
        N('"Find the three Era Keys: the Sun Disc of the first age, the Bell Hammer of ours, and the Fusion Core of the last. Restart the Tower. ~O."'),
        Wr('The first age... and the last? He means the PAST and the FUTURE?!'),
      ]);
      f.hasAmulet = true;
      audio.sfx('key');
      game.hud.showAmulet(true);
      game.bursts.emit(ent.x, ent.y + 0.3, ent.z, 40, { color: [0x7ff6ff, 0xffd070], speed: 4, life: 0.9 });
      game.hud.toast(
        touchActive()
          ? '<b>Chronoheart obtained!</b> <b>Swipe</b> across the screen to travel: swipe left toward the Future, right toward the Past. You can also tap the era names at the top.'
          : '<b>Chronoheart obtained!</b> Press <kbd>Q</kbd> to go to the Past and <kbd>E</kbd> to go to the Future. Hold <kbd>Tab</kbd> to peek at another era.',
        7000,
      );
      setTimeout(() => game.hud.toast('The amulet drains while you\'re away from the Present, and recharges when you come back.', 6000), 7200);
      game.save();
      return;
    case 'lever':
      if (f.springOpen) return say(N('The spring flows freely now. Water trickles down the cliff face.'));
      f.springOpen = true;
      audio.sfx('lever');
      audio.sfx('splash');
      game.renderer.shake = 0.5;
      game.refreshWorld();
      await say([N('With a heavy clunk, a stone plug slides away. Spring water starts trickling down the cliff.'), Wr("Just a trickle... but if it keeps dripping for a few hundred years..."), Wr('Water wears away stone, given enough time!')]);
      await game.timelapse({ to: ERA.PRESENT, focus: [66.5, 2.5, 4.5], years: 600, caption: 'Drip by drip, the spring wears through the cliff...', erode: { cells: erosionCells(), origin: [66.6, 4, 7] } });
      game.save();
      return;
    case 'cliffSign':
      if (f.springOpen) return say(N('A smooth tunnel, carved through the cliff by centuries of dripping water.'));
      return say([N('Soft, crumbly sandstone. Old water stains run down from the top of the cliff, but no water has flowed here in living memory.'), Wr('If only water had been running here all this time...')]);
    case 'soil':
      if (f.acornPlanted) return say(N('A young sapling, growing nicely. It just needs time.'));
      if (inv.includes('acorn')) {
        game.removeItem('acorn');
        f.acornPlanted = true;
        audio.sfx('grow');
        game.bursts.emit(ent.x, 0.3, ent.z, 30, { color: [0x9aff7a, 0xffe070], speed: 3, life: 1 });
        game.refreshWorld();
        await say([N('You press the acorn into the rich, dark soil.'), Wr('Grow big and tall for me. You\'ve got a few centuries!')]);
        await game.timelapse({ to: ERA.PRESENT, focus: [93, 5, 1.5], years: 600, caption: 'The acorn takes root and grows...', grow: ['oak'] });
        game.save();
        return;
      }
      if (f.acornPlantedM) return say(N('Rich, dark, fertile soil. You already planted the acorn in the Present.'));
      return say(N('Rich, dark, fertile soil. Something could grow here, given enough time.'));
    case 'soilM':
      if (f.acornPlantedM) return say(N('A little oak sapling. Give it a few hundred years and it could tower over the town wall.'));
      if (inv.includes('acorn')) {
        game.removeItem('acorn');
        f.acornPlantedM = true;
        audio.sfx('grow');
        game.bursts.emit(ent.x, 0.6, ent.z, 30, { color: [0x9aff7a, 0xffe070], speed: 3, life: 1 });
        game.refreshWorld();
        await say([N('You tuck the acorn into the planter and pat the soil down.'), Wr("Grow tall for me. By the Future, you'll be taller than the wall!")]);
        await game.timelapse({ to: ERA.FUTURE, focus: [93, 5, 1.5], years: 300, caption: 'The sapling grows, and the city grows around it...', grow: ['petrified'] });
        game.save();
        return;
      }
      return say(N('An empty planter box full of good soil. Something could grow here, given enough time.'));
    case 'postern':
      if (f.posternOpen) return say(N('The postern passage runs west through the rubble, back toward the gatehouse.'));
      f.posternOpen = true;
      audio.sfx('lever');
      audio.sfx('gate');
      game.renderer.shake = 0.7;
      game.refreshWorld();
      game.bursts.emit(180, 1.5, 4, 40, { color: [0xd8c09a, 0x8a8378], speed: 3, life: 0.9, gravity: 3 });
      await say([N('You heave the rusted lever. Somewhere behind the wall, a bar scrapes free and old stone shifts.'), Wr('A way back through the rubble to the gatehouse. Good to know!')]);
      game.save();
      return;
    case 'wildLilies':
      if (s.kindness.includes('lilies') || inv.includes('lilySeeds') || f.liliesPlanted) return say(N('Wild sun-lilies, nodding in the warm wind.'));
      if (!f.lilyQuest) return say(N('A clump of wild golden flowers, heavy with seeds.'));
      await say([N('Wild sun-lilies, heavy with golden seeds. You gather a handful.'), Wr('Louise said these grew in the square in the oldest days. This must be the very spot!')]);
      game.giveItem('lilySeeds');
      return;
    case 'lilyBed':
      if (f.liliesPlanted) return say(N('Golden sun-lilies, swaying by the road.'));
      if (!inv.includes('lilySeeds')) return say(N(f.lilyQuest ? 'Louise\'s empty flower bed. Nothing has bloomed here in living memory.' : 'An empty flower bed by the road.'));
      game.removeItem('lilySeeds');
      f.liliesPlanted = true;
      audio.sfx('grow');
      game.refreshWorld();
      game.bursts.emit(ent.x, 0.6, ent.z, 30, { color: [0xffd34a, 0x9aff7a], speed: 3, life: 1 });
      await say([N('You scatter the seeds and press them into the soil. Within moments, green shoots appear.'), Wr('Grow, little lilies. You have a lot of catching up to do.')]);
      await game.timelapse({ to: ERA.FUTURE, focus: [23.5, 1, 4.5], years: 300, caption: 'The lilies spread, season after season...', grow: ['lilyGarden'] });
      game.completeKindness('lilies');
      return;
    case 'vault':
      if (f.hammerLeft) return say(N('The quench-vault is sealed tight. Time will do the rest.'));
      if (inv.includes('hammerBroken')) {
        game.removeItem('hammerBroken');
        f.hammerLeft = true;
        audio.sfx('lever');
        await say([N('You lay the cracked hammer in the iron quench-vault and seal the lid.'), { who: 'aria', name: 'Aria the Smith', text: 'Let time do its work, eh? I\'ll make sure the family knows not to touch it.' }]);
        await game.timelapse({ to: ERA.FUTURE, focus: [119.5, 1.2, 0.5], years: 300, caption: 'The star-iron tempers, slowly, for three hundred years...', effect: 'shine' });
        game.save();
        return;
      }
      return say(N('An iron quench-vault, used to temper metal very, very slowly.'));
    case 'glyphP':
    case 'glyphF':
    case 'glyphMill': {
      const p = game.pushables.find((q) => q.id === ent.spec.resets);
      if (!p) return;
      if (p.spec.lockFlag && f[p.spec.lockFlag]) return say(N('The glyph is dark. The boulder is wedged firmly in the gully mouth now.'));
      const st = p.start;
      if (game.player.body.x > st.x - 0.4 && game.player.body.x < st.x + 1.4 && game.player.body.z > st.z - 0.4 && game.player.body.z < st.z + 1.4) return say(N('Step out of the way first.'));
      p.setCell(st.x, st.z);
      game.onPushed(p);
      audio.sfx('shift', { era: ent.era });
      game.bursts.emit(st.x + 0.5, 0.6, st.z + 0.5, 30, { color: ent.era === ERA.PAST ? 0x3ad0c0 : 0xffb03a, speed: 3, life: 0.7 });
      return say(N(ent.era === ERA.PAST ? `The glyph pulses, and the carved ${p.id === 'boulder' ? 'boulder' : 'block'} shimmers back to where it started.` : 'BEACON RESET: CRATE RETURNED TO ITS DEPOT.'));
    }
    case 'sluice':
      if (f.sluiceClosed) return say(N('The sluice gate is shut tight. The millpond is brim-full.'));
      if (!f.millDammed) return say([N('An old sluice gate in the dam. The channel beneath it is bone dry: there is no water to hold back.'), Wr('A dam with nothing to dam...')]);
      if (!inv.includes('wheel')) return say([N("Water trickles out through the open sluice. The gate's wheel is missing; only a bare, rusted spindle is left."), Wr("Without a wheel, I can't wind it shut.")]);
      game.removeItem('wheel');
      f.sluiceClosed = true;
      audio.sfx('lever');
      audio.sfx('gate');
      game.renderer.shake = 0.4;
      game.refreshWorld();
      await say([N('You fit the brass wheel onto the spindle and wind. With a long groan, the sluice gate drops shut.'), Wr('Now the pond can fill all the way up!')]);
      await game.timelapse({ to: ERA.FUTURE, focus: [195.5, 1.5, 3], years: 300, caption: 'The millpond fills to the brim, and in time becomes a reservoir...', grow: ['millF'] });
      game.hud.toast("The pond is full, and the mill's old log boom has floated up level with the banks. Hop across the logs, and don't fall in: the water is deep and cold.", 7000);
      game.save();
      return;
    case 'satchel':
      if (f.hasSeal) return say(N("Eugene's satchel, empty now apart from a few bent cogs."));
      await say([
        N("Half-hidden in the reeds by the old crossing: Eugene's battered leather satchel."),
        N('Inside is a brass ring etched with an hourglass, and another note:'),
        N('"Vivienne. If you have come this far, the Chronoheart can do more than carry you. Touch this ring to it and you can hold a thing in its moment, so the years pass it by. I call it the Stasis Seal. ~E."'),
        Wr('Hold a thing in its moment... so it never ages at all?'),
      ]);
      game.abilities.unlock('seal');
      game.save();
      return;
    case 'echoLens':
      if (f.hasEcho) return say(N("Eugene's lectern. A scrawled diagram of three stone steps, and the words: \"Be in three places at once.\""));
      await say([
        N("A lectern stands by the gallery wall, and on it, Eugene's handwriting:"),
        N('"Vivienne. The Gallery steps rise only while their buttons are held. I could never hold three at once... but you can. This lens lets the Chronoheart remember you: where you stood, how you moved. ~E."'),
        Wr('A lens that remembers me... so I can leave a copy of myself standing on a button?'),
        N('The lens clicks neatly into the Chronoheart.'),
      ]);
      game.abilities.unlock('echo');
      game.save();
      return;
    case 'lockM': {
      if (f.towerUnlocked) return say(N('The great door stands open.'));
      // four keyholes: the Escapement Key, and one for each Era Key
      const need = [['clockKey', 'a many-toothed key'], ['disc', 'a sun'], ['hammer', 'a bell hammer'], ['core', 'a power core']];
      const missing = need.filter(([it]) => !inv.includes(it));
      if (missing.length) {
        return say([
          N("The Clocktower's great lock has four keyholes: one for a many-toothed key, and three shaped like a sun, a bell hammer and a power core."),
          Wr(missing.length === 4 ? "I don't have anything that fits yet." : `I'm still missing ${missing.length === 1 ? 'the one' : 'the ones'} shaped like ${listOf(missing.map(([, d]) => d))}.`),
        ]);
      }
      game.removeItem('clockKey');
      f.towerUnlocked = true;
      audio.sfx('lever');
      audio.sfx('gate');
      game.renderer.shake = 0.5;
      game.refreshWorld();
      await say([
        N('You fit the Sun Disc, the Bell Hammer and the Fusion Core into their keyholes. They hum together. Then the Escapement Key turns with a deep, satisfying clunk, and the great door swings open.'),
        N('The three Era Keys come loose again in your hands: the Tower needs them inside.'),
        Wr("Only the Present's lock still turns. Now to restart the Tower!"),
      ]);
      game.save();
      return;
    }
    case 'lockP':
      return say([N('A sealed slab of stone. There is no lock, no handle: the door has not been made yet.'), Wr("The lock doesn't exist in this age. It has to be the Present.")]);
    case 'lockF':
      return say([N('The great lock has rusted into one solid lump. It will never turn again.'), Wr("No key will open this one. It has to be the Present.")]);
    case 'socketSun':
    case 'socketBell':
    case 'socketCore': {
      const item = { socketSun: 'disc', socketBell: 'hammer', socketCore: 'core' }[ent.id];
      if (game.sockets[ent.id]) return say(N('The key glows in its socket, humming in time with the others.'));
      if (!inv.includes(item)) {
        const t = { socketSun: 'A pedestal shaped to hold a great golden disc.', socketBell: 'The great bell hangs silent. Its hammer is missing.', socketCore: 'An empty reactor socket, sized for some kind of power core.' }[ent.id];
        return say(N(t));
      }
      game.placeKey(ent.id, item);
      return;
    }
    default:
      return;
  }
}
