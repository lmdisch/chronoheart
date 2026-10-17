// Chapter Three, Highcrest: items, favors, every line of dialogue, and what using things does.
// A story for children: Sir Christopher is grand and grumpy, not wicked, nobody dies, and the
// only sad thing in it is that good things end, and the answer to that is that new ones begin.
import { audio } from '../../audio/audio.js';
import { ERA } from '../../core/util.js';

export const ITEMS = {
  hourLantern: { name: "Ingrid's Lantern", desc: "Her gran's. It never kept time with the other lamps. Lit, it shines with another age's light, and inside that light the other age is real. Q and E choose which." },
  lens: { name: 'The Echo Lens', desc: "From the heart of the Clocktower. Michelle borrowed it back. Through it, the Chronoheart remembers you well enough to make another of you: three of you, even." },
  ember: { name: 'A Coal from the First Fire', desc: 'From the builders\' fire in the First Age. It has never gone out, and it never will.' },
  page: { name: 'A Page of Star-Book', desc: 'Torn from one of Tobin\'s star-books: four rings, drawn in a line. Someone has written in the margin.' },
  summitFlag: { name: "Zach's Flag", desc: 'An acorn on a blue field. "Every great expedition needs a flag," says Zach.' },
  finder: { name: 'The Cog Finder', desc: 'Chapter One\'s ten cogs, fitted round the Chronoheart\'s rim. Through the lens, a Lost Cog sends up gold.' },
  myWatch: { name: "Vivienne's Pocketwatch", desc: 'Twelve cogs and a winter of Donald Eugene\'s evenings. Your echo remembers longer for it: eight seconds instead of five.' },
};

/** Kindness side quests. `start` is the flag set when the favor is asked. */
export const FAVORS = [
  { id: 'ember', title: 'A light for the lookout', start: 'emberQuest', todo: 'The lookout lamp on the Lantern Road has been dark since Ingrid\'s gran\'s time: no flame up here lasts in that wind. One from a fire that never goes out might.', done: 'The lookout lamp burns again, in every age after.' },
  { id: 'page', title: "Tobin's lost page", start: 'pageQuest', todo: 'A page of Tobin\'s star-books blew away over the ravine on the Lantern Road. It\'s the page with the midwinter rings on it.', done: 'Tobin has his page back, and you know whose initials are in its margin.' },
  { id: 'flag', title: "Zach's flag", start: 'zachQuest', todo: 'Zach gave you his expedition flag. Plant it at the very top of Highcrest.', done: "Zach's flag flies at the top of the world." },
];

const N = (text) => ({ who: null, name: '', text });
const V = (text) => ({ who: 'vivienne', name: 'Vivienne', text });
const S = (who, name) => (text) => ({ who, name, text });
const DE = S('eugeneWinter', 'Donald Eugene');
const CH = S('christopher', 'Sir Christopher');
const MI = S('michelleWinter', 'Michelle the Wise');
const ZA = S('zachWinter', 'Zach Tiberious');
const ME = S('meganWinter', 'Megan the Squirrel');
const IN = S('ingrid', 'Ingrid the Lamplighter');
const TO = S('tobin', 'Tobin the Stargazer');
const SE = S('sela', 'Sela the Stonecutter');
const AN = S('anwen', 'Anwen the Guide');
const KI = S('porterKit', 'Kit the Porter');
const BR = S('porterBram', 'Bram the Porter');

