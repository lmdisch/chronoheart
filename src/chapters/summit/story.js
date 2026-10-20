// Chapter Three, Highcrest: items, favors, every line of dialogue, and what using things does.
import { audio } from '../../audio/audio.js';
import { ERA } from '../../core/util.js';
import { L, gy, zb } from './level.js';

export const ITEMS = {
  hourLantern: { name: "Ingrid's Lantern", desc: "Her gran's. A lady from the observatory fitted its glass, long ago. Lit, it shines with light from another hour, and inside that light the other age is real. Q and E choose which." },
  lens: { name: 'The Echo Lens', desc: "The stranger's gift. Lyra ground the glass. Through it, the Chronoheart remembers you well enough to make another of you, and even remembers your Lantern's light." },
  ember: { name: 'A Coal from the First Fire', desc: "From the builders' fire in the First Age. It has never gone out, and it never will." },
  page: { name: 'A Page of Star-Book', desc: "Torn from one of Tobin's star-books: four rings, drawn in a line. Someone has written in the margin." },
  summitFlag: { name: "Zach's Flag", desc: 'An acorn on a blue field. "Every great expedition needs a flag," says Zach.' },
  masterDrawings: { name: "The Founder's Drawings", desc: 'Plans for a stone bridge and a house for the stars on Highcrest, six hundred years old, in a small, tidy hand you know very well.' },
  finder: { name: 'The Cog Finder', desc: "Ten of Donald Eugene's cogs, meshed round the Chronoheart's rim. Under your hearts, they point the way to the nearest Lost Cog, and say which age it is in. Through the time lens, it sends up gold." },
  myWatch: { name: "Vivienne's Pocketwatch", desc: "Twelve cogs and a winter of Donald Eugene's evenings. Your echo remembers longer (eight seconds) and holds four echoes at once." },
  masterKey: { name: "The Master's Key", desc: "Ten Lost Cogs, fitted by Orin into the key-blank Lyra left on the observatory bench. It opens the star-iron door in Hollowmere Square.", key: true },
};

/** Kindness side quests. `start` is the flag set when the favor is asked. */
export const FAVORS = [
  { id: 'ember', title: 'A light for the lookout', start: 'emberQuest', todo: "The lookout lamp on the Lantern Road has been dark since Ingrid's gran's time: no flame up here lasts in that wind. One from a fire that never goes out might.", done: 'The lookout lamp burns again, in every age after.' },
  { id: 'page', title: "Tobin's lost page", start: 'pageQuest', todo: "A page of Tobin's star-books blew away over the ravine on the Lantern Road. It's the page with the midwinter rings on it.", done: 'Tobin has his page back, and you know whose initials are in its margin.' },
  { id: 'flag', title: "Zach's flag", start: 'zachQuest', todo: 'Zach gave you his expedition flag. Plant it at the very top of Highcrest.', done: "Zach's flag flies at the top of the world." },
];

const N = (text) => ({ who: null, name: '', text });
const V = (text) => ({ who: 'vivienne', name: 'Vivienne', text });
const S = (who, name) => (text) => ({ who, name, text });
const DE = S('eugeneWinter', 'Donald Eugene');
const OR = S('orinOld', 'Orin');
const LY = S('michelleWinter', 'Lyra');
const ST = S('michelleWinter', 'Mysterious Stranger'); // (Lyra's echo: nobody knows that yet)
const ZA = S('zachWinter', 'Zach Tiberious');
const ME = S('meganWinter', 'Megan the Squirrel');
const IN = S('ingrid', 'Ingrid the Lamplighter');
const TO = S('tobin', 'Tobin the Stargazer');
const SE = S('sela', 'Sela the Stonecutter');
const AN = S('anwen', 'Anwen the Guide');
const KI = S('porterKit', 'Kit the Porter');
const BR = S('porterBram', 'Bram the Porter');
const YL = S('lyraYoung', 'Lyra (Memory)');
const YO = S('christopherYoung', 'Orin (Memory)');
const YD = S('eugeneYoung', 'Don (Memory)');

