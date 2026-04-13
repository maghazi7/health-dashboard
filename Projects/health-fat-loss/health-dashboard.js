// ==============================================================
// Health Dashboard V1 — single-file app (spec: specs/dashboard-design.md)
// ==============================================================

// ---------- Config ----------
const DEFAULT_API_BASE = 'https://127.0.0.1:27124';
const POLL_MS = 30000;

// ---------- DOM helpers ----------
const $ = (sel, root) => (root || document).querySelector(sel);
const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
const todayISO = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
};
const yesterdayISO = () => {
  const d = new Date(); d.setDate(d.getDate() - 1);
  const pad = (n) => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
};
const nowHHMM = () => {
  const d = new Date();
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const am = h < 12 ? 'am' : 'pm';
  h = h % 12 || 12;
  return h + ':' + m + am;
};

function el(tag, attrs, ...children) {
  attrs = attrs || {};
  const node = document.createElement(tag);
  for (const k of Object.keys(attrs)) {
    const v = attrs[k];
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'dataset') for (const dk of Object.keys(v)) node.dataset[dk] = v[dk];
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
    else if (k === 'textContent') node.textContent = v;
    else if (k === 'hidden' && v) node.hidden = true;
    else node.setAttribute(k, v);
  }
  for (const child of children) {
    if (child == null || child === false) continue;
    if (Array.isArray(child)) {
      for (const c of child) node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    } else {
      node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
    }
  }
  return node;
}

// Build SVG with document.createElementNS — no innerHTML, no parsed strings
const SVGNS = 'http://www.w3.org/2000/svg';
function buildBodySVG() {
  const svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('class', 'body-svg');
  svg.setAttribute('viewBox', '0 0 300 520');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Body muscle map');

  const outline = document.createElementNS(SVGNS, 'g');
  outline.setAttribute('fill', 'none');
  outline.setAttribute('stroke', 'var(--theme_border)');
  outline.setAttribute('stroke-width', '1');
  const head = document.createElementNS(SVGNS, 'ellipse');
  head.setAttribute('cx', '150'); head.setAttribute('cy', '42');
  head.setAttribute('rx', '28'); head.setAttribute('ry', '34');
  outline.appendChild(head);
  const neck = document.createElementNS(SVGNS, 'rect');
  neck.setAttribute('x', '140'); neck.setAttribute('y', '72');
  neck.setAttribute('width', '20'); neck.setAttribute('height', '18'); neck.setAttribute('rx', '4');
  outline.appendChild(neck);
  svg.appendChild(outline);

  function region(tag, attrs, muscle) {
    const n = document.createElementNS(SVGNS, tag);
    for (const k of Object.keys(attrs)) n.setAttribute(k, attrs[k]);
    n.setAttribute('class', 'muscle-region heat-0');
    n.setAttribute('data-muscle', muscle);
    svg.appendChild(n);
  }
  region('path',    { d: 'M115,90 Q150,80 185,90 L180,108 Q150,100 120,108 Z' }, 'traps');
  region('ellipse', { cx: '98',  cy: '112', rx: '22', ry: '16' }, 'shoulders');
  region('ellipse', { cx: '202', cy: '112', rx: '22', ry: '16' }, 'shoulders');
  region('path',    { d: 'M112,108 Q150,100 188,108 L185,148 Q150,155 115,148 Z' }, 'chest');
  region('ellipse', { cx: '82',  cy: '158', rx: '14', ry: '32' }, 'biceps');
  region('ellipse', { cx: '218', cy: '158', rx: '14', ry: '32' }, 'biceps');
  region('ellipse', { cx: '78',  cy: '162', rx: '10', ry: '28', transform: 'translate(-8,0)' }, 'triceps');
  region('ellipse', { cx: '222', cy: '162', rx: '10', ry: '28', transform: 'translate(8,0)' }, 'triceps');
  region('rect',    { x: '128', y: '150', width: '44', height: '68', rx: '8' }, 'abs');
  region('rect',    { x: '112', y: '112', width: '14', height: '50', rx: '4', opacity: '0.75' }, 'back');
  region('rect',    { x: '174', y: '112', width: '14', height: '50', rx: '4', opacity: '0.75' }, 'back');
  region('path',    { d: 'M118,220 Q150,212 182,220 L180,250 Q150,258 120,250 Z' }, 'glutes');
  region('path',    { d: 'M115,252 L128,252 L130,360 L110,360 Z' }, 'quads');
  region('path',    { d: 'M172,252 L185,252 L190,360 L170,360 Z' }, 'quads');
  region('path',    { d: 'M130,252 L145,252 L143,355 L132,355 Z' }, 'hamstrings');
  region('path',    { d: 'M155,252 L170,252 L168,355 L157,355 Z' }, 'hamstrings');
  region('ellipse', { cx: '120', cy: '408', rx: '12', ry: '40' }, 'calves');
  region('ellipse', { cx: '180', cy: '408', rx: '12', ry: '40' }, 'calves');

  const decor = document.createElementNS(SVGNS, 'g');
  decor.setAttribute('fill', 'var(--theme_surface)');
  for (const a of [
    { tag: 'rect', x: '60', y: '195', width: '12', height: '50', rx: '6' },
    { tag: 'rect', x: '228', y: '195', width: '12', height: '50', rx: '6' },
    { tag: 'ellipse', cx: '120', cy: '470', rx: '16', ry: '8' },
    { tag: 'ellipse', cx: '180', cy: '470', rx: '16', ry: '8' },
  ]) {
    const n = document.createElementNS(SVGNS, a.tag);
    for (const k of Object.keys(a)) if (k !== 'tag') n.setAttribute(k, a[k]);
    decor.appendChild(n);
  }
  svg.appendChild(decor);
  return svg;
}

// ---------- Inline fallback exercise DB (extended list loaded async from data/nippard-program.json) ----------
const INLINE_EXERCISE_DB = {
  "45° Incline Barbell Press": { muscles: ["chest"], primaryMuscle: "chest", subs: ["45° Incline DB Press"], notes: "1 second pause at the bottom of each rep.", dayTypes: ["Upper Strength"], rpe: "6-8" },
  "Wide-Grip Pull-Up": { muscles: ["back","biceps"], primaryMuscle: "back", subs: ["Wide-Grip Lat Pulldown"], notes: "1.5x shoulder width overhand grip.", dayTypes: ["Upper Strength"], rpe: "6-7" },
  "Barbell Bench Press": { muscles: ["chest","triceps"], primaryMuscle: "chest", subs: ["Machine Chest Press"], notes: "Set up a comfortable arch.", dayTypes: ["Push Hypertrophy"], rpe: "6-7" },
  "Smith Machine Squat": { muscles: ["quads","glutes"], primaryMuscle: "quads", subs: ["DB Bulgarian Split Squat"], notes: "Upright torso, feet forward.", dayTypes: ["Lower Strength"], rpe: "6-8" },
  "Barbell RDL": { muscles: ["hamstrings","glutes"], primaryMuscle: "hamstrings", subs: ["DB RDL"], notes: "Stop 75% of lockout.", dayTypes: ["Lower Strength"], rpe: "6-7" },
  "Standing Calf Raise": { muscles: ["calves"], primaryMuscle: "calves", subs: ["Seated Calf Raise"], notes: "1-2 second pause at bottom.", dayTypes: ["Lower Strength"], rpe: "7-9" },
  "Cable Crunch": { muscles: ["abs"], primaryMuscle: "abs", subs: ["Decline Weighted Crunch"], notes: "Round lower back as you crunch.", dayTypes: ["Lower Strength"], rpe: "7-8" },
  "High-Cable Lateral Raise": { muscles: ["shoulders"], primaryMuscle: "shoulders", subs: ["Lean-In DB Lateral Raise"], notes: "Squeeze lateral delt.", dayTypes: ["Upper Strength","Push Hypertrophy"], rpe: "6-8" },
  "Bayesian Cable Curl": { muscles: ["biceps"], primaryMuscle: "biceps", subs: ["Incline DB Stretch Curl"], notes: "Use weaker arm first if imbalanced.", dayTypes: ["Upper Strength"], rpe: "7-9" },
  "Machine Shrug": { muscles: ["traps"], primaryMuscle: "traps", subs: ["DB Shrug"], notes: "Brief pause at the top.", dayTypes: ["Pull Hypertrophy"], rpe: "6-7" },
  "Overhead Cable Triceps Extension (Bar)": { muscles: ["triceps"], primaryMuscle: "triceps", subs: ["DB Skull Crusher"], notes: "Optional pause in the stretched position.", dayTypes: ["Upper Strength","Push Hypertrophy"], rpe: "7-9" },
};

// ---------- State ----------
const state = {
  profile: {
    identity: { name: null, age: null, weightLbs: null, goalWeightLbs: null },
    goals: { primary: null, secondary: null },
    dietProfile: { restrictions: [], calories: null, proteinG: null, carbsG: null, fatG: null, waterL: null },
    trainingProfile: {},
    healthProfile: {},
    activePersona: null,
  },
  today: {
    date: todayISO(),
    macros: { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, waterL: 0, yesterday: { calories: null, proteinG: null } },
    meals: [],
    supplements: [],
    compliance: [],
    targets: { calories: null, proteinG: null, carbsG: null, fatG: null, waterL: null },
  },
  training: { lastSessionDate: null, trainedYesterday: false, recentSessions: [], weeklyVolume: {} },
  nutrition: { recentMeals: [], mealLibrary: [], checkInDays: [] },
  meds: { active: [], complianceLast12Weeks: {}, supplementStack: [], todayCompliance: { checked: 0, total: 0 } },
  body: { weeklySnapshots: [] },
  avoidance: { daysSinceLastInput: 0, currentGhostStreak: 0, longestGhostStreak: 0, escalationLevel: 0 },
  checkInConfig: { morning: null, evening: null, activeDomains: [] },
  readiness: { score: null, status: 'no_data', narrative: 'Log a meal or workout to unlock readiness.' },
  ui: {
    activeView: 'today',
    sidebarCollapsed: false,
    bodyMapMode: '2d',
    selectedMuscle: null,
    aiSphereOpen: false,
    apiReachable: true,
    apiLastError: null,
    assetOk: false,
  },
  cache: { lastFetched: {}, bodies: {} },
  parseErrors: {},
  fileStatus: {},
  exerciseDB: INLINE_EXERCISE_DB,
  writeQueue: [],
};

