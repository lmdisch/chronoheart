// Story content and all puzzle interactions.
import { audio } from '../../audio/audio.js';
import { ERA } from '../../core/util.js';
import { LANTERN, CLAM } from './level.js';

export const ITEMS = {
  watch: { name: "Donald Eugene's Pocketwatch", desc: 'An old pocketwatch.' }, // no longer used; kept so old saves still show it
  myWatch: { name: "Vivienne's Pocketwatch", desc: "Twelve lost cogs and one winter of Donald Eugene's evenings, made to fit the Chronoheart." },
  donCog: { name: 'A Notched Cog', desc: 'Brass, six hundred years old, and stamped with a notch in one tooth: Donald Eugene\'s mark. It was holding Saltwick\'s river back.' },
  nets: { name: 'Old Fishing Nets', desc: 'From the deck of the Marigold. Good for catching fish, or anything else that drifts by.' },
  clapper: { name: 'Bell Clapper', desc: 'The tongue of a great bell, misfiled in a salvage pit for three hundred years.' },
  pearlChip: { name: 'Moon-Pearl Chip', desc: "A chip off the lighthouse lamp's clouded heart. A pearl grows around a seed, given time. A great deal of time." },
  pearl: { name: 'Moon Pearl', desc: 'Six hundred years in the growing. It glows a little, even in daylight.' },
  loupe: { name: "The Keeper's Loupe", desc: "A clockmaker's eyeglass, handed down through five lightkeepers. With it, what you see through the time lens is close enough to touch." },
  lumen: { name: 'Lumen Cell', desc: 'Harbor grade. It burns cold, the wind cannot touch it, and it has a 900-year warranty.' },
  whistle: { name: 'Shell Whistle', desc: "Pim's best whistle. It can call every gull on the strand." },
  crank: { name: 'Winch Crank', desc: 'Taken out of a cage, and out of the Dry Age, through the lens.' },
  noteDawn: { name: "The Dawn Bell's Note", desc: 'Rung in the first age, through the lens. The Chronoheart holds it.', key: true },
  noteNoon: { name: "The Noon Bell's Note", desc: "Rung on Bell Rock, in Saltwick's own age. The Chronoheart holds it.", key: true },
  noteDusk: { name: "The Dusk Bell's Note", desc: 'The first sound the Dusk Bell ever made. The Chronoheart holds it.', key: true },
  // carried over from Chapter One (all ten of its Lost Cogs)
  finder: { name: 'Cog Finder', desc: "Ten of Donald Eugene's cogs, meshed round the Chronoheart's rim. Under your hearts, they point the way to the nearest Lost Cog, and say which age it is in. Through the time lens, it sends up gold." },
};

/** Kindness side quests. `start` is the flag set when the favor is asked. */
export const FAVORS = [
  { id: 'lamp', title: 'A light for the tide folk', start: 'lampQuest', todo: "Isha's people fear the dark shore, and their lamps blow out in the first wind. Somewhen, there must be a light that doesn't.", done: 'The Ever-Lantern has hung on the quay ever since.' },
  { id: 'whistle', title: "Pim's whistle", start: 'whistleQuest', todo: 'Pim dropped her best shell whistle into the middle of the harbor, where the water is too deep for her.', done: 'Pim has her whistle back. So does every harbormaster after her.' },
  { id: 'hoard', title: "Zach's lost hoard", start: 'hoardQuest', todo: 'Zach Tiberious buried four hundred acorns somewhere along the shore, and forgot where. Perhaps time has turned them up.', done: 'Four hundred oaks say hello to their grandfather.' },
];

const N = (text) => ({ who: null, name: '', text });
const Wr = (text) => ({ who: 'vivienne', name: 'Vivienne', text });
const DE = (text) => ({ who: 'eugene', name: 'Donald Eugene', text });

export const INTRO = [
  N('Three weeks after the Clocktower of Hollowmere began to tick again, a river barge ties up at Saltwick, where the valley meets the sea.'),
  N('Or where it used to. The harbor is mud from wall to wall, the wells are dry, and the fields behind the town are white with salt.'),
  DE('There. Not one drop. Saltwick has been in drought for fifty years, apprentice: since long before you were born. The river that fed this harbor simply stopped coming.'),
  DE('Nobody knows why.'),
  DE('That is your next lesson. Find out why.'),
  Wr('Me? On my own?'),
  DE('You did splendidly in Hollowmere. I shall be right here on the quay, possibly eating smoked eel. Shout if you need me.'),
  DE('The harbor children have a rhyme: "Dawn and Noon and Dusk must chime, and the Well will run as in olden time." Three bells, apprentice. I would start by asking where they hang.'),
];

/** After the climb out of the Well: Donald Eugene has come up the stair. */
export const ENDING_A = [
  N('Vivienne comes up out of the Wellhead with the river at her heels. Behind her the water stops rising a hand below the door, exactly where it has always meant to stop.'),
  DE('Vivienne! I heard it from the quay: the whole river, coming home at once. I came up those steps like a man of forty. Well. Fifty.'),
  Wr('Somebody built a sluice down there, Master. Six hundred years ago. It turned the river away from Saltwick, on purpose.'),
  Wr('And this was jamming the wheel.'),
  N('She holds out the cog. Brass, worn smooth, with a notch cut in one tooth.'),
  DE('...So it was.'),
  Wr("It's your mark."),
  DE('Half the cogs on this coast have my mark on them, apprentice. I sold a great many cogs, in my day. Now come and look. I think the harbor has something to show you.'),
];