export const INTRO = [
  N('Midwinter. Snow on the valley, and the Clocktower of Hollowmere striking every hour exactly on time.'),
  N('Since Saltwick, Donald Eugene has been kinder than ever. He has also been watching her.'),
  DE("Come up Highcrest with me for Midwinter, apprentice. There's someone up there I'd like you to meet."),
  N('Two days later they reach Base Camp, at the foot of the mountain: bright tents in the snow, prayer flags snapping in the wind, porters loading packs for the climb.'),
  N('Above it, the road zigzags up the face of Highcrest: across, and turning back, and across again, all the way to the observatory at the top.'),
  DE("You take the road. I'll go on ahead. My knees know a shortcut."),
];

/** Right after the intro: he is simply not there any more. */
export const GONE = [
  V('Master? ...Master?'),
  V("There isn't a shortcut. There isn't anywhere to go."),
  V("He didn't walk. He went somewhen."),
];

/** The first time you walk out to the overlook, or look through the brass telescope. */
export const VIEW = {
  0: [V('No towns at all, down there. Just forest, all the way to the sea.'), V("One day that'll be Hollowmere. And that, Saltwick.")],
  1: [
    V("Oh! There's Hollowmere! I can see the Clocktower, all lit up..."),
    V("And Saltwick, and Keeper's Light going round, and the sea. Everything I've ever done is down there."),
  ],
  2: [V("Everything down there is white, and still. Even the lighthouse isn't turning."), V('Nothing moves. Nothing ever goes wrong again. ...This is what he wants.')],
};

/** On the Sundial Terrace: Orin, in front of the Founder's statue. */
export const MEET = [
  N("An old man in a shabby plum coat is standing in front of the statue, looking up at it. He turns, and sees the amulet at Vivienne's throat, and goes very still."),
  OR("That's Don's. The Chronoheart."),
  V("I'm Vivienne. His apprentice. He came up ahead of me. ...Do you know him?"),
  OR('I did. Fifty years ago.'),
  OR("Orin. I keep the observatory, up at the top. Kept. I'm not sure what I keep any more."),
  OR('They say that statue is six hundred years old. The Founder, who gave Highcrest its observatory. Funny thing.'),
  OR('It has his nose.'),
  V('...It does.'),
  OR("Whatever he's told you he came up here for, apprentice: don't help him."),
  V('Help him with what?'),
  OR('Ask him about Lyra.'),
  N('Behind them, the air shivers, like heat over a road. Frost races up the mountain, switchback by switchback, and seals the observatory doors in ice.'),
  OR("...That isn't weather. That's him."),
  OR("He doesn't want you reading something up there. Go on, then. I'm too old for that road. I'll come up the long way."),
  N('He goes, slowly, leaning on the rail.'),
  ZA('Well. He seemed cheerful.'),
  ME('Chk.'),
  ZA('Megan and I shall scout ahead. By which I mean we shall ride in your rucksack.'),
  ZA('Take this. If you reach the top before us, plant it. Every great expedition needs a flag. Ours has an acorn on it.'),
  { give: 'summitFlag', favor: 'flag', flag: 'zachQuest' },
];

/** Under the orrery: an echo Lyra left behind, of Midwinter Night fifty years ago. */
export const MEMORY = [
  N('The air under the orrery shimmers. An echo, left here a long time ago: one minute to midnight, on Midwinter Night, fifty years back.'),
  N('A young woman in a heavy shawl, far too thin, holds a tin cup in both hands. A young man holds her other hand. A third stands a little apart, with his hand in his pocket.'),
  YL('Look up, both of you. All four rings, coming into line. Twenty winters we waited for this.'),
  YO('I see them.'),
  YL("Don. Come here. ...No, take your hand out of your pocket. I know what's in it."),
  N('Young Donald Eugene draws out his hand. In it is half of something brass and glass, still warm.'),
  YL("Promise me you won't use it for me. Not on any winter, not on any doctor, not on any day."),
  YD('Lyra, you don\'t have to—'),
  YL("It's the ending that makes it ours, Don. Let me have mine."),
  YD('...I promise.'),
  N('Her cup slips from her fingers and cracks on the stone. Nobody picks it up. The echo fades.'),
  V('He promised her.'),
];