export const INTRO = [
  N('Winter came early to Hollowmere. And with the first snow, every clock in Donald Eugene\'s workshop began to lose an hour a night.'),
  S('eugene', 'Donald Eugene')('Not running slow, mind. Losing them. As if someone were reaching in at midnight and taking an hour off the top.'),
  V('Who would steal hours?'),
  S('eugene', 'Donald Eugene')('Someone who needs them very badly. ...The oldest clock there is stands on Highcrest, at the top of the mountain, by the old observatory. If hours are going anywhere, they are going up there.'),
  S('eugene', 'Donald Eugene')('I would come with you, but my knees have opinions about mountains. Wrap up warm, apprentice.'),
  N('Two days later, Vivienne reaches Base Camp at the foot of Highcrest: bright tents in the snow, prayer flags snapping in the wind, and porters loading packs for the climb.'),
  N('Above it, the road zigzags up the face of the mountain: across, and turning back, and across again, higher every time, all the way to the observatory at the top.'),
  V('All the way to the top, then.'),
];

/** On the Sundial Terrace: Sir Christopher, in front of the statue. */
/** The first time you walk out to the overlook, at the top: the whole world, far below. */
export const VIEW = {
  0: [V('No towns at all, down there. Just forest, all the way to the sea.'), V('One day that\'ll be Hollowmere. And that, Saltwick.')],
  1: [
    V('Oh! There\'s Hollowmere! I can see the Clocktower, all lit up...'),
    V('And Saltwick, and Keeper\'s Light going round, and the sea. Everything I\'ve ever done is down there.'),
  ],
  2: [V('Everything down there is white, and still. Even the lighthouse isn\'t turning.'), V('That\'s what happens if nobody fixes this. Right. Let\'s fix it.')],
};

export const MEET = [
  N('A man in plum velvet is standing in front of the statue, looking up at it. He turns, and sees Vivienne, and goes very still.'),
  CH('...You. It\'s you. You haven\'t aged a day. Well. Neither have I, I suppose.'),
  V('Have we met? I\'m Vivienne. Donald Eugene\'s apprentice.'),
  CH('Donald Eugene\'s... apprentice. Of course you are. Of course he found somebody else.'),
  CH('Sir Christopher. Keeper of the Highcrest clocks, by my own appointment. Whatever you have come to do, apprentice, you can turn round and do it somewhere lower down.'),
  V('Somebody\'s taking hours from every clock in the valley. Is it you?'),
  CH('Borrowing. I always mean to give them back.'),
  N('He snaps his gloved fingers. Frost races up the mountain, from switchback to switchback, and seals the observatory doors in ice.'),
  CH('Just not today.'),
  N('And he is gone, up the mountain, a great deal faster than a man in velvet ought to go.'),
  ZA('Well. He seemed nice.'),
  ME('Chk.'),
  ZA('Megan and I shall go back down the mountain for reinforcements. By which I mean Donald Eugene. By which I mean, he is going to be furious about his knees.'),
  ZA('Take this. If you reach the top before us, plant it. Every great expedition needs a flag. Ours has an acorn on it.'),
  { give: 'summitFlag', favor: 'flag', flag: 'zachQuest' },
];

/** The Borrowed Hour, replaying under the orrery. */
export const MEMORY = [
  N('The air under the orrery shimmers. Two apprentices are sitting on the floor with a pot of cocoa between them, a long time ago, on a midwinter night.'),
  S('eugeneYoung', 'Young Donald Eugene')('Chris. Chris, look. The rings are in line. All four of them. That only happens once in a hundred years.'),
  S('christopherYoung', 'Young Christopher')('Then we\'re the luckiest two apprentices who ever lived. Promise me we\'ll always be up here for it, Don. Every midwinter. Just like this.'),
  S('eugeneYoung', 'Young Donald Eugene')('Every midwinter. Just like this. ...Pass the cocoa.'),
  N('The two of them laugh. Then the hour starts again from the beginning, the way it has been doing for a very long time.'),
  V('He kept it. He kept the whole hour.'),
];

