// Story content and all puzzle interactions.
import { audio } from '../../audio/audio.js';
import { ERA } from '../../core/util.js';
import { touchActive } from '../../ui/touch.js';
import { erosionCells, STATUE } from './level.js';

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
  snorkel: { name: 'Snorkel', desc: 'Borrowed from the aqueduct pool, three hundred years from now. With it you can stay underwater for as long as you like.' },
  clockKey: { name: 'Escapement Key', desc: "The key to the Clocktower's great lock. Only a lock that still turns will take it.", showcase: true },
  finder: { name: 'Cog Finder', desc: "Ten of Donald Eugene's lost cogs, meshed round the Chronoheart's rim. Hold the time lens open and they turn toward anything of his still lost in another age." },
};

/** Kindness side quests. `start` is the flag set when the favor is asked. */
export const FAVORS = [
  { id: 'chart', title: "Samaria's star chart", start: 'chartQuest', todo: "A storm carried off the Sun-Keeper's star chart. Someone, somewhen, must have found it.", done: 'You returned the star chart to Samaria.' },
  { id: 'lilies', title: "Karen Louise's sun-lilies", start: 'lilyQuest', todo: "Sun-lilies once grew in the square, in the oldest days. Bring some back to Karen Louise's flower bed.", done: 'Sun-lilies bloom in the square again.' },
  { id: 'keepsake', title: "Lillian's keepsake", start: 'keepsakeQuest', todo: 'Lillian has nothing her ancestor Aria ever held. Perhaps Aria could spare something.', done: "Lillian wears Aria's medallion at the bench." },
];

const N = (text) => ({ who: null, name: '', text });
const Wr = (text) => ({ who: 'vivienne', name: 'Vivienne', text });

export const INTRO = [
  N('Hollowmere. A valley where the river bends, and where the great Clocktower has kept time for six hundred years.'),
  N('This morning, for the first time anyone can remember... it stopped.'),
  Wr('Master Donald Eugene? ...Master?'),
  Wr("Three days gone, and now the Tower's gone silent. He'd never leave his workshop this long."),
  Wr("Wait. Something's glowing on his workbench..."),
];

// The Escapement Key: the part of a clock that sets its tempo teaches the Chronoheart to do the same.
export const TEMPO_LEARN = [
  // (only for someone who walked past the toolbox at the courtyard gate)
  N('The Escapement Key hums against the Chronoheart. Its ring divides in two: one half turning slowly, one racing.'),
  Wr('An escapement sets how fast a clock runs... and now the Chronoheart can, too. Any machine near me: slower, or faster.'),
  N('Across the yard, the Warden swings round. It knows the key is gone.'),
  Wr("Then I'll start with that one."),
];

// The third key: the clock face opens, and the way up into the clock with it.
export const TEMPO_GIFT = [
  N('The third key slides home. High above, the great clock face splits along its seams and swings open.'),
  N("Golden light pours down the shaft. But the Tower's heart still stutters: somewhere up inside the clock, the great mainspring is running wild."),
  Wr("Up there the ages are wound too tightly to step between. But I can still turn time slower and faster."),
  Wr('Then that is where I am going.'),
];

const DE = (text) => ({ who: 'eugene', name: 'Donald Eugene', text });
export const ENDING = [
  N('Across three ages at once, the Clocktower shudders... and begins to tick.'),
  DE("Vivienne! I knew you'd find your way. I've been stuck between the ages for days. You pulled me back through."),
  Wr('Master Donald Eugene! You\'re all right! And the amulet... look, the crack is gone!'),
  DE("Mended by the Tower's heart. That means it's yours now, apprentice. Time always needs someone to look after it."),
  DE("And let me tell you what all my years among the clocks have taught me. Time is the most precious thing any of us will ever have."),
  DE("Not the hours on a clock face. The hours you spend with the people you love. Those are the ones you can never wind back, not even with a Chronoheart."),
  DE('So spend your time well, Vivienne. Spend it on them.'),
  Wr('I will. I promise.'),
  DE("Good. Though... while I was lost between the ages, I saw something I can't explain. Another clock, far older than ours, ticking somewhere no clock should be."),
  Wr('Another clock? Where?'),
  DE("That, apprentice, is a puzzle for another day. Our work isn't finished, not by a long way. And I have a feeling you'll be the one to finish it."),
  DE('Now then... I believe we are both late for supper. Shall we go home?'),
];

