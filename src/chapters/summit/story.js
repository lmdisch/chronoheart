// Chapter Three, Highcrest: items, favors, every line of dialogue, and what using things does.
import { audio } from '../../audio/audio.js';
import { ERA } from '../../core/util.js';
import { L, gy, zb } from './level.js';

export const ITEMS = {
  hourLantern: { name: "Ingrid's Lantern", desc: "Her gran's. It never kept time with the other lamps. Lit, it shines with another age's light, and inside that light the other age is real. Q and E choose which." },
  lens: { name: 'The Echo Lens', desc: "From the heart of the Clocktower. Lyra's Echo borrowed it back. Through it, the Chronoheart remembers you well enough to make another of you—and even remembers your Lantern's light." },
  ember: { name: 'A Coal from the First Fire', desc: "From the builders' fire in the First Age. It has never gone out, and it never will." },
  page: { name: 'A Page of Star-Book', desc: "Torn from one of Tobin's star-books: four rings, drawn in a line. Someone has written in the margin." },
  summitFlag: { name: "Zach's Flag", desc: 'An acorn on a blue field. "Every great expedition needs a flag," says Zach.' },
  masterDrawings: { name: 'The Master Drawings', desc: "Parchment blueprints for the Valley Clocktower, the Tide Well, and the Highcrest Observatory—begun by Orin and Lyra, with margin notes in a hand that looks very much like yours." },
  finder: { name: 'The Cog Finder', desc: "Chapter One's ten cogs, fitted round the Chronoheart's rim. Through the lens, a Lost Cog sends up gold." },
  myWatch: { name: "Vivienne's Pocketwatch", desc: "Twelve cogs and a winter of Donald Eugene's evenings. Your echo remembers longer (eight seconds) and holds four echoes at once." },
  masterKey: { name: "The Master's Key", desc: "All ten of Highcrest's Lost Cogs, forged by Donald, Orin, and Lyra into a master winding key. It rekindles the Chronoheart so you can shift freely between Highcrest's three ages—and unlocks the Astral Clock-Door in Hollowmere Square.", key: true },
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
const OR = S('christopher', 'Sir Orin');
const LY = S('michelleWinter', 'Lyra the Wise');
const ZA = S('zachWinter', 'Zach Tiberious');
const ME = S('meganWinter', 'Megan the Squirrel');
const IN = S('ingrid', 'Ingrid the Lamplighter');
const TO = S('tobin', 'Tobin the Stargazer');
const SE = S('sela', 'Sela the Stonecutter');
const AN = S('anwen', 'Anwen the Guide');
const KI = S('porterKit', 'Kit the Porter');
const BR = S('porterBram', 'Bram the Porter');
const YL = S('lyraYoung', 'Lyra (Memory)');
const YO = S('christopherYoung', 'Sir Orin (Memory)');

export const INTRO = [
  N("Winter came early to Hollowmere. And with the first snow, every clock in Donald Eugene's workshop began to lose an hour a night."),
  S('eugene', 'Donald Eugene')('Not running slow, mind. Losing them. As if someone were reaching in at midnight and taking an hour off the top.'),
  V("It's Sir Orin, isn't it? Now that Hollowmere's Tower and Saltwick's Tide Clock are locked forward, he can't siphon from them quietly anymore."),
  S('eugene', 'Donald Eugene')("Aye. Fifty years ago on Midwinter Night, when his wife Lyra was dying, Orin locked the Highcrest Observatory at 11:59 in a 'Borrowed Hour' so she would never reach midnight. Now it takes whole hours out of our nights just to keep that single minute from ending."),
  S('eugene', 'Donald Eugene')('Go on ahead to Base Camp, apprentice. My knees are slow on ice, so I will follow behind with the pack. Help my old friend let the night end.'),
  N('Two days later, Vivienne reaches Base Camp at the foot of Highcrest: bright tents in the snow, prayer flags snapping in the wind, and porters loading packs for the climb.'),
  N('Above it, the road zigzags up the face of the mountain: across, and turning back, and across again, higher every time, all the way to the observatory at the top.'),
  V('All the way to the top, then.'),
];

/** The first time you walk out to the overlook, or look through the brass telescope. */
export const VIEW = {
  0: [V('No towns at all, down there. Just forest, all the way to the sea.'), V("One day that'll be Hollowmere. And that, Saltwick.")],
  1: [
    V("Oh! There's Hollowmere! I can see the Clocktower, all lit up..."),
    V("And Saltwick, and Keeper's Light going round, and the sea. Everything I've ever done is down there."),
  ],
  2: [V("Everything down there is white, and still. Even the lighthouse isn't turning."), V("That's what happens if nobody fixes this. Right. Let's fix it.")],
};

export const MEET = [
  N('A man in plum velvet is standing in front of the statue, looking up at it. He turns, and sees Vivienne, and goes very still.'),
  OR("...You. Look at those goggles. You're the one from the margin of the old drawings. Have you been waiting six hundred years just to scold me?"),
  V("I'm Vivienne. Donald Eugene's apprentice."),
  OR("Donald's... apprentice. Of course. He ran down the mountain fifty years ago with the Tide Watch, and now he sends a child in his place."),
  OR('I am Sir Orin, Master of the Highcrest Observatory. Whatever you have come to mend, apprentice, you can turn round and mend it somewhere lower down.'),
  V("You're taking hours from every clock in the valley to keep one Midwinter night frozen. The frost is creeping down the mountain."),
  OR('I am keeping my wife alive! One hour—11:59 on Midwinter Night—where Lyra is still breathing beside me under the orrery. I always mean to pay the valley back.'),
  N('He snaps his gloved fingers. Frost races up the mountain, from switchback to switchback, and seals the observatory doors in ice.'),
  OR('Just not tonight.'),
  N('And he is gone, up the mountain, a great deal faster than a man in velvet ought to go.'),
  ZA('Well. He seemed dramatic.'),
  ME('Chk.'),
  ZA('Megan and I shall go back down the mountain to fetch reinforcements. By which I mean Donald Eugene. By which I mean, he is going to complain about every single step.'),
  ZA('Take this. If you reach the top before us, plant it. Every great expedition needs a flag. Ours has an acorn on it.'),
  { give: 'summitFlag', favor: 'flag', flag: 'zachQuest' },
];

/** The Borrowed Hour, replaying under the orrery. */
export const MEMORY = [
  N('The air under the orrery shimmers. A young man in velvet and a woman wrapped in a heavy winter shawl sit together by a pot of cocoa, fifty years ago on Midwinter Night.'),
  YL('Orin... look up. All four rings are coming into line. You and Donald and I waited twenty winters to see this.'),
  YO("Don't talk like the night is over, Lyra. It's 11:59. I have locked the Needle's escapement. If midnight never strikes, this hour never ends, and you stay right here with me."),
  YL('My love, a song only means something because the notes move on. If you hold a single chord forever, it stops being music and turns to stone.'),
  YL("I slipped my Echo Lens into the valley's clockwork before you sealed the doors. Even if you freeze my body here, my Echo will wait down the mountain for an apprentice who knows how to let tomorrow come."),
  N('The memory flickers, loops back to 11:59, and begins again—the way it has for fifty years.'),
  V("Lyra... The wise woman who guided me in Hollowmere and Saltwick was her living Echo all along."),
];

/** At the summit: Sir Orin, at the Needle. */
export const SUMMIT = [
  OR('You climbed the whole mountain. In those boots. Donald always did pick the stubborn ones.'),
  V("Lyra sent me, Orin. Her living Echo guided me through Hollowmere and Saltwick, and up this mountain. She doesn't want the world frozen in her name."),
  OR("Her Echo... She was always cleverer with lenses than I was. But if I let the Needle turn, the Borrowed Hour ends, midnight strikes, and she is gone!"),
  V("And if you don't, the Stopped Age swallows everything—Ingrid, Tobin, the valley, and even your memory of Lyra—in silent ice."),
  OR('Stand back from the Needle, apprentice! I will not let midnight take her!'),
  N('Sir Orin strikes the stone with his staff! Rolling waves of frost surge eastward from the Needle as an icy containment ring locks around its base.'),
];

/** Shown the Stopped Age through the Lantern, he lets the hours go. */
export const RELEASE = [
  N("Inside the Lantern's Stopped Age light, the summit freezes dead still. The prayer flags hang like iron. Far below on the Lantern Road, Ingrid stands frozen mid-step, and inside the Observatory even the memory under the orrery turns to silent, sightless frost."),
  OR("That's... Ingrid. And in the dome... even Lyra's memory is frozen solid. She isn't breathing in that light at all."),
  V('That is where the Borrowed Hour ends, Orin. When nothing is allowed to end, nothing is allowed to live, either.'),
  OR('...She told me a chord held forever turns to stone. Fifty years I kept her at 11:59, and I never let her finish her sentence.'),
  V('You still have one real minute before midnight—an un-looped hour that truly belongs to you both. Let it play out.'),
  OR('...One real hour.'),
  N('Sir Orin looks out over the sea of clouds for a long moment. Then he draws off one white glove, and lays his bare hand on the Needle.'),
  OR('Forgive me, my love. Let the night move on.'),
];

/** Long after dark: Donald Eugene reaches the top, and Lyra wakes for one final, real Midwinter hour. */
export const REUNION = [
  N('As the fifty years of borrowed hours rush back into the valley, the frozen Golden Hour softens into a clear, starlit Midwinter Night.'),
  N('From the warm doorway of the Observatory, a figure in a winter shawl steps out onto the snow—no longer a blue Echo, but Lyra herself, awake in the real, un-looped hour before midnight.'),
  OR('...Lyra? You are warm.'),
  LY('Of course I am, you stubborn velvet goose. You finally let the clock tick.'),
  N('A lantern comes bobbing up the last switchback, followed by two small, determined squirrels.'),
  DE('My knees... have registered... a formal complaint. I came anyway.'),
  ZA('We carried him. Spiritually.'),
  DE('...Orin? Lyra?'),
  OR('Hello, Don. You kept the sea safe.'),
  DE('And you kept the stars waiting fifty years. Here—I brought the cocoa. Still hot.'),
  N('For one un-looped, real hour at the top of the world, the three old friends and the young apprentice sit together by the Needle, passing Donald Eugene\'s tin cup while the four brass rings of the orrery align overhead.'),
  LY('Look, Orin. All four rings in line. And Vivienne—thank you for hearing my Echo across the years, and for bringing my boys back to each other.'),
  V("You taught me how to listen to a clock, Lyra. I won't forget."),
  LY('Promise me you three will climb up here every Midwinter, Orin. Don\'t look backward for me—look out at the valley, and tell me what has grown.'),
  OR('Every Midwinter, Lyra. I promise.'),
  N('Far below in Hollowmere, the Clocktower bell strikes the first note of midnight. Lyra rests her head against Orin\'s shoulder, smiles up at the aligned rings, and closes her eyes in peace as her final borrowed ember drifts gently into the stars.'),
  ME('Chk...'),
  DE('...She is at rest, Orin. And she is proud of you. Both of you.'),
];

export const COGS_ENDING = [
  DE('And what is that rattling in your coat, Vivienne? ...The last ten Lost Cogs! Every single cog from the day the Tower stopped.'),
  OR('Give them here, Don. Lyra left a master key-blank on the Observatory bench fifty years ago. With ten true cogs, we can finish it right now.'),
  N('Together by lantern-light, Donald Eugene and Sir Orin fit the ten cogs into the brass key-blank and press it into Vivienne\'s hand: The Master\'s Key.'),
  DE('There. With that key, the Chronoheart will never run out of shifts—even after you choose an age to call home. And if you ever visit Hollowmere Square again, try it in the old Astral Clock-Door.'),
];

export const CHOICE = [
  N("The Chronoheart grows warm against Vivienne's coat. Up here, where all three ages meet, it is ready for the long shift—to choose which age she will call home."),
  DE('Choose well, apprentice. Every one of these ages has a place for a master clockmaker.'),
];

/** The three endings: the age Vivienne stays in. */
export const ENDINGS = {
  [ERA.PAST]: [
    N('Vivienne steps back, and back, all the way to the First Age.'),
    SE('Stranger! The one in the boots! Look—the foundations are rising already from the Master Drawings!'),
    V('And now I can stay to help you tune the gears. A clock for the valley, one for the sea, and an orrery for the stars.'),
    V('...and some very patient clockwork Wardens to keep an eye on them.'),
    N('She helps Sela raise the Observatory and teaches the first keepers. Long afterward, the people of Highcrest carve a statue of her on the Sundial Terrace, and get her nose—and her goggles—exactly right.'),
  ],
  [ERA.PRESENT]: [
    N('Vivienne stays in her own age, at the top of the mountain, with Donald Eugene and Sir Orin.'),
    DE('Home, then. Orin, you are carrying the cocoa thermos down.'),
    OR('I am a Knight of the Observatory, Don.'),
    DE('Then carry it knightly.'),
    N('Down in Hollowmere the Clocktower chimes the new day, right on time, and in Saltwick the tide rises full against the quay.'),
    N('Every Midwinter after, three clockmakers climb Highcrest together to drink cocoa under the rings and tell Lyra everything the valley has become.'),
  ],
  [ERA.FUTURE]: [
    N('Vivienne steps forward into the age that was stopped. The ice is cracking, and soft snow is falling again across the Lantern Road.'),
    IN('...Oh! I was just... was I standing here long?'),
    V('A little while, Ingrid. Your lamps are going to burn all the way to morning now.'),
    N('Vivienne makes her home in the Waking Age, where the clocks are ticking again for the first time in centuries, and there is a whole world waking up to mend.'),
    N("She's a clockmaker. She doesn't mind at all."),
  ],
};
export const CHOICES = [
  { era: ERA.PAST, title: 'The First Age', text: "Help Sela's builders raise the Observatory and tune the first clocks." },
  { era: ERA.PRESENT, title: 'Home, in Midwinter', text: 'Walk back down to Hollowmere with Donald Eugene and Sir Orin.' },
  { era: ERA.FUTURE, title: 'The Waking Age', text: 'Step forward into the thawing future and help it start again.' },
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
        IN('Gran said whatever it shines on, it shines on in another time. I never knew what she meant. Maybe you will.'),
        { give: 'hourLantern', unlock: 'lantern' },
        IN("And if you ever come across a flame that the wind can't put out... the lookout lamp has been dark since Gran's time. Nothing up here lasts long enough to light it."),
        { favor: 'ember', flag: 'emberQuest' },
      ];
      if (kind.includes('ember')) return [IN("Look at it, burning away up there. The children have started calling it the Old Fire. They're not wrong.")];
      return [IN("Light Gran's lantern, and turn it to whichever time you need. Back, or forward."), IN("The lookout lamp's still dark. A flame that never goes out: that's what it wants.")];
    }
    case 'ingridW':
      return f.endingAge === ERA.FUTURE ? [IN("Thank you. I don't quite know what for. But thank you.")] : [IN('...was I standing here long? My feet are freezing.')];
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
          SE("Look at these Master Drawings! A bridge across the crevasse, an observatory for the stars, and clocks for the valley and the sea."),
          SE("We have already begun carving your likeness for the Sundial Terrace, traveler—goggles, apron, and all!"),
        ];
      }
      if (inv.includes('masterDrawings')) {
        return [
          SE('Traveler! Those parchment rolls in your apron—are those the Master Drawings?!'),
          V("I found them in the Clockworks. They show the Observatory, the Tide Well, the Valley Clocktower—and the stone bridge across the upper crevasse."),
          { take: 'masterDrawings', flag: 'selaBuilt', sfx: 'key' },
          SE("And look in the corner: the notes for the bridge and the gear trains are signed in your own hand! The songs were true—the First Clockmaker came from beyond the clouds!"),
          SE("Stand back, traveler! Give my masons six hundred years, and this mountain will have its bridge and its Observatory!"),
        ];
      }
      if (id === 'selaHigh') {
        return [
          SE('Mind the crevasse, stranger! Our log bridge holds for now, but we cannot cut permanent stone steps until someone brings us the Master Drawings.'),
          V('(If I find the Master Drawings in the Clockworks, I should bring them to Sela in the First Age.)'),
        ];
      }
      return [
        SE('A stranger! In such boots! You must be from beyond the clouds. Nobody comes from beyond the clouds.'),
        SE("We are cutting stones for a great house on the top of the mountain. We don't know what it's for yet. The old songs say the First Clockmaker will bring us the drawings."),
        ...(f.emberQuest && !inv.includes('ember') && !game.state.taken.includes('ember') ? [SE('Our fire? Take a coal from it, if you like. That fire has never gone out. We are rather proud of it.')] : []),
        V('(The First Clockmaker will bring them the drawings...)'),
      ];
    case 'michelle':
      if (!f.hasLantern) return [LY('You came up the mountain, Vivienne. Mind the cold up here—it is my husband Orin\'s grief, frozen into the rock.'), LY('Ingrid the lamplighter has a lantern that never agreed with the clock. Ask her for it. You will need it before the ravine.')];
      return [LY('A light that holds an hour. Use it kindly.'), LY("Where Orin's frost lies on the road, the ages are frozen together and the Chronoheart cannot shift. Light the Lantern instead, and turn it back or forward.")];
    case 'michelleDome':
      if (!f.hasEcho) return [
        LY('He recognized your goggles from the margin of our old drawings. I thought he might.'),
        V("He said he's keeping his wife Lyra alive in a Borrowed Hour under the orrery... Wait. You're Lyra!"),
        LY("I am what my Echo Lens could send down the mountain, Vivienne. My real body is sitting beside Orin under the Observatory's orrery at 11:59 on Midwinter Night, fifty years ago."),
        LY('Take my Echo Lens. I borrowed it back from the Clocktower for you.'),
        { give: 'lens', unlock: 'echo' },
        LY('Your Echo will walk where you walked, over and over—and if your Lantern is lit while you record, your Echo will carry that age\'s light too!'),
        LY('One of the three Clockworks plates ahead is crusted in frost: light the First Age in your Lantern while you or an Echo stand on it. And inside the Clockworks, look for our Master Drawings—Sela in the First Age has been waiting six hundred years for them.'),
      ];
      return [LY('The clockworks door wants all three green plates held at once, and the third plate needs the First Age Lantern light to melt its frost.'), LY('Don\'t forget the Master Drawings inside the hall—Sela in the First Age can build a stone bridge across the upper crevasse with them.')];
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
        ? [BR("Bram. Highest porter on Highcrest. Well, second highest, now you're up here."), BR("The rockfall's been blocking this road for weeks. You can freeze the falls into a stair with the Stopped Age—or if you're in the First Age, smash the ice off the old thermal sluice with your wrench!")]
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
        TO('And now a page of the star-books has blown away. Over the ravine, I think. The page with the midwinter rings on it, of all pages.'),
        { favor: 'page', flag: 'pageQuest' },
      ];
    }
    case 'youngLyra':
    case 'youngChristopher':
      return MEMORY;
    case 'christopher':
      if (f.hoursReturned) return [OR("She got to see the four rings align, Don's cocoa was warm, and the valley is breathing again. Thank you, Vivienne."), OR("Every Midwinter, we'll climb back up here together and tell her what we've built.")];
      if (!f.summitTalk) return SUMMIT;
      if (!f.orinPhase1) return [OR("Stand back! My Frost-Anchor holds the Needle fast—you'll never reach it through the gale!")];
      if (!f.orinPhase2) return [OR("Even with the anchor broken, the Needle's twin Frost-Locks and gnomon beam will keep midnight at bay!")];
      return [OR("...I have no strength left to fight you, apprentice. Show me, then. Show me why I should let this hour end.")];
    case 'lyraEnd':
      return [
        LY("The stars are moving again, Vivienne. Look how bright Hollowmere and Saltwick shine down in the valley."),
        LY("Take care of Donald and Orin for me—and never be afraid of what comes next."),
      ];
    case 'eugene':
      if (f.hoursReturned && game.state.cogs.length >= 10 && !f.masterKey) {
        return COGS_ENDING;
      }
      return [DE("Fifty years I carried the guilt of leaving this mountain. Thank you for bringing us all home, apprentice."), DE('Go on, Vivienne. Look through the brass telescope at the overlook—you earned that view.')];
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
        N('A statue of a young woman in an apron, with goggles pushed up on her forehead and one hand raised, as if she were explaining something to somebody slow.'),
        N('The plaque reads: "THE FIRST CLOCKMAKER. SHE BROUGHT THE MASTER DRAWINGS TO SELA\'S MASONS, AND PROMISED TO RETURN."'),
        V("...That's my nose."),
        V('That is DEFINITELY my nose.'),
      ]);
    case 'statueF':
      return say(N('The statue of the first Clockmaker, frosted white. Even her stone hand is frozen in the air.'));
    case 'frostWall':
      return say([N('A wall of ice across the observatory doors, hard as glass. Behind it, you can just see the orrery, turning.'), V('In the First Age there were no doors here at all. Only planks over the foundations.')]);
    case 'starBooks':
      return say([N('Rows of star-books, one for every year the observatory has watched the sky. One shelf is labeled MIDWINTER. Someone has read it so often that the spines have worn white.')]);
    case 'needle':
      if (f.hoursReturned) return say(N("The Needle, the summit's own gnomon. Its shadow moves again, slowly, the way a shadow should."));
      return say([N('The Needle: a spire of stone at the very top of Highcrest, older than anything built by hands. Its shadow lies across the clouds, and has not moved for fifty years.')]);
    case 'telescope': {
      f.sawView = true;
      const lines = [...(VIEW[game.era] || VIEW[1])];
      if (f.hoursReturned) {
        lines.push(V('Both towns are awake and shining under the Midwinter stars. Clocktower and Tide Clock, beating in time.'));
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
        game.hud.toast('The Orrery rings align: <b>the Borrowed Hour</b>.', 4500);
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
  if (npc.id === 'christopher' && !f.summitTalk && !f.hoursReturned) {
    f.summitTalk = true;
    game.startOrinBoss?.();
  }
  if (npc.id === 'eugene' && f.hoursReturned && game.state.cogs.length >= 10 && !f.masterKey) {
    game.grantMasterKey?.();
  }
  if ((npc.id === 'youngLyra' || npc.id === 'youngChristopher') && !f.memorySeen) {
    f.memorySeen = true;
    game.hud.toast('A memory, replaying: <b>the Borrowed Hour</b>.', 4000);
  }
  if (!hadBuilt && f.selaBuilt) {
    game.refreshWorld();
    await game.timelapse({
      to: ERA.PRESENT,
      focus: [(L.crev1X0 + L.crev1X1) * 0.5, gy(4, L.crev1X0) + 1, zb(4) + 3],
      years: 600,
      caption: "From the Master Drawings, Sela's masons raise the First Clockmaker's bridge and foundations...",
      effect: 'shine',
    });
    game.hud.toast("The First Clockmaker's stone bridge now spans the upper crevasse in every age!", 5500);
  }
  game.save();
}