/** At the foot of the Needle: a shimmer, like heat over a road, but cold. */
export function summitLines(f) {
  return [
    N('At the foot of the Needle, the air hangs wrong: a shimmer, like heat over a road. But cold.'),
    ...(f.notebooksRead ? [V('Attempt eight thousand, five hundred and twelve.'), V("All right, Master. Let's talk.")] : [V("Master? ...I know you're in there.")]),
    N('Vivienne steps into the shimmer, and the summit falls away.'),
  ];
}

/** Where it leads: the End of Time, and the throne he keeps there. */
export const ARRIVE = [
  N('A great hall of black marble, broken into a thousand pieces, and every crack mended with gold. There is no sky. Pages of the world drift past in the dark: Hollowmere, Saltwick, the mountain, each one a little different from the last.'),
  DE('There you are. I knew you would find the door. You always do.'),
  DE('Welcome to the End of Time, apprentice. Every version of the valley there has ever been ends up here. I keep them.'),
  V('I read your notebooks.'),
  DE('Did you? Good. Then I needn\'t explain. It saves such a lot of time.'),
  DE('Eight thousand, five hundred and eleven times I have tried to save her. A doctor. A different winter. A ship kept in port. She dies every time, Vivienne. Differently. Every single time.'),
  DE('So I found the cleverest mind in the valley, and I made sure she came to my door. You are the best attempt I have ever had. Solve it.'),
  V('No.'),
  DE('...I beg your pardon?'),
  V('She asked you not to. I saw her ask. You promised her.'),
  DE('She was dying. People say all sorts of things.'),
  V('She meant it. It was hers.'),
  DE('Nothing is anyone\'s, apprentice. Everything is a draft.'),
  DE("Very well. If you won't choose it, I shall make it the only thing left to choose."),
];

/** Phase three: he reaches for the things she loves. */
export const SQUIRRELS = [
  DE('Shall I start on the things you love, then? Your squirrels, perhaps.'),
  N('By the door, the air shivers, and two small, indignant figures flicker into the hall: Zach and Megan, half there and half not, like a page being rubbed out.'),
  ZA('Excuse me. I am being ERASED. I would like to speak to whoever is in charge of erasing.'),
];

/** Held in his moment, he has to listen: Lyra's last echo. */
export const RELEASE = [
  N('The wave takes him on his throne, mid-word. Donald Eugene is held in his moment, one hand raised to rewrite the hall. For once in fifty years, he cannot change anything at all.'),
  N('Someone steps out of the dark beside Vivienne. An old woman in a winter shawl.'),
  LY('Hello, Don.'),
  V('...You. The river. The quay. The Lantern Road. It was you, every time.'),
  LY('Only echoes, dear. I sent them down the years to whoever he would give the other half to. I knew he would give it to somebody. He never could manage anything alone.'),
  LY("It was my ending, Don. Not yours to write."),
  LY('I built it in two halves, so you would never be alone with it. Whoever held the other half would remember every change you made. You were never alone, love. You only thought you were.'),
  LY('Let me go. Then go and sit with Orin. He has been waiting a very long time.'),
  N('The echo fades. A long moment after it, so does the wave.'),
  N('Donald Eugene does not rewrite the hall. He sits on his throne at the end of time, and looks at his hands.'),
  N("His half of the Chronoheart slips from his fingers and rings on the marble. He doesn't reach for it."),
  N('Vivienne picks it up. The two halves are warm in her hand.'),
  DE("...I don't know how to stop, Vivienne."),
  N('She holds out her other hand. After a long time, he takes it.'),
];

/** Back on the summit: Midwinter Night, at last, and an old friend waiting. */
export const REUNION = [
  N('The frost lets go of the mountain, switchback by switchback. The golden evening that never quite set goes down at last, and it is a clear, starlit Midwinter Night.'),
  N('Orin is waiting at the foot of the Needle, with a tin cup in his hands. It was cracked clean across, once. Someone has filled the crack with gold.'),
  OR('Took you long enough, Don.'),
  DE('...Fifty years.'),
  OR('Fifty years. She left this on the stone that night. I mended it. It was the only thing I ever mended.'),
  N('Orin sets the cup down at the foot of the Needle. Donald Eugene sits beside it in the snow, and for the first time in fifty years, he does not reach for anything.'),
  N('After a while, he weeps. Orin sits down next to him, and lets him.'),
  ZA('(very quietly) We shall give them a minute.'),
  ME('Chk.'),
];