// All ten Lost Cogs: in the ending, or brought to him in his workshop afterward.
export const ENDING_COGS = [
  DE('And what is that rattling in your apron? ...Cogs. Ten of MY cogs! My parts tray emptied itself the day the Tower stopped. I thought I was going mad.'),
  DE('Hold the Chronoheart still a moment.'),
  N("He fits the ten cogs round the amulet's rim, one by one, until they mesh and turn together."),
  DE('There. Hold the time lens open, and they will turn toward anything of mine still lost in another age. I suspect there is more of it about than ten.'),
  Wr('Cogs that find cogs.'),
  DE('Clockmakers are very practical people, apprentice.'),
];

// Nobody Vivienne meets knows she is traveling through time. In the Present they know her as
// the clockmaker's apprentice; in the other ages she is a stranger in very odd clothes. What she
// does for them is remembered all the same, and shows up in the ages that follow (the statue in
// the square, the waymarker by Tamsin's bridge, the lily garden, Lillian's medallion).
function npcLines(game, id) {
  const f = game.state.flags, inv = game.state.inventory;
  const S = (who, name) => (text) => ({ who, name, text });
  switch (id) {
    case 'louise': {
      const m = S('louise', 'Elder Karen Louise');
      if (!f.hasAmulet) return [m("Vivienne, dear. The Tower's stopped and Donald Eugene's vanished. People say the old ages are bleeding through. I saw a lizard the size of a dog in the square at dawn!"), m('Have you looked in his workshop? He always kept his secrets on that bench.')];
      if (f.chartReturned && !f.louiseStatue) {
        f.louiseStatue = true;
        return [
          m("Do you know, dear, I've walked past the Stranger's statue every day of my life, and only this morning did I notice she wears eye-glasses just like yours."),
          m('Callie the carver made her, in the oldest days. Nobody remembers who she was. Somebody kind, the plaque says.'),
          Wr('...Somebody kind. I can live with that.'),
        ];
      }
      if (inv.includes('lilySeeds')) return [m("Are those... sun-lily seeds? But they died out centuries ago! Wherever did you find them? No, don't tell me, you'll only say something clever. Plant them in my old flower bed by the road, would you?")];
      if (f.finished) {
        const lines = [m('Listen to it, dear. Tick, tock, and the whole valley back on time. I set my kettle by it this morning, like Grandmother used to.'), m("And Donald Eugene home for supper, I hear. You did that, didn't you? No, don't tell me. You'll only say something clever.")];
        if (game.state.kindness.includes('lilies')) lines.push(m('And my lilies still blooming. You have had a busy week.'));
        return lines;
      }
      if (game.state.kindness.includes('lilies')) return [m('Look at them, Vivienne. Sun-lilies, right here in the square, just like Grandmother said. Thank you, dear.')];
      if (game.player.body.x < 50) {
        const lines = [m("Is that Donald Eugene's amulet? He never took it off. Keep it safe for him, dear, until he's back."), m("If you're off to look for him, mind the river. The ford washed out long ago. Grandmother used to say that in the oldest days, people crossed it on stepping stones."), Wr('The oldest days... the Past!')];
        if (!f.lilyQuest) {
          f.lilyQuest = true;
          lines.push(m("One more thing, dear, if you have a moment. That empty flower bed by the road was my grandmother's pride."), m('She said golden sun-lilies grew in this square in the oldest days. None have bloomed here in living memory.'), { favor: 'lilies' });
        }
        return lines;
      }
      return [m('Go on, child. The Clocktower is at the far end of the valley, past the gatehouse.')];
    }
    case 'samaria': {
      const y = S('samaria', 'Samaria the Sun-Keeper');
      if (!f.hasAmulet) return [y('...')];
      const disc = y('We keep the Sun Disc in the observatory on the high terrace to the east. Only someone who lays stones for the ages can climb up to it.');
      if (game.state.kindness.includes('chart')) return [y("Every night I mark the sun's path on the chart you brought back. The calendar is whole again."), y('Callie is carving you in stone, strange clothes and all. The valley should remember who helped it.'), disc];
      if (inv.includes('starChart'))
        return [
          y('My star chart! Dry, and whole! Where did you find it? ...No. The sun sends what it sends, and today it sent a stranger in peculiar clothes.'),
          { take: 'starChart' },
          y('Thank you, traveler. Without it, the planting days would be guesswork, and the village would go hungry.'),
          y('You will be remembered here. I shall have Callie carve you in stone, so that our grandchildren know your face.'),
          { kind: 'chart', flag: 'chartReturned' },
        ];
      if (f.chartQuest) return [y('Still no sign of my star chart? The storm carried it far. Perhaps farther than anyone can walk.'), disc];
      f.chartQuest = true;
      return [
        y('What strange clothes, traveler. Glass over your eyes, and an apron full of iron? You are not from the river villages.'),
        y("Forgive me, I am distracted. Last night a storm tore my star chart from the observatory and carried it off. Without it, I cannot keep the sun's calendar."),
        { favor: 'chart' },
        disc,
      ];
    }
    case 'tick': {
      const t = S('tick', 'TICK');
      if (game.state.kindness.includes('chart'))
        return [
          t('ARCHIVE NOTE: ITEM 4471, "ANCIENT STAR CHART", IS NO LONGER LISTED AS LOST. I HAVE NO RECORD OF THAT RECORD CHANGING. HOW DELIGHTFUL.'),
          t('PLEASE ENJOY THE PLAZA\'S OLDEST EXHIBIT: THE STATUE OF "THE STRANGER". VISITORS OFTEN REMARK THAT YOUR COSTUME IS A VERY GOOD COPY.'),
        ];
      if (inv.includes('starChart')) return [t('THE STAR CHART IS ON LOAN TO YOU. ITS ORIGINAL OWNER IS LISTED AS "SAMARIA, SUN-KEEPER".')];
      if (f.chartQuest)
        return [
          t('QUERY: ANCIENT STAR CHART. SEARCHING...'),
          t('ITEM 4471 LOCATED. A STAR CHART RECOVERED FROM THE VALLEY AFTER A GREAT STORM. AGE: VERY.'),
          t('YOU MAY BORROW IT. PLEASE RETURN IT TO ITS OWNER, "SAMARIA, SUN-KEEPER". OWNER STATUS: DECEASED, APPROXIMATELY NINE HUNDRED YEARS. ...I WILL MARK THE LOAN "OPEN-ENDED".'),
          { give: 'starChart' },
        ];
      if (f.finished) return [t('GREETINGS AGAIN, VISITOR. ARCHIVE NOTE: THE GREAT TOWER HAS KEPT PERFECT TIME FOR THREE HUNDRED YEARS. I HAVE CHECKED. TWICE.'), t('...I ENJOY CHECKING.')];
      return [t('GREETINGS, VISITOR. WELCOME TO HOLLOWMERE MEMORIAL PLAZA.'), t('COSTUME DETECTED: "MEDIEVAL APPRENTICE". VERY AUTHENTIC. PLEASE NOTE THE HERITAGE FESTIVAL IS NOT UNTIL SPRING.'), t('ARCHIVE NOTE: AN AQUEDUCT LIES BENEATH THE SANDSTONE CLIFFS. IT WAS CARVED BY A SPRING THAT DRIPPED FOR CENTURIES.')];
    }
    case 'holo':
      // once the Tower ticks again, the Future remembers it differently
      if (f.finished)
        return [
          N('MEMORIAL: DONALD EUGENE THE CLOCKMAKER, KEEPER OF THE GREAT TOWER, AND HIS APPRENTICE, WHO RESTARTED IT. IT HAS NOT MISSED A TICK IN THREE HUNDRED YEARS.'),
          Wr('"His apprentice." Not even a name.'),
          Wr('...Good. He would hate a fuss, and so would I.'),
        ];
      // (the Tower hasn't been restarted in the Present yet, so no Future knows of it)
      return [
        N('MEMORIAL: DONALD EUGENE THE CLOCKMAKER, LAST KEEPER OF THE GREAT TOWER. HE VANISHED THE WEEK THE TOWER STOPPED, AND WAS NEVER FOUND. THE TOWER HAS NOT TICKED SINCE.'),
        Wr('Never found... and three hundred years on, it still has not ticked.'),
        Wr("Not if I can help it. That's not how this is going to go, Master."),
      ];
    case 'michelle': {
      const m = S('michelle', 'Michelle the Wise');
      if (f.finished) return [m('I heard it from here: the first tick. I had almost forgotten the sound.'), m('Spend your time well, Vivienne. There is a great deal more of it about than there was yesterday.')];
      if (f.metMichelle && game.state.kindness.length >= FAVORS.length)
        return [m("You have the look of someone who has been busy being kind, Vivienne. I can always tell."), m('People remember a kindness far longer than you would think. And so do I.')];
      if (f.metMichelle)
        return [m('Spend your time wisely, Vivienne. And wherever you find yourself, always remember to help others.')];
      f.metMichelle = true;
      return [
        m('Ah. The clockmaker\'s apprentice, right on time. The river has been expecting you.'),
        m('A little advice before you cross. Time is the one thing none of us gets back, and it is very easy to waste. Spend it wisely.'),
        m('Your master used to vanish for days at a time, you know. He once told me he kept a room "in the oldest age, behind a door no one would ever think to knock on". I never did work out what he meant.'),
        m('And wherever you find yourself, always remember to help others. A kindness is remembered longer than you would think.'),
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
          Wr("Aria... suppose someone in your family, a long way down the line, wished they had something you'd held. What would you leave them?"),
          b("Strange question, girl. ...Ha. I like it, though. So the forge outlives me, in this story of yours? Good."),
          b("Then this. My mother stamped our mark in it. You've a careful look about you: see it finds its way to whoever is minding the bench by then. Tell them to wear it there."),
          { give: 'medallion', flag: 'medallionGiven' },
        ];
      if (f.hammerLeft) return [b("It's in the vault now. My grandkids' grandkids can fish it out, eh?")];
      if (inv.includes('hammerBroken')) return [b("Seal it in my quench-vault if you like. Some great-grandchild of mine can fish it out when it's done.")];
      return [
        b("Donald Eugene's apprentice! You've got his look, like you're late for something that hasn't happened yet."),
        b('The Tower\'s bell hammer cracked last winter. Donald Eugene brought it to me, but tempering star-iron properly takes a lifetime in the quench-vault. Longer than I\'ve got left.'),
        b("Take it. Seal it in my vault if you like, and let some great-grandchild of mine fish it out when it's done."),
        { give: 'hammerBroken' },
      ];
    }
    case 'callie': {
      const b = S('callie', 'Callie the Carver');
      if (f.chartReturned)
        return [
          b('Ah, the stranger! The Sun-Keeper wants you in stone, for bringing back her chart. Hold still a moment.'),
          b('...Hm. Strange cloth is hard to carve. And what are those, on your eyes? I shall have to guess.'),
          b('Stone remembers longer than people do. Whoever stands in this valley after us will know your face, if not your name.'),
        ];
      return [b('Hm. Strange cloth, stranger boots. You are not from the river villages, are you? No matter. Callie the carver, at your service.'), b('Remember this: whatever you lay down now becomes the foundation for everything after. My grandchildren will build their houses on my stones.'), b('The Sun Disc sits up on the terrace. Far too high for most people.')];
    }
    case 'lillian': {
      const k = S('lillian', 'Lillian');
      const wish = [k("Funny thing. We have Aria's shop, her name, her stories... but not one thing she ever actually held."), k('I always wished I had something of hers.')];
      if (inv.includes('medallion'))
        return [
          k("Is this... Aria's medallion? That's our family mark!"),
          { take: 'medallion' },
          k('Where did you even find this? ...No, never mind. I don\'t need to know.'),
          k("All we ever had were stories. Now I've got something she actually held. Thank you. Really."),
          { kind: 'keepsake' },
        ];
      if (f.finished) {
        const lines = [k("Hear that? Three hundred years, and it has never once missed. Family legend says that's Aria's hammer doing the ringing.")];
        if (game.state.kindness.includes('keepsake')) lines.push(k("(Lillian taps Aria's medallion, pinned proudly to her apron.)"));
        else if (f.keepsakeQuest) lines.push(...wish);
        return lines;
      }
      if (game.state.kindness.includes('keepsake')) return [k('Ring that bell loud enough for all of us.'), k("(Lillian taps Aria's medallion, pinned proudly to her apron.)")];
      if (game.state.taken.includes('hammerGift')) {
        if (f.keepsakeQuest) return [k('Ring that bell loud enough for all of us.')];
        f.keepsakeQuest = true;
        return [k('Ring that bell loud enough for all of us.'), ...wish, { favor: 'keepsake' }];
      }
      if (f.hammerLeft)
        return [
          k('Wait. Glowing amulet. Dark hair in a bun. Goggles...'),
          k("Family legend says someone dressed exactly like that would come for THE hammer one day. I always figured it was a joke Aria played on us. It's her last masterwork, and it's been tempering in her vault for three hundred years."),
          k("Well, a legend's a legend. It's right there on the display case. Go on, take it."),
          ...(f.keepsakeQuest ? [] : (f.keepsakeQuest = true, [...wish, { favor: 'keepsake' }])),
        ];
      if (!f.keepsakeQuest) {
        f.keepsakeQuest = true;
        return [k("Hey, you're not from around here. Nice goggles."), k("This family shop has been here since my ancestor Aria's forge days. She supposedly left something unfinished... the stories never say what."), ...wish, { favor: 'keepsake' }];
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
      if (f.finished) return [h("Wheel's turning, Tower's ticking, and the whole valley on time for once. I hardly know myself.")];
      if (f.sluiceClosed) return [h('A full millpond! The wheel turns again, and the old log boom floats like it did in Grandsire\'s day.'), h("You're a marvel, girl. Swim it if you like: it's clean spring water, top to bottom. Or hop the logs and keep your boots dry.")];
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
        h("You can still see the old channels in the mud down there. Two of them go nowhere, mind. Only one was ever the millrace."),
        Wr('A spring that wandered off... in the Past, maybe it can be turned back this way. Down the right channel.'),
      ];
    }
    case 'oren': {
      // He has met Donald Eugene, without knowing who (or when) he is: the old man came back to
      // the first age to have the Clocktower built.
      const o = S('oren', 'Oren the Mason');
      if (f.metOren) return [o('Still dressing stone for the old man\'s "clock" tower. If you see him, tell him the walls are up. And ask him again what a clock is.')];
      f.metOren = true;
      return [
        o("Ho, stranger. More odd clothes! You're the second this season."),
        o('The first was an old man. Bald as a river stone on top, with white hair all round the sides. He walked out of the trees with a cart of iron wheels, and drawings on skins so thin the sun shone through them.'),
        o('He wanted a tower. Here, on this very spot. A "clock tower", he called it. He was very excited. He would not stop talking, and he would not hear no.'),
        Wr('A clock tower... did he say what a clock was?'),
        o('Something that counts the day, he said. I told him we have the sun for that. He laughed, and said the sun was a fine start.'),
        o('So we are building it. The walls are up already. He says the part that matters goes inside, later. He paid in iron, and iron is iron. But between us, stranger: not one of us knows what it is for.'),
        Wr('Bald, white hair, would not hear no... Master Donald Eugene. He didn\'t just look after the Clocktower. He had it built.'),
      ];
    }
    case 'tamsin': {
      const t = S('tamsin', 'Tamsin the Ropewright');
      if (f.bridgeSealed) return [t('Look at it. Not a fray, not a speck of rot, and it hums like a plucked string.'), t('Whatever you did, spirit, my bridge will outlive us all.')];
      if (f.bridgeBuilt) {
        const lines = [t("Strong as I could make it. Mind, the planks will rot and the posts will go soft. A lifetime, maybe two, and it'll be gone.")];
        if (f.hasSeal) lines.push(Wr("Unless it never ages at all. Donald Eugene's Stasis Seal..."));
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
        t('A traveler! And dressed like no one I ever saw. Careful near the edge: the Thornwater has taken braver folk than you.'),
        t("I'm Tamsin. I mean to bridge this gorge, but every vine rope I twist frays within a season."),
        t('If only there were rope that never rotted. Spirits\' rope. Ha!'),
        Wr('Rope that never rots... there must be something like that in the Future.'),
      ];
    }
    case 'eugene': {
      // home, after the story: the Lost Cogs
      const home = DE('Home, and the Tower ticking over my head. I could get used to this.');
      if (f.cogFinder) return [home, DE('How is the finder turning? If it ever points somewhere I have never been, do tell me.')];
      const n = game.state.cogs.length;
      if (n >= game.ch.COG_TOTAL) return [...ENDING_COGS, { finder: true }];
      return [home, DE(`My parts tray emptied itself the day the Tower stopped: ten cogs, all over the valley, and into every age of it. You have found ${n}. Bring me the lot, and I will make the Chronoheart something useful.`)];
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
    if (cmd.favor) game.startFavor(cmd.favor);
    if (cmd.kind) game.completeKindness(cmd.kind);
    if (cmd.sfx) audio.sfx(cmd.sfx);
    if (cmd.finder) game.grantFinder();
    if (cmd.refresh) {
      game.refreshWorld();
      game.save();
    }
  });
  npc.talking = false;
  if (npc.id === 'tick') game.state.flags.metTick = true;
  // the river folk remember: Callie's statue of the stranger stands in the square from then on
  const f = game.state.flags;
  if (npc.id === 'samaria' && f.chartReturned && !f.statueShown) {
    f.statueShown = true;
    game.refreshWorld();
    await game.timelapse({ to: ERA.PRESENT, focus: [STATUE.x, 1.2, 2], years: 600, caption: 'The river folk carve the stranger in stone, and the valley keeps her...', grow: ['strangerStatue'] });
    game.hud.toast('Something new stands in the square, in the <b>Present</b> and the <b>Future</b>.', 5000);
    game.save();
  }
}