function getApiKey() { return localStorage.getItem('obsidian:apiKey') || ''; }
function setApiKey(k) { localStorage.setItem('obsidian:apiKey', k); }
function getApiBase() { return localStorage.getItem('obsidian:apiBase') || DEFAULT_API_BASE; }
function setApiBase(b) { localStorage.setItem('obsidian:apiBase', b); }

// ---------- Readiness formula (§6) ----------
function caloriesScore(ratio) {
  if (ratio == null || Number.isNaN(ratio)) return null;
  if (ratio >= 0.9 && ratio <= 1.1) return 95;
  if (ratio >= 0.8 && ratio <= 1.2) return 80;
  if (ratio >= 0.7 && ratio <= 1.3) return 65;
  return 45;
}
function proteinScore(ratio) {
  if (ratio == null || Number.isNaN(ratio)) return null;
  if (ratio >= 1.0) return 100;
  if (ratio >= 0.8) return 80;
  if (ratio >= 0.6) return 60;
  if (ratio >= 0.4) return 40;
  return 20;
}
function trainedScore(trainedYesterday) {
  if (trainedYesterday === null || trainedYesterday === undefined) return null;
  return trainedYesterday ? 90 : 60;
}
function supplementScore(fraction) {
  if (fraction == null || Number.isNaN(fraction)) return null;
  return Math.round(fraction * 100);
}
function hrvScore() { return null; }
function rhrScore() { return null; }
function sleepScore() { return null; }
function statusFor(s) { if (s >= 75) return 'green'; if (s >= 50) return 'amber'; return 'red'; }
function narrativeFor(s) {
  if (s >= 90) return 'Primed — full send.';
  if (s >= 75) return 'Green light — hit the session.';
  if (s >= 60) return 'Amber — train but skip intensity techniques.';
  if (s >= 40) return 'Back off — light accessory day.';
  return 'Recover — rest, eat, sleep.';
}
function readinessCompute(inputs) {
  const scores = [
    caloriesScore(inputs.caloriesRatio),
    proteinScore(inputs.proteinRatio),
    trainedScore(inputs.trainedYesterday),
    supplementScore(inputs.supplementCompliance),
    hrvScore(inputs.hrv),
    rhrScore(inputs.restingHr),
    sleepScore(inputs.sleepHours),
  ].filter((s) => s != null);
  if (scores.length === 0) return { score: null, status: 'no_data', narrative: 'Log a meal or workout to unlock readiness.' };
  const score = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  return { score, status: statusFor(score), narrative: narrativeFor(score) };
}

// ---------- Dispatch ----------
function dispatch(action) {
  try { console.log('[dispatch]', action.type, action); } catch (_) {}
  switch (action.type) {
    case 'HYDRATE_PROFILE':  state.profile = action.payload; break;
    case 'HYDRATE_TODAY':    state.today = action.payload; break;
    case 'HYDRATE_TRAINING': state.training = action.payload; break;
    case 'HYDRATE_NUTRITION':state.nutrition = action.payload; break;
    case 'HYDRATE_MEDS':     state.meds = action.payload; break;
    case 'HYDRATE_BODY':     state.body = action.payload; break;
    case 'HYDRATE_AVOIDANCE':state.avoidance = action.payload; break;
    case 'HYDRATE_CHECKIN':  state.checkInConfig = action.payload; break;
    case 'HYDRATE_EXERCISES':state.exerciseDB = Object.assign({}, INLINE_EXERCISE_DB, action.payload || {}); break;

    case 'UI_SET_VIEW':           state.ui.activeView = action.view; break;
    case 'UI_TOGGLE_SIDEBAR':     state.ui.sidebarCollapsed = !state.ui.sidebarCollapsed; break;
    case 'UI_SET_BODYMAP_MODE':   state.ui.bodyMapMode = action.mode; break;
    case 'UI_SELECT_MUSCLE':      state.ui.selectedMuscle = action.muscle; break;
    case 'UI_TOGGLE_AI_SPHERE':   state.ui.aiSphereOpen = action.open !== undefined ? action.open : !state.ui.aiSphereOpen; break;
    case 'UI_SET_ASSET_OK':       state.ui.assetOk = action.ok; break;

    case 'OPTIMISTIC_ADD_MEAL':   state.today.meals = state.today.meals.concat([action.meal]); break;
    case 'OPTIMISTIC_ADD_WORKOUT':
      state.training.recentSessions = [action.session].concat(state.training.recentSessions).slice(0, 50);
      state.training.lastSessionDate = action.session.date;
      if (action.session.date === yesterdayISO()) state.training.trainedYesterday = true;
      break;
    case 'OPTIMISTIC_MARK_MED': {
      const hit = state.today.compliance.find((c) => c.item.toLowerCase() === action.item.toLowerCase());
      if (hit) hit.taken = true;
      else state.today.compliance = state.today.compliance.concat([{ item: action.item, taken: true }]);
      const totalItems = Math.max(state.today.compliance.length, state.meds.todayCompliance.total || 0);
      state.meds.todayCompliance = { checked: state.today.compliance.filter((c) => c.taken).length, total: totalItems };
      break;
    }
    case 'OPTIMISTIC_ROLLBACK':
      if (action.kind === 'meal') state.today.meals = state.today.meals.filter((m) => m.id !== action.id);
      if (action.kind === 'workout') state.training.recentSessions = state.training.recentSessions.filter((s) => s.id !== action.id);
      if (action.kind === 'med') {
        const hit = state.today.compliance.find((c) => c.item.toLowerCase() === action.item.toLowerCase());
        if (hit) hit.taken = false;
      }
      break;

    case 'API_REACHABLE':       state.ui.apiReachable = true;  state.ui.apiLastError = null; break;
    case 'API_UNREACHABLE':     state.ui.apiReachable = false; state.ui.apiLastError = action.error || null; break;

    case 'SET_PARSE_ERROR':     state.parseErrors[action.path] = action.error; break;
    case 'CLEAR_PARSE_ERROR':   delete state.parseErrors[action.path]; break;
    case 'SET_FILE_STATUS':     state.fileStatus[action.path] = action.status; break;

    case 'WRITE_ENQUEUE':       state.writeQueue.push(action.entry); break;
    case 'WRITE_DEQUEUE':       state.writeQueue = state.writeQueue.filter((e) => e.id !== action.id); break;

    default:
      console.warn('[dispatch] Unknown action:', action.type);
      return;
  }

  // Re-derive readiness
  const profCal = state.profile.dietProfile && state.profile.dietProfile.calories;
  const profPro = state.profile.dietProfile && state.profile.dietProfile.proteinG;
  const yCal = state.today.macros.yesterday ? state.today.macros.yesterday.calories : null;
  const yPro = state.today.macros.yesterday ? state.today.macros.yesterday.proteinG : null;
  const caloriesRatio = (yCal != null && profCal) ? (yCal / profCal) : null;
  const proteinRatio  = (yPro != null && profPro) ? (yPro / profPro) : null;
  const suppFrac = state.meds.todayCompliance.total > 0 ? state.meds.todayCompliance.checked / state.meds.todayCompliance.total : null;
  state.readiness = readinessCompute({
    caloriesRatio,
    proteinRatio,
    trainedYesterday: state.training.trainedYesterday,
    supplementCompliance: suppFrac,
    hrv: null, restingHr: null, sleepHours: null,
  });

  persistLocalCache();
  renderAll();
}

function persistLocalCache() {
  try {
    localStorage.setItem('ui:activeView', state.ui.activeView);
    localStorage.setItem('ui:sidebarCollapsed', JSON.stringify(state.ui.sidebarCollapsed));
    localStorage.setItem('ui:bodyMapMode', state.ui.bodyMapMode);
  } catch (_) {}
}
function hydrateFromLocalStorage() {
  const v = localStorage.getItem('ui:activeView'); if (v) state.ui.activeView = v;
  const s = localStorage.getItem('ui:sidebarCollapsed'); if (s !== null) { try { state.ui.sidebarCollapsed = JSON.parse(s); } catch (_) {} }
  const b = localStorage.getItem('ui:bodyMapMode'); if (b) state.ui.bodyMapMode = b;
}

// ---------- REST client ----------
function restUrl(path) { return getApiBase() + '/vault/' + path; }
async function restGet(path) {
  const url = restUrl(path);
  const key = getApiKey();
  const headers = { Accept: 'text/markdown' };
  if (key) headers['Authorization'] = 'Bearer ' + key;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  try {
    const res = await fetch(url, { method: 'GET', headers, credentials: 'omit', signal: controller.signal });
    clearTimeout(timer);
    if (res.status === 401 || res.status === 403) { openAuthModal('HTTP ' + res.status + ': API key rejected'); throw new Error('auth'); }
    dispatch({ type: 'API_REACHABLE' });
    dispatch({ type: 'SET_FILE_STATUS', path, status: res.status });
    if (res.status === 404) return { status: 404, body: null };
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const body = await res.text();
    state.cache.bodies[path] = body;
    state.cache.lastFetched[path] = Date.now();
    try {
      localStorage.setItem('cache:' + path, body);
      localStorage.setItem('cache:ts:' + path, String(Date.now()));
    } catch (_) {}
    return { status: 200, body };
  } catch (err) {
    clearTimeout(timer);
    if (err && err.message === 'auth') throw err;
    dispatch({ type: 'API_UNREACHABLE', error: String(err) });
    const cached = localStorage.getItem('cache:' + path);
    if (cached) return { status: 0, body: cached, stale: true };
    return { status: 0, body: null, stale: true };
  }
}
async function restPatch(path, opts, attempt) {
  attempt = attempt || 1;
  const url = restUrl(path);
  const key = getApiKey();
  const headers = {
    'Authorization': 'Bearer ' + key,
    'Content-Type': opts.contentType || 'text/markdown',
    'Operation': opts.operation,
    'Target-Type': opts.targetType || 'heading',
    'Trim-Target-Whitespace': 'true',
  };
  if (opts.target !== undefined && opts.target !== null && opts.target !== '') headers['Target'] = opts.target;
  try {
    const res = await fetch(url, { method: 'PATCH', headers, body: opts.payload, credentials: 'omit' });
    if (res.status === 401 || res.status === 403) { openAuthModal('HTTP ' + res.status + ': API key rejected'); throw new Error('auth'); }
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res;
  } catch (err) {
    if (attempt === 1 && !(err && err.message === 'auth')) return restPatch(path, opts, 2);
    throw err;
  }
}
async function restPut(path, body) {
  const url = restUrl(path);
  const key = getApiKey();
  const headers = {
    'Authorization': 'Bearer ' + key,
    'Content-Type': 'text/markdown',
  };
  const res = await fetch(url, { method: 'PUT', headers, body, credentials: 'omit' });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res;
}