/** At the summit: Sir Christopher, at the Needle. */
export const SUMMIT = [
  CH('You climbed the whole mountain. In those boots. He always did pick the stubborn ones.'),
  V('Ingrid\'s lamps burn shorter every year. Tobin\'s stars are slipping. Every clock in the valley is losing hours. You\'re putting them all into one hour.'),
  CH('One hour. The best hour there ever was. Two friends under the orrery on midwinter night, and nothing had changed yet. Nothing had ended.'),
  CH('Then he grew up. Then he went away. Then our master gave the watch to him and not to me, because I "couldn\'t let time go forward". Well. I proved her right. I have kept that hour going for fifty years.'),
  V('And the Stopped Age? That\'s where it ends, you know. Everything frozen. Everyone.'),
  CH('Nonsense. Nothing of the sort.'),
  V('I can show you.'),
];

/** Shown the Stopped Age through the Lantern, he lets the hours go. */
export const RELEASE = [
  N('Inside the Lantern\'s light, the summit freezes. The flags hang stiff. Far below, on the Lantern Road, a lamplighter stands with her pole raised, and does not move, and will not ever move again.'),
  CH('That\'s... that\'s Ingrid. Little Ingrid, who used to follow the lamplighter about. That\'s the Lantern Road.'),
  V('That\'s what happens when nothing is allowed to end. Nothing gets to start, either.'),
  CH('...He promised. Every midwinter. Just like this.'),
  V('Then go down and have one with him. A new one. It won\'t be just like the old one. It\'ll be its own.'),
  CH('Its own. Hm.'),
  N('He looks out over the clouds for a long moment. Then he takes off one white glove, and lays his hand on the Needle.'),
  CH('Very well. Take them back. All of them. I never was much good at keeping things anyway.'),
];

/** Long after dark: Donald Eugene reaches the top. */
export const REUNION = [
  N('It is long after dark when a lantern comes bobbing up the last switchback.'),
  DE('My knees... are not... what they were. I came anyway.'),
  ZA('We carried him. Spiritually.'),
  DE('...Chris?'),
  CH('Hello, Don. You got old.'),
  DE('And you didn\'t, you great velvet goose. Fifty years. I wrote to you every midwinter. You never once wrote back.'),
  CH('I was busy. Keeping the midwinter.'),
  N('Donald Eugene laughs, and then he hugs him, velvet and all.'),
  DE('There\'s cocoa in my pack. Not as good as it used to be. Better, possibly.'),
  ME('Chk!'),
  DE('And you, apprentice. You climbed a mountain, gave back every hour in the valley, and brought me my oldest friend. I have nothing left to teach you. Again.'),
  V('You still haven\'t told me how you get your gear trains so quiet.'),
  DE('And I never will.'),
];

export const COGS_ENDING = [
  DE('And what is that rattling in your coat? ...The last ten of my cogs. My parts tray is full at last. Now I shall have to find something else to lose.'),
];

export const CHOICE = [
  N('The Chronoheart grows warm against Vivienne\'s coat. Up here, where all three ages meet, it has one last shift left in it: the long one. Wherever she steps now, she stays.'),
  MI('Choose well, Vivienne. Every one of them is a good place to live.'),
];