/** All ten of Highcrest's cogs: Orin finishes what Lyra left on the bench. */
export const COGS_ENDING = [
  OR('That rattling in your coat, apprentice. Cogs? Ten of them, with his mark on every one.'),
  OR('Lyra left a key-blank on the observatory bench, fifty years ago. She said someone would want it finished one day.'),
  N('By lantern-light, Orin fits the ten cogs into the brass key-blank, one by one, and presses it into her hand: the Master\'s Key.'),
  OR("It opens one door, she said: the star-iron one in Hollowmere Square. She said it was the only door worth opening twice."),
];

/** The last word: spring, in Hollowmere. */
export const AFTER = [
  N('Vivienne leaves them there, two old friends under the four brass rings, and starts down the mountain.'),
  N('Spring, in Hollowmere. The workshop on the square is hers now, and the Clocktower ticks over her head.'),
  N("On her way to buy bread, she passes the bakery's sign. HALE'S. It was Marlow's, once. She and one old man on a mountain are the only people in the world who know."),
  N('She could change it back with one step into the Past.'),
  N('She buys her bread, and goes home.'),
];

// ---------------------------------------------------------------------------
export function npcLines(game, id) {
  const f = game.state.flags, inv = game.state.inventory, kind = game.state.kindness;
  switch (id) {
    case 'ingrid': {
      if (f.hoursReturned) return [IN("My lamps! Listen to them: they're burning right down to the wick, the way lamps should. I could cry. I won't. It would freeze.")];
      if (inv.includes('ember')) return [
        IN("Is that... it's warm. It's been burning since before there was a town up here, hasn't it? I can feel it."),
        { take: 'ember' },
        N('Ingrid takes the coal up to the lookout and tucks it into the dark lamp. It catches at once, and the wind can do nothing about it at all.'),
        { flag: 'lampLit', refresh: true, sfx: 'key' },
        IN("Gran always said that lamp was waiting for the right flame. There. Now it'll outlast all of us."),
        { kind: 'ember' },
      ];
      if (!f.hasLantern) return [
        IN('Every lamp on the road, every night, all winter. And every year they burn a little shorter. Nobody can tell me why.'),
        IN("You're climbing? Up to the top? Then take Gran's lantern. It never kept time with the others. Some nights it shone with yesterday's light. Some nights, with tomorrow's."),
        IN('Gran said a lady from the observatory fitted the glass, long ago. Said it held light from another hour. I never knew what she meant. Maybe you will.'),
        { give: 'hourLantern', unlock: 'lantern' },
        IN("And if you ever come across a flame that the wind can't put out... the lookout lamp has been dark since Gran's time. Nothing up here lasts long enough to light it."),
        { favor: 'ember', flag: 'emberQuest' },
      ];
      if (kind.includes('ember')) return [IN("Look at it, burning away up there. The children have started calling it the Old Fire. They're not wrong.")];
      return [IN("Light Gran's lantern, and turn it to whichever time you need. Back, or forward."), IN("The lookout lamp's still dark. A flame that never goes out: that's what it wants.")];
    }
    case 'ingridW':
      return [IN("...was I standing here long? My feet are freezing. And I had the strangest dream: that nothing ever changed again.")];
    case 'tobinW':
      return [TO("Where did my ink go? Oh. Oh, it's dried. How wonderful. Ink is supposed to dry.")];
    case 'ingridF':
    case 'tobinF':
      if (f.hoursReturned) return [N('The ice is melting off them, drop by drop. Any day now.')];
      return id === 'ingridF'
        ? [N('Ingrid, frozen mid-step with her lighting pole raised. A snowflake hangs beside her cheek, and does not fall.'), V('...Ingrid?')]
        : [N('Tobin, stopped with his pen above the page. The ink on its nib has not dried, and never will.')];
    case 'sela':
    case 'selaHigh':
      if (f.selaBuilt) {
        return [
          SE("The Founder's drawings! A bridge across the crevasse, and a house for the stars at the top. He promised he would send them."),
          SE('We are carving him for the terrace, too: an old man in a fine coat. He was very particular about the nose.'),
        ];
      }
      if (inv.includes('masterDrawings')) {
        return [
          SE("Traveler! Those parchment rolls in your apron: are those the Founder's drawings?!"),
          V('I found them in the Clockworks. A stone bridge, across the upper crevasse.'),
          { take: 'masterDrawings', flag: 'selaBuilt', sfx: 'key' },
          SE('He said they would come. He said a stranger in very odd boots would bring them, and that we should do exactly as they say.'),
          V("...He said that? Six hundred years ago?"),
          SE("Stand back, traveler! Give my masons six hundred years, and this mountain will have its bridge."),
        ];
      }
      if (id === 'selaHigh') {
        return [
          SE("Mind the crevasse, stranger! Our log bridge holds for now, but we cannot cut stone steps until someone brings us the Founder's drawings."),
          V("(The Founder's drawings... if I find them in the Clockworks, Sela should have them, in the First Age.)"),
        ];
      }
      return [
        SE('A stranger! In such boots! You must be from beyond the clouds. Nobody comes from beyond the clouds.'),
        SE("We are cutting stones for a great house on the top of the mountain. We don't know what it's for yet. The Founder says he will send the drawings."),
        ...(f.emberQuest && !inv.includes('ember') && !game.state.taken.includes('ember') ? [SE('Our fire? Take a coal from it, if you like. That fire has never gone out. We are rather proud of it.')] : []),
        SE('An old man in a fine coat, the Founder. He pays in gold. Every coin has a little wheel on it, with a nick in one tooth.'),
        V('(...Of course it does.)'),
      ];
    case 'michelle':
      if (!f.hasLantern) return [ST('There you are, Vivienne. Late, or early. Up here it is hard to say.'), ST('Mind the frost on this mountain. It is not weather. Somebody put it there.'), ST('Ingrid the lamplighter has a lantern that never agreed with the clock. Ask her for it. You will need it before the ravine.')];
      return [ST('A light that holds an hour. Use it gently.'), ST("Where the frost lies on the road, the ages are held still, and the Chronoheart cannot shift. Light the Lantern instead, and turn it back or forward.")];
    case 'michelleDome':
      if (!f.hasEcho) return [
        ST('You met Orin.'),
        V("He said not to help Master. He said to ask him about Lyra. Who IS Lyra? You seem to know everybody."),
        ST('Go and see, under the orrery. It is not mine to tell. ...Well. It is. But not yet.'),
        V('...Who ARE you?'),
        ST('Someone who would like your master to stop. Here. Take this.'),
        { give: 'lens', unlock: 'echo' },
        ST('An Echo Lens. Through it, the Chronoheart remembers you, and something of you can stay behind. Your echo walks where you walked, over and over. And if your Lantern is lit while you record, it carries that light too.'),
        ST("One of the three Clockworks plates ahead is crusted in frost: light the First Age in your Lantern while you or an echo stand on it. And inside, look for the Founder's drawings. Sela, in the First Age, has been waiting six hundred years for them."),
      ];
      return [ST('The clockworks door wants all three green plates held at once, and the third plate needs the First Age light to melt its frost.'), ST("Don't forget the Founder's drawings inside the hall. Sela, in the First Age, can build a stone bridge across the upper crevasse with them.")];
    case 'anwen':
      if (f.hoursReturned) return [AN("Every clock in the valley right on time, and a midwinter night as clear as glass. Best season we've ever had.")];
      return [
        AN('Anwen. I lead the guides on Highcrest. Kit and Bram carry the loads; I carry the worrying.'),
        AN('The road goes up in switchbacks. East along here, and where you see the flags, it turns back on itself and climbs. West along the next, and turn again. Six legs to the top.'),
        AN("And mind the frost. It's been creeping down from the top all winter. Where it lies, the mountain won't let you go anywhere but forward."),
      ];
    case 'anwenF':
      return [N('Anwen, frozen still with a rope coil over one shoulder. Her breath hangs in the air, a little white cloud that will never fade.')];
    case 'anwenEnd':
      return [AN("Made it to the top in the dark with two squirrels and a clockmaker. I've guided a lot of expeditions. That one goes in the book.")];
    case 'porterKit':
    case 'porterRest':
      if (f.hoursReturned) return [KI('Light pack today! Just cocoa, all the way down.')];
      return id === 'porterRest'
        ? [KI('Resting my legs. Half the loads in this town come up that road on my back.'), KI("Follow the flags at every turn. You're doing well, for someone with no pack.")]
        : [KI("Kit. I carry things up the mountain. Then I carry other things down. It's a living."), KI('Funny thing: the loads have felt heavier every winter. Like the hours are getting longer on the way up.')];
    case 'porterBram':
    case 'porterHigh':
      if (f.hoursReturned) return [BR('Heard the bells ring all the way up. Every clock on the mountain at once. Never heard the like.')];
      return id === 'porterHigh'
        ? [BR("Bram. Highest porter on Highcrest. Well, second highest, now you're up here."), BR("The rockfall's been blocking this road for weeks. The old songs say there was a warm spring up there once, before the ice got into it, and that in the hardest winters the falls froze solid into a stair."), BR("Not this winter, more's the pity. Not in any winter I've seen.")]
        : [BR("Bram. If you're going all the way up: the observatory's at the east end of the summit, and the Needle's at the west."), BR("And don't lick the railings.")];
    case 'zach':
      return [ZA('Ahem. Zach Tiberious, alpine expert. We did NOT stow away in your rucksack. We conducted a vertical inspection of it.')];
    case 'megan':
      return [ME('Chk. (Megan is wearing a very small red scarf. She is extremely pleased about it.)')];
    case 'zachEnd':
      return f.flagPlanted ? [ZA('Our flag! At the top of the world! I planned this. Write that down.')] : [ZA('Did you plant the flag? The flag is the most important part of any expedition. After the snacks.')];
    case 'meganEnd':
      return [ME('Chk! (Megan has eaten most of the cocoa biscuits. She regrets nothing.)')];
    case 'tobin': {
      if (f.hoursReturned) return [TO('The stars are back where they belong, every one, to the second. I have checked four times. I shall check again in a minute.')];
      if (inv.includes('page')) return [
        TO('My page! The midwinter rings! Where on earth... over the ravine? Of course it was.'),
        { take: 'page' },
        TO('Look: four rings, in a line. Once in a hundred years. And in the margin, somebody wrote, fifty years ago: "O., L., & D. — Midwinter forever."'),
        V('Orin, Lyra, and Donald...'),
        { kind: 'page' },
      ];
      if (f.pageQuest) return [TO("The page with the midwinter rings on it. It went over the ravine, I'm almost sure. Into the town side, I hope.")];
      return [
        TO('The stars are slipping. Half a second a night, every night, for as long as I have kept the books. The stars cannot be late, the Dean says. And yet.'),
        TO('Every star you see is old light, you know. It left the star before your grandmother was born. Light is the only thing that travels through time all by itself.'),
        TO('And now a page of the star-books has blown away. Over the ravine, I think. The page with the midwinter rings on it, of all pages.'),
        { favor: 'page', flag: 'pageQuest' },
      ];
    }
    case 'youngLyra':
    case 'youngChristopher':
    case 'youngDon':
      return MEMORY;
    case 'christopher': // (Donald Eugene, on his throne at the End of Time)
      if (!f.orinPhase1) return [DE('Every wave is a version you never lived in. Hollowmere without its Tower. Saltwick without its sea. I can do this all night, apprentice.')];
      if (!f.orinPhase2) return [DE('The Anchor was only a clock. These locks are older. They hold everything I have ever written.')];
      return [DE('Go on, then. Hold me still, if you can. Nobody ever has.')];
    case 'orinEnd':
      return [OR('She asked us to come up here every Midwinter. Look out at the valley, not back at her, and tell her what grew.'), OR("I've come every year. Now he will too. I'll show him how.")];
    case 'eugene':
      return [DE('I keep reaching for it. Fifty years of reaching. My hands do not know what to do with themselves.'), DE('Sit with us a while, apprentice. Orin says I am not to be left alone. I think he is right.')];
    default:
      return [N('...')];
  }
}