/** "a", "a and b", "a, b and c" */
const listOf = (xs) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

/** Something the wrench has just knocked loose (see Strikeable). */
export async function struck(game, ent) {
  const f = game.state.flags;
  const say = (lines) => game.dialogue.run(Array.isArray(lines) ? lines : [lines]);
  switch (ent.id) {
    case 'leverJam':
      // freed at last: it swings over, and the spring runs
      return interact(game, { id: 'lever' });
    case 'plugN':
    case 'plugMid':
      audio.sfx('splash');
      game.bursts.emit(ent.x - 0.4, 0.4, ent.z, 30, { color: [0x4a9ad8, 0x9fe0ff], speed: 3, life: 0.8, gravity: 6 });
      await say([
        N('The plug pops free, and water rushes away down the old channel and under the scrub... and then you hear it gurgle down into the rock.'),
        Wr("A sinkhole. Not that one. If only I could see where each of these channels ends up, further down the years..."),
        N('You wedge the plug back into place.'),
      ]);
      ent.reseat();
      return;
    case 'plugS':
      f.millDammed = true;
      audio.sfx('socket');
      audio.sfx('splash');
      game.bursts.emit(ent.x - 0.4, 0.4, ent.z, 40, { color: [0x3ad0c0, 0x9fe0ff], speed: 3.5, life: 0.9, gravity: 6 });
      game.refreshWorld();
      game.save();
      await say([N('The plug pops free. Water rushes down the old channel and out across the floor of the hollow, and this time it stays.'), Wr('That one runs true: the old millrace. Now give it a few centuries...')]);
      await game.timelapse({ to: ERA.PRESENT, focus: [195.5, 1, 3], years: 500, caption: 'Turned down the old millrace, the spring pools in the hollow...', grow: ['millWaterM'] });
      game.hud.toast("A millpond now, but it drains through the mill's open sluice.", 4500);
      return;
    case 'shutterLock':
      f.shutterBroken = true;
      audio.sfx('gate');
      game.renderer.shake = 0.6;
      game.refreshWorld();
      await say([N('The rusted lock housing bursts apart, and the shutter drops into the floor.'), Wr('Three hundred years of rust, and one good wrench.')]);
      game.save();
      return;
  }
}