// ---------- Parsers (matchAll only) ----------
function stripFrontmatter(s) { return (s || '').replace(/^---[\s\S]*?---\n?/, ''); }

function splitBySecondLevel(body) {
  const parts = (body || '').split(/^##\s+/m);
  const out = {};
  for (let i = 1; i < parts.length; i++) {
    const newlineIdx = parts[i].indexOf('\n');
    const head = newlineIdx === -1 ? parts[i] : parts[i].slice(0, newlineIdx);
    const rest = newlineIdx === -1 ? '' : parts[i].slice(newlineIdx + 1);
    out[head.trim()] = rest;
  }
  return out;
}

function splitByDateHeading(body) {
  const matches = (body || '').matchAll(/^##\s+([^\n]+)\n([\s\S]*?)(?=^##\s+|$(?![\r\n]))/gm);
  const out = [];
  for (const m of matches) out.push({ header: m[1].trim(), body: m[2] });
  return out;
}

function parseBulletMap(text) {
  const out = {};
  const matches = (text || '').matchAll(/^[-*]\s*\*\*(.+?)\*\*\s*:?\s*(.*)$/gm);
  for (const m of matches) out[m[1].trim()] = m[2].trim();
  return out;
}

function extractSection(body, name) {
  const re = new RegExp('^###\\s+' + name + '\\s*\\n([\\s\\S]*?)(?=^###\\s+|$(?![\\r\\n]))', 'm');
  const m = (body || '').match(re);
  return m ? m[1] : '';
}

function parseNum(s) {
  if (s == null) return null;
  const cleaned = String(s).replace(/[^\d.\-]/g, '');
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function splitCSV(s) {
  if (!s) return [];
  return String(s).split(/[,;]/).map((x) => x.trim()).filter(Boolean);
}

function parseProfile(body) {
  if (!body) return null;
  const sections = splitBySecondLevel(body);
  const identity = parseBulletMap(sections['Identity'] || '');
  const goals = parseBulletMap(sections['Goals'] || '');
  const diet = parseBulletMap(sections['Diet Profile'] || '');
  const training = parseBulletMap(sections['Training Profile'] || '');
  const health = parseBulletMap(sections['Health Profile'] || '');
  const apm = (sections['Active Persona'] || '').match(/\*\*([^*]+)\*\*/);
  const activePersona = apm ? apm[1].trim() : null;

  const targetsStr = diet['Targets'] || '';
  const dietProfile = { restrictions: splitCSV(diet['Restrictions']), calories: null, proteinG: null, carbsG: null, fatG: null, waterL: null };
  const matches = targetsStr.matchAll(/([\d,]+(?:\.\d+)?)\s*(kcal|g\s*P|g\s*C|g\s*F|L\s*water|L)/gi);
  for (const m of matches) {
    const n = Number(m[1].replace(/,/g, ''));
    const u = m[2].toLowerCase().replace(/\s+/g, '');
    if (u === 'kcal') dietProfile.calories = n;
    else if (u === 'gp') dietProfile.proteinG = n;
    else if (u === 'gc') dietProfile.carbsG = n;
    else if (u === 'gf') dietProfile.fatG = n;
    else if (u.indexOf('l') === 0) dietProfile.waterL = n;
  }
  return {
    identity: {
      name: identity['Name'] || null,
      age: parseNum(identity['Age']),
      weightLbs: parseNum(identity['Current weight']),
      goalWeightLbs: parseNum(identity['Goal weight']),
    },
    goals: { primary: goals['Primary'] || null, secondary: goals['Secondary'] || null },
    dietProfile,
    trainingProfile: training,
    healthProfile: health,
    activePersona,
  };
}

function parseMetricsTable(text) {
  const out = { calories: null, proteinG: null, carbsG: null, fatG: null, waterL: null, targets: {} };
  const lines = (text || '').split('\n');
  for (const line of lines) {
    const m = line.match(/^\|\s*([\w\s]+?)\s*\|\s*([^\|]+?)\s*\|\s*([^\|]+?)\s*\|\s*([^\|]+?)\s*\|/);
    if (!m) continue;
    const metric = m[1].trim().toLowerCase();
    const value = m[2].trim();
    const target = m[3].trim();
    if (metric === 'calories') { out.calories = parseNum(value); out.targets.calories = parseNum(target); }
    else if (metric === 'protein') { out.proteinG = parseNum(value); out.targets.proteinG = parseNum(target); }
    else if (metric === 'carbs') { out.carbsG = parseNum(value); out.targets.carbsG = parseNum(target); }
    else if (metric === 'fat') { out.fatG = parseNum(value); out.targets.fatG = parseNum(target); }
    else if (metric === 'water') { out.waterL = parseNum(value); out.targets.waterL = parseNum(target); }
  }
  return out;
}

function parseMeals(text) {
  if (!text) return [];
  const out = [];
  const lines = text.split('\n');
  let current = null;
  for (const raw of lines) {
    const mealM = raw.match(/^(\d+)\.\s+\*\*(.+?)(?:\s+\((.+?)\))?\*\*\s*(?:—\s*(.+))?$/);
    if (mealM) {
      if (current) out.push(current);
      current = { n: Number(mealM[1]), name: mealM[2].trim(), time: mealM[3] || null, description: mealM[4] || '', cal: null, proteinG: null, carbsG: null, fatG: null, confidence: null };
      continue;
    }
    if (current && /Cal:\s*~?\d/i.test(raw)) {
      const calM = raw.match(/Cal:\s*~?(\d+)/i);
      const pM = raw.match(/P:\s*~?(\d+(?:\.\d+)?)\s*g/i);
      const cM = raw.match(/C:\s*~?(\d+(?:\.\d+)?)\s*g/i);
      const fM = raw.match(/F:\s*~?(\d+(?:\.\d+)?)\s*g/i);
      if (calM) current.cal = Number(calM[1]);
      if (pM) current.proteinG = Number(pM[1]);
      if (cM) current.carbsG = Number(cM[1]);
      if (fM) current.fatG = Number(fM[1]);
    }
    if (current && /Confidence:/i.test(raw)) {
      const cfM = raw.match(/Confidence:\s*(\w+)/i);
      if (cfM) current.confidence = cfM[1].toLowerCase();
    }
  }
  if (current) out.push(current);
  return out;
}

function parseCheckboxList(text) {
  if (!text) return [];
  const out = [];
  const matches = text.matchAll(/^[-*]\s*\[([ xX])\]\s*~?~?(.+?)~?~?$/gm);
  for (const m of matches) out.push({ taken: m[1].toLowerCase() === 'x', item: m[2].trim().replace(/\s*—.*$/, '') });
  return out;
}

function parseDailyLog(body) {
  if (!body) return { days: [] };
  const striped = stripFrontmatter(body);
  const blocks = splitByDateHeading(striped);
  const days = blocks.map((b) => {
    const dateMatch = b.header.match(/^(\d{4}-\d{2}-\d{2})(?:\s*\(Day\s*(\d+)\))?/);
    const date = dateMatch ? dateMatch[1] : null;
    const dayN = dateMatch && dateMatch[2] ? Number(dateMatch[2]) : null;
    const metricsTable = parseMetricsTable(b.body);
    const meals = parseMeals(extractSection(b.body, 'Meals'));
    const supplements = parseCheckboxList(extractSection(b.body, 'Supplements'));
    const compliance = parseCheckboxList(extractSection(b.body, 'Compliance'));
    return { date, dayN, metrics: metricsTable, meals, supplements, compliance };
  });
  return { days };
}

function parseTrainingLog(body) {
  if (!body) return { sessions: [] };
  const striped = stripFrontmatter(body);
  const blocks = splitByDateHeading(striped);
  const sessions = blocks.map((b) => {
    const dm = b.header.match(/^(\d{4}-\d{2}-\d{2})/);
    const date = dm ? dm[1] : null;
    const bullets = parseBulletMap(b.body);
    return { date, focus: bullets['Focus'] || null, exerciseCount: parseNum(bullets['Exercises']) || null, raw: b.body };
  }).filter((s) => s.date);
  return { sessions };
}

function parseWeeklyVolume(body) {
  if (!body) return {};
  const striped = stripFrontmatter(body);
  const lines = striped.split('\n');
  const out = {};
  for (const line of lines) {
    const m = line.match(/^\|\s*([A-Za-z][A-Za-z\-\s]+?)\s*\|\s*(\d+)\s*\|/);
    if (!m) continue;
    const muscle = m[1].trim().toLowerCase();
    if (muscle === 'muscle') continue;
    out[muscle] = Number(m[2]);
  }
  return out;
}

function parseActiveMeds(body) {
  if (!body) return [];
  const striped = stripFrontmatter(body);
  const blocks = striped.split(/^##\s+/m).slice(1);
  return blocks.map((blk) => {
    const lines = blk.split('\n');
    const name = lines[0].trim();
    const kv = parseBulletMap(lines.slice(1).join('\n'));
    return {
      name,
      class: kv['Class'] || null,
      dose: kv['Dose'] || null,
      schedule: kv['Schedule'] || null,
      started: kv['Started'] || null,
      sideEffects: kv['Known side effects'] || null,
      coaching: kv['Coaching implications'] || null,
    };
  });
}

function parseComplianceLog(body) {
  if (!body) return { days: [] };
  const striped = stripFrontmatter(body);
  const blocks = splitByDateHeading(striped);
  const days = blocks.map((b) => {
    const dm = b.header.match(/^(\d{4}-\d{2}-\d{2})/);
    const date = dm ? dm[1] : null;
    const items = parseCheckboxList(b.body);
    const taken = items.filter((i) => i.taken).length;
    return { date, items, total: items.length, taken, compliancePct: items.length ? taken / items.length : 0 };
  }).filter((d) => d.date);
  return { days };
}

function parseAvoidance(body) {
  if (!body) return null;
  const sections = splitBySecondLevel(body);
  const cur = parseBulletMap(sections['Current State'] || '');
  return {
    daysSinceLastInput: parseNum(cur['Days since last input']) || 0,
    currentGhostStreak: parseNum(cur['Current ghost streak']) || 0,
    longestGhostStreak: parseNum(cur['Longest ghost streak']) || 0,
    escalationLevel: parseNum(cur['Escalation level']) || 0,
    responseRate: parseNum((cur['Response rate'] || '').replace('%', '')) || null,
  };
}

function parseCheckInConfig(body) {
  if (!body) return null;
  const sections = splitBySecondLevel(body);
  const sched = sections['Schedule'] || '';
  const mm = sched.match(/morning[^\|]*\|\s*([\d:APMapm\s]+)\s*\|/i);
  const em = sched.match(/evening[^\|]*\|\s*([\d:APMapm\s]+)\s*\|/i);
  const morning = mm ? mm[1].trim() : null;
  const evening = em ? em[1].trim() : null;
  const domainsBlock = sections['Active Domains'] || '';
  const activeDomains = [];
  for (const line of domainsBlock.split('\n')) {
    const m = line.match(/^[-*]\s*\[([ xX])\]\s*(\w+)/);
    if (m && m[1].toLowerCase() === 'x') activeDomains.push(m[2]);
  }
  return { morning, evening, activeDomains };
}

function parseWeeklySnapshots(body) {
  if (!body) return [];
  const striped = stripFrontmatter(body);
  const blocks = splitByDateHeading(striped);
  return blocks.map((b) => {
    const dm = b.header.match(/^(\d{4}-\d{2}-\d{2})/);
    const date = dm ? dm[1] : null;
    const kv = parseBulletMap(b.body);
    return { date, weightLbs: parseNum(kv['Weight']), bodyFatPct: parseNum(kv['Body fat']), notes: kv['Notes'] || null };
  }).filter((s) => s.date);
}

// ---------- Hydrate orchestrator ----------
async function hydrateAll() {
  const T = todayISO();
  const Y = yesterdayISO();

  const profileRes = await safeGet('Data/health/profile.md');
  try {
    const p = parseProfile((profileRes && profileRes.body) || '');
    if (p) dispatch({ type: 'HYDRATE_PROFILE', payload: p });
  } catch (e) { dispatch({ type: 'SET_PARSE_ERROR', path: 'Data/health/profile.md', error: String(e) }); }

  const dailyRes = await safeGet('Data/health/nutrition/daily-log.md');
  try {
    const parsed = parseDailyLog((dailyRes && dailyRes.body) || '');
    const todayBlock = parsed.days.find((d) => d.date === T);
    const yBlock = parsed.days.find((d) => d.date === Y);
    const macros = {
      calories: (todayBlock && todayBlock.metrics.calories) || 0,
      proteinG: (todayBlock && todayBlock.metrics.proteinG) || 0,
      carbsG: (todayBlock && todayBlock.metrics.carbsG) || 0,
      fatG: (todayBlock && todayBlock.metrics.fatG) || 0,
      waterL: (todayBlock && todayBlock.metrics.waterL) || 0,
      yesterday: {
        calories: yBlock && yBlock.metrics ? yBlock.metrics.calories : null,
        proteinG: yBlock && yBlock.metrics ? yBlock.metrics.proteinG : null,
      },
    };
    dispatch({
      type: 'HYDRATE_TODAY',
      payload: {
        date: T,
        macros,
        meals: (todayBlock && todayBlock.meals) || [],
        supplements: (todayBlock && todayBlock.supplements) || [],
        compliance: (todayBlock && todayBlock.compliance) || [],
        targets: (todayBlock && todayBlock.metrics && todayBlock.metrics.targets) || {},
      },
    });
    const recentMeals = parsed.days.slice(0, 7).flatMap((d) => d.meals.map((m) => Object.assign({}, m, { date: d.date })));
    const checkInDays = parsed.days.map((d) => ({ date: d.date, intensity: d.meals && d.meals.length > 0 ? 3 : 1 }));
    dispatch({ type: 'HYDRATE_NUTRITION', payload: { recentMeals, mealLibrary: [], checkInDays } });
  } catch (e) { dispatch({ type: 'SET_PARSE_ERROR', path: 'Data/health/nutrition/daily-log.md', error: String(e) }); }

  const trainRes = await safeGet('Data/health/training/training-log.md');
  try {
    const parsed = parseTrainingLog((trainRes && trainRes.body) || '');
    const trainedYesterday = parsed.sessions.some((s) => s.date === Y);
    const lastSessionDate = parsed.sessions[0] ? parsed.sessions[0].date : null;
    dispatch({
      type: 'HYDRATE_TRAINING',
      payload: {
        lastSessionDate,
        trainedYesterday,
        recentSessions: parsed.sessions.slice(0, 10),
        weeklyVolume: state.training.weeklyVolume,
      },
    });
  } catch (e) { dispatch({ type: 'SET_PARSE_ERROR', path: 'Data/health/training/training-log.md', error: String(e) }); }

  const volRes = await safeGet('Data/health/training/weekly-volume.md');
  try {
    const vol = parseWeeklyVolume((volRes && volRes.body) || '');
    state.training.weeklyVolume = vol;
    renderBodyView();
  } catch (e) { dispatch({ type: 'SET_PARSE_ERROR', path: 'Data/health/training/weekly-volume.md', error: String(e) }); }

  const medsRes = await safeGet('Data/health/medications/active-medications.md');
  const compRes = await safeGet('Data/health/medications/compliance-log.md');
  try {
    const active = parseActiveMeds((medsRes && medsRes.body) || '');
    const compParsed = parseComplianceLog((compRes && compRes.body) || '');
    const compMap = {};
    for (const d of compParsed.days) compMap[d.date] = d;
    const todayComp = compMap[T];
    dispatch({
      type: 'HYDRATE_MEDS',
      payload: {
        active,
        complianceLast12Weeks: compMap,
        supplementStack: state.meds.supplementStack,
        todayCompliance: todayComp ? { checked: todayComp.taken, total: todayComp.total } : { checked: 0, total: 0 },
      },
    });
  } catch (e) { dispatch({ type: 'SET_PARSE_ERROR', path: 'Data/health/medications/compliance-log.md', error: String(e) }); }

  const avoidRes = await safeGet('Data/health/avoidance-metrics.md');
  try {
    const a = parseAvoidance((avoidRes && avoidRes.body) || '');
    if (a) dispatch({ type: 'HYDRATE_AVOIDANCE', payload: a });
  } catch (_) {}

  const cfgRes = await safeGet('Data/health/check-in-config.md');
  try {
    const c = parseCheckInConfig((cfgRes && cfgRes.body) || '');
    if (c) dispatch({ type: 'HYDRATE_CHECKIN', payload: c });
  } catch (_) {}

  const snapRes = await safeGet('Data/health/weekly-snapshots.md');
  try {
    const snaps = parseWeeklySnapshots((snapRes && snapRes.body) || '');
    dispatch({ type: 'HYDRATE_BODY', payload: { weeklySnapshots: snaps } });
  } catch (_) {}

  try {
    const r = await fetch('data/nippard-program.json');
    if (r.ok) {
      const json = await r.json();
      if (json && json.exercises) dispatch({ type: 'HYDRATE_EXERCISES', payload: json.exercises });
    }
  } catch (_) {
    console.warn('[asset] exercise DB JSON not reachable, using inline subset');
  }
}

async function safeGet(path) {
  try { return await restGet(path); } catch (_) { return null; }
}

// ---------- PATCH writes (§8) ----------
async function ensureTodayDailyBlock() {
  const T = todayISO();
  const cached = state.cache.bodies['Data/health/nutrition/daily-log.md'] || '';
  const hasHeading = new RegExp('^##\\s+' + T, 'm').test(cached);
  if (hasHeading) return;
  const targets = state.profile.dietProfile || {};
  const payload = [
    '## ' + T + ' (Day N)',
    '',
    '| Metric | Value | Target | Status |',
    '|--------|-------|--------|--------|',
    '| Calories | 0 | ' + (targets.calories != null ? targets.calories : '?') + ' | 0% |',
    '| Protein | 0g | ' + (targets.proteinG != null ? targets.proteinG : '?') + 'g | 0% |',
    '| Carbs | 0g | ' + (targets.carbsG != null ? targets.carbsG : '?') + 'g | 0% |',
    '| Fat | 0g | ' + (targets.fatG != null ? targets.fatG : '?') + 'g | over |',
    '| Water | 0 | ' + (targets.waterL != null ? targets.waterL : '?') + 'L | 0% |',
    '',
    '### Meals',
    '',
    '### Supplements',
    '',
    '### Compliance',
    '',
    '### Notes',
    '',
  ].join('\n');
  // Append at document body root (no target) — the REST API adds to doc after frontmatter
  await restPatch('Data/health/nutrition/daily-log.md', { operation: 'append', targetType: 'heading', target: '', payload }).catch(async () => {
    await restPatch('Data/health/nutrition/daily-log.md', { operation: 'append', targetType: 'frontmatter', target: 'tags', payload });
  });
}

async function ensureTodayComplianceBlock() {
  const T = todayISO();
  const cached = state.cache.bodies['Data/health/medications/compliance-log.md'] || '';
  const hasHeading = new RegExp('^##\\s+' + T, 'm').test(cached);
  if (hasHeading) return;
  const payload = '## ' + T + '\n\n';
  await restPatch('Data/health/medications/compliance-log.md', { operation: 'append', targetType: 'heading', target: '', payload }).catch(async () => {
    await restPatch('Data/health/medications/compliance-log.md', { operation: 'append', targetType: 'frontmatter', target: 'tags', payload });
  });
}

async function patchAddMeal(mealText) {
  const T = todayISO();
  const name = (mealText || '').replace(/^(ate|had|eating|breakfast|lunch|dinner|snack|meal)\s*:?\s*/i, '').trim() || mealText;
  const n = state.today.meals.length + 1;
  const time = nowHHMM();
  const payload = [
    '',
    n + '. **' + name + ' (' + time + ')** — logged via dashboard quick-log',
    '   - Cal: ~? | P: ~?g | C: ~?g | F: ~?g',
    '   - Confidence: low',
    '   - Input: text, response quality: N/A',
    '   - Source: dashboard quick-log',
  ].join('\n');
  const id = 'meal-' + Date.now();
  dispatch({ type: 'OPTIMISTIC_ADD_MEAL', meal: { id, n, name, time, description: 'dashboard quick-log', cal: null, proteinG: null, carbsG: null, fatG: null, confidence: 'low' } });
  try {
    await ensureTodayDailyBlock();
    await restPatch('Data/health/nutrition/daily-log.md', { operation: 'append', targetType: 'heading', target: T + '/Meals', payload });
    surfaceToast('Meal logged.', 'ok');
  } catch (err) {
    dispatch({ type: 'OPTIMISTIC_ROLLBACK', kind: 'meal', id });
    surfaceToast('Write failed — use /health to log this.', 'bad');
    dispatch({ type: 'WRITE_ENQUEUE', entry: { id, kind: 'meal', payload, target: T + '/Meals' } });
  }
}

async function patchAddWorkout(focusText) {
  const T = todayISO();
  const focus = (focusText || '').replace(/^(trained|workout|lifted|ran|gym session|session)\s*:?\s*/i, '').trim() || 'General';
  const payload = [
    '## ' + T,
    '',
    '- **Focus:** ' + focus,
    '- **Exercises:** ?',
    '- **Source:** dashboard quick-log',
    '',
  ].join('\n');
  const id = 'w-' + Date.now();
  dispatch({ type: 'OPTIMISTIC_ADD_WORKOUT', session: { id, date: T, focus, exerciseCount: null } });
  try {
    await restPatch('Data/health/training/training-log.md', { operation: 'append', targetType: 'heading', target: '', payload }).catch(async () => {
      await restPatch('Data/health/training/training-log.md', { operation: 'append', targetType: 'frontmatter', target: 'tags', payload });
    });
    surfaceToast('Workout logged.', 'ok');
  } catch (err) {
    dispatch({ type: 'OPTIMISTIC_ROLLBACK', kind: 'workout', id });
    surfaceToast('Write failed — use /health to log this.', 'bad');
    dispatch({ type: 'WRITE_ENQUEUE', entry: { id, kind: 'workout', payload } });
  }
}

async function patchMarkMed(itemText) {
  const T = todayISO();
  const item = (itemText || '').replace(/^(took|injected|dosed|dose)\s*:?\s*/i, '').trim() || itemText;
  const payload = '- [x] ' + item + '\n';
  dispatch({ type: 'OPTIMISTIC_MARK_MED', item });
  try {
    await ensureTodayComplianceBlock();
    await restPatch('Data/health/medications/compliance-log.md', { operation: 'append', targetType: 'heading', target: T, payload });
    surfaceToast(item + ' marked taken.', 'ok');
  } catch (err) {
    surfaceToast('Write failed — use /health to log this.', 'bad');
    dispatch({ type: 'WRITE_ENQUEUE', entry: { kind: 'med', item, payload } });
  }
}

async function patchAddNote(text) {
  const T = todayISO();
  const hh = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const payload = '- ' + hh + ' — ' + text + '\n';
  const path = 'Daily/' + T + '.md';
  try {
    await restPatch(path, { operation: 'append', targetType: 'heading', target: 'Quick Log', payload });
    surfaceToast('Note saved.', 'ok');
  } catch (_) {
    try {
      const stub = '---\ndate: ' + T + '\n---\n\n## Quick Log\n';
      await restPut(path, stub);
      await restPatch(path, { operation: 'append', targetType: 'heading', target: 'Quick Log', payload });
      surfaceToast('Note saved.', 'ok');
    } catch (_) {
      surfaceToast('Write failed — note not saved.', 'bad');
    }
  }
}

// ---------- AI-Sphere classifier (§9, regex-only) ----------
const CLASSIFIERS = [
  { domain: 'meal',    pattern: /^(ate|had|eating|breakfast|lunch|dinner|snack|meal)\b/i },
  { domain: 'workout', pattern: /^(trained|workout|lifted|ran|gym session|session)\b/i },
  { domain: 'med',     pattern: /^(took|injected|dosed|dose)\b/i },
];
function classify(text) {
  for (const c of CLASSIFIERS) {
    if (c.pattern.test(text)) return { domain: c.domain };
  }
  return { domain: 'note' };
}

async function aiSphereSubmit(text) {
  text = String(text || '').trim();
  if (text.length < 2) {
    const s = $('#ai-sphere');
    s.classList.add('shake');
    setTimeout(() => s.classList.remove('shake'), 320);
    return;
  }
  if (!state.ui.apiReachable) {
    surfaceToast('Obsidian disconnected — reconnect in Settings.', 'bad');
    return;
  }
  const { domain } = classify(text);
  try {
    if (domain === 'meal') await patchAddMeal(text);
    else if (domain === 'workout') await patchAddWorkout(text);
    else if (domain === 'med') await patchMarkMed(text);
    else await patchAddNote(text);

    const sphere = $('#ai-sphere');
    sphere.classList.add('flash-success');
    setTimeout(() => sphere.classList.remove('flash-success'), 400);
    const inp = $('#ai-sphere-input'); if (inp) inp.value = '';
    dispatch({ type: 'UI_TOGGLE_AI_SPHERE', open: false });
    hydrateAll();
  } catch (_) {
    const sphere = $('#ai-sphere');
    sphere.classList.add('flash-error');
    setTimeout(() => sphere.classList.remove('flash-error'), 400);
  }
}

// ---------- Toast ----------
let toastTimer = null;
function surfaceToast(text, tone) {
  tone = tone || 'bad';
  const existing = $('.toast'); if (existing) existing.remove();
  const t = el('div', { class: 'toast' + (tone === 'ok' ? ' ok' : '') }, text);
  document.body.appendChild(t);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { if (t && t.parentNode) t.remove(); }, tone === 'ok' ? 2000 : 4500);
}

// ---------- Auth modal ----------
function openAuthModal(errText) {
  const modal = $('#auth-modal');
  if (!modal) return;
  modal.classList.add('open');
  const errEl = $('#auth-error'); if (errEl) errEl.textContent = errText || '';
  const inp = $('#auth-key-input'); if (inp) inp.focus();
}
function closeAuthModal() { const m = $('#auth-modal'); if (m) m.classList.remove('open'); }

// ---------- Renderers ----------
function renderAll() {
  renderSidebar();
  renderHeader();
  renderReadiness();
  renderKPIStrip();
  renderTodayTiles();
  renderTrainingView();
  renderNutritionView();
  renderMedsView();
  renderBodyView();
  renderSettingsView();
  renderAISphere();
  renderAPIPill();
  renderBanner();
  renderActiveView();
}

function renderSidebar() {
  document.body.classList.toggle('sidebar-collapsed', !!state.ui.sidebarCollapsed);
  $$('.nav-btn').forEach((b) => { b.classList.toggle('active', b.dataset.view === state.ui.activeView); });
  const st = $('#sidebar-toggle'); if (st) st.textContent = state.ui.sidebarCollapsed ? '⇥' : '⇤ Collapse sidebar';
}

function renderHeader() {
  const titles = { today: 'Today', training: 'Training', nutrition: 'Nutrition', meds: 'Medications', body: 'Body', settings: 'Settings' };
  const ttl = $('#page-title'); if (ttl) ttl.textContent = titles[state.ui.activeView] || 'Today';
  const date = new Date();
  const opts = { weekday: 'long', month: 'short', day: 'numeric' };
  const pill = $('#today-date-pill'); if (pill) pill.textContent = date.toLocaleDateString(undefined, opts);

  const cfg = state.checkInConfig;
  const ckPill = $('#checkin-pill'); const ckText = $('#checkin-pill-text');
  if (ckPill && ckText) {
    if (cfg && (cfg.morning || cfg.evening)) {
      const h = new Date().getHours();
      const next = (h < 12 && cfg.morning) ? cfg.morning : (cfg.evening || cfg.morning);
      if (next) { ckText.textContent = 'Next check-in: ' + next; ckPill.hidden = false; }
      else { ckPill.hidden = true; }
    } else { ckPill.hidden = true; }
  }

  const g = $('#ghost-pill'); const gt = $('#ghost-pill-text');
  if (g && gt) {
    if (state.avoidance && state.avoidance.currentGhostStreak > 0) {
      gt.textContent = 'Ghost streak: ' + state.avoidance.currentGhostStreak + 'd';
      g.hidden = false;
    } else { g.hidden = true; }
  }
}

function renderReadiness() {
  const hero = $('#readiness-hero');
  const r = state.readiness || { score: null, status: 'no_data', narrative: '' };
  hero.classList.remove('status-green', 'status-amber', 'status-red', 'status-no_data');
  hero.classList.add('status-' + (r.status || 'no_data'));
  $('#readiness-score').textContent = r.score == null ? '—' : String(r.score);
  $('#readiness-narrative').textContent = r.narrative;
}

function renderKPIStrip() {
  const strip = $('#kpi-strip');
  if (!strip) return;
  const targets = state.today.targets || {};
  const dietP = state.profile.dietProfile || {};
  const kpis = [
    { icon: '✅', label: 'Readiness', value: state.readiness.score, unit: '', change: state.readiness.status === 'green' ? 'good' : state.readiness.status === 'red' ? 'bad' : 'neutral', changeText: (state.readiness.status || 'no_data'), navigate: 'today' },
    { icon: '⚖️', label: 'Weight', value: state.profile.identity.weightLbs, unit: 'lbs', change: 'neutral', changeText: 'Goal: ' + (state.profile.identity.goalWeightLbs != null ? state.profile.identity.goalWeightLbs + ' lbs' : '—'), navigate: 'body' },
    { icon: '🔥', label: 'Calories', value: state.today.macros.calories, unit: 'kcal', change: 'neutral', changeText: 'Target: ' + (targets.calories != null ? targets.calories : dietP.calories != null ? dietP.calories : '—'), navigate: 'nutrition' },
    { icon: '🥩', label: 'Protein', value: state.today.macros.proteinG, unit: 'g', change: 'neutral', changeText: 'Target: ' + (targets.proteinG != null ? targets.proteinG + 'g' : dietP.proteinG != null ? dietP.proteinG + 'g' : '—'), navigate: 'nutrition' },
  ];
  strip.replaceChildren.apply(strip, kpis.map(renderKPICard));
}

function renderKPICard(k) {
  const btn = el('button', { class: 'kpi-card-v2', onclick: () => dispatch({ type: 'UI_SET_VIEW', view: k.navigate }) });
  btn.appendChild(el('div', { class: 'kpi-row' }, el('span', { class: 'icon', 'aria-hidden': 'true' }, k.icon), el('span', {}, k.label)));
  const valueEl = el('div', { class: 'kpi-value' });
  if (k.value === undefined) valueEl.appendChild(el('span', { class: 'skeleton' }));
  else if (k.value === null || k.value === '' || (typeof k.value === 'number' && Number.isNaN(k.value))) valueEl.textContent = '—';
  else {
    valueEl.textContent = String(k.value);
    if (k.unit) valueEl.appendChild(el('span', { class: 'kpi-unit' }, ' ' + k.unit));
  }
  btn.appendChild(valueEl);
  const change = el('div', { class: 'kpi-change ' + (k.change || 'neutral') }, k.value === null ? 'No data yet' : String(k.changeText || ''));
  btn.appendChild(change);
  return btn;
}

function renderTodayTiles() {
  const tT = $('#tile-training');
  if (tT) {
    const nodes = [
      el('div', { class: 'tile-header' },
        el('span', { class: 'tile-title' }, '🏋️ Training'),
        el('button', { class: 'tile-cta', onclick: () => dispatch({ type: 'UI_SET_VIEW', view: 'training' }) }, 'View →'),
      ),
    ];
    if (state.training.recentSessions.length === 0) nodes.push(renderEmpty({ icon: '🏋️', title: 'No training sessions yet', body: 'Log your first session with the AI-Sphere ("workout today: upper push") or /health.', cta: { label: 'Copy /health-setup command', onClick: () => copyCmd('/health-setup --domain training') } }));
    else nodes.push(renderRecentSessionsTable(state.training.recentSessions.slice(0, 5)));
    tT.replaceChildren.apply(tT, nodes);
  }

  const tN = $('#tile-nutrition');
  if (tN) {
    const dietP = state.profile.dietProfile || {};
    const mTargets = state.today.targets || {};
    const bars = ['protein','carbs','fat','water'].map((key) => renderProgressBar({
      label: ({ protein:'Protein', carbs:'Carbs', fat:'Fat', water:'Water' })[key],
      value: key === 'protein' ? state.today.macros.proteinG : key === 'carbs' ? state.today.macros.carbsG : key === 'fat' ? state.today.macros.fatG : state.today.macros.waterL,
      target: key === 'protein' ? (mTargets.proteinG != null ? mTargets.proteinG : dietP.proteinG) : key === 'carbs' ? (mTargets.carbsG != null ? mTargets.carbsG : dietP.carbsG) : key === 'fat' ? (mTargets.fatG != null ? mTargets.fatG : dietP.fatG) : (mTargets.waterL != null ? mTargets.waterL : dietP.waterL),
      unit: key === 'water' ? 'L' : 'g',
    }));
    const nodes = [
      el('div', { class: 'tile-header' },
        el('span', { class: 'tile-title' }, '🍽️ Nutrition'),
        el('button', { class: 'tile-cta', onclick: () => dispatch({ type: 'UI_SET_VIEW', view: 'nutrition' }) }, 'View →'),
      ),
    ];
    if (state.today.meals.length === 0 && state.today.macros.calories === 0) {
      nodes.push(renderEmpty({ icon: '🍽️', title: 'No meals logged today', body: 'Use the AI-Sphere or run /health to log a meal.', cta: { label: 'Copy /health command', onClick: () => copyCmd('/health') } }));
    } else {
      const body = el('div', { class: 'tile-body' });
      bars.forEach((b) => body.appendChild(b));
      nodes.push(body);
    }
    tN.replaceChildren.apply(tN, nodes);
  }

  const tM = $('#tile-meds');
  if (tM) {
    const nodes = [
      el('div', { class: 'tile-header' },
        el('span', { class: 'tile-title' }, '💊 Medications'),
        el('button', { class: 'tile-cta', onclick: () => dispatch({ type: 'UI_SET_VIEW', view: 'meds' }) }, 'View →'),
      ),
    ];
    if (state.meds.active.length === 0) {
      nodes.push(renderEmpty({ icon: '💊', title: 'No active medications', body: 'Run /health-setup --domain health to set up meds.', cta: { label: 'Copy /health-setup command', onClick: () => copyCmd('/health-setup --domain health') } }));
    } else {
      const body = el('div', { class: 'tile-body' });
      state.meds.active.slice(0, 3).forEach((m) => {
        const taken = state.today.compliance.some((c) => c.item.toLowerCase() === m.name.toLowerCase() && c.taken);
        body.appendChild(el('div', { class: 'med-card' },
          el('div', { class: 'med-name' }, m.name),
          el('div', { class: 'med-meta' }, [m.dose, m.schedule].filter(Boolean).join(' · ')),
          el('div', { class: 'med-actions' },
            el('button', { class: taken ? 'taken' : '', onclick: () => patchMarkMed(m.name) }, taken ? '✓ Taken' : 'Mark taken'),
          ),
        ));
      });
      nodes.push(body);
    }
    tM.replaceChildren.apply(tM, nodes);
  }

  const tB = $('#tile-body');
  if (tB) {
    const nodes = [
      el('div', { class: 'tile-header' },
        el('span', { class: 'tile-title' }, '🧍 Body'),
        el('button', { class: 'tile-cta', onclick: () => dispatch({ type: 'UI_SET_VIEW', view: 'body' }) }, 'View →'),
      ),
    ];
    if (state.profile.identity.weightLbs == null) {
      nodes.push(renderEmpty({ icon: '🧍', title: 'No body data yet', body: 'Weigh in weekly and update profile.md.', cta: { label: 'Copy /health-setup command', onClick: () => copyCmd('/health-setup') } }));
    } else {
      const body = el('div', { class: 'tile-body' });
      body.appendChild(el('div', { class: 'kpi-row' }, 'Current'));
      body.appendChild(el('div', { class: 'kpi-value' }, String(state.profile.identity.weightLbs), el('span', { class: 'kpi-unit' }, 'lbs')));
      body.appendChild(el('div', { class: 'kpi-change neutral' }, 'Goal: ' + (state.profile.identity.goalWeightLbs != null ? state.profile.identity.goalWeightLbs + ' lbs' : '—')));
      nodes.push(body);
    }
    tB.replaceChildren.apply(tB, nodes);
  }
}

function renderProgressBar(opts) {
  const v = opts.value == null || Number.isNaN(Number(opts.value)) ? null : Number(opts.value);
  const t = opts.target == null || Number.isNaN(Number(opts.target)) ? null : Number(opts.target);
  const unit = opts.unit || '';
  const wrap = el('div', { class: 'pbar-wrap' });
  wrap.appendChild(el('div', { class: 'pbar-label' },
    el('span', {}, opts.label),
    el('span', {}, (v == null ? '—' : v + unit) + ' / ' + (t == null ? '—' : t + unit)),
  ));
  const track = el('div', { class: 'pbar-track' });
  if (v != null && t != null && t > 0) {
    const ratio = v / t;
    const pct = Math.max(0, Math.min(1, ratio)) * 100;
    let tone = 'under';
    if (ratio >= 0.9 && ratio <= 1.1) tone = 'good';
    else if (ratio > 1.1) tone = 'over';
    const fill = el('div', { class: 'pbar-fill ' + tone, style: { width: pct + '%' } });
    track.appendChild(fill);
  } else {
    wrap.appendChild(el('div', { class: 'pbar-empty-note' }, 'no target'));
  }
  wrap.appendChild(track);
  return wrap;
}

function renderEmpty(opts) {
  const wrap = el('div', { class: 'empty-state' },
    el('div', { class: 'empty-icon' }, opts.icon || '•'),
    el('div', { class: 'empty-title' }, opts.title || ''),
    el('div', { class: 'empty-body' }, opts.body || ''),
  );
  if (opts.cta) wrap.appendChild(el('button', { class: 'empty-cta', onclick: opts.cta.onClick }, opts.cta.label));
  return wrap;
}

function renderRecentSessionsTable(rows) {
  if (!rows.length) return renderEmpty({ icon: '🏋️', title: 'No recent sessions', body: 'Log a workout to populate this list.' });
  return renderDataTable({
    columns: [
      { key: 'date', label: 'Date' },
      { key: 'focus', label: 'Focus' },
      { key: 'exerciseCount', label: '# Ex', align: 'right' },
    ],
    rows,
    emptyMessage: 'No sessions yet.',
  });
}

function renderDataTable(opts) {
  const table = el('table', { class: 'dt' });
  const thead = el('thead');
  const headRow = el('tr');
  for (const c of opts.columns) headRow.appendChild(el('th', { class: c.align === 'right' ? 'num' : '' }, c.label));
  thead.appendChild(headRow);
  const tbody = el('tbody');
  if (!opts.rows || !opts.rows.length) tbody.appendChild(el('tr', { class: 'empty' }, el('td', { colspan: String(opts.columns.length) }, opts.emptyMessage || 'No data yet.')));
  else for (const r of opts.rows) {
    const tr = el('tr');
    for (const c of opts.columns) tr.appendChild(el('td', { class: c.align === 'right' ? 'num' : '' }, r[c.key] == null ? '—' : String(r[c.key])));
    tbody.appendChild(tr);
  }
  table.appendChild(thead); table.appendChild(tbody);
  return table;
}

function renderTrainingView() {
  const kpi = $('#training-kpi-strip');
  if (!kpi) return;
  const recent = state.training.recentSessions;
  const weekCount = recent.filter((s) => withinDays(s.date, 7)).length;
  const totalVolume = Object.values(state.training.weeklyVolume || {}).reduce((a, b) => a + (Number(b) || 0), 0);
  const prog = state.profile.trainingProfile && state.profile.trainingProfile.Program;
  const progVal = (prog && prog.indexOf('[run /health-setup') === -1) ? prog : null;
  const cards = [
    { icon: '📅', label: 'Sessions this week', value: weekCount, unit: '', change: 'neutral', changeText: recent.length ? 'Last: ' + (recent[0].date || '—') : 'No recent sessions', navigate: 'training' },
    { icon: '📊', label: 'Weekly volume', value: totalVolume || null, unit: 'sets', change: 'neutral', changeText: totalVolume ? 'across muscle groups' : 'Log a session', navigate: 'body' },
    { icon: '🎯', label: 'Program', value: progVal, unit: '', change: 'neutral', changeText: 'Frequency: ' + ((state.profile.trainingProfile && state.profile.trainingProfile.Frequency) || '—'), navigate: 'settings' },
    { icon: '🏃', label: 'Trained yesterday', value: state.training.trainedYesterday ? 'Yes' : 'No', unit: '', change: 'neutral', changeText: 'Feeds readiness', navigate: 'today' },
  ];
  kpi.replaceChildren.apply(kpi, cards.map(renderKPICard));

  const rt = $('#training-recent-table');
  if (rt) rt.replaceChildren(renderRecentSessionsTable(recent.slice(0, 10)));

  const list = $('#training-exercise-list');
  if (list) {
    const db = state.exerciseDB || {};
    const names = Object.keys(db);
    if (!names.length) list.replaceChildren(renderEmpty({ icon: '📘', title: 'Exercise DB not loaded', body: 'data/nippard-program.json is missing or failed to load.' }));
    else list.replaceChildren.apply(list, names.slice(0, 48).map((name) => renderExerciseRow(name, db[name])));
  }
}

function renderExerciseRow(name, data) {
  const primary = data.primaryMuscle || (data.muscles && data.muscles[0]) || '—';
  const secondary = (data.muscles || []).slice(1);
  const row = el('div', { class: 'exercise-row', onclick: () => openExerciseModal(name) });
  const chips = el('div', { class: 'ex-chips' }, el('span', { class: 'chip' }, primary));
  for (const s of secondary) chips.appendChild(el('span', { class: 'chip' }, s));
  row.appendChild(el('div', { class: 'ex-name' }, name));
  row.appendChild(chips);
  row.appendChild(el('div', { class: 'ex-sets' }, 'RPE ' + (data.rpe || '?')));
  return row;
}

function openExerciseModal(name) {
  const data = state.exerciseDB[name];
  if (!data) return;
  const body = $('#exercise-modal-body');
  const nodes = [
    el('button', { class: 'modal-close', onclick: () => $('#exercise-modal').classList.remove('open') }, '×'),
    el('h3', {}, name),
  ];
  const chipsWrap = el('div', { style: { marginBottom: 'var(--theme_space-sm)' } });
  for (const m of (data.muscles || [])) chipsWrap.appendChild(el('span', { class: 'chip' }, m));
  nodes.push(chipsWrap);
  nodes.push(el('div', { class: 'card-sub' }, 'RPE: ' + (data.rpe || '?') + ' · Day types: ' + ((data.dayTypes || []).join(', ') || '—')));
  nodes.push(el('p', { style: { marginBottom: 'var(--theme_space-md)' } }, data.notes || ''));
  nodes.push(el('div', { class: 'card-title', style: { fontSize: '16px' } }, 'Substitutions'));
  const ul = el('ul');
  for (const s of (data.subs || [])) ul.appendChild(el('li', {}, s));
  nodes.push(ul);
  body.replaceChildren.apply(body, nodes);
  $('#exercise-modal').classList.add('open');
}

function withinDays(iso, days) {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  const diff = (now - d) / (1000 * 60 * 60 * 24);
  return diff >= 0 && diff <= days;
}

function renderNutritionView() {
  const prog = $('#nutrition-progress');
  if (!prog) return;
  const dietP = state.profile.dietProfile || {};
  const mTargets = state.today.targets || {};
  const bars = ['calories','protein','carbs','fat','water'].map((key) => renderProgressBar({
    label: ({ calories:'Calories', protein:'Protein', carbs:'Carbs', fat:'Fat', water:'Water' })[key],
    value: ({ calories: state.today.macros.calories, protein: state.today.macros.proteinG, carbs: state.today.macros.carbsG, fat: state.today.macros.fatG, water: state.today.macros.waterL })[key],
    target: key === 'calories' ? (mTargets.calories != null ? mTargets.calories : dietP.calories) : key === 'protein' ? (mTargets.proteinG != null ? mTargets.proteinG : dietP.proteinG) : key === 'carbs' ? (mTargets.carbsG != null ? mTargets.carbsG : dietP.carbsG) : key === 'fat' ? (mTargets.fatG != null ? mTargets.fatG : dietP.fatG) : (mTargets.waterL != null ? mTargets.waterL : dietP.waterL),
    unit: key === 'water' ? 'L' : key === 'calories' ? ' kcal' : 'g',
  }));
  prog.replaceChildren.apply(prog, bars);

  const meals = state.today.meals || [];
  const mtable = $('#nutrition-meals-table');
  if (mtable) {
    if (meals.length) mtable.replaceChildren(renderDataTable({
      columns: [
        { key: 'time', label: 'Time' },
        { key: 'name', label: 'Meal' },
        { key: 'cal', label: 'kcal', align: 'right' },
        { key: 'proteinG', label: 'P (g)', align: 'right' },
        { key: 'carbsG', label: 'C (g)', align: 'right' },
        { key: 'fatG', label: 'F (g)', align: 'right' },
      ],
      rows: meals,
      emptyMessage: 'No meals yet.',
    }));
    else mtable.replaceChildren(renderEmpty({ icon: '🍽️', title: 'No meals logged today', body: 'Use the AI-Sphere or run /health.', cta: { label: 'Copy /health command', onClick: () => copyCmd('/health') } }));
  }

  const nh = $('#nutrition-heat');
  if (nh) nh.replaceChildren(renderHeatmap({ days: state.nutrition.checkInDays || [], weeks: 12, title: 'check-ins' }));
}

function renderHeatmap(opts) {
  const wrap = el('div');
  const weeks = opts.weeks || 12;
  const totalCells = weeks * 7;
  const today = new Date();
  const map = {};
  for (const d of (opts.days || [])) map[d.date] = d.intensity || 0;
  const grid = el('div', { class: 'heat' });
  let anyHot = false;
  for (let i = totalCells - 1; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    const intensity = map[iso] || 0;
    if (intensity > 0) anyHot = true;
    const cell = el('div', { class: 'cell' + (intensity ? ' i-' + intensity : ''), title: iso + ' · ' + (intensity ? 'logged' : 'no data') });
    grid.appendChild(cell);
  }
  wrap.appendChild(grid);
  if (anyHot) {
    const legend = el('div', { class: 'heat-legend' }, el('span', {}, 'Less'));
    for (const i of [1,2,3,4]) legend.appendChild(el('span', { class: 'cell i-' + i, style: { width: '14px', height: '14px', borderRadius: '3px', display: 'inline-block' } }));
    legend.appendChild(el('span', {}, 'More'));
    wrap.appendChild(legend);
  } else {
    wrap.appendChild(el('div', { class: 'heat-caption' }, opts.title ? 'Log activity to populate ' + opts.title + '.' : 'Log activity to populate.'));
  }
  return wrap;
}

function renderMedsView() {
  const active = $('#meds-active');
  if (active) {
    if (state.meds.active.length === 0) {
      active.replaceChildren(renderEmpty({ icon: '💊', title: 'No active medications', body: 'Run /health-setup --domain health to set up meds.', cta: { label: 'Copy /health-setup command', onClick: () => copyCmd('/health-setup --domain health') } }));
    } else {
      const nodes = state.meds.active.map((m) => {
        const taken = state.today.compliance.some((c) => c.item.toLowerCase() === m.name.toLowerCase() && c.taken);
        return el('div', { class: 'med-card' },
          el('div', { class: 'med-name' }, m.name),
          el('div', { class: 'med-meta' }, [m.class, m.dose, m.schedule].filter(Boolean).join(' · ')),
          el('div', { class: 'med-meta', style: { marginTop: 'var(--theme_space-xs)' } }, m.coaching ? 'Coaching: ' + m.coaching : ''),
          el('div', { class: 'med-actions' },
            el('button', { class: taken ? 'taken' : '', onclick: () => patchMarkMed(m.name) }, taken ? '✓ Taken today' : 'Mark taken'),
          ),
        );
      });
      active.replaceChildren.apply(active, nodes);
    }
  }

  const heat = $('#meds-heat');
  if (heat) {
    const compDays = Object.keys(state.meds.complianceLast12Weeks || {}).map((date) => ({
      date, intensity: Math.min(4, Math.round(((state.meds.complianceLast12Weeks[date].compliancePct) || 0) * 4)),
    }));
    heat.replaceChildren(renderHeatmap({ days: compDays, weeks: 12, title: 'compliance' }));
  }

  const tbl = $('#meds-recent-table');
  if (tbl) {
    const rows = [];
    for (const date of Object.keys(state.meds.complianceLast12Weeks || {})) {
      const d = state.meds.complianceLast12Weeks[date];
      for (const item of (d.items || [])) rows.push({ date, item: item.item, status: item.taken ? '✓' : '—' });
    }
    rows.sort((a, b) => b.date.localeCompare(a.date));
    tbl.replaceChildren(rows.length ? renderDataTable({
      columns: [{ key: 'date', label: 'Date' }, { key: 'item', label: 'Item' }, { key: 'status', label: 'Taken', align: 'right' }],
      rows: rows.slice(0, 50),
      emptyMessage: 'No doses logged yet.',
    }) : renderEmpty({ icon: '📜', title: 'No compliance history', body: 'Mark a med taken to start the log.' }));
  }
}

function ensureBody2D() {
  const pane2d = $('#body-2d');
  if (!pane2d || pane2d.dataset.loaded === '1') return;
  const svg = buildBodySVG();
  pane2d.appendChild(svg);
  pane2d.dataset.loaded = '1';
  $$('.muscle-region', pane2d).forEach((reg) => {
    reg.addEventListener('click', () => {
      const name = reg.dataset.muscle;
      const same = state.ui.selectedMuscle === name;
      dispatch({ type: 'UI_SELECT_MUSCLE', muscle: same ? null : name });
    });
  });
}

function renderBodyView() {
  const pane2d = $('#body-2d');
  const pane3d = $('#body-3d');
  if (!pane2d || !pane3d) return;
  ensureBody2D();

  // Apply heatmap classes
  $$('.muscle-region', pane2d).forEach((reg) => {
    const m = reg.dataset.muscle;
    const sets = Number(state.training.weeklyVolume && state.training.weeklyVolume[m]) || 0;
    reg.classList.remove('heat-0','heat-1','heat-2','heat-3','heat-4','active');
    let level = 0;
    if (sets >= 15) level = 4;
    else if (sets >= 10) level = 3;
    else if (sets >= 5) level = 2;
    else if (sets >= 1) level = 1;
    reg.classList.add('heat-' + level);
    if (state.ui.selectedMuscle === m) reg.classList.add('active');
  });

  const hasVolume = Object.values(state.training.weeklyVolume || {}).some((v) => Number(v) > 0);
  const hc = $('#heat-caption');
  if (hc) hc.textContent = hasVolume ? '' : 'Log a session to populate the heatmap.';

  // 3D lazy mount
  if (state.ui.bodyMapMode === '3d') {
    if (!pane3d.dataset.mounted) {
      const mv = document.createElement('model-viewer');
      mv.setAttribute('src', 'assets/body.glb');
      mv.setAttribute('alt', 'Male musculature');
      mv.setAttribute('camera-controls', '');
      mv.setAttribute('shadow-intensity', '1');
      mv.setAttribute('exposure', '0.9');
      mv.setAttribute('style', 'width: 100%; height: 560px; background: var(--theme_surface);');
      mv.addEventListener('load', () => { dispatch({ type: 'UI_SET_ASSET_OK', ok: true }); });
      mv.addEventListener('error', (e) => {
        console.warn('[asset] body.glb failed to load', e);
        pane3d.dataset.errored = '1';
        dispatch({ type: 'UI_SET_ASSET_OK', ok: false });
        dispatch({ type: 'UI_SET_BODYMAP_MODE', mode: '2d' });
      });
      pane3d.appendChild(mv);
      pane3d.dataset.mounted = '1';
    }
    pane3d.style.display = '';
    pane2d.style.display = 'none';
    const attr = $('#body-attribution'); if (attr) attr.hidden = !state.ui.assetOk;
  } else {
    pane3d.style.display = 'none';
    pane2d.style.display = '';
    const attr = $('#body-attribution'); if (attr) attr.hidden = true;
  }

  const toggle = $('#body-toggle');
  if (toggle) {
    const hide = pane3d.dataset.errored === '1';
    toggle.hidden = hide;
    $$('button', toggle).forEach((b) => b.classList.toggle('active', b.dataset.mode === state.ui.bodyMapMode));
  }

  const panel = $('#muscle-side-list');
  const sub = $('#muscle-side-panel .panel-sub');
  if (panel) {
    if (!state.ui.selectedMuscle) {
      if (sub) sub.textContent = 'Select a muscle group to populate this list.';
      panel.replaceChildren();
    } else {
      const name = state.ui.selectedMuscle;
      if (sub) sub.textContent = 'Exercises targeting ' + name + ':';
      const all = Object.keys(state.exerciseDB || {});
      const matches = all.filter((n) => {
        const d = state.exerciseDB[n];
        return d.primaryMuscle === name || (d.muscles || []).indexOf(name) !== -1;
      });
      if (!matches.length) panel.replaceChildren(renderEmpty({ icon: '•', title: 'No exercises', body: 'No exercises target ' + name + ' in the current DB.' }));
      else panel.replaceChildren.apply(panel, matches.map((n) => renderExerciseRow(n, state.exerciseDB[n])));
    }
  }

  const snaps = state.body.weeklySnapshots || [];
  const snapTbl = $('#body-snapshots-table');
  if (snapTbl) {
    snapTbl.replaceChildren(snaps.length ? renderDataTable({
      columns: [{ key: 'date', label: 'Date' }, { key: 'weightLbs', label: 'Weight (lbs)', align: 'right' }, { key: 'bodyFatPct', label: 'BF %', align: 'right' }, { key: 'notes', label: 'Notes' }],
      rows: snaps,
      emptyMessage: 'No snapshots yet.',
    }) : renderEmpty({ icon: '📷', title: 'No weekly snapshots', body: 'Weigh in once a week to track trends.' }));
  }
}

function renderSettingsView() {
  const base = $('#setting-api-base'); if (base && !base.dataset.bound) { base.dataset.bound = '1'; base.value = getApiBase(); }
  const key = $('#setting-api-key'); if (key && !key.value) key.placeholder = getApiKey() ? '••• saved locally •••' : 'paste from Obsidian plugin settings';
  const refresh = $('#setting-refresh');
  if (refresh && !refresh.dataset.bound) {
    refresh.dataset.bound = '1';
    refresh.value = localStorage.getItem('obsidian:refreshSec') || 60;
    refresh.addEventListener('change', () => { localStorage.setItem('obsidian:refreshSec', String(refresh.value || 60)); });
  }
  const persona = $('#setting-persona');
  if (persona) persona.textContent = state.profile.activePersona ? ('Active persona: ' + state.profile.activePersona) : 'No active persona — run /health-setup.';
}

function renderAISphere() {
  const e = $('#ai-sphere');
  if (!e) return;
  e.classList.toggle('open', !!state.ui.aiSphereOpen);
  if (state.ui.aiSphereOpen) setTimeout(() => { const i = $('#ai-sphere-input'); if (i) i.focus(); }, 50);
  const submit = $('#ai-sphere-submit');
  if (submit) submit.disabled = !state.ui.apiReachable;
}

function renderAPIPill() {
  const pill = $('#footer-api');
  if (!pill) return;
  pill.classList.toggle('bad', !state.ui.apiReachable);
  const txt = $('#footer-api-text');
  if (txt) txt.textContent = state.ui.apiReachable ? 'Obsidian connected' : 'Disconnected';
}

function renderBanner() {
  const b = $('#api-banner');
  if (!b) return;
  if (state.ui.apiReachable) { b.classList.remove('show'); b.replaceChildren(); return; }
  b.classList.add('show');
  b.replaceChildren(el('strong', {}, 'Obsidian disconnected — read-only mode. '), document.createTextNode(' Reconnect in Settings.'));
}

function renderActiveView() {
  $$('.view').forEach((v) => v.classList.toggle('active', v.id === 'view-' + state.ui.activeView));
}

function copyCmd(cmd) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(cmd);
    surfaceToast('Copied: ' + cmd, 'ok');
  } catch (_) { surfaceToast('Copy failed — select manually.', 'bad'); }
}

function bindUI() {
  $$('.nav-btn').forEach((b) => b.addEventListener('click', () => dispatch({ type: 'UI_SET_VIEW', view: b.dataset.view })));
  const toggle = $('#sidebar-toggle'); if (toggle) toggle.addEventListener('click', () => dispatch({ type: 'UI_TOGGLE_SIDEBAR' }));

  const bubble = $('#ai-sphere-bubble'); if (bubble) bubble.addEventListener('click', () => dispatch({ type: 'UI_TOGGLE_AI_SPHERE', open: true }));
  const submit = $('#ai-sphere-submit'); if (submit) submit.addEventListener('click', () => aiSphereSubmit($('#ai-sphere-input').value));
  const input = $('#ai-sphere-input');
  if (input) input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); aiSphereSubmit(input.value); }
    else if (e.key === 'Escape') { dispatch({ type: 'UI_TOGGLE_AI_SPHERE', open: false }); }
  });

  const xm = $('#exercise-modal');
  if (xm) xm.addEventListener('click', (e) => { if (e.target.id === 'exercise-modal') xm.classList.remove('open'); });

  const btoggle = $('#body-toggle');
  if (btoggle) btoggle.addEventListener('click', (e) => {
    const btn = e.target && e.target.closest('button');
    if (!btn) return;
    dispatch({ type: 'UI_SET_BODYMAP_MODE', mode: btn.dataset.mode });
  });

  const authSave = $('#auth-save');
  if (authSave) authSave.addEventListener('click', async () => {
    const k = $('#auth-key-input').value.trim();
    if (!k) { const er = $('#auth-error'); if (er) er.textContent = 'Key required.'; return; }
    setApiKey(k);
    closeAuthModal();
    await hydrateAll();
  });

  const saveApi = $('#setting-save-api');
  if (saveApi) saveApi.addEventListener('click', async () => {
    const base = $('#setting-api-base').value.trim();
    const key = $('#setting-api-key').value.trim();
    if (base) setApiBase(base);
    if (key) setApiKey(key);
    const st = $('#setting-api-status'); if (st) st.textContent = 'Saved. Re-testing connection…';
    try {
      const r = await restGet('Data/health/profile.md');
      if (r && r.body) { if (st) st.textContent = '✓ Connected'; }
      else { if (st) st.textContent = '⚠ No response'; }
    } catch (_) { if (st) st.textContent = '✗ Failed — check key/URL'; }
    hydrateAll();
  });

  const resetLocal = $('#setting-reset-local');
  if (resetLocal) resetLocal.addEventListener('click', () => {
    if (!confirm('Clear all dashboard localStorage? Your vault is untouched.')) return;
    localStorage.clear();
    location.reload();
  });

  window.addEventListener('keydown', (e) => {
    const tag = document.activeElement ? document.activeElement.tagName : '';
    const typing = tag === 'INPUT' || tag === 'TEXTAREA';
    if (!typing && e.key === '/') {
      e.preventDefault();
      dispatch({ type: 'UI_TOGGLE_AI_SPHERE', open: true });
    } else if (!typing && /^[1-6]$/.test(e.key)) {
      const views = ['today','training','nutrition','meds','body','settings'];
      const i = Number(e.key) - 1;
      dispatch({ type: 'UI_SET_VIEW', view: views[i] });
    } else if (e.key === 'Escape') {
      dispatch({ type: 'UI_TOGGLE_AI_SPHERE', open: false });
      const xm2 = $('#exercise-modal'); if (xm2) xm2.classList.remove('open');
    }
  });
}

