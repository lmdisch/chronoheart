// Story content and all puzzle interactions.
import { audio } from '../../audio/audio.js';
import { ERA } from '../../core/util.js';
import { LANTERN, CLAM } from './level.js';

export const ITEMS = {
  watch: { name: "Donald Eugene's Pocketwatch", desc: 'It runs backward, and it pulls toward the sea. Three clockmakers have carried it, and none of them ever knew why.' },
  myWatch: { name: "Vivienne's Pocketwatch", desc: "Twelve lost cogs and one winter of Donald Eugene's evenings. It runs backward, exactly as promised." },
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
  N('Or where it used to. The harbor is mud from wall to wall. The tide went out the night the Tower restarted, and it has not come back.'),
  DE('There. You see it, Vivienne? Not one drop. Now listen to this.'),
  N('He holds up his old pocketwatch. It is ticking. Backward.'),
  DE('It began the moment you restarted the Tower. The other clock I told you about, the old one, ticking where no clock should be: this watch is tied to it somehow, and it pulls toward that headland. The Tide Well, they call it.'),
  DE('My knees are not what they were, and that is a long road. So the watch goes with you. Mind it. I have carried it fifty years and never once understood it.'),
  Wr("A clock that keeps the tide, and it's running the wrong way. All right, Master. Let's go and wind it forward."),
  DE('One thing first. The harbor children have a rhyme: "Dawn and Noon and Dusk must ring, before the Well lets anything in." Three bells, apprentice. I would start by asking where they hang.'),
];

/** After the climb out of the Well: Donald Eugene has come up the stair. */
export const ENDING_A = [
  N('Vivienne comes up out of the Well with the sea at her heels. Behind her the water stops rising a hand below the door, exactly where it has always meant to stop.'),
  DE('Vivienne! I felt it turn. Every clock I own struck at once. I came up those steps like a man of forty. Well. Fifty.'),
  Wr("Master... I'm sorry. Your watch. It was never a watch. It was the Tide Clock's heart, and it had to go back. I couldn't keep it."),
  DE('Sorry? Fifty years I wound that watch, and my master before me, and hers before her. Not one of us ever asked where it was trying to go.'),
  DE('We do not own time, apprentice. We never did. It is lent to us: a little, by the ones who came before, to be handed on to the ones who come after. All we choose is what we do while it is in our hands.'),
  DE('And you chose to give it back. That is the whole of the craft. I have nothing left to teach you.'),
  Wr("That isn't true. You still won't tell me how you get your gear trains so quiet."),
  DE('Ha! No. That one I am keeping. Now come and look. I think the sea has something to show you.'),
];

export const ENDING_COGS = [
  DE('And what is that rattling in your apron? ...Twelve cogs. Twelve of MY cogs. I wondered where those had got to.'),
  DE('Twelve is exactly enough for a watch movement. Give me the winter, and you shall have one of your own. I cannot promise it will run backward.'),
  Wr('I can.'),
];

