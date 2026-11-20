// Menu-bar-only mouse jiggler. Posts a 1px move and back via CoreGraphics (JXA)
// so macOS idle timers (Teams, etc.) reset. macOS only.
// First run: grant Accessibility to the app (System Settings > Privacy & Security).

const JIGGLE = `
ObjC.import('ApplicationServices');
const here = $.CGEventGetLocation($.CGEventCreate($()));
for (const dx of [1, 0]) {
  $.CGEventPost($.kCGHIDEventTap,
    $.CGEventCreateMouseEvent($(), $.kCGEventMouseMoved, $.CGPointMake(here.x + dx, here.y), 0));
}`;

const DURATIONS = [
  ['d0', 'Until stopped', 0],
  ['d30', '30 minutes', 30],
  ['d60', '1 hour', 60],
  ['d120', '2 hours', 120],
  ['d240', '4 hours', 240],
  ['d480', '8 hours', 480],
];
const INTERVALS = [
  ['i30', 'Every 30 seconds', 30],
  ['i60', 'Every minute', 60],
  ['i120', 'Every 2 minutes', 120],
];

let duration = 'd60', interval = 'i60';
let timer = null, stopAt = 0, appRef, res;

const jiggle = () => tjs.spawn(['osascript', '-l', 'JavaScript', '-e', JIGGLE],
  { stdout: 'ignore', stderr: 'ignore' });

const running = () => timer !== null;

function stop() {
  clearInterval(timer);
  timer = null;
  render();
}

function start() {
  const mins = DURATIONS.find(d => d[0] === duration)[2];
  const secs = INTERVALS.find(i => i[0] === interval)[2];
  stopAt = mins ? Date.now() + mins * 60000 : 0;
  jiggle();
  timer = setInterval(() => {
    if (stopAt && Date.now() >= stopAt) return stop();
    jiggle();
  }, secs * 1000);
  render();
}

function render() {
  const menu = [
    running()
      ? { id: 'stop', label: 'Stop' }
      : { id: 'start', label: 'Start' },
    { separator: true },
    { id: 'h1', label: 'Run for', enabled: false },
    ...DURATIONS.map(([id, label]) => ({ id, label, checked: id === duration })),
    { separator: true },
    { id: 'h2', label: 'Move', enabled: false },
    ...INTERVALS.map(([id, label]) => ({ id, label, checked: id === interval })),
    { separator: true },
    { id: 'about', label: 'About tinymousy' },
    { id: 'quit', label: 'Quit' },
  ];
  appRef.tray.set({
    icon: res + (running() ? '/mouse-on.png' : '/mouse.png'),
    tooltip: running() ? 'Mouse mover running' : 'Mouse mover idle',
    menu,
  });
}

export const api = {};

export function init(app) {
  appRef = app;
  res = app.paths.resources;
  render();
}

export function onTray(id, app) {
  if (id === 'quit') return app.quit();
  if (id === 'about') return app.win.open('about', { page: 'about.html', title: 'About tinymousy', size: '340x300' });
  if (id === 'start') return start();
  if (id === 'stop') return stop();
  if (id[0] === 'd') duration = id;
  else if (id[0] === 'i') interval = id;
  else return;
  if (running()) { stop(); start(); } else render();
}