export const ENDING_COGS = [
  DE('And what is that rattling in your apron? ...Twelve cogs. Twelve of MY cogs.'),
  Wr('All along this shore, in every age. Every one with the notch in it.'),
  DE('Then I had better put them to some use. Twelve is exactly enough for a watch movement. Give me the winter, and you shall have one of your own, made to fit the Chronoheart.'),
];

export const ENDING_B = [
  N('By morning the harbor is full. By evening the boats are out, the Marigold among them. And three hundred years on, where there was salt to the horizon, there are lights on the water.'),
  DE('There. Fifty years of drought, mended in an afternoon. Splendid work, apprentice. Truly.'),
  Wr('Master... can I ask you something silly?'),
  DE('Always.'),
  Wr("The bakery at home, on the square. Wasn't it called Marlow's? Before?"),
  N('Donald Eugene goes completely still. Only for a breath. Then he smiles.'),
  DE("Hale's, apprentice. It has always been Hale's."),
  DE('Supper. I am told there is smoked eel.'),
  N('All through supper, he watches her. Vivienne pretends not to notice.'),
];

/** "One voice..." after each bell, whatever order they're rung in. */
function bellCount(f) {
  const n = ['dawnRung', 'noonRung', 'duskRung'].filter((k) => f[k]).length;
  return Wr(n === 1 ? 'One voice. Two more to find.' : n === 2 ? 'Two. One more.' : 'Dawn, Noon and Dusk. The Well should hear me now.');
}