/** The three endings: the age Vivienne stays in. */
export const ENDINGS = {
  [ERA.PAST]: [
    N('Vivienne steps back, and back, all the way to the First Age. The Chronoheart goes quiet in her hand.'),
    SE('Stranger! The one in the boots! Have you... have you brought the drawings?'),
    V('Not yet. Give me a winter. I\'ll draw you an observatory. And a clock for the valley, and one for the sea, and...'),
    V('...and some very good guards. Big ones. Patient.'),
    N('She draws the clocks. She teaches the first keeper. A long time after, the people of Highcrest carve a statue of her, and get her nose exactly right.'),
    N('And far ahead, a clockmaker\'s apprentice pushes open a workshop door in Hollowmere, and the whole thing begins again.'),
  ],
  [ERA.PRESENT]: [
    N('Vivienne stays exactly where she is: in her own age, at the top of the mountain, with her friends.'),
    DE('Home, then. Christopher, you\'re carrying the cocoa.'),
    CH('I am a Sir, you know.'),
    DE('Then you can carry it with dignity.'),
    N('The Chronoheart sleeps. Down in Hollowmere the Clocktower strikes midnight, right on time, and every clock in the workshop agrees with it.'),
    N('Every midwinter after, three clockmakers climb Highcrest to watch the stars. It is never just like the first time. It is better.'),
  ],
  [ERA.FUTURE]: [
    N('Vivienne steps forward, into the age that was stopped. The ice is cracking. The snow has started to fall again.'),
    IN('...Oh! I was just... was I standing here long?'),
    V('A little while. Your lamps are going to burn for a very long time now.'),
    N('Vivienne stays in the Waking Age, where the clocks are ticking again for the first time in a very long time, and there is a great deal to mend.'),
    N('She\'s a clockmaker. She doesn\'t mind at all.'),
  ],
};
export const CHOICES = [
  { era: ERA.PAST, title: 'The First Age', text: 'Stay, and draw the clocks. Sela\'s people are waiting for someone with the drawings.' },
  { era: ERA.PRESENT, title: 'Home, in Midwinter', text: 'Go home to Hollowmere, with Donald Eugene and Sir Christopher.' },
  { era: ERA.FUTURE, title: 'The Waking Age', text: 'Step forward into the stopped age as it thaws, and help it start again.' },
];