export async function interact(game, ent) {
  const f = game.state.flags, inv = game.state.inventory;
  const say = (lines) => game.dialogue.run(Array.isArray(lines) ? lines : [lines]);
  switch (ent.id) {
    case 'lookoutLamp':
      if (f.lampLit) return say(N('The lookout lamp, burning with a flame from the First Age. The wind has given up trying.'));
      return say([N('An old lamp on a tall post, dark. Its glass is clean: someone polishes it, even though it never gets lit.'), f.emberQuest ? V('A flame that never goes out. Somewhere, someone must have one.') : V('Ingrid would know about this.')]);
    case 'statue':
      return say([
        N('A statue of an old man in a long coat, bald on top, with one hand raised as if he were conducting an orchestra.'),
        N('The plaque reads: "THE FOUNDER, WHO GAVE HIGHCREST ITS OBSERVATORY. SIX HUNDRED YEARS."'),
        V("...That's Master's nose."),
        V('Six hundred years old. With Master\'s nose.'),
      ]);
    case 'statueF':
      return say(N("The Founder's statue, frosted white. Even his stone hand is frozen in the air, mid-conduct."));
    case 'frostWall':
      return say([N('A wall of ice across the observatory doors, hard as glass. Behind it, on the bench, you can just see a stack of notebooks.'), V("He sealed it. He doesn't want me reading something."), V('In the First Age there were no doors here at all. Only planks over the foundations.')]);
    case 'notebooks':
      f.notebooksRead = true;
      game.save();
      return say([
        N("A stack of notebooks on the observatory bench, every one in Donald Eugene's small, tidy hand. The oldest are fifty years old."),
        N('"Attempt 12. A doctor from Saltwick, kept in port. Did not help. The harbor changed. Corrected."'),
        N('"Attempt 340. A different winter. Did not help. Hollowmere lost its mill. Corrected."'),
        N('"Attempt 2,207. Moved her down to the valley. No difference. A boy in the square grew up unkind. Corrected."'),
        N('Page after page after page, for fifty years. Near the end, a gold cog with a notch in one tooth is stamped at the top of every page.'),
        N('"Attempt 8,512. An apprentice: the cleverest in the valley. Arranged. Testing."'),
        V('...Arranged.'),
        V('The clock in my village stopped, the winter I was nine. That\'s why they sent me to him.'),
      ]);
    case 'shimmer':
      return game.enterShimmer();
    case 'starBooks':
      return say([N('Rows of star-books, one for every year the observatory has watched the sky. One shelf is labeled MIDWINTER. Someone has read it so often that the spines have worn white.')]);
    case 'needle':
      if (f.hoursReturned) return say(N("The Needle, the summit's own gnomon. Its shadow moves again, slowly, the way a shadow should."));
      return say([N('The Needle: a spire of stone at the very top of Highcrest, older than anything built by hands. Its shadow lies across the clouds, held in its moment, and has not moved for fifty years.')]);
    case 'lyraCup':
      return say([N("Lyra's tin cup, at the foot of the Needle. It cracked clean across on Midwinter Night, fifty years ago. Orin filled the crack with gold."), N('Two old men sit beside it, looking out at the valley.')]);
    case 'telescope': {
      f.sawView = true;
      const lines = [...(VIEW[game.era] || VIEW[1])];
      if (f.hoursReturned) {
        lines.push(V("Both towns are awake and shining under the Midwinter stars: the Clocktower lit, and Saltwick's harbor full of water."));
      }
      await say(lines);
      game.save();
      return;
    }
    case 'flagSpot':
      if (!inv.includes('summitFlag')) return;
      game.removeItem('summitFlag');
      f.flagPlanted = true;
      audio.sfx('checkpoint');
      game.refreshWorld();
      await say([N("You plant Zach's flag at the very top of Highcrest. It snaps in the wind, acorn and all."), V('Every great expedition needs a flag.')]);
      game.completeKindness('flag');
      game.save();
      return;
    default:
      return;
  }
}