// Nobody Vivienne meets knows she is traveling through time. In Saltwick she is the clockmaker's
// apprentice off the Hollowmere barge; in the other ages she is a stranger in very odd clothes.
// What she does for people is remembered all the same (the Ever-Lantern on the quay, the
// harbormaster's whistle, the oak wood in the salt).
function npcLines(game, id) {
  const f = game.state.flags, inv = game.state.inventory, kind = game.state.kindness;
  const S = (who, name) => (text) => ({ who, name, text });
  const bells = ['dawnRung', 'noonRung', 'duskRung'].filter((k) => f[k]).length;
  switch (id) {
    case 'eugene': {
      if (f.finished) {
        const lines = [DE('Listen to that. Water. I had quite forgotten what this harbor sounded like.')];
        if (f.ownWatch) lines.push(DE('And how is the new watch running? I worked very hard on that.'));
        else lines.push(DE(`Twelve cogs of mine along this shore, and you have found ${game.state.cogs.length} of them. Bring me the lot and I can build you a watch of your own: twelve is exactly a movement.`));
        return lines;
      }
      if (!f.metEugene) {
        f.metEugene = true;
        return [
          DE('Still here? Good. The Chronoheart is whole now: you may stay in any age as long as you please. No more racing its ring.'),
          DE('The harbormaster will know about the bells. Off you go. And Vivienne: be kind to these people. Fifty years is a long time to go thirsty.'),
        ];
      }
      if (f.heartPlaced) return [DE('The water! Vivienne, look at the water!')];
      if (bells === 3) return [DE('All three! I heard every one. Then the Wellhead will open to you, up on the headland. Go on, apprentice. I shall be right here. Possibly eating smoked eel.')];
      if (!f.noonRung) return [DE('The Noon Bell hangs out on Bell Rock, at the end of the Long Pier. East along the quay, past the mudflats. The harbormaster says the gate out there has beaten everyone for years.')];
      if (!f.dawnRung) return [DE('The Dawn Bell... nobody in Saltwick has laid eyes on it. They say the first folk hung it. A bell that old, I would look for in an age that old. Ask at the lighthouse: lightkeepers remember things.')];
      return [DE('And the Dusk Bell. Brannoch says it has never been cast: there is only an old promise that someone will, "for whoever is still here at the end". I do not like the sound of that, Vivienne. Look in the last age.')];
    }
    case 'brannoch': {
      const b = S('brannoch', 'Harbormaster Brannoch');
      if (f.tideRestored) return [b("Water's back! Forty boats to refloat, eleven to bail, and one to dig out with a spade, and I have never been happier in my life."), b("I don't know what you did up on the Head, girl. I don't need to. The harbor's yours whenever you want it.")];
      if (kind.includes('whistle') && !f.brannochWhistle) {
        f.brannochWhistle = true;
        return [
          b("Funny thing. Thirty years I've blown this shell whistle to call the boats in. The harbormaster's whistle: older than the town, they say, handed down one to the next."),
          b("This morning I caught myself wondering whose it was first. Some child off the strand, I shouldn't wonder, in the oldest days."),
          Wr('...She said she would.'),
        ];
      }
      if (f.noonRung && !f.brannochBell) {
        f.brannochBell = true;
        return [b('That was the Noon Bell! Nobody has got through that gate since old Keeper Ansel died with the knack of it. How in the deep did you...'), b("No. I'm a harbormaster with no harbor. I've stopped asking how things happen. Two more bells, the rhyme says. Luck to you.")];
      }
      if (!f.metBrannoch) {
        f.metBrannoch = true;
        return [
          b('Brannoch. Harbormaster. Of that.'),
          N('(He waves a hand at the mud.)'),
          b("Fifty years without a ripple. My father was harbormaster the autumn the river stopped coming. Don't step off the quay: that mud has swallowed a horse and cart."),
          b('These days the only water on this coast comes out of the Gilded Gear Company\'s pump, a copper a cup. Lovely people. Never met one.'),
          b('My gran used to say folk swam this harbor in the first days, when it was all sea. Cheerful woman. Never stopped going on about it.'),
          b("Bells? The Noon Bell's on Bell Rock, at the end of the Long Pier. The Dawn Bell is a story. The Dusk Bell is a promise. That is all I know, and it's more than most."),
        ];
      }
      return [b("Mind the mud. East past the flats for the Long Pier and the Noon Bell. And if you see the river, tell it we've kept its place.")];
    }
    case 'zach': {
      const z = S('zach', 'Zach Tiberious');
      if (kind.includes('hoard')) return [z("An entire forest, from one squirrel's foresight. They will name it after me. Tiberious Wood. Zachwood. The Zacharboretum.")];
      if (f.groveSeen) {
        return [
          Wr("Zach... I think I found your hoard. Nobody ever dug it up. It's a wood now. An oak wood, a long way from here, and the only green thing for miles."),
          z('A WOOD. Well, obviously it is a wood. That is called a long-term investment. I planned that. Write that down.'),
          z('...Four hundred oaks. Hm.'),
          z('Tell them their grandfather says hello.'),
          { kind: 'hoard' },
        ];
      }
      if (f.hoardQuest) return [z('Under a bollard. Or possibly a Tuesday. It was definitely one of those.'), N('(Megan covers her eyes with her tail.)')];
      f.hoardQuest = true;
      return [
        z('Ahem. Zach Tiberious, maritime expert. Nineteen years at sea. Possibly twenty.'),
        z("We did NOT stow away. We conducted an unannounced inspection of the barge's biscuit barrel."),
        z('Now. The water. Obviously someone has left the plug out. Find the plug. It will be on a chain.'),
        z('And while you are about it: I buried my retirement hoard somewhere along this shore this morning. Four hundred acorns. Under a bollard. Or a Tuesday. If you find it, do NOT eat it.'),
        { favor: 'hoard' },
        N('(Behind Zach, Megan shakes a tiny head very, very slowly.)'),
      ];
    }
    case 'megan': {
      const n = S('megan', 'Megan the Squirrel');
      if (f.tideRestored) return [n('Chk. (Megan is watching the water lap at the quay, very still, tail curled round her feet.)')];
      if (kind.includes('hoard')) return [n('Chk-chk. (Megan pats Zach on the head. He is still talking about his forest.)')];
      return [n('Chk! (Megan points at the mud, then at the horizon, then shrugs with her entire body.)')];
    }
    case 'isha': {
      const y = S('isha', 'Isha the Shell-Singer');
      const bell = y('The Dawn Bell? It hangs from the mast on the Tooth, the lone rock far along the shore, out over the water. No one climbs to it. Only the sea-wind rings it.');
      if (kind.includes('lamp')) return [y("It has burned every night since you came. The little ones call it the Stranger's Star."), bell];
      if (inv.includes('lumen')) {
        return [
          y('What is this? It burns... and it is cold? And the wind does not touch it at all!'),
          { take: 'lumen' },
          y('A light that does not go out. The children will not fear the shore tonight, nor any night after.'),
          y('We shall hang it where the boats come in, and tell them a stranger brought it from beyond the reef. That will be remembered, traveler. We are good at remembering.'),
          { kind: 'lamp', flag: 'lampGiven' },
        ];
      }
      if (f.lampQuest) return [y('Still no light that outlasts the wind? No matter. The sea sends what it sends.'), bell];
      f.lampQuest = true;
      return [
        y('A stranger on the strand! And in such cloth: glass over your eyes, and an apron full of iron. Are you from beyond the reef?'),
        y('I am Isha. I sing the tide out and I sing it in again. The sea here always comes back: that is the first thing we teach our children.'),
        Wr('(...Always. Until it doesn\'t.)'),
        y('But the nights are long, and the little ones fear the dark water. Our fish-oil lamps blow out in the first wind. I have asked the sea for a light that does not go out. So far it has sent me a stranger.'),
        { favor: 'lamp' },
        bell,
      ];
    }
    case 'pim': {
      const p = S('pim', 'Pim');
      if (kind.includes('whistle')) return [p('FWEEEEEEET!'), p("...Sorry. Did it get your ears? It gets everybody's ears.")];
      if (inv.includes('whistle')) {
        return [
          p('MY WHISTLE! You went all the way to the bottom?'),
          { take: 'whistle' },
          N('(Pim blows it. Every gull on the strand takes off at once.)'),
          p("When I'm old I'm going to be the one who whistles the boats home. And then I'll give it to whoever does it after me. And they'll give it to whoever's after THEM."),
          { kind: 'whistle' },
        ];
      }
      if (f.whistleQuest) return [p("It's right in the middle of the harbor, at the very bottom. Sea spirits can breathe water. Everybody knows that.")];
      f.whistleQuest = true;
      return [
        p('Are you a sea spirit? You LOOK like a sea spirit. Your eyes are made of glass.'),
        p('I had a shell whistle. The best one. It could call the gulls. And I dropped it off the rocks, and it sank in the harbor, right in the middle, and it is too deep for me.'),
        p('Sea spirits can breathe water. Everybody knows that.'),
        { favor: 'whistle' },
        Wr('...I am a very good swimmer.'),
      ];
    }
    case 'digby': {
      const t = S('digby', 'DIGBY');
      if (f.tideRestored) return [t('WELCOME TO SALTWICK HARBOR. NINE HUNDRED YEARS OF CONTINUOUS OPERATION. HIGH WATER IS AT 06:12.'), t('I AM A SALVAGE UNIT. THERE IS NOTHING HERE TO SALVAGE. I HAVE NEVER KNOWN WHY THAT MAKES ME SO CONTENT.'), t('ARCHIVE NOTE: THE GILDED GEAR COMPANY CLOSED ITS SALTWICK PUMPS SOME CENTURIES AGO. NOBODY WOULD PAY FOR WATER.')];
      if (f.lampQuest && !f.lumenGiven) {
        return [
          t('QUERY: A LIGHT THAT DOES NOT BLOW OUT. SEARCHING...'),
          t('ITEM: LUMEN CELL, HARBOR GRADE. 900-YEAR WARRANTY. I HAVE FOUR THOUSAND OF THEM, AND NO SHIPS.'),
          { give: 'lumen', flag: 'lumenGiven' },
          t('PLEASE INFORM THE RECIPIENT THAT THE WARRANTY IS NOT TRANSFERABLE.'),
          t('...THAT WAS A JOKE. I HAVE BEEN PRACTICING. THERE HAS BEEN TIME.'),
        ];
      }
      if (kind.includes('lamp') && !f.digbyLantern) {
        f.digbyLantern = true;
        return [t('ARCHIVE NOTE: THE HARBOR\'S OLDEST ARTIFACT, "THE EVER-LANTERN", APPEARS TO BE ONE OF MY LUMEN CELLS. IT IS SIX HUNDRED YEARS OLDER THAN I AM.'), t('I HAVE DECIDED NOT TO THINK ABOUT THIS.')];
      }
      if (f.metDigby) return [t('REMINDER: THE DUSK BELL STANDS ON THE OLD WHARF. ITS CLAPPER IS MISFILED IN SALVAGE PIT 3. THE PIT HAS NO EXIT. THESE FACTS ARE RELATED.')];
      f.metDigby = true;
      return [
        t('SALVAGE UNIT DIGBY, PROPERTY OF THE GILDED GEAR COMPANY, WATER DIVISION. WELCOME TO SALTWICK DRY DOCK. SEA LEVEL: NOT APPLICABLE.'),
        t('YOU ARE THE FIRST VISITOR IN 61 YEARS. PLEASE DO NOT BE SALVAGE. THE COMPANY PUMP IS THE ONLY WATER ON THE COAST. PRICE PER CUP: ONE GOLD COG.'),
        t('HISTORICAL NOTE: THE WATER LEFT THIS HARBOR THREE AND A HALF CENTURIES AGO AND DID NOT RETURN. THE LAST HARBOR FOLK CAST A BELL TO CALL IT HOME. THE BELL NEVER RANG. ITS CLAPPER WAS MISFILED. I BELIEVE IN SALVAGE PIT 3.'),
        Wr("A gold cog for a cup of water. With a notch in one tooth, I suppose. ...So this is what happens if I don't mend it."),
      ];
    }
    case 'michelle': {
      const m = S('michelle', 'Mysterious Stranger');
      if (f.tideRestored) return [m('You gave them back their river. I knew you would.'), m('He will be proud of you, Vivienne. Watch his face when he says it.')];
      if (f.hasRewind) {
        if (!f.tideGatePassed) return [m('Stand at the gate first. Then go down to the lever. The Chronoheart remembers the way back, even up a drop that your legs would not.')];
        return [m('Spend your time wisely, Vivienne. Even the time you get to spend twice.'), m('And whatever they tell you, a river does not wander off on its own.')];
      }
      return [
        m("Ah. Donald's apprentice. Keeper of the Chronoheart now, I see. You are early. Or I am late. Across the years it is hard to say."),
        m('You did well in Hollowmere. And you were kind while you did it, which is rarer.'),
        m('Here. A hairspring that runs backward. I made it a long time ago, for a heart very like that one. Fit it to the Chronoheart, think of where you have just been... and let it carry you.'),
        N('The hairspring clicks into the Chronoheart. For a heartbeat Vivienne is standing where she stood three steps ago.'),
        { unlock: 'rewind' },
        m('There. It only ever takes you. The world keeps walking forward without you: gates go on closing, water goes on running. Remember that, when you are tempted to lean on it.'),
        m('The tide gate ahead opens for a few breaths when its lever is pulled, and the lever is a long way from the gate. Unless, of course, you have only just been standing at the gate.'),
      ];
    }
    case 'odalys': {
      const o = S('odalys', 'Odalys the Lightkeeper');
      if (f.tideRestored) return [o("Light on the water again. That's what a light is FOR.")];
      if (f.dawnRung) return [o("I heard it. Don't tell me I didn't. A bell with nothing under it, ringing out of empty air off my own gallery."), o('Gran, you old terror. You were right.')];
      if (f.lampLit) return [o("Up the stair to the gallery. Look through that glass of Gran's into the old days. And if you can touch what you see... well. Ring it for her.")];
      if (inv.includes('pearl')) {
        return [
          o('That is... where did... that is a moon pearl the size of my fist.'),
          { take: 'pearl' },
          N('Odalys climbs the tower two steps at a time. A minute later the great lamp coughs, catches, and swings a bar of gold out over the mud.'),
          { flag: 'lampLit', refresh: true, sfx: 'key' },
          o('Fifty years dark. Right. Back on the books.'),
          o("Light's lit, so the stair's open: a rule is a rule. Go on up to the gallery. Gran swore that on a clear dawn you could see the first folk's bell from there, hanging in the air off the rail."),
          o("She used this. Take it. A loupe: her gran's gran's. She said she didn't only see the bell through it. Once, she said, she reached out and touched it. I always put that down to the gin."),
          { give: 'loupe', unlock: 'reach' },
        ];
      }
      if (f.clamSeeded) return [o("You've a look about you like you've just done something clever. Go and have a look at the old pool, then.")];
      if (f.gotChip) return [o('The Mother Clam lived in the pool by the stack, back when it was a pool. Three lifetimes, a pearl like that takes. I wish you luck finding a clam with the patience.')];
      return [
        o("Mind the cage. It's locked for a reason. No light, no stair: Keeper's rule."),
        o('Odalys. I keep the Light. Kept. The lamp went out the autumn the water did: its heart is a moon pearl, and it clouded over like a dead eye. Fifty years dark, after four hundred burning.'),
        o("Pearls like that don't come out of any clam I ever met. The first folk grew them in the Mother Clam, in the pool yonder, around a seed. Took the clam three lifetimes. That pool's been dry mud since before Gran."),
        o('Here. A chip off the old heart. If you ever meet a clam with three lifetimes to spare, you will know what to do.'),
        { give: 'pearlChip', flag: 'gotChip' },
        Wr('Three lifetimes. I can do three lifetimes before lunch.'),
      ];
    }
    case 'fenwick': {
      const w = S('fenwick', 'Old Fenwick');
      if (f.tideRestored) return [w('Told you.'), w('Always comes back.')];
      if (f.metFenwick) return [w("That jetty? Sound as a bell, what's left of it. Runs a good long way out over the mud. Mind, you would have to be daft to walk off the end of it.")];
      f.metFenwick = true;
      return [
        w("Shh. You'll scare the fish."),
        Wr("There's... no water."),
        w("That's what they WANT you to think."),
        w("Fifty year I've fished this lock. The jetty used to go right the way across, before the far end fell in. Nothing crosses here now, not in my time."),
        w("Water'll be back. Always comes back. I can wait. I'm very good at it."),
      ];
    }
    case 'maren': {
      // she has met Donald Eugene, a long way back, without knowing who (or when) he is
      const m = S('maren', 'Maren the Tide-Reader');
      if (f.tideRestored) return [m('Stranger! The river ran past my door this morning as it always has. And yet I dreamed it had been gone a very long time.'), m('Strange dreams, up on the Head.')];
      if (f.metMaren) return [m('Still cutting stone for the old man\'s well-house. When it is done, he says, he will turn his little wheel. I hope he pays as well as he talks.')];
      f.metMaren = true;
      return [
        m('You climbed the Head! In those boots! Sit, stranger, before you fall down my well.'),
        m('I am Maren. I read the tides. Just now I am cutting stone instead, for an old man in a very fine coat. The river rises up here, you see, under the Head, and he wants a house built over it.'),
        m('He drew every stone himself. And a great wheel inside, and a little door that only opens to three bells. "So that nobody wanders in," he said.'),
        m('When it is done, he says, he will turn the wheel, and the river will go round the other side of the hills instead. "It will take a long while," he said. "I don\'t mind waiting."'),
        Wr('Why would anyone want to turn a river away from a harbor?'),
        m('I asked him that. He said: "So that one ship, a long way from now, stays in port." Then he laughed, and paid us in gold.'),
        m('He was very kind about it.'),
        Wr('An old man in a fine coat... with his gold stamped with a little cog, I suppose.'),
        m('Notched in one tooth! How did you know?'),
      ];
    }
    case 'pell': {
      const d = S('pell', 'Dr. Pell');
      if (f.tideRestored) return [d('The Marigold is afloat. Fifty years late.'), d('...I think I shall stay, now. Somebody here might need a doctor.')];
      if (f.metPell) return [d('Mind the mud, child. I have set enough legs for one lifetime.')];
      f.metPell = true;
      return [
        d('Dr. Pell. I was the doctor in Saltwick, once. Still am, when anyone needs one.'),
        d('Fifty years ago this autumn I had a berth on the Marigold, bound clear across the sea. My bag was packed. Then the river stopped coming, the harbor dried up under her, and she never sailed.'),
        d('Neither did I.'),
        d('That winter they sent for me up Highcrest. A young woman, very ill. I sat with her all night. I could not help her. Nobody could have.'),
        d('I sometimes wonder where I would be now, if the Marigold had sailed.'),
        Wr('...The Marigold. The boat that\'s still aground out there in the mud.'),
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
    if (cmd.take) game.removeItem(cmd.take);
    if (cmd.flag) game.state.flags[cmd.flag] = true;
    if (cmd.favor) game.startFavor(cmd.favor);
    if (cmd.kind) game.completeKindness(cmd.kind);
    if (cmd.sfx) audio.sfx(cmd.sfx);
    if (cmd.unlock) game.craft.unlock(cmd.unlock);
    if (cmd.refresh) {
      game.refreshWorld();
      game.save();
    }
  });
  npc.talking = false;
  game.save();
  // the tide folk remember: the stranger's light hangs on the quay from then on, in every age
  const f = game.state.flags;
  if (npc.id === 'isha' && f.lampGiven && !f.lanternShown) {
    f.lanternShown = true;
    game.refreshWorld();
    await game.timelapse({ to: ERA.PRESENT, focus: [LANTERN.x, 1.4, 2], years: 600, caption: "The tide folk hang the stranger's light on the strand, and every age after keeps it burning...", grow: ['everLantern'], effect: 'shine' });
    game.hud.toast('Something new hangs on the quay, in every age.', 5000);
    game.save();
  }
}

/** "a", "a and b", "a, b and c" */
const listOf = (xs) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

/** A bell has had its three strokes (see Strikeable). */
export async function struck(game, ent) {
  const f = game.state.flags;
  const say = (lines) => game.dialogue.run(lines);
  const ring = (flag, note) => {
    f[flag] = true;
    audio.sfx('checkpoint');
    game.giveItem(note);
    game.refreshWorld();
    game.save();
  };
  switch (ent.id) {
    case 'noonBell':
      ring('noonRung', 'noteNoon');
      return say([
        N('The Noon Bell rings out across the dry harbor: three great strokes. Back on the quay, people stop what they are doing and look up.'),
        N('The Chronoheart hums in answer, and holds the note.'),
        bellCount(f),
      ]);
    case 'dawnBell':
      ring('dawnRung', 'noteDawn');
      return say([
        N('Your wrench passes through the lens and strikes bronze, six hundred years away. The Dawn Bell sings out over water that is still there.'),
        N('On the strand below, in the first age, the tide folk fall silent and stare up at a bell that is ringing itself.'),
        bellCount(f),
      ]);
    case 'wardenKey':
      f.wardenKeyStruck = true;
      if (game.warden) game.warden.stunT = 14;
      audio.sfx('gate');
      game.refreshWorld();
      game.save();
      game.hud.toast('<b>Wind-up key struck!</b> The Harbor Warden is stunned and its shield is down—ring the <b>second stroke</b>!', 5500);
      return;
    case 'duskBell':
      ring('duskRung', 'noteDusk');
      if (game.warden) game.warden.stunT = 20;
      return say([
        N('The Dusk Bell has waited three hundred years to make its first sound. It makes it now: low and enormous, rolling out across the salt as the Harbor Warden folds down into silent rest.'),
        N("On the Warden's dented back plate, half rubbed away: a gold cog, with a notch in one tooth."),
        N('Nothing answers. Not yet.'),
        bellCount(f),
      ]);
  }
}

export async function interact(game, ent) {
  const s = game.state, f = s.flags, inv = s.inventory;
  const say = (lines) => game.dialogue.run(Array.isArray(lines) ? lines : [lines]);
  switch (ent.id) {
    case 'gauge':
      if (f.tideRestored) return say(N("The harbor's tide gauge. Its float bobs halfway up the slot, exactly where the painted line says it should be."));
      return say(N('The harbor\'s tide gauge. Its float lies at the very bottom of the slot, on dry mud. Beside it, years of chalk tally marks, and a total: "18,262 DAYS".'));
    case 'portSign':
      if (f.tideRestored) return say(N('"SALTWICK HARBOR. HIGH WATER 06:12. MIND THE GULLS."'));
      return say([N('"SALTWICK DRY DOCK. PORT AUTHORITY NOTICE 1: THE SEA IS NOT CURRENTLY AVAILABLE. NOTICE 2: NOTICE 1 HAS BEEN IN EFFECT FOR 350 YEARS."'), Wr('Three hundred and fifty years. And it all started before I was born.')]);
    case 'lanternM':
      return say([
        N('A lantern on an old iron post, burning with a cold, steady light. The plaque is worn almost smooth:'),
        N('"THE EVER-LANTERN. A STRANGER FROM BEYOND THE REEF GAVE THE FIRST FOLK A LIGHT THAT DID NOT GO OUT. IT HAS NOT GONE OUT."'),
        Wr('Nine-hundred-year warranty. Six hundred down.'),
      ]);
    case 'lanternF':
      return say([N('The old lantern, still burning on its post. Its warranty label is just legible: "3 YEARS REMAINING".'), Wr("I'll have a word with DIGBY about a replacement.")]);
    case 'ferrySign':
      if (f.tideRestored) return say(N('"FERRY STEPS. LOW WATER: WAIT FOR THE TIDE." Underneath, in a different hand: "STILL WAITING." And under that, in fresh chalk: "WORTH IT."'));
      return say([N('"FERRY STEPS. LOW WATER: WAIT FOR THE TIDE." Underneath, someone has added in a different hand: "STILL WAITING."'), Wr('Sinking mud from here to the far bank, and no way round it. Not in this age, anyway.')]);
    case 'pitSign':
      return say(N('"SALVAGE PIT 3. NO LADDER. NO EXIT. DO NOT ENTER THE PIT. IF YOU ARE READING THIS FROM INSIDE THE PIT: WE DID SAY."'));
    case 'grove':
      if (!f.hoardQuest || f.groveSeen) return say(N('Oak trees, a little wood of them, growing out of the salt where nothing else will. The only green in the Dry Age.'));
      f.groveSeen = true;
      game.save();
      return say([
        N('Oak trees, a little wood of them, growing out of the salt where nothing else will. They stand in oddly neat rows.'),
        N('Scratched into the bark of the oldest, very low down: a tiny pawprint, and the letters "Z.T."'),
        Wr('Four hundred acorns, buried and forgotten. Oh, Zach.'),
      ]);
    case 'fencePosts':
      if (f.fenceBuilt) return say(N('The nets hum in the wind. Sand is already gathering at their feet.'));
      if (inv.includes('nets')) {
        game.removeItem('nets');
        f.fenceBuilt = true;
        audio.sfx('lever');
        game.refreshWorld();
        await say([N('You string the old nets between the drying posts, corner to corner, and tie them off the way a ropewright once showed you.'), Wr("The wind never stops along this shore. Whatever it's carrying, it can leave right here. For about three hundred years.")]);
        await game.timelapse({ to: ERA.FUTURE, focus: [121.5, 2, 3], years: 300, caption: 'Grain by grain, the wind heaps sand against the nets...', grow: ['dune'] });
        game.hud.toast('A dune stands against the sea wall, in the <b>Future</b>.', 4500);
        game.save();
        return;
      }
      return say([N('A row of net-drying posts, set square across the wind. Nothing is strung on them: the fleet has no use for nets this month.'), Wr("Anything stretched between these would catch whatever the wind's carrying.")]);
    case 'drift':
      return say([N('The old sea wall, far too sheer to climb. A little sand has drifted against its foot.'), Wr('Sand piles up against anything that stands in the wind for long enough. It just needs something to pile up behind.')]);
    case 'clamP':
      if (f.clamSeeded) return say(N('The Mother Clam has closed, very gently, around its seed.'));
      if (inv.includes('pearlChip')) {
        game.removeItem('pearlChip');
        f.clamSeeded = true;
        audio.sfx('grow');
        game.bursts.emit(ent.x, ent.y + 0.6, ent.z, 30, { color: [0xffd8f0, 0xffffff], speed: 2.5, life: 1, gravity: -0.5 });
        game.refreshWorld();
        await say([N('The Mother Clam gapes on the floor of the pool, big as a cartwheel. You tuck the chip of pearl inside, and the shell closes over it like a hand.'), Wr('There. Take your time. Take three lifetimes.')]);
        await game.timelapse({ to: ERA.PRESENT, focus: [CLAM.x, -1.5, CLAM.z], years: 600, caption: 'Layer by layer, one lifetime at a time...', effect: 'shine' });
        game.save();
        return;
      }
      return say(N('A giant clam gapes on the floor of the pool, big as a cartwheel. The inside of its shell shimmers.'));
    case 'clamM':
      if (f.pearlTaken) return say(N('The fossil clam, empty now.'));
      if (f.clamSeeded) {
        f.pearlTaken = true;
        game.refreshWorld();
        await say([N('In the dried mud the old clam has turned to stone, half open. And inside it, where no one has looked in six hundred years: a pearl the size of your fist.'), Wr('Hello, you. Somebody is going to be very glad to see you.')]);
        game.giveItem('pearl');
        game.save();
        return;
      }
      return say(N('A fossil clam, big as a cartwheel, half sunk in the dried mud. Empty.'));
    case 'stairCage':
      return say(N('An iron cage round the foot of the Keeper\'s stair, padlocked. A painted board: "NO LIGHT, NO STAIR."'));
    case 'lockSign':
      return say([
        N('"DRY LOCK FOOTBRIDGE. THE DOOR OPENS FOR 3 SECONDS. CONTROL PANEL: ON THE SERVICE JETTY."'),
        N('Below the bridge, the control panel hangs on its cable over the empty channel. There is no jetty.'),
        Wr("Not in this age, there isn't. I have stood on one, though."),
      ]);
    case 'duskBellFit':
      if (inv.includes('clapper')) {
        game.removeItem('clapper');
        f.clapperFitted = true;
        audio.sfx('socket');
        game.save();
        await say([N('The Dusk Bell: cast by the last harbor folk to call the sea home, and never once rung. You hang the clapper on its hook.'), Wr("Three hundred years late. Let's make it loud.")]);
        game.hud.toast('Ring the Dusk Bell (<kbd>X</kbd>). Its Harbor Warden will wake to defend it!', 5000);
        return;
      }
      return say([N('A great bell, the color of dusk. It has no clapper. It has never made a sound.'), f.metDigby ? Wr('Salvage Pit 3, DIGBY said. Back west, in the Saltings.') : Wr('Somebody must know where its clapper went.')]);
    case 'boathouse':
      return say(N(f.tideRestored ? 'The boathouse stands open and empty. Everything that floats is out on the water.' : 'The boathouse. Locked, and full of boats with nowhere to go.'));
    case 'wellDoorM': {
      const need = [['dawnRung', 'the Dawn Bell'], ['noonRung', 'the Noon Bell'], ['duskRung', 'the Dusk Bell']];
      const missing = need.filter(([k]) => !f[k]);
      if (missing.length) {
        return say([
          N('A slab of dark stone closes the mouth of the Wellhead. Three bells are carved into it, and something behind it is listening. Above them, small and neat, someone has carved a cog with a notch in one tooth.'),
          Wr(missing.length === 3 ? "Master's mark. Here, on a door older than Saltwick. ...And it's waiting for three voices. I haven't rung one yet." : `It hasn't heard ${listOf(missing.map(([, d]) => d))} yet.`),
        ]);
      }
      f.wellOpen = true;
      [330, 262, 196].forEach((freq, i) => setTimeout(() => audio.sfx('bell', { freq }), i * 450));
      game.renderer.shake = 0.5;
      await say([
        N('The Chronoheart gives back its three notes, one after another: Dawn. Noon. Dusk.'),
        N('For a long moment, nothing. Then the slab sinks into the rock without a sound, and cold, damp air breathes out of the dark.'),
        Wr("Only the Present's door still opens. All right. Down we go."),
      ]);
      audio.sfx('gate');
      game.refreshWorld();
      game.save();
      return;
    }
    case 'wellDoorP':
      return say([N('A doorway framed in fresh-cut stone and closed with driftwood planks. Behind it, the well-house is still being dug, over the spring where the river rises.'), Wr("It isn't finished in this age. It has to be the Present.")]);
    case 'wellDoorF':
      return say([N('Salt has drifted up to the lintel and set like stone. Nothing has opened this door in three hundred years.'), Wr('Not this one. It has to be the Present.')]);
    case 'leverA':
      if (f.gateA) return say(N('The lever is thrown. Somewhere ahead in time, a gate is standing open.'));
      f.gateA = true;
      audio.sfx('lever');
      audio.sfx('gate');
      game.renderer.shake = 0.5;
      game.refreshWorld();
      game.save();
      return say([N("You throw the builders' lever. Below the scaffold a counterweight drops into the dark, and stays dropped."), Wr('And stays that way for six hundred years. A gate that ought to be shut is standing open in the Present.')]);
    case 'crankCage':
      if (f.crankTaken) return;
      f.crankTaken = true;
      await say(N('Your hand goes through the lens and into another age. The crank is cold, and gritty with salt. You draw it back through the bars, and through three hundred years.'));
      game.giveItem('crank');
      game.save();
      return;
    case 'winchB':
      if (f.gateB) return say(N('The winch is wound tight, and has been for a very long time.'));
      if (!inv.includes('crank')) return say([N('A winch, walled into an alcove of fresh-cut timber. Its crank is missing: there is only a bare spindle.'), Wr("I can reach it. I've nothing to turn it with.")]);
      game.removeItem('crank');
      f.gateB = true;
      audio.sfx('lever');
      audio.sfx('gate');
      game.renderer.shake = 0.5;
      game.refreshWorld();
      game.save();
      return say([N('You reach through the lens, fit the crank to the spindle, and wind. In an age you are not standing in, a chain comes taut.'), Wr('Six hundred years of being wound. That should hold.')]);
    case 'heart':
      if (f.heartPlaced) return say(N('The great wheel turns freely now, and the river runs home beneath it.'));
      await say([
        N("A great wheel fills the wall, holding the sluice gate shut. Behind it, faintly, water: the whole river, pressing to come home the way it used to."),
        N('At the foot of the wheel, one small brass cog is jammed into the works. Worn smooth by six hundred years. A notch cut in one tooth.'),
        Wr("His mark. Holding a whole river back from Saltwick, for six hundred years."),
        Wr('"So that one ship, a long way from now, stays in port."'),
        N('Vivienne works the cog loose, and puts it in her apron.'),
      ]);
      return game.placeHeart();
    default:
      return;
  }
}