export async function interact(game, ent) {
  const s = game.state, f = s.flags, inv = s.inventory;
  const say = (lines) => game.dialogue.run(Array.isArray(lines) ? lines : [lines]);
  switch (ent.id) {
    case 'workbench':
      if (f.hasAmulet) return say(Wr("Donald Eugene's tools, all neatly arranged. Except his favorite wrench, which is in my apron."));
      await say([
        Wr("Donald Eugene's amulet, the Chronoheart! He never let me touch it."),
        N("There's a note folded underneath it:"),
        N('"Vivienne. The Tower\'s heart is failing and the ages are coming loose. The Chronoheart is cracked, but it will carry you for a little while."'),
        N('"Find the three Era Keys: the Sun Disc of the first age, the Bell Hammer of ours, and the Fusion Core of the last. Restart the Tower. ~D.E."'),
        Wr('The first age... and the last? He means the PAST and the FUTURE?!'),
      ]);
      f.hasAmulet = true;
      audio.sfx('key');
      game.hud.showAmulet(true);
      game.bursts.emit(ent.x, ent.y + 0.3, ent.z, 40, { color: [0x7ff6ff, 0xffd070], speed: 4, life: 0.9 });
      game.hud.toast(
        touchActive()
          ? '<b>Chronoheart!</b> Swipe left for the Future, right for the Past.'
          : '<b>Chronoheart!</b> <kbd>Q</kbd> Past · <kbd>E</kbd> Future · hold <kbd>Tab</kbd> to peek.',
        6000,
      );
      setTimeout(() => game.hud.toast('It drains away from the Present, and recharges there.', 4000), 6200);
      game.save();
      return;
    case 'lever':
      if (f.springOpen) return say(N('The spring flows freely now. Water trickles down the cliff face.'));
      f.springOpen = true;
      audio.sfx('lever');
      audio.sfx('splash');
      game.renderer.shake = 0.5;
      game.refreshWorld();
      await say([N('The lever jolts free and swings over. With a heavy clunk, a stone plug slides away. Spring water starts trickling down the cliff.'), Wr("Just a trickle... but if it keeps dripping for a few hundred years..."), Wr('Water wears away stone, given enough time!')]);
      await game.timelapse({ to: ERA.PRESENT, focus: [66.5, 2.5, 4.5], years: 600, caption: 'Drip by drip, the spring wears through the cliff...', erode: { cells: erosionCells(), origin: [66.6, 4, 7] } });
      game.save();
      return;
    case 'swimSign': {
      const sign = N('A lit sign beside the flooded aqueduct: "HOLLOWMERE AQUEDUCT POOL. CLEAN SPRING WATER: SWIMMING PERMITTED. ALL OTHER WATERWAYS IN THE VALLEY ARE TREATED. DO NOT ENTER THEM."');
      if (f.hasSnorkel) return say(sign);
      await say([
        sign,
        N('A snorkel hangs from a hook beneath it: "FOR VISITORS. PLEASE BORROW."'),
        Wr("Clean water, three hundred years on. That's my spring! And with a breathing tube, I can stay under for as long as I like."),
      ]);
      f.hasSnorkel = true;
      game.giveItem('snorkel');
      game.refreshWorld();
      game.save();
      return;
    }
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
      await say([N('Wild sun-lilies, heavy with golden seeds. You gather a handful.'), Wr('Karen Louise said these grew in the square in the oldest days. This must be the very spot!')]);
      game.giveItem('lilySeeds');
      return;
    case 'lilyBed':
      if (f.liliesPlanted) return say(N('Golden sun-lilies, swaying by the road.'));
      if (!inv.includes('lilySeeds')) return say(N(f.lilyQuest ? 'Karen Louise\'s empty flower bed. Nothing has bloomed here in living memory.' : 'An empty flower bed by the road.'));
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
      // the pond you're standing over fills first; then, three centuries on, the reservoir it becomes
      await game.timelapse({ to: ERA.PRESENT, focus: [195.5, 1.5, 3], years: 1, caption: 'With the sluice shut, the millpond fills to the brim...', grow: ['millWaterM'], growFrom: 0.2, float: { ids: ['millBoomM'], by: 2 } });
      await game.timelapse({ to: ERA.FUTURE, focus: [195.5, 1.5, 3], years: 300, caption: '...and in time it becomes a reservoir.', grow: ['millWaterF'], float: { ids: ['millBoomF'], by: 2 } });
      game.hud.toast('The pond is brim-full: swim across, or hop the log boom.', 4000);
      game.save();
      return;
    case 'satchel':
      if (f.hasSeal) return say(N("Donald Eugene's satchel, empty now apart from a few bent cogs."));
      await say([
        N("Half-hidden in the reeds by the old crossing: Donald Eugene's battered leather satchel."),
        N('Inside is a brass ring etched with an hourglass, and another note:'),
        N('"Vivienne. If you have come this far, the Chronoheart can do more than carry you. Touch this ring to it and you can hold a thing in its moment, so the years pass it by. I call it the Stasis Seal. ~D.E."'),
        Wr('Hold a thing in its moment... so it never ages at all?'),
      ]);
      game.abilities.unlock('seal');
      game.save();
      return;
    case 'tempoGift':
      if (f.hasTempo) return say(N("Donald Eugene's toolbox, empty now but for a note: \"Hold, don't tap.\""));
      await say([
        N("Just inside the courtyard gate sits Donald Eugene's old toolbox. In it, a small brass escape wheel, and another note:"),
        N('"Vivienne. The thing that guards this yard in the age to come is only a machine, and every machine keeps time. An escapement sets how fast a clock runs. Fit this one to the Chronoheart, and you can set the pace of any machine near you: slower, or faster. ~D.E."'),
        Wr('Slower... or faster. Any machine near me?'),
        N('The escape wheel clicks into the Chronoheart. Its ring divides in two: one half turning slowly, one racing.'),
      ]);
      audio.sfx('key');
      game.grantTempo();
      game.tempoToast();
      return;
    case 'echoLens':
      if (f.hasEcho) return say(N("Donald Eugene's lectern. A scrawled diagram of three stone steps, and the words: \"Be in three places at once.\""));
      await say([
        N("A lectern stands by the gallery wall, and on it, Donald Eugene's handwriting:"),
        N('"Vivienne. These buttons forget you the moment you step off them. This lens lets the Chronoheart remember you, so something of you can stay behind. ~D.E."'),
        Wr('A copy of me that stays behind... standing on the buttons for me?'),
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
      if (!f.regulatorsSynced) {
        return say([
          N('Every key fits, but the Escapement Key will not turn. On either side of the yard, a brass flywheel ticks round: one, then the other, never together.'),
          Wr("The lock's two regulators are out of step. It won't turn until they beat as one."),
          Wr("Tempo only reaches what's close to me. If I stand by just one of them and slow it down, or hurry it up..."),
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
    case 'statueM':
      return say([
        N('A small, weathered statue on a plinth: a girl with her hair in a bun and round glass over her eyes, holding out a star chart. The carving is very old.'),
        N('The plaque is worn almost smooth: "THE STRANGER, WHO BROUGHT BACK THE SUN\'S CALENDAR. CARVED BY CALLIE OF THE RIVER FOLK."'),
        Wr("That's... me. They carved me. Six hundred years ago, and it has been standing here my whole life."),
        Wr("...Has it? I honestly can't remember the square without it."),
      ]);
    case 'statueF':
      return say([
        N('The old statue from the square, kept under a pane of light. A label glows beside it.'),
        N('"THE STRANGER. HOLLOWMERE\'S OLDEST CARVING, c. 900 YEARS. SUBJECT UNKNOWN. THE COSTUME IS CONSIDERED FANCIFUL."'),
        Wr('Fanciful! These are perfectly sensible work clothes.'),
      ]);
    case 'bridgeStoneM':
      return say([
        N('A waymarker by the bridge, its carving softened by weather: a ropewright at her work, and beside her a small figure in odd clothes, handing her a coil.'),
        N('"TAMSIN\'S BRIDGE. RAISED WITH SPIRIT-ROPE, THE GIFT OF A STRANGER. IT HAS NEVER ONCE NEEDED MENDING."'),
        Wr('Spirit-rope. She never did believe it was only steel.'),
      ]);
    case 'bridgeStoneF':
      return say([
        N('TRANSIT HERITAGE MARKER 12: "TAMSIN\'S BRIDGE, THE VALLEY\'S OLDEST CROSSING. ENGINEERS HAVE NEVER EXPLAINED WHY IT DOES NOT AGE."'),
        Wr("I could explain it. They wouldn't believe me."),
      ]);
    case 'gearworksDoor':
      return game.enterGearworks();
    case 'gearworksExit':
      return game.leaveGearworks();
    case 'mainspring':
      if (f.finished) return say(N('The great mainspring turns, slow and steady. Tick. Tock. Tick.'));
      await say([
        N("The great mainspring thrashes on its post, unwinding far too fast. The whole clock shakes with every beat."),
        Wr("Easy... easy. Slow down."),
        N('You press the Chronoheart against the spring. Its two rings turn, one against the other, until the spring\'s wild beat settles into one steady rhythm...'),
      ]);
      return game.runEnding();
    case 'studyDoor':
      if (!f.studyFound) {
        await say([
          N('You knock on the old door. Silence... and then, from somewhere inside, a faint ticking.'),
          N('The door swings open on its own. Above the latch, a tiny brass gear has been pressed into the wood.'),
          Wr("That's Master Donald Eugene's mark! What's it doing here, in the oldest age?"),
        ]);
        f.studyFound = true;
        game.save();
      }
      return game.enterStudy();
    case 'everspring':
      if (f.steadyHeart) return say(N('The workbench is tidy now. Above it, the chalk Clocktower is covered in notes, most of them crossed out.'));
      await say([
        N('A hidden room: a cot, a lantern, maps of the valley in three different ages, and the Clocktower chalked on the wall, covered in notes.'),
        N('On the workbench lies a letter, held down by a coil of bright star-iron.'),
        N('"Vivienne. If you found this room, you\'ve been paying attention. I\'ve been hopping between the ages trying to work out why the Tower is failing, and I needed somewhere to rest where no one would ever think to knock."'),
        N('"This is the Everspring: a mainspring of star-iron that never runs down. Fit it to the Chronoheart and it will never need to recharge again. I\'d hoped to finish the job myself. ~D.E."'),
        Wr('A secret workshop in the oldest age... Of course he had one.'),
        N("You fit the Everspring into the Chronoheart. A slow warmth spreads from your chest, and the amulet's ring settles into a steady gold glow."),
      ]);
      f.steadyHeart = true;
      game.meter = 1;
      audio.sfx('key');
      game.bursts.emit(ent.x, 1.2, ent.z, 40, { color: [0xffd070, 0x9ff4ff], speed: 3, life: 1 });
      game.hud.toast('<b>The Everspring!</b> The Chronoheart never runs down now.', 5000);
      game.save();
      return;
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
