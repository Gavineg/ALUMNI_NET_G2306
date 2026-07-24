/**
 * 模拟 DOS/CMD 彩蛋命令
 * 所有命令的输出都通过 ctx.print(lines) 交给 boot.js 的 biosAppend 渲染到信息面板
 */

const FORTUNES = [
  'YOU WILL FIND A BUG TODAY. YOU WROTE IT YESTERDAY.',
  'A WATCHED BUILD NEVER COMPLETES.',
  '99 LITTLE BUGS IN THE CODE, 99 LITTLE BUGS...',
  'THE CAKE IS A LIE. THE FOOD IS REAL. GO CENGFAN.',
  'RESISTANCE IS FUTILE. COMMIT YOUR CHANGES.',
  'THERE IS NO CLOUD. IT IS JUST SOMEONE ELSE\'S COMPUTER.'
];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function L(text, status) { return { text, status }; }

function helpLines() {
  return [
    L('AVAILABLE COMMANDS ::'),
    L('  HELP / ?          — SHOW THIS LIST'),
    L('  WHOAMI            — SHOW ACCESS IDENTITY'),
    L('  DATE               — SHOW SYSTEM TIME'),
    L('  STATS              — SHOW NETWORK STATISTICS'),
    L('  FIND <NAME>        — LOCATE A CLASSMATE ON MAP'),
    L('  LS / DIR           — LIST FILES'),
    L('  CAT SECRETS.TXT    — READ CLASSIFIED FILE'),
    L('  MATRIX             — ???'),
    L('  HACK <TARGET>      — INITIATE INTRUSION'),
    L('  SUDO <CMD>         — ATTEMPT ROOT ACCESS'),
    L('  KONAMI             — ↑↑↓↓←→←→BA'),
    L('  SL                 — CHOO CHOO'),
    L('  FORTUNE            — ASK THE ORACLE'),
    L('  42                 — THE ANSWER'),
    L('  COFFEE             — BREW A CUP'),
    L('  ABOUT / CREDITS    — PROJECT INFO'),
    L('  CLEAR              — CLEAR TERMINAL'),
    L('  EXIT               — ABORT SESSION')
  ];
}

