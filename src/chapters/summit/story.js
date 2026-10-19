// Chapter Three, Highcrest: items, favors, every line of dialogue, and what using things does.
import { audio } from '../../audio/audio.js';
import { ERA } from '../../core/util.js';
import { L, gy, zb } from './level.js';

export const ITEMS = {
  hourLantern: { name: "Ingrid's Lantern", desc: "Her gran's. It never kept time with the other lamps. Lit, it shines with another age's light, and inside that light the other age is real. Q and E choose which." },
  lens: { name: 'The Echo Lens', desc: "From the heart of the Clocktower. The stranger borrowed it back for you. Through it, the Chronoheart remembers you well enough to make another of you—and even remembers your Lantern's light." },
  ember: { name: 'A Coal from the First Fire', desc: "From the builders' fire in the First Age. It has never gone out, and it never will." },
  page: { name: 'A Page of Star-Book', desc: "Torn from one of Tobin's star-books: four rings, drawn in a line. Someone has written in the margin." },
  summitFlag: { name: "Zach's Flag", desc: 'An acorn on a blue field. "Every great expedition needs a flag," says Zach.' },
  masterDrawings: { name: 'The Master Drawings', desc: "Parchment blueprints for the Valley Clocktower, the Tide Well, and the Highcrest Observatory—begun by Orin and Lyra, with margin notes in a hand that looks very much like yours." },
  finder: { name: 'The Cog Finder', desc: "Chapter One's ten cogs, fitted round the Chronoheart's rim. Through the lens, a Lost Cog sends up gold." },
  myWatch: { name: "Vivienne's Pocketwatch", desc: "Twelve cogs and a winter of Donald Eugene's evenings. Your echo remembers longer (eight seconds) and holds four echoes at once." },
  masterKey: { name: "The Master's Key", desc: "All ten of Highcrest's Lost Cogs, fitted by Donald and Orin into the key-blank Lyra left them: a master winding key. It rekindles the Chronoheart so you can shift freely between Highcrest's three ages—and unlocks the Astral Clock-Door in Hollowmere Square.", key: true },
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
const YO = S('christopherYoung', 'Sir Orin (Memory)');

export const INTRO = [
  N("Winter came early to Hollowmere. And with the first snow, every clock in Donald Eugene's workshop began to lose an hour a night."),
  S('eugene', 'Donald Eugene')('Not running slow, mind. Losing them. As if someone were reaching in at midnight and taking an hour off the top.'),
  V("It's Sir Orin, isn't it? Your old friend."),
  S('eugene', 'Donald Eugene')("Aye. Fifty years ago, on Midwinter Night, something ended on that mountain, and Orin would not let it. I came down. He stayed."),
  S('eugene', 'Donald Eugene')("Whatever he is holding on to up there, it costs more every winter. Now it is costing the valley its nights."),
  S('eugene', 'Donald Eugene')('Go on ahead to Base Camp, apprentice. My knees are slow on ice; I will follow with the pack.'),
  S('eugene', 'Donald Eugene')('...I should have gone back up there a long time ago.'),
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
  V("You're taking hours from every clock in the valley. The frost is creeping down the mountain."),
  OR('I am keeping something. It is mine, it is small, and it is none of your business.'),
  OR('I always mean to pay the valley back.'),
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
  N("The air under the orrery shimmers. A young man in velvet sits by a pot of cocoa, and beside him a woman in a heavy winter shawl, too thin, holding a tin cup in both hands to keep them warm. The dome's clock says one minute to midnight."),
  YL('Orin... look up. All four rings, coming into line. Twenty winters we waited for this, the three of us.'),
  YO("Two of us, tonight. Don's gone. He took the watch and ran."),
  YL('I sent him. You know why. Drink your cocoa.'),
  YL("Don't hold my hand so tightly, love. If you hold an hour too tightly, it freezes. Everything does."),
  YO("Then I'll hold this one. If midnight never comes, the morning never comes either, and you are still here."),
  YL('Orin. When the hour is over, I want you to—'),
  N('Her cup slips from her fingers and cracks on the stone. The memory shivers... and it is 11:59 again.'),
  YL('Orin... look up. All four rings, coming into line.'),
  N('The cup slips. It cracks. 11:59, again. The way it has every night for fifty years.'),
  V('...She never gets to finish.'),
];

/** At the summit: Sir Orin, at the Needle (and whether you saw the memory on the way). */
export function summitLines(f) {
  return [
    OR('You climbed the whole mountain. In those boots. Donald always did pick the stubborn ones.'),
    ...(f.memorySeen
      ? [
          V('I saw her. Under the orrery. Lyra.'),
          OR('...'),
          V("She's trying to tell you something, and she never gets to finish."),
          OR('She will finish it when I am ready to hear it. Which is never.'),
        ]
      : [V("Sir Orin, please. Whatever you're keeping up here, it's freezing the whole mountain."), OR('Then the mountain can freeze.')]),
    OR('Stand back from the Needle, apprentice. If it turns, midnight strikes.'),
    N('Sir Orin strikes the Needle with his staff. The summit cracks across like a dropped plate, and everything falls away into the dark.'),
  ];
}

/** Where he takes her: the End of Time. */
export const ARRIVE = [
  N('A great hall of black marble, broken into a thousand pieces, and every crack filled with gold. There is no sky. Shards of the world drift past in the dark.'),
  OR('Welcome to the End of Time, apprentice. This is where every hour goes when it is over. Every one of them, mended and kept.'),
  OR('I have spent fifty years making sure hers never comes here.'),
  V('...You built a throne at the end of the world. Out of broken things.'),
  OR('Out of MENDED things.'),
  OR("And you, apprentice. Donald is old. His knees, his hands, that heart of his. Stay here with me, and he never gets one day older. Nothing you love ever does."),
  V("...That isn't fair."),
  OR('No. It is only tempting. My Frost-Anchor holds this hall together. You will not reach me.'),
];

/** Shown the Stopped Age through the Lantern, he lets the hours go. */
export const RELEASE = [
  OR('Why do you care, apprentice? Why does a child care whether an old man hears midnight strike?'),
  V("When Master vanished, I looked for him in three ages. I'd have done anything to get him back. Anything."),
  V("...I think I'd have done this."),
  OR('Then you understand.'),
  V('I do. Look.'),
  N("Inside the Lantern's light, Sir Orin sees the Stopped Age: the summit hung with ice, the prayer flags like iron, Ingrid frozen mid-step far below on the Lantern Road. In the dome, the memory under the orrery has turned to frost. Lyra's cup hangs in the air, halfway to the floor."),
  OR("Lyra. She isn't even breathing in that light."),
  OR('...She told me an hour held too tightly freezes. Fifty years I kept her at 11:59, and I never once let her finish her sentence.'),
  N('For a long moment Sir Orin says nothing at all. Then he draws off one white glove, and lays his bare hand on the cracked marble floor.'),
  OR('Let it strike.'),
  N('The gold in every crack blazes up at once, and the End of Time lets them go.'),
];

/** Long after dark: Donald Eugene reaches the top, and Lyra wakes for one final, real Midwinter hour. */
export const REUNION = [
  N('As the fifty years of borrowed hours rush back into the valley, the frozen Golden Hour softens into a clear, starlit Midwinter Night.'),
  N('The Observatory door opens. Sir Orin comes out into the snow with a woman in a winter shawl leaning on his arm. She is very thin, and she is smiling.'),
  LY("There you are. You're late, Vivienne. Or I'm early. I never could tell which."),
  V('...You.'),
  V('The river. The quay. The Lantern Road. It was you, every time.'),
  LY('Only echoes of me, dear. I sent them as far down the years as they would go. This is the real one. What is left of her.'),
  OR('She is warm, Vivienne. Fifty years, and she is warm.'),
  N('A lantern comes bobbing up the last switchback, followed by two small, determined squirrels.'),
  DE('My knees... have registered... a formal complaint.'),
  ZA('We carried him. Spiritually.'),
  DE('...Lyra.'),
  N('Donald Eugene stops. Sir Orin looks at him across the snow.'),
  OR('You took the watch and ran, Don.'),
  DE('She asked me to.'),
  OR('I know. That was the worst of it.'),
  N('Nobody says anything for a while. Then Donald Eugene unscrews the top of his flask.'),
  DE('I brought cocoa. It is still hot. Mostly.'),
  N('They sit together at the foot of the Needle, three old friends and an apprentice, and pass the tin cup round while the four brass rings come into line overhead.'),
  LY('Look, Orin. All four.'),
  OR('I see them.'),
  LY('Orin. When the hour is over, I want you to come up here every Midwinter. All of you. Look out at the valley, not back at me, and tell me what grew.'),
  OR('...Every Midwinter.'),
  N('Far below in Hollowmere, the Clocktower begins to strike midnight. Lyra rests her head on Orin\'s shoulder, and closes her eyes, and the bell goes on ringing, all twelve strokes, the way a bell should.'),
  ME('Chk...'),
];

/** After midnight: they stay with her a while. */
export const AFTER = [N('They stay beside her a long while, and nobody hurries.')];

export const COGS_ENDING = [
  DE('Vivienne. That rattling in your coat... are those my cogs? The last ten?'),
  OR('Give them here, Don. Lyra left a key-blank on the Observatory bench fifty years ago. She said someone would want it finished.'),
  N('By lantern-light, the two old friends fit the ten cogs into the brass key-blank, arguing quietly about every one, and press it into Vivienne\'s hand: the Master\'s Key.'),
  DE('There. With that key, the Chronoheart will never run out of shifts—even after you choose an age to call home. And if you ever visit Hollowmere Square again, try it in the old Astral Clock-Door.'),
];

export const CHOICE = [
  N("Toward morning, the Chronoheart grows warm against Vivienne's coat. Up here, where all three ages meet, it has one long shift left in it: to whichever age she will call home."),
  DE("Don't look at me, apprentice. I can't choose this one for you."),
  DE("I'd choose wrong. I'd choose the one with me in it."),
];

/** The three endings: the age Vivienne stays in. */
export const ENDINGS = {
  [ERA.PAST]: [
    V('The First Age.'),
    DE('...Of course it is. Somebody has to teach the first of us.'),
    V("I won't see you again."),
    DE('You will. Not for six hundred years, and not the way you mean. But you will.'),
    N('Vivienne takes the wrench out of her apron to give it back. Donald Eugene closes her fingers round it.'),
    DE('Keep it. I want it back in six hundred years.'),
    N('Vivienne steps back, and back, all the way to the First Age.'),
    SE('Stranger! The one in the boots! You came back! The foundations are rising already, from your drawings!'),
    N('She helps Sela raise the Observatory, and teaches the first keepers, and grows old among them. Long afterward, the people of Highcrest carve her statue on the Sundial Terrace, and get her nose exactly right.'),
    N('The wrench is handed down, keeper to keeper, for six hundred years, until an old clockmaker in Hollowmere gives it to his apprentice on her first day.'),
  ],
  [ERA.PRESENT]: [
    V('Home.'),
    DE('Home, then. Orin, you are carrying the flask down.'),
    OR('I am a Knight of the Observatory, Don.'),
    DE('Then carry it knightly.'),
    N('Down in Hollowmere the Clocktower chimes the new day, right on time, and in Saltwick the tide comes in full against the quay.'),
    N('Sir Orin leaves Lyra\'s cup at the foot of the Needle, the crack in it filled with gold.'),
    N('Every Midwinter after, three clockmakers climb Highcrest together, and sit beside it, and look out at the valley, and tell her what grew.'),
  ],
  [ERA.FUTURE]: [
    V('Forward.'),
    DE('Forward. You always did run ahead of me.'),
    V("Somebody has to wake them up, Master. They've been standing still a long time."),
    DE('Then go and be late for supper somewhere new. ...Mind your boots on the ice.'),
    N('Vivienne steps forward into the age that was stopped. The ice is cracking, and soft snow is falling again across the Lantern Road.'),
    IN('...Oh! I was just... was I standing here long?'),
    V('A little while, Ingrid. Your lamps are going to burn all the way to morning now.'),
    N('Vivienne makes her home in the Waking Age, where the clocks are ticking for the first time in centuries, and everything has to be mended at once.'),
    N('At the foot of the Needle she finds a tin cup, old beyond telling, cracked and mended with gold. She leaves it where it is.'),
  ],
};
export const CHOICES = [
  { era: ERA.PAST, title: 'The First Age', text: 'Teach the first clockmakers, six hundred years before anyone you love is born.' },
  { era: ERA.PRESENT, title: 'Home, in Midwinter', text: 'Walk back down to Hollowmere with Donald Eugene and Sir Orin.' },
  { era: ERA.FUTURE, title: 'The Waking Age', text: 'Leave everyone you know, to help a stopped world start again.' },
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
      if (!f.hasLantern) return [ST('There you are, Vivienne. Late, or early. Up here it is hard to say.'), ST('Mind the cold on this mountain. It is not weather.'), ST('Ingrid the lamplighter has a lantern that never agreed with the clock. Ask her for it. You will need it before the ravine.')];
      return [ST('A light that holds an hour. Use it gently.'), ST("Where the frost lies on the road, the ages are frozen together and the Chronoheart cannot shift. Light the Lantern instead, and turn it back or forward.")];
    case 'michelleDome':
      if (!f.hasEcho) return [
        ST('He knew your goggles. I thought he might.'),
        V("He said he's keeping something up there. Something small. Do you know what it is? You seem to know everybody."),
        ST('I know what it is. Go and see it for yourself, under the orrery. It is not mine to tell.'),
        V('...Who ARE you?'),
        ST('Someone who would like that old man to hear midnight strike. Here. Take this.'),
        { give: 'lens', unlock: 'echo' },
        ST('An Echo Lens, borrowed back from the Clocktower. Through it, the Chronoheart remembers you, and something of you can stay behind. Your echo walks where you walked, over and over. And if your Lantern is lit while you record, it carries that light too.'),
        ST('One of the three Clockworks plates ahead is crusted in frost: light the First Age in your Lantern while you or an echo stand on it. And inside the Clockworks, look for the Master Drawings. Sela, in the First Age, has been waiting six hundred years for them.'),
      ];
      return [ST('The clockworks door wants all three green plates held at once, and the third plate needs the First Age light to melt its frost.'), ST('Don\'t forget the Master Drawings inside the hall. Sela, in the First Age, can build a stone bridge across the upper crevasse with them.')];
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
        TO('And now a page of the star-books has blown away. Over the ravine, I think. The page with the midwinter rings on it, of all pages.'),
        { favor: 'page', flag: 'pageQuest' },
      ];
    }
    case 'youngLyra':
    case 'youngChristopher':
      return MEMORY;
    case 'christopher':
      if (f.hoursReturned) return [OR('She saw all four rings. That was the whole of what she wanted, and I nearly took it from her.'), OR('Every Midwinter, apprentice. I promised.')];
      if (!f.summitTalk) return summitLines(f);
      if (!f.orinPhase1) return [OR('Every one of those waves is that night, apprentice. Fifty years of it. Go home.')];
      if (!f.orinPhase2) return [OR('The anchor was only ice. The locks are older. Midnight does not come in here.')];
      return [OR('...I have nothing left to throw at you.'), OR('Whatever you came to say, apprentice, say it with that light of yours. I am too tired for words.')];
    case 'lyraEnd':
      return [LY('Look at the valley, Vivienne. Every light down there is somebody spending an hour.')];
    case 'eugene':
      if (f.hoursReturned && game.state.cogs.length >= 10 && !f.masterKey) {
        return COGS_ENDING;
      }
      return [DE('Fifty years, and it took my apprentice to get me back up this mountain. My knees would like a word with both of us.'), DE('Go on, Vivienne. Look through the brass telescope at the overlook. You earned that view.')];
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
    case 'lyraCup':
      return say([N("Lyra's tin cup, at the foot of the Needle. It came back from the End of Time cracked clean across, and the crack filled with gold."), N('Sir Orin will not let anyone drink from it. It is still a little warm.')]);
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