export async function struck(game, ent) {
  const f = game.state.flags;
  switch (ent.id) {
    case 'cwChime':
      f.cwChimeRung = true;
      game.chimeHoldT = 9.0;
      audio.sfx('checkpoint');
      game.hud.toast('<b>Resonance chime rung!</b> Its vibration holds the gold gate open for 9 seconds!', 5000);
      game.save();
      return;
    case 'thermalLever':
      f.springOpened = true;
      audio.sfx('gate');
      game.refreshWorld();
      await game.dialogue.run([
        N('Your wrench shatters the brittle ice-lock on the First Age sluice! Warm geothermal springwater bursts from the rockface in a cloud of steam.'),
        V('Give that warm spring six hundred years, and it will carve stepped terraces right through the rockfall!'),
      ]);
      await game.timelapse({
        to: ERA.PRESENT,
        focus: [L.iceStairX0 + 2, gy(4, L.iceStairX0) + 2, zb(4) + 3],
        years: 600,
        caption: 'Six hundred years of warm springwater carve stepped terraces across the rockfall...',
        effect: 'shine',
      });
      game.hud.toast('Warm stone terraces now climb the rockfall in the <b>Present</b>!', 5000);
      game.save();
      return;
    case 'orreryChime':
      f.orreryChimeRung = true;
      audio.sfx('checkpoint');
      game.save();
      if (!f.memorySeen) {
        f.memorySeen = true;
        await game.dialogue.run(MEMORY);
        game.hud.toast('The Orrery rings align: <b>Midwinter Night, fifty years ago</b>.', 4500);
      } else {
        game.hud.toast('The Orrery chime rings out, harmonizing with the four brass rings overhead.', 4000);
      }
      return;
    case 'orinAnchor':
      f.orinPhase1 = true;
      audio.sfx('gate');
      game.renderer.shake = 0.7;
      game.refreshWorld();
      game.save();
      game.onOrinPhase1Done?.();
      return;
  }
}