export const ENDING_B = [
  N('By morning the harbor is full. By evening the boats are out. And three hundred years on, where there was salt to the horizon, there are lights on the water.'),
  DE('There. A town that will never know how near it came to being a desert. That is the best sort of mending: the kind nobody ever finds out about.'),
  Wr("Somebody will find out. Give it six hundred years and there'll be a statue. There's always a statue."),
  DE('...Vivienne. While I waited on the quay, I got talking to the harbormaster about that well. He says the tide folk did not design it. They were handed the drawings. By a traveler, in very odd clothes.'),
  Wr("...That wasn't me. I'd remember. Wouldn't I?"),
  DE('Not yet, perhaps. That, apprentice, is a puzzle for another day. Supper first. I am told there is smoked eel.'),
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
        const lines = [DE('Listen to that. Waves. I had quite forgotten that I missed them.')];
        if (f.ownWatch) lines.push(DE('And how is the new watch running? ...Backward, I hope. I worked very hard on that.'));
        else lines.push(DE(`I keep finding empty slots in my parts tray. Twelve cogs gone, and you have found ${game.state.cogs.length} of them. Bring me the lot and I can build you a watch of your own: twelve is exactly a movement.`));
        return lines;
      }
      if (!f.metEugene) {
        f.metEugene = true;
        return [
          DE('Still here? Good. One more thing I should have said. The Chronoheart is whole again, since the Tower mended it: you may stay in any age as long as you please. No more racing its ring.'),
          DE('The watch was my master\'s, and her master\'s before that. "Wind it, and keep it close," she told me. "It is looking for something." I thought she was being poetical.'),
          DE('The harbormaster will know about the bells. And Vivienne: be kind to these people. They have lost a whole sea.'),
        ];
      }
      if (f.heartPlaced) return [DE('The water! Vivienne, look at the water!')];
      if (bells === 3) return [DE('All three! I heard every one. Then the Well will open to you, up on the headland. Go on, apprentice. I shall be right here. Possibly eating smoked eel.')];
      if (!f.noonRung) return [DE('The Noon Bell hangs out on Bell Rock, at the end of the Long Pier. East along the quay, past the mudflats. The harbormaster says the gate out there has beaten everyone for years.')];
      if (!f.dawnRung) return [DE('The Dawn Bell... nobody in Saltwick has laid eyes on it. They say the first folk hung it. A bell that old, I would look for in an age that old. Ask at the lighthouse: lightkeepers remember things.')];
      return [DE('And the Dusk Bell. Brannoch says it has never been cast: there is only an old promise that someone will, "for whoever is still here at the end". I do not like the sound of that, Vivienne. Look in the last age.')];
    }
    case 'brannoch': {
      const b = S('brannoch', 'Harbormaster Brannoch');
      if (f.tideRestored) return [b("Tide's in! Forty boats to refloat, eleven to bail, and one to dig out with a spade, and I have never been happier in my life."), b("I don't know what you did up on the Head, girl. I don't need to. The harbor's yours whenever you want it.")];
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
          b("Three weeks without a ripple, and the boats sinking a little deeper every day. Don't step off the quay: that mud has swallowed a horse and cart."),
          b('My gran used to say folk swam this harbor in the first days, when it was all sea. And that one day it would be dry as a bone. Cheerful woman.'),
          Wr('All sea in the first days... and dry as a bone, later on.'),
          b("Bells? The Noon Bell's on Bell Rock, at the end of the Long Pier. The Dawn Bell is a story. The Dusk Bell is a promise. That is all I know, and it's more than most."),
        ];
      }
      return [b("Mind the mud. East past the flats for the Long Pier and the Noon Bell. And if you see the tide, tell it we've kept its place.")];
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
        z('Now. The tide. Obviously someone has left the plug out. Find the plug. It will be on a chain.'),
        z('And while you are about it: I buried my retirement hoard somewhere along this shore this morning. Four hundred acorns. Under a bollard. Or a Tuesday. If you find it, do NOT eat it.'),
        { favor: 'hoard' },
        N('(Behind Zach, Megan shakes a tiny head very, very slowly.)'),
      ];
    }
    case 'megan': {
      const n = S('megan', 'Megan the Squirrel');
      if (f.tideRestored) return [n('Chk. (Megan is watching the waves come in, very still, tail curled round her feet.)')];
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
        Wr('(...Always. For about six hundred years.)'),
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
        Wr('...I do still have that snorkel.'),
      ];
    }
    case 'digby': {
      const t = S('digby', 'DIGBY');
      if (f.tideRestored) return [t('WELCOME TO SALTWICK HARBOR. NINE HUNDRED YEARS OF CONTINUOUS OPERATION. HIGH WATER IS AT 06:12.'), t('I AM A SALVAGE UNIT. THERE IS NOTHING HERE TO SALVAGE. I HAVE NEVER KNOWN WHY THAT MAKES ME SO CONTENT.')];
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
        t('SALVAGE UNIT DIGBY. WELCOME TO SALTWICK DRY DOCK. SEA LEVEL: NOT APPLICABLE.'),
        t('YOU ARE THE FIRST VISITOR IN 61 YEARS. PLEASE DO NOT BE SALVAGE.'),
        t('HISTORICAL NOTE: THE TIDE LEFT THIS HARBOR THREE CENTURIES AGO AND DID NOT RETURN. THE LAST HARBOR FOLK CAST A BELL TO CALL IT HOME. THE BELL NEVER RANG. ITS CLAPPER WAS MISFILED. I BELIEVE IN SALVAGE PIT 3.'),
        Wr("Three centuries ago... starting three weeks ago. So this is what happens if I don't mend it."),
      ];
    }
    case 'michelle': {
      const m = S('michelle', 'Michelle the Wise');
      if (f.tideRestored) return [m('Some things are only ever lent to us. You gave yours back with good grace, Vivienne. I knew you would.'), m('And you were kind along the way. I can always tell.')];
      if (f.hasRewind) {
        if (!f.tideGatePassed) return [m('Stand at the gate first. Then go down to the lever. The watch remembers the way back, even up a drop that your legs would not.')];
        return [m('Spend your time wisely, Vivienne. Even the time you get to spend twice.')];
      }
      return [
        m("Ah. The clockmaker's apprentice. Keeper of the Chronoheart now, I hear. You are early. Or I am late. With you it is hard to say."),
        m('You did well in Hollowmere. And you were kind while you did it, which is rarer.'),
        m('That watch in your pocket runs backward, yes? Things that run backward want to take someone with them. Hold it tight, think of where you have just been... and let it.'),
        N("The pocketwatch shivers in Vivienne's hand. For a heartbeat she is standing where she stood three steps ago."),
        { unlock: 'rewind' },
        m('There. It only ever takes you. The world keeps walking forward without you: gates go on closing, tides go on turning. Remember that, when you are tempted to lean on it.'),
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
          o('Four hundred years and three weeks. Right. Back on the books.'),
          o("Light's lit, so the stair's open: a rule is a rule. Go on up to the gallery. Gran swore that on a clear dawn you could see the first folk's bell from there, hanging in the air off the rail."),
          o("She used this. Take it. A loupe: her gran's gran's. She said she didn't only see the bell through it. Once, she said, she reached out and touched it. I always put that down to the gin."),
          { give: 'loupe', unlock: 'reach' },
        ];
      }
      if (f.clamSeeded) return [o("You've a look about you like you've just done something clever. Go and have a look at the old pool, then.")];
      if (f.gotChip) return [o('The Mother Clam lived in the pool by the stack, back when it was a pool. Three lifetimes, a pearl like that takes. I wish you luck finding a clam with the patience.')];
      return [
        o("Mind the cage. It's locked for a reason. No light, no stair: Keeper's rule."),
        o('Odalys. I keep the Light. Kept. The lamp went out the night the tide did: its heart is a moon pearl, and it clouded over like a dead eye. Three weeks dark, for the first time in four hundred years.'),
        o("Pearls like that don't come out of any clam I ever met. The first folk grew them in the Mother Clam, in the pool yonder, around a seed. Took the clam three lifetimes. That pool's been dry mud since before Gran."),
        o('Here. A chip off the old heart. If you ever meet a clam with three lifetimes to spare, you will know what to do.'),
        { give: 'pearlChip', flag: 'gotChip' },
        Wr('Three lifetimes. I can do three lifetimes before lunch.'),
      ];
    }
    case 'fenwick': {
      const w = S('fenwick', 'Old Fenwick');
      if (f.tideRestored) return [w('Told you.'), w('Always is.')];
      if (f.metFenwick) return [w("That jetty? Sound as a bell, what's left of it. Runs a good long way out over the mud. Mind, you would have to be daft to walk off the end of it.")];
      f.metFenwick = true;
      return [
        w("Shh. You'll scare the fish."),
        Wr("There's... no water."),
        w("That's what they WANT you to think."),
        w("Fifty year I've fished this lock. The jetty used to go right the way across, before the far end fell in. Nothing crosses here now, not in my time."),
        w("Tide'll be back. Always is. I can wait. I'm very good at it."),
      ];
    }
    case 'maren': {
      const m = S('maren', 'Maren the Tide-Reader');
      if (f.tideRestored) {
        return [
          m('Stranger! Come and see. The grandmothers were right: it was brought. I woke, and there it was in the cradle. Small as a duck egg, gold, and ticking both ways at once.'),
          m('No one saw who left it. There were footprints, though. Small ones. Very strange boots.'),
          Wr('...Very strange boots.'),
        ];
      }
      if (f.metMaren) return [m('No heart for it yet. The grandmothers are very patient. I am less so.')];
      f.metMaren = true;
      return [
        m('You climbed the Head! In those boots! Sit, stranger, before you fall down my well.'),
        m("I am Maren. I read the tides. And I had an idea, which was a mistake, because now I must build it: a clock for the sea. Wheels and water, to keep the tide's own time, so that it never forgets to come back."),
        m("The wheels I can cut. The door is planned: it will open only to three bells' voices, so that no fool wanders in. We have hung one bell, the dawn's. The other two are a problem for people cleverer than me, a long time from now. I find most problems are."),
        m('What I do not have is a heart for it. A clock like this wants a spring that knows how to run back as well as forward: out, and in again. No one alive can make such a thing.'),
        m('The grandmothers say one will be brought. They do not say by whom.'),
        Wr("(A spring that runs back as well as forward... Master's watch has been ticking against my ribs this whole time.)"),
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
        N('Your wrench passes through the lens and strikes bronze, six hundred years away. The Dawn Bell sings out over a sea that is still there.'),
        N('On the strand below, in the first age, the tide folk fall silent and stare up at a bell that is ringing itself.'),
        bellCount(f),
      ]);
    case 'duskBell':
      ring('duskRung', 'noteDusk');
      return say([
        N('The Dusk Bell has waited three hundred years to make its first sound. It makes it now: low and enormous, rolling out across the salt.'),
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
      return say(N('The harbor\'s tide gauge. Its float lies at the very bottom of the slot, on dry mud. Someone has chalked beside it: "21 DAYS".'));
    case 'portSign':
      if (f.tideRestored) return say(N('"SALTWICK HARBOR. HIGH WATER 06:12. MIND THE GULLS."'));
      return say([N('"SALTWICK DRY DOCK. PORT AUTHORITY NOTICE 1: THE SEA IS NOT CURRENTLY AVAILABLE. NOTICE 2: NOTICE 1 HAS BEEN IN EFFECT FOR 300 YEARS."'), Wr('Three hundred years, and it started three weeks ago.')]);
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
        game.hud.toast('Every stroke will bring the Warden. Ring, then <b>rewind</b> out of reach.', 5000);
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
          N('A slab of dark stone closes the mouth of the Tide Well. Three bells are carved into it, and something behind it is listening.'),
          Wr(missing.length === 3 ? "It's waiting for three voices, and I haven't rung one yet." : `It hasn't heard ${listOf(missing.map(([, d]) => d))} yet.`),
        ]);
      }
      f.wellOpen = true;
      [330, 262, 196].forEach((freq, i) => setTimeout(() => audio.sfx('bell', { freq }), i * 450));
      game.renderer.shake = 0.5;
      await say([
        N('The Chronoheart gives back its three notes, one after another: Dawn. Noon. Dusk.'),
        N('For a long moment, nothing. Then the slab sinks into the rock without a sound, and cold sea air breathes out of the dark.'),
        Wr("Only the Present's door still opens. All right. Down we go."),
      ]);
      audio.sfx('gate');
      game.refreshWorld();
      game.save();
      return;
    }
    case 'wellDoorP':
      return say([N('A doorway framed in fresh-cut stone and closed with driftwood planks. Behind it, the well is still being dug.'), Wr("It isn't finished in this age. It has to be the Present.")]);
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
      if (f.heartPlaced) return say(N('The pocketwatch ticks in its cradle. Forward, and back, and forward.'));
      await say([
        N("The Tide Clock's great wheel fills the wall, turning slowly the wrong way. At its foot is a cradle of dark stone, the size of a duck egg. Empty."),
        N("In Vivienne's pocket the watch is pulling so hard that it hums."),
        Wr("It was never a watch. It's this clock's heart. Somebody carried it inland a very long time ago, and it has been trying to get home ever since."),
        Wr("...If I put it back, I can't take it out again. No more running myself backward."),
        Wr('Michelle said it. The world keeps walking forward. So should I.'),
        N('Vivienne sets the watch in the cradle. It fits as though it had only just been lifted out.'),
      ]);
      return game.placeHeart();
    default:
      return;
  }
}