let pollTimer = null;
function startHealthPoll() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(async () => {
    try {
      const r = await restGet('Data/health/profile.md');
      if (r && (r.body || r.status === 200)) dispatch({ type: 'API_REACHABLE' });
    } catch (_) {}
  }, POLL_MS);
}

function runReadinessTests() {
  const vectors = [
    { label: 'V1 perfect',   inp: { caloriesRatio: 1.0, proteinRatio: 1.0, trainedYesterday: true, supplementCompliance: 1.0, hrv: null, restingHr: null, sleepHours: null }, expectScore: 96, expectStatus: 'green' },
    { label: 'V2 red',       inp: { caloriesRatio: 0.50, proteinRatio: 0.44, trainedYesterday: true, supplementCompliance: 0, hrv: null, restingHr: null, sleepHours: null }, expectScore: 44, expectStatus: 'red' },
    { label: 'V3 rest day',  inp: { caloriesRatio: null, proteinRatio: null, trainedYesterday: false, supplementCompliance: null, hrv: null, restingHr: null, sleepHours: null }, expectScore: 60, expectStatus: 'amber' },
    { label: 'V4 no data',   inp: { caloriesRatio: null, proteinRatio: null, trainedYesterday: null, supplementCompliance: null, hrv: null, restingHr: null, sleepHours: null }, expectScore: null, expectStatus: 'no_data' },
    { label: 'V5 over cals', inp: { caloriesRatio: 1.15, proteinRatio: 1.05, trainedYesterday: false, supplementCompliance: 0.75, hrv: null, restingHr: null, sleepHours: null }, expectScore: 78, expectStatus: 'green' },
  ];
  const results = vectors.map((v) => {
    const out = readinessCompute(v.inp);
    const ok = out.score === v.expectScore && out.status === v.expectStatus;
    return { label: v.label, ok, got: out, expected: { score: v.expectScore, status: v.expectStatus } };
  });
  try {
    console.group('[readiness tests]');
    for (const r of results) (r.ok ? console.log : console.error).call(console, r.label, r.ok ? 'PASS' : 'FAIL', r);
    console.groupEnd();
  } catch (_) {}
  return results;
}

async function boot() {
  hydrateFromLocalStorage();
  bindUI();
  renderAll();
  window.__readinessTests = runReadinessTests();

  if (!getApiKey()) {
    openAuthModal('Paste your Obsidian REST API key to begin.');
  } else {
    await hydrateAll();
  }
  startHealthPoll();
}

document.addEventListener('DOMContentLoaded', boot);