/** The little commands mixed in with the lines: give, take, flag, favor, kindness, sound, power, refresh. */
export function runCommand(game, cmd) {
  if (cmd.give) game.giveItem(cmd.give);
  if (cmd.take) game.removeItem(cmd.take);
  if (cmd.flag) game.state.flags[cmd.flag] = true;
  if (cmd.favor) game.startFavor(cmd.favor);
  if (cmd.kind) game.completeKindness(cmd.kind);
  if (cmd.sfx) audio.sfx(cmd.sfx);
  if (cmd.unlock) game.unlockPower(cmd.unlock);
  if (cmd.refresh) {
    game.refreshWorld();
    game.save();
  }
}

/** Talk to someone: their lines, and the commands mixed in with them. */
export async function talk(game, npc) {
  const f = game.state.flags;
  const hadBuilt = !!f.selaBuilt;
  npc.talking = true;
  const lines = npcLines(game, npc.id);
  await game.dialogue.run(lines, (cmd) => runCommand(game, cmd));
  npc.talking = false;
  if (npc.id === 'orinEnd' && f.hoursReturned && game.state.cogs.length >= game.ch.COG_TOTAL && !f.masterKey) {
    await game.dialogue.run(COGS_ENDING);
    game.grantMasterKey?.();
  }
  if ((npc.id === 'youngLyra' || npc.id === 'youngChristopher' || npc.id === 'youngDon') && !f.memorySeen) {
    f.memorySeen = true;
    game.hud.toast('An echo, left behind: <b>Midwinter Night, fifty years ago</b>.', 4000);
  }
  if (!hadBuilt && f.selaBuilt) {
    game.refreshWorld();
    await game.timelapse({
      to: ERA.PRESENT,
      focus: [(L.crev1X0 + L.crev1X1) * 0.5, gy(4, L.crev1X0) + 1, zb(4) + 3],
      years: 600,
      caption: "From the Founder's drawings, Sela's masons raise a stone bridge across the crevasse...",
      effect: 'shine',
    });
    game.hud.toast("The Founder's stone bridge now spans the upper crevasse in every age!", 5500);
  }
  game.save();
}