// ---------------------------------------------------------------------------
export function npcLines(game, id) {
  const f = game.state.flags, inv = game.state.inventory, kind = game.state.kindness;
  switch (id) {
    case 'ingrid': {
      if (f.hoursReturned) return [IN('My lamps! Listen to them: they\'re burning right down to the wick, the way lamps should. I could cry. I won\'t. It would freeze.')];
      if (inv.includes('ember')) return [
        IN('Is that... it\'s warm. It\'s been burning since before there was a town up here, hasn\'t it? I can feel it.'),
        { take: 'ember' },
        N('Ingrid takes the coal up to the lookout and tucks it into the dark lamp. It catches at once, and the wind can do nothing about it at all.'),
        { flag: 'lampLit', refresh: true, sfx: 'key' },
        IN('Gran always said that lamp was waiting for the right flame. There. Now it\'ll outlast all of us.'),
        { kind: 'ember' },
      ];
      if (!f.hasLantern) return [
        IN('Every lamp on the road, every night, all winter. And every year they burn a little shorter. Nobody can tell me why.'),
        IN('You\'re climbing? Up to the top? Then take Gran\'s lantern. It never kept time with the others. Some nights it shone with yesterday\'s light. Some nights, with tomorrow\'s.'),
        IN('Gran said whatever it shines on, it shines on in another time. I never knew what she meant. Maybe you will.'),
        { give: 'hourLantern', unlock: 'lantern' },
        IN('And if you ever come across a flame that the wind can\'t put out... the lookout lamp has been dark since Gran\'s time. Nothing up here lasts long enough to light it.'),
        { favor: 'ember', flag: 'emberQuest' },
      ];
      if (kind.includes('ember')) return [IN('Look at it, burning away up there. The children have started calling it the Old Fire. They\'re not wrong.')];
      return [IN('Light Gran\'s lantern, and turn it to whichever time you need. Back, or forward.'), IN('The lookout lamp\'s still dark. A flame that never goes out: that\'s what it wants.')];
    }
    case 'ingridW':
      return f.endingAge === ERA.FUTURE ? [IN('Thank you. I don\'t quite know what for. But thank you.')] : [IN('...was I standing here long? My feet are freezing.')];
    case 'tobinW':
      return [TO('Where did my ink go? Oh. Oh, it\'s dried. How wonderful. Ink is supposed to dry.')];
    case 'ingridF':
    case 'tobinF':
      if (f.hoursReturned) return [N('The ice is melting off them, drop by drop. Any day now.')];
      return id === 'ingridF'
        ? [N('Ingrid, frozen mid-step with her lighting pole raised. A snowflake hangs beside her cheek, and does not fall.'), V('...Ingrid?')]
        : [N('Tobin, stopped with his pen above the page. The ink on its nib has not dried, and never will.')];
    case 'sela':
      if (f.endingAge === ERA.PAST) return [SE('The drawings! Look at them all. A clock for the sea, too? We had better start cutting.')];
      return [
        SE('A stranger! In such boots! You must be from beyond the clouds. Nobody comes from beyond the clouds.'),
        SE('We are cutting stones for a great house on the top of the mountain. We don\'t know what it\'s for yet. The old songs say somebody will come with the drawings.'),
        ...(f.emberQuest && !inv.includes('ember') && !game.state.taken.includes('ember') ? [SE('Our fire? Take a coal from it, if you like. That fire has never gone out. We are rather proud of it.')] : []),
        V('(Somebody will come with the drawings...)'),
      ];
    case 'michelle':
      if (!f.hasLantern) return [MI('You came up the mountain. Of course you did. Mind the cold up here, Vivienne. It is the kind that remembers.'), MI('Ingrid the lamplighter has a lantern that never agreed with the clock. Ask her for it. You will need it before the ravine.')];
      return [MI('A light that holds an hour. Use it kindly.'), MI('Where the frost lies on the road, the ages are frozen together and the Chronoheart can\'t move. But the Lantern can. Light it, and turn it back, or forward.')];
    case 'michelleDome':
      if (!f.hasEcho) return [
        MI('He recognized you. I thought he might.'),
        V('He looked at me as if I\'d let him down. I\'ve never even met him.'),
        MI('Not yet.'),
        MI('Here. I borrowed this back from the Clocktower. It won\'t miss it for an afternoon.'),
        { give: 'lens', unlock: 'echo' },
        MI('Your echo will walk where you walked, over and over. Three of you can hold open what one of you cannot.'),
        MI('Christopher was Donald Eugene\'s first apprentice, you know. His best friend. When you reach the observatory, look under the orrery. Some hours are still going round.'),
      ];
      return [MI('The clockworks door wants a foot on all three plates at once. You can be three of you now.'), MI('Stand on a plate before you start recording, and your echo will stand there too.')];
    case 'anwen':
      if (f.hoursReturned) return [AN('Every clock in the valley right on time, and a midwinter night as clear as glass. Best season we\'ve ever had.')];
      return [
        AN('Anwen. I lead the guides on Highcrest. Kit and Bram carry the loads; I carry the worrying.'),
        AN('The road goes up in switchbacks. East along here, and where you see the flags, it turns back on itself and climbs. West along the next, and turn again. Six legs to the top.'),
        AN('And mind the frost. It\'s been creeping down from the top all winter. Where it lies, the mountain won\'t let you go anywhere but forward.'),
      ];
    case 'anwenF':
      return [N('Anwen, frozen still with a rope coil over one shoulder. Her breath hangs in the air, a little white cloud that will never fade.')];
    case 'anwenEnd':
      return [AN('Made it to the top in the dark with two squirrels and a clockmaker. I\'ve guided a lot of expeditions. That one goes in the book.')];
    case 'porterKit':
    case 'porterRest':
      if (f.hoursReturned) return [KI('Light pack today! Just cocoa, all the way down.')];
      return id === 'porterRest'
        ? [KI('Resting my legs. Half the loads in this town come up that road on my back.'), KI('Follow the flags at every turn. You\'re doing well, for someone with no pack.')]
        : [KI('Kit. I carry things up the mountain. Then I carry other things down. It\'s a living.'), KI('Funny thing: the loads have felt heavier every winter. Like the hours are getting longer on the way up.')];
    case 'porterBram':
    case 'porterHigh':
      if (f.hoursReturned) return [BR('Heard the bells ring all the way up. Every clock on the mountain at once. Never heard the like.')];
      return id === 'porterHigh'
        ? [BR('Bram. Highest porter on Highcrest. Well, second highest, now you\'re up here.'), BR('The rockfall\'s been blocking this road for weeks. The only way past is the falls, and they only stand still in the frost. Rather you than me.')]
        : [BR('Bram. If you\'re going all the way up: the observatory\'s at the east end of the summit, and the Needle\'s at the west.'), BR('And don\'t lick the railings.')];
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
        TO('Look: four rings, in a line. Once in a hundred years. And in the margin, somebody wrote, a long time ago: "C and D. Best night ever."'),
        V('C and D...'),
        { kind: 'page' },
      ];
      if (f.pageQuest) return [TO('The page with the midwinter rings on it. It went over the ravine, I\'m almost sure. Into the town side, I hope.')];
      return [
        TO('The stars are slipping. Half a second a night, every night, for as long as I have kept the books. The stars cannot be late, the Dean says. And yet.'),
        TO('And now a page of the star-books has blown away. Over the ravine, I think. The page with the midwinter rings on it, of all pages.'),
        { favor: 'page', flag: 'pageQuest' },
      ];
    }
    case 'youngEugene':
    case 'youngChristopher':
      return MEMORY;
    case 'christopher':
      if (f.hoursReturned) return [CH('I\'d forgotten how good cocoa is when it\'s the first cup and not the thousandth.'), CH('Don\'t tell him I said so.')];
      if (!f.summitTalk) return SUMMIT;
      return [CH('Show me, then. Show me anything worth more than that hour.')];
    case 'eugene':
      return [DE('Fifty years, and he still sulks exactly the same way. I\'d missed it.'), DE('Go on, apprentice. Look at the view. You climbed for it.')];
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
        N('The plaque reads: "THE FIRST CLOCKMAKER. SHE DREW THE CLOCKS, AND WENT AWAY. SHE WILL COME BACK."'),
        V('...That\'s my nose.'),
        V('That is DEFINITELY my nose.'),
      ]);
    case 'statueF':
      return say(N('The statue of the first Clockmaker, frosted white. Even her stone hand is frozen in the air.'));
    case 'frostWall':
      return say([N('A wall of ice across the observatory doors, hard as glass. Behind it, you can just see the orrery, turning.'), V('In the First Age there were no doors here at all. Only planks over the foundations.')]);
    case 'starBooks':
      return say([N('Rows of star-books, one for every year the observatory has watched the sky. One shelf is labeled MIDWINTER. Someone has read it so often that the spines have worn white.')]);
    case 'needle':
      if (f.hoursReturned) return say(N('The Needle, the summit\'s own gnomon. Its shadow moves again, slowly, the way a shadow should.'));
      return say([N('The Needle: a spire of stone at the very top of Highcrest, older than anything built by hands. Its shadow lies across the clouds, and has not moved for fifty years.')]);
    case 'flagSpot':
      if (!inv.includes('summitFlag')) return;
      game.removeItem('summitFlag');
      f.flagPlanted = true;
      audio.sfx('checkpoint');
      game.refreshWorld();
      await say([N('You plant Zach\'s flag at the very top of Highcrest. It snaps in the wind, acorn and all.'), V('Every great expedition needs a flag.')]);
      game.completeKindness('flag');
      game.save();
      return;
    default:
      return;
  }
}

export async function struck() {}

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
  npc.talking = true;
  const lines = npcLines(game, npc.id);
  await game.dialogue.run(lines, (cmd) => runCommand(game, cmd));
  npc.talking = false;
  const f = game.state.flags;
  if (npc.id === 'christopher' && !f.summitTalk && !f.hoursReturned) f.summitTalk = true;
  if ((npc.id === 'youngEugene' || npc.id === 'youngChristopher') && !f.memorySeen) {
    f.memorySeen = true;
    game.hud.toast('A memory, replaying: <b>the Borrowed Hour</b>.', 4000);
  }
  game.save();
}