export async function runCommand(raw, ctx) {
  const input = raw.trim();
  if (!input) return [];
  const [cmdRaw, ...rest] = input.split(/\s+/);
  const cmd = cmdRaw.toLowerCase();
  const arg = rest.join(' ');

  ctx.openPanel();

  switch (cmd) {
    case '?':
    case 'help':
    case '/help':
      return helpLines();

    case 'whoami':
      return [L('GUEST @ ALUMNI_NET_G2306'), L('ACCESS_LEVEL :: OBSERVER'), L('CLEARANCE :: NONE', 'ERR')];

    case 'date':
    case 'time':
      return [L(new Date().toString().toUpperCase())];

    case 'stats': {
      const data = ctx.getMapData();
      if (!data) return [L('NO DATA LOADED YET.', 'ERR')];
      const uniCount = data.universities.length;
      const studentCount = data.universities.reduce((s, u) => s + (u.members?.length || 0), 0);
      const readyCount = data.universities.reduce((s, u) => s + (u.members?.filter(m => m.canCengfan).length || 0), 0);
      return [
        L(`TARGET UNIVERSITIES :: ${uniCount}`),
        L(`TRACKED STUDENTS    :: ${studentCount}`),
        L(`READY_FOR_FOOD      :: ${readyCount}`, readyCount > 0 ? 'OK' : undefined)
      ];
    }

    case 'find': {
      if (!arg) return [L('USAGE: FIND <NAME>', 'ERR')];
      const data = ctx.getMapData();
      if (!data) return [L('NO DATA LOADED YET.', 'ERR')];
      const needle = arg.toLowerCase();
      for (const u of data.universities) {
        const hit = (u.members || []).find(m => (m.name || '').toLowerCase().includes(needle));
        if (hit) {
          ctx.flyTo(u.longitude, u.latitude);
          return [
            L(`TARGET LOCATED :: ${hit.name}`),
            L(`UNIVERSITY :: ${u.university}`),
            L(`CITY       :: ${u.city || 'UNKNOWN'}`),
            L(`MAJOR      :: ${hit.major || 'UNKNOWN'}`),
            L('MAP FOCUS LOCKED.', 'OK')
          ];
        }
      }
      return [L(`NO MATCH FOR "${arg.toUpperCase()}"`, 'ERR')];
    }

    case 'ls':
    case 'dir':
      return [
        L('  SECRETS.TXT'),
        L('  ORIGIN.LOG'),
        L('  README.MD'),
        L('  DO_NOT_OPEN.EXE'),
        L('4 FILE(S)')
      ];

    case 'cat':
      if (arg.toLowerCase() === 'secrets.txt') {
        return [
          L('DECRYPTING SECRETS.TXT...'),
          L('...'),
          L('THE REAL SECRET WAS THE FRIENDS WE MADE ALONG THE WAY.'),
          L('ALSO: G2306 STILL OWES SOMEONE A MEAL.', 'OK')
        ];
      }
      if (arg.toLowerCase() === 'do_not_open.exe') {
        return [L('ACCESS DENIED.', 'ERR'), L('THAT WAS CLOSE.')];
      }
      return [L(`FILE NOT FOUND: ${arg || '(NONE)'}`, 'ERR')];

    case 'matrix':
      return [
        L('WAKE UP...'),
        L('THE MATRIX HAS YOU.'),
        L('FOLLOW THE WHITE RABBIT.'),
        L('01000111 00110010 00110011 00110000 00110110')
      ];

    case 'hack':
      return [
        L(`INITIATING INTRUSION ON "${arg || 'UNKNOWN TARGET'}"...`),
        L('BYPASSING FIREWALL... [45%]'),
        L('BYPASSING FIREWALL... [98%]'),
        L('JUST KIDDING. THIS IS A CLASSMATE MAP, NOT NASA.', 'OK')
      ];

    case 'sudo':
      return [
        L(`SUDO ${arg.toUpperCase() || '(NOTHING)'}`),
        L('[SUDO] PASSWORD FOR GUEST: ********'),
        L('PERMISSION DENIED. NICE TRY.', 'ERR')
      ];

    case 'su':
      return [L('ACCESS DENIED — USE THE LOGIN PORTAL, SCRIPT KID.', 'ERR')];

    case 'rm':
      if (arg.replace(/\s+/g, '').includes('-rf/')) {
        return [L('NICE TRY.'), L('FILESYSTEM PROTECTED BY FRIENDSHIP.', 'OK')];
      }
      return [L('RM: MISSING OPERAND', 'ERR')];

    case 'konami':
      return [L('↑ ↑ ↓ ↓ ← → ← → B A'), L('CODE ACCEPTED.'), L('+30 LIVES GRANTED (NOT REALLY)', 'OK')];

    case 'sl':
      return [L('🚂 CHOO CHOO...'), L('A TRAIN PASSES THROUGH THE TERMINAL.')];

    case 'fortune':
      return [L(pick(FORTUNES))];

    case '42':
      return [L('THE ANSWER TO LIFE, THE UNIVERSE, AND EVERYTHING.')];

    case 'coffee':
      return [L('BREWING...'), L('418 I\'M A TEAPOT', 'ERR'), L('(THIS TERMINAL CANNOT MAKE COFFEE)')];

    case 'about':
    case 'credits':
      return [
        L('ALUMNI_NET :: G2306'),
        L('A CYBERPUNK CLASSMATE LOCATOR.'),
        L('BUILT WITH ECHARTS, CLOUDFLARE, FIREBASE, AND SPITE.'),
        L('THANK YOU FOR VISITING.', 'OK')
      ];

    case 'clear':
    case 'cls':
      ctx.clearTerminal();
      return [];

    case 'exit':
    case 'quit':
    case 'close':
      ctx.closePanel();
      return [];

    default:
      return [L(`'${cmdRaw.toUpperCase()}' IS NOT RECOGNIZED. TYPE HELP OR ? FOR COMMANDS.`, 'ERR')];
  }
}
