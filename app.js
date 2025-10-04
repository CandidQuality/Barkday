console.log('[Barkday] app.js loaded v3 (aliases externalized)');
// ====================== Barkday app.js (complete, upgraded) ======================

// ---------- Config ----------
const LOGO_SPLASH_SRC = "barkday-logo.png?v=3";   // full-size on splash
const LOGO_HEADER_SRC = "barkday-logo2.png?v=2";  // smaller header mark

// Data sources
const GIFT_FEED_URL     = "https://raw.githubusercontent.com/CandidQuality/dog-birthday-feed/main/dog-gifts.json";
const RECO_BANDED_URL   = "data/reco-banded.json?v=4";
const RECO_BREED_URL    = "data/reco-breed.json?v=3";
const BREED_GROUPS_URL  = "data/breed_groups.json?v=2";
const BREED_ALIASES_URL = "data/breed_aliases.json?v=1"; // NEW: external aliases
const TAXONOMY_URL      = "data/breed_taxonomy.json?v=1"; // NEW: AKC + behavioral mapping

// --- Affiliate Config (Amazon live; Chewy placeholder) ---
const AMAZON_TAG = "candidquality-20";               // your live Amazon Associates tag
const CHEWY_IMPACT_BASE = "";                        // leave empty until Chewy approves (e.g., "https://chewy.pxf.io/c/XXXX/XXXX/XXXX")
const CHEWY_ENABLED = !!CHEWY_IMPACT_BASE;           // auto-toggle when you paste your Chewy Impact base

// Debug: show data file versions in console
console.debug("[Barkday] data sources", {
  groups: BREED_GROUPS_URL,
  banded: RECO_BANDED_URL,
  breed: RECO_BREED_URL,
  aliases: BREED_ALIASES_URL,
  gifts: GIFT_FEED_URL,
  taxonomy: TAXONOMY_URL // NEW
});

// ---------- Splash + Logos ----------
(function(){
  const hideSplash = () => document.getElementById("splash")?.classList.add("hide");
  window.addEventListener("load", () => setTimeout(hideSplash, 1800));   // doubled
  document.addEventListener("DOMContentLoaded", () => {
    const h = document.getElementById("logoHeader");
    const s = document.getElementById("logoSplash");
    if (h) h.src = LOGO_HEADER_SRC;
    if (s) s.src = LOGO_SPLASH_SRC;
    setTimeout(hideSplash, 3000); // doubled fail-safe
  });
})();

// ---------- Theme ----------
const root=document.documentElement, themeBtn=document.getElementById('themeToggle');
const savedTheme = localStorage.getItem('barkday-theme') || 'dark';
root.setAttribute('data-theme', savedTheme==='light'?'light':'dark');
if (themeBtn) {
  themeBtn.textContent = savedTheme==='light' ? '🌙 Dark' : '☀️ Light';
  themeBtn.addEventListener('click', () => {
    const now = root.getAttribute('data-theme')==='light'?'dark':'light';
    root.setAttribute('data-theme', now);
    localStorage.setItem('barkday-theme', now);
    themeBtn.textContent = now==='light' ? '🌙 Dark' : '☀️ Light';
  });
}


// ---------- DOM Shortcuts ----------
const $ = id => document.getElementById(id);
const els = {
  dogName: $('dogName'), dob: $('dob'), adultWeight: $('adultWeight'), adultWeightVal: $('adultWeightVal'),
  chewer: $('chewer'), showEpi: $('showEpigenetic'), smooth: $('smoothMilestones'),
  breed: $('breed'), breedGroup: $('breedGroup'), breedExamples: $('breedExamples'),
  ignoreAge: $('ignoreAge'), ignoreSize: $('ignoreSize'), ignoreChewer: $('ignoreChewer'),
  resetBtn: $('resetBtn'), shareBtn: $('shareBtn'), sizeWarn: $('sizeWarn'),
  nextHeadline: $('nextHeadline'), nextBday: $('nextBday'), nextBdayDelta: $('nextBdayDelta'),
  dogAge: $('dogAge'), humanYears: $('humanYears'), slopeNote: $('slopeNote'),
  loadGifts: $('loadGifts'), giftMeta: $('giftMeta'), gifts: $('gifts'),
  heroLine: $('heroLine'), profileLine: $('profileLine'), breedNotes: $('breedNotes'), epi: $('epi')
};

// Gate Reset/Share before first calculation
document.addEventListener('DOMContentLoaded', () => {
  if (els.resetBtn){ els.resetBtn.disabled = true; els.resetBtn.setAttribute('aria-disabled','true'); }
  if (els.shareBtn){ els.shareBtn.disabled = true; els.shareBtn.setAttribute('aria-disabled','true'); }
}, { once:true });

// ---------- Hero line ----------
const poss = n => !n ? "your precious friend's" : (/\s*$/.test(n)&&/s$/i.test(n.trim())? n.trim()+"’" : n.trim()+"’s");
function renderHero(){ els.heroLine.textContent = `Let’s find out together what ${poss(els.dogName.value)} birthdays are, so we can celebrate every single one.`; }
els.dogName.addEventListener('input', renderHero); renderHero();

// ---------- Static group notes (UI hints under Results) ----------
const GROUP_META = {
  'Working / Herding': { desc:'High-drive problem solvers; thrive on jobs.', examples:['Border Collie','Australian Shepherd','German Shepherd','Belgian Malinois','Corgi'] },
  'Sporting': { desc:'Endurance & retrieving; water-confident.', examples:['Labrador','Golden Retriever','Vizsla','GSP','Setter'] },
  'Hound': { desc:'Scent/sight specialists; independent.', examples:['Beagle','Dachshund','Greyhound','Foxhound','Basset'] },
  'Terrier': { desc:'Tenacious hunters; love dig/chase.', examples:['JRT','Westie','Airedale','Border Terrier'] },
  'Toy': { desc:'Small frames; fragile joints.', examples:['Chihuahua','Pomeranian','Yorkie','Maltese','Papillon'] },
  'Non-Sporting': { desc:'Mixed roles; varied needs.', examples:['Bulldog','Dalmatian','Poodle (Std)','Boston Terrier'] },
  'Guardian': { desc:'Large/giant protectors.', examples:['Rottweiler','Mastiff','Great Dane','Anatolian','Kuvasz'] },
  'Companion': { desc:'Human-bonded routines.', examples:['Cavapoo','Cockapoo','Shih Tzu','Havanese'] },
  'Mixed / Other': { desc:'Profile by drive & size.', examples:['Mixed-breed','Rescue','Unknown'] }
};
const GROUPS = {
  'Working / Herding':['Daily jobs/puzzles (herding games, scentwork).','Mental as important as physical; enrichment.','Prevent under-stimulation → boredom.'],
  'Sporting':['Structured fetch/dock/field games.','Watch weight; measured meals.'],
  'Hound':['Scent walks on long line; recall with high-value rewards.'],
  'Terrier':['Dig boxes, flirt poles, controlled tug.'],
  'Toy':['Low-impact play; dental care; temperature care.'],
  'Non-Sporting':['Tailor enrichment to individual needs.'],
  'Guardian':['Impulse control & neutrality; joint support.'],
  'Companion':['Reinforce calm independence; routines.'],
  'Mixed / Other':['Profile by observed drive (retrieve, scent, herd).']
};

// --- Ensure the UI never holds a blank group name ---
// --- Group select helpers (handles name mismatches like "Sporting / Gun Dogs") ---
function normalizeKey(s){ return String(s||'').toLowerCase().replace(/[^a-z]/g,''); }

// Map an arbitrary group name to one of our GROUP_META/GROUPS keys,
// so tips and examples always show up.
function resolveGroupKey(name){
  const n = normalizeKey(name);
  for (const k of Object.keys(GROUP_META)){
    const nk = normalizeKey(k);
    if (n === nk || n.includes(nk) || nk.includes(n)) return k;
  }
  return 'Mixed / Other';
}

// ===== Round 2 helpers: toast + auto-scroll =====
function bdToast(msg, ms = 2200){
  const el = document.getElementById('bdToast');
  const msgEl = document.getElementById('bdToastMsg');
  if (!el || !msgEl) return;
  msgEl.textContent = msg || 'Results updated.';
  el.classList.add('show');
  // Close handlers
  const closer = el.querySelector('.bd-x');
  const off = () => el.classList.remove('show');
  closer?.addEventListener('click', off, { once:true });
  // Auto-dismiss
  clearTimeout(bdToast._t); bdToast._t = setTimeout(off, ms);
}

function scrollResultsIntoView(){
  // Prefer the “Next Birthday Plan” header; fall back to first KPI
  const anchor = document.getElementById('nextPlanHeading')
             || document.querySelector('.kpi')
             || document.querySelector('h2');
  if (!anchor) return;
  // Small timeout so layout is final (after DOM writes)
  setTimeout(()=> anchor.scrollIntoView({ behavior:'smooth', block:'start' }), 50);
}

// ===== Round 3: Saved Results (mobile-safe) =====
const BD_STORE_KEY = 'barkday.runs.v1';

/* Mobile-safe storage shim
   Chooses localStorage → sessionStorage → in-memory fallback.
   Shows a small badge so you know which backend you're on. */
const BarkdayStore = (function(){
  let memory = {}; // last resort (per tab)
  function testArea(area){
    if (!area) return false;
    const k = '__bd_test__' + Math.random();
    try { area.setItem(k, '1'); area.removeItem(k); return true; }
    catch { return false; }
  }
  const hasLocal   = testArea(window.localStorage);
  const hasSession = !hasLocal && testArea(window.sessionStorage);
  const area = hasLocal ? window.localStorage : (hasSession ? window.sessionStorage : null);
  const kind = hasLocal ? 'localStorage' : (hasSession ? 'sessionStorage' : 'memory');

  function get(key){
    try { return area ? area.getItem(key) : (memory[key] ?? null); }
    catch (e) { console.warn('[Barkday] storage.get failed', e); return null; }
  }
  function set(key, val){
    try {
      if (area) { area.setItem(key, val); }
      else { memory[key] = val; }
      return true;
    } catch (e) {
      console.warn('[Barkday] storage.set failed', e);
      return false;
    }
  }
  return { get, set, kind };
})();

// Storage helpers (use the shim above)
function bdStoreList(){
  try { const raw = BarkdayStore.get(BD_STORE_KEY); return raw ? JSON.parse(raw) : []; }
  catch { return []; }
}
function bdStoreSave(list){
  const ok = BarkdayStore.set(BD_STORE_KEY, JSON.stringify(list));
  if (!ok) bdToast('Could not save on this device (storage blocked).', 3500);
}

// Optional: show which backend we’re using (local/session/memory) — gated for dev
(function showStorageStatus(){
  try{
    if (!(location.hostname === 'localhost' || location.search.includes('debug=1'))) return;
    const el = document.createElement('div');
    el.id = 'bdStorageStatus';
    el.textContent = `Storage: ${BarkdayStore.kind}`;
    el.style.cssText = 'position:fixed;right:10px;bottom:10px;font:12px/1.2 system-ui;padding:6px 8px;border-radius:8px;background:#0009;color:#fff;z-index:9999';
    document.addEventListener('DOMContentLoaded', ()=> document.body.appendChild(el), { once:true });
  }catch{}
})();


// Optional: quick self-test button (injects a dummy saved run)
(function storageSelfTest(){
  try{
    const host = document.getElementById('selftestHost');
    if (!host) return;
    const btn = document.createElement('button');
    btn.className = 'ghost';
    btn.textContent = 'Storage Self-Test';
    btn.addEventListener('click', ()=>{
      const list = bdStoreList();
      list.unshift({
        ts: Date.now(),
        dog: 'Test Dog',
        dob: '2020-01-01',
        weight: 40,
        chewer: 'Normal',
        breed: 'Labrador Retriever',
        group: 'Sporting',
        smooth: true, epi: false,
        kpi: { nextHeadline:'Test', nextDate:new Date().toDateString(), nextDateISO:new Date().toISOString(), hy:'42.00', dogAge:'4y 0m' },
        event: { start:new Date().toISOString(), end:new Date(Date.now()+3600000).toISOString(), title:'Test', notes:'Test' }
      });
      bdStoreSave(list);
      bdToast('Dummy run saved. Open Saved ▾ to verify.');
    });
    host.appendChild(btn);
  }catch{}
})();

// Build the payload we store each time
function currentRunPayload(){
  const { start, end, title, notes } = getContext(); // existing helper
  return {
    ts: Date.now(),
    dog: (els.dogName.value||'').trim(),
    dob: els.dob.value || '',
    weight: parseInt(els.adultWeight.value,10)||55,
    chewer: els.chewer.value,
    breed: (els.breed.value||'').trim(),
    group: els.breedGroup.value,
    smooth: !!els.smooth.checked,
    epi: !!els.showEpi.checked,
    kpi: {
      nextHeadline: els.nextHeadline.textContent,
      nextDate: els.nextBday.textContent,
      nextDateISO: els.nextBday.dataset.iso || null,
      hy: els.humanYears.textContent,
      dogAge: els.dogAge.textContent
    },
    event: { start, end, title, notes }
  };
}

// Save handler (session-only toast is always shown when not on localStorage)
function bdSaveRun(){
  const list = bdStoreList();
  list.unshift(currentRunPayload());
  if (list.length > 50) list.length = 50;
  bdStoreSave(list);
  bdToast('Saved to this device');

  if (BarkdayStore?.kind && BarkdayStore.kind !== 'localStorage') {
    bdToast('Saved for this session only in this browser.', 3500);
  }

  if (document.getElementById('bdSaved')?.classList.contains('is-open')) {
    BarkdaySaved.render();
  }
}


function hydrateRun(run, doCompute=false){
  if (!run) return;
  els.dogName.value = run.dog || '';
  els.dob.value = run.dob || '';
  els.adultWeight.value = run.weight || 55;
  els.adultWeightVal.textContent = String(els.adultWeight.value);
  els.chewer.value = run.chewer || 'Normal';
  els.breed.value = run.breed || '';
  els.breedGroup.value = run.group || 'Working / Herding';
  els.smooth.checked = !!run.smooth;
  els.showEpi.checked = !!run.epi;
  renderHero(); updateBreedNotes();
  if (doCompute) compute();
}

// Drawer UI
const BarkdaySaved = (() => {
  const drawer = () => document.getElementById('bdSaved');
  const panel  = () => drawer()?.querySelector('.bd-panel');
  const bodyEl = () => document.getElementById('bdSavedBody');

  function open(){
    const d = drawer(); if (!d) return;
    render();
    d.classList.add('is-open'); document.body.classList.add('body-lock');
    // backdrop + buttons
    d.addEventListener('click', onBackdrop);
    document.addEventListener('keydown', onEsc);
    panel()?.focus();
  }
  function close(){
    const d = drawer(); if (!d) return;
    d.classList.remove('is-open'); document.body.classList.remove('body-lock');
    d.removeEventListener('click', onBackdrop);
    document.removeEventListener('keydown', onEsc);
  }
  function onBackdrop(e){ if (e.target?.dataset?.close === 'drawer') close(); }
  function onEsc(e){ if (e.key === 'Escape') close(); }

  function render(){
    const host = bodyEl(); if (!host) return;
    const items = bdStoreList();
    if (!items.length){
      host.innerHTML = `<div class="muted">No saved results yet. Run Calculate, then click “Save result”.</div>`;
      return;
    }
    host.innerHTML = items.map((r, i) => {
      const date = new Date(r.ts).toLocaleString();
      const dog  = r.dog || 'Your dog';
      const hy   = r.kpi?.hy || '—';
      const next = r.kpi?.nextDate || '—';
      const w    = r.weight ? `${r.weight} lb` : '';
      const grp  = r.group || '';
      return `
        <div class="bd-card" data-i="${i}">
          <h4>${dog}</h4>
          <div class="muted">${grp}${grp&&w?' · ':''}${w} · Saved ${date}</div>
          <div class="muted" style="margin-top:4px">Next: ${r.kpi?.nextHeadline || '—'} (${next}) · Human-years: ${hy}</div>
          <div class="bd-row">
            <button type="button" class="btn" data-act="load">Load</button>
            <button type="button" class="ghost" data-act="compute">Load & Compute</button>
            <button type="button" class="ghost" data-act="share">Copy Share Link</button>
            <button type="button" class="ghost" data-act="delete">Delete</button>
          </div>
        </div>
      `;
    }).join('');
  }

  function onListClick(e){
    const btn = e.target.closest('[data-act]'); if (!btn) return;
    const card = e.target.closest('.bd-card'); if (!card) return;
    const idx = parseInt(card.dataset.i,10);
    const items = bdStoreList();
    const run = items[idx];

    switch(btn.dataset.act){
      case 'load':
        hydrateRun(run, false);
        bdToast('Loaded inputs (not computed)');
        break;
      case 'compute':
        hydrateRun(run, true);
        bdToast('Loaded and computed');
        break;
      case 'share': {
        // Rebuild a share URL from inputs
        const p = new URLSearchParams({
          n: els.dogName.value || '',
          d: els.dob.value || '',
          w: els.adultWeight.value,
          c: els.chewer.value,
          g: els.breedGroup.value,
          r: els.breed.value || '',
          s: els.smooth.checked ? 1 : 0,
          e: els.showEpi.checked ? 1 : 0
        });
        const url = location.origin + location.pathname + '?' + p.toString();
        navigator.clipboard.writeText(url).then(()=>bdToast('Share link copied'));
        break;
      }
      case 'delete': {
        const next = items.filter((_,i)=>i!==idx);
        bdStoreSave(next);
        render();
        bdToast('Deleted');
        break;
      }
    }
  }

  // Footer controls
  function onFooterClick(e){
    const id = e.target.id;
    if (id === 'bdExport'){
      const data = JSON.stringify(bdStoreList(), null, 2);
      const blob = new Blob([data], {type:'application/json'});
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'barkday-saved.json';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(()=>URL.revokeObjectURL(a.href), 1000);
    } else if (id === 'bdClearAll'){
      if (confirm('Delete all saved results on this device?')){
        bdStoreSave([]); render(); bdToast('Cleared');
      }
    } else if (e.target.dataset?.close === 'drawer'){
      close();
    }
  }

  // Public API
  return { open, close, render, onListClick, onFooterClick };
})();


// Find and set the closest option in <select id="breedGroup">, without event loops.
function setGroupFromName(name){
  const sel = els.breedGroup;
  if (!sel) return 'Mixed / Other';
  if (!name) return sel.value || 'Mixed / Other';

  const lettersOnly = s => String(s||'').toLowerCase().replace(/[^a-z]/g,'');
  const tokenBag    = s => (String(s||'').toLowerCase().match(/[a-z]+/g)||[]).sort().join('');

  const CANON_TO_UI = {
    'herdingworkingdrive': 'Working / Herding',
    'workingherding':      'Working / Herding',
    'guardianprotection':  'Guardian',
    'sportinggundogs':     'Sporting',
    'scenthounds':         'Hound',
    'sighthounds':         'Hound',
    'terriers':            'Terrier',
    'toycompaniondogs':    'Toy',
    'nordicspitztypes':    'Non-Sporting',
    'bulldogmolossertypes':'Non-Sporting'
  };

  const rawNorm   = lettersOnly(name);
  const uiLabel   = CANON_TO_UI[rawNorm] || name;
  const targetBag = tokenBag(uiLabel);
  const targetLex = lettersOnly(uiLabel);

  const setIfChanged = (val) => {
    if (sel.value !== val) {
      sel.value = val;
      sel.dispatchEvent(new Event('change'));
      console.debug('[Barkday] breedGroup set →', val, '(from', name, ')');
    }
    return sel.value;
  };

  for (const opt of sel.options){
    if (lettersOnly(opt.value) === targetLex) return setIfChanged(opt.value);
  }
  for (const opt of sel.options){
    if (lettersOnly(opt.textContent) === targetLex) return setIfChanged(opt.value);
  }
  for (const opt of sel.options){
    if (tokenBag(opt.textContent) === targetBag || tokenBag(opt.value) === targetBag) {
      return setIfChanged(opt.value);
    }
  }
  for (const opt of sel.options){
    const ov = lettersOnly(opt.value), ot = lettersOnly(opt.textContent);
    if (ov.includes(targetLex) || ot.includes(targetLex) || targetLex.includes(ov) || targetLex.includes(ot)) {
      return setIfChanged(opt.value);
    }
  }
  return sel.value || 'Mixed / Other';
}

// --- Replace the original applyGroupSafe with this shim that uses the helpers above ---
function applyGroupSafe(name){
  const chosen = setGroupFromName(name);
  return chosen || 'Mixed / Other';
}

// ---------- External data (breed groups + recos + aliases) ----------
let BREED_GROUPS = [];       // array with id/name/examples/etc.
let RECO_BANDED = null;      // banded recommendations by group
let RECO_BREED  = null;      // per-breed, per-dog-year overrides
let BREED_NAME_MAP = {};     // lowercased alias → canonical breed name (from reco-breed keys)
let BREED_ALIASES = {};      // canonical → [aliases] (from external JSON)
let BREED_TAXONOMY = null;  // canonical breed → { akc_group: string, clusters: string[] }

// Loaders
async function loadBreedGroups(){
  try{
    const res = await fetch(BREED_GROUPS_URL, { cache: 'no-store' });
    BREED_GROUPS = await res.json();
    console.debug('[Barkday] breed_groups loaded:', Array.isArray(BREED_GROUPS)? BREED_GROUPS.length : 0);
  }catch(e){ BREED_GROUPS = []; console.warn('[Barkday] breed_groups load failed', e); }
}
function normalizeBreedReco(raw){
  if (!raw) return {};
  return raw.breeds ? raw.breeds : raw; // accept {breeds:{...}} or direct map
}
function rebuildBreedIndex(){
  BREED_NAME_MAP = {};
  if (!RECO_BREED) return;
  for (const k of Object.keys(RECO_BREED)) BREED_NAME_MAP[k.toLowerCase()] = k;
  const add = (alias, canon) => { if (RECO_BREED[canon]) BREED_NAME_MAP[alias.toLowerCase()] = canon; };
  add("aussie", "Australian Shepherd");
  add("lab", "Labrador Retriever");
  add("frenchie", "French Bulldog");
}
async function loadReco(){
  try {
    const [bandedRes, breedRes] = await Promise.allSettled([
      fetch(RECO_BANDED_URL, { cache: 'no-store' }),
      fetch(RECO_BREED_URL,   { cache: 'no-store' })
    ]);

    const safeJson = async (label, resSettle) => {
      if (resSettle.status !== 'fulfilled') {
        throw new Error(`${label}: fetch failed: ${resSettle.reason}`);
      }
      const res = resSettle.value;
      if (!res.ok) {
        const body = await res.text().catch(()=>'(no body)');
        throw new Error(`${label}: HTTP ${res.status} ${res.statusText} — ${body.slice(0,200)}`);
      }
      const text = await res.text();
      try {
        return JSON.parse(text);
      } catch (e) {
        let extra = '';
        const m = String(e.message).match(/position (\d+)/i);
        if (m) {
          const pos = Number(m[1]);
          const from = Math.max(0, pos - 160);
          const to = Math.min(text.length, pos + 160);
          extra = `\nContext[${from}..${to}]:\n${text.slice(from, to)}`;
        }
        throw new Error(`${label}: JSON parse error: ${e.message}${extra}`);
      }
    };

    if (bandedRes.status === 'fulfilled') {
      RECO_BANDED = await safeJson('reco-banded', bandedRes);
    }
    if (breedRes.status === 'fulfilled') {
      const raw = await safeJson('reco-breed', breedRes);
      RECO_BREED = normalizeBreedReco(raw);
    }

    if (!RECO_BANDED) RECO_BANDED = {};
    if (!RECO_BREED)  RECO_BREED  = null;

    rebuildBreedIndex();
    console.debug('[Barkday] reco files loaded:', { banded: !!RECO_BANDED, breed: !!RECO_BREED });
  } catch (e) {
    RECO_BANDED = RECO_BANDED || {};
    RECO_BREED  = RECO_BREED  || null;
    rebuildBreedIndex();
    console.warn('[Barkday] reco load failed', e);
  }
}

// NEW: alias loader + normalizer
async function loadAliases(){
  try{
    const res = await fetch(BREED_ALIASES_URL, { cache: 'no-store' });
    BREED_ALIASES = await res.json();
    console.debug('[Barkday] aliases loaded:', Object.keys(BREED_ALIASES).length, 'canonical entries');
  }catch(e){
    console.warn('[Barkday] aliases failed to load; continuing without aliases', e);
    BREED_ALIASES = {};
  }
}

async function loadTaxonomy(){
  try{
    const res = await fetch(TAXONOMY_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    BREED_TAXONOMY = await res.json();
    const n = BREED_TAXONOMY ? Object.keys(BREED_TAXONOMY).length - (BREED_TAXONOMY._meta ? 1 : 0) : 0;
    console.debug('[Barkday] taxonomy loaded:', n, 'breeds mapped');
  }catch(e){
    BREED_TAXONOMY = null;
    console.warn('[Barkday] taxonomy load failed; continuing without overlays', e);
  }
}

/**
 * Normalize user-typed breed to a canonical display name if possible.
 */
function normalizeBreed(input){
  if (!input) return null;
  const q = String(input).trim().toLowerCase();

  for (const canon of Object.keys(BREED_ALIASES)){
    if (canon.toLowerCase() === q) return canon;
  }
  for (const [canon, aliases] of Object.entries(BREED_ALIASES)){
    if (Array.isArray(aliases) && aliases.some(a => String(a).trim().toLowerCase() === q)) {
      return canon;
    }
  }
  return null;
}

// Kick off data loads
loadBreedGroups();
loadReco();
loadAliases();
loadTaxonomy();

// Map typed breed → BREED_GROUPS entry.
function findGroupByBreedName(name){
  if (!name || !BREED_GROUPS.length) return null;
  const canonical = normalizeBreed(name);
  if (!canonical) return null;
  const canonicalLC = canonical.trim().toLowerCase();

  for (const g of BREED_GROUPS){
    const ex = Array.isArray(g.examples) ? g.examples : [];
    for (const e of ex){
      const eCanon = normalizeBreed(e) || String(e);
      if (String(eCanon).trim().toLowerCase() === canonicalLC) {
        return g;
      }
    }
  }
  return null;
}

// Fuzzy breed lookup from RECO_BREED (unchanged)
function getBreedEntry(input){
  if (!input || !RECO_BREED) return null;
  const canon = normalizeBreed(input);
  if (!canon) return null;
  return RECO_BREED[canon] || null;
}

// ---------- Breed notes + examples under selectors ----------
function updateBreedNotes(){
  const name = els.dogName.value || 'your dog';
  const breedTxtRaw = (els.breed.value || '').trim();
  const breedTxt = normalizeBreed(breedTxtRaw) || breedTxtRaw;
  const lb = parseInt(els.adultWeight.value, 10) || 55;

  const mapped = findGroupByBreedName(breedTxt);

  if (mapped) {
    els.breedExamples.textContent =
      `${mapped.name}: examples — ${(mapped.examples || []).join(', ')}`;
    setGroupFromName(mapped.name);
  } else {
    const gSel = els.breedGroup?.value || 'Mixed / Other';
    const meta = GROUP_META[resolveGroupKey(gSel)];
    els.breedExamples.textContent =
      meta ? `${meta.desc} Examples: ${meta.examples.join(', ')}` : '';
  }

  const gname = setGroupFromName(els.breedGroup?.value);
  const gkey  = resolveGroupKey(gname);

  els.profileLine.textContent =
    `Profile: ${name}${breedTxt ? ' — ' + breedTxt : ''} • Group: ${gname} • Weight: ${lb} lb`;

  els.breedNotes.innerHTML =
    (GROUPS[gkey] || []).map(n => `• ${n}`).join(' ');
}
// <— end updateBreedNotes()

// Debounce helper for updateBreedNotes
const debounce = (fn, ms = 120) => {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
};
const debouncedUpdate = debounce(updateBreedNotes, 120);


['input','change'].forEach(ev=>{
  els.breed.addEventListener(ev, debouncedUpdate);
  els.breedGroup.addEventListener(ev, debouncedUpdate);
  els.dogName.addEventListener(ev, debouncedUpdate);
  els.adultWeight.addEventListener(ev, debouncedUpdate);
  });
updateBreedNotes(); // initial render stays immediate

// ---------- Slider label (5-lb steps) ----------
els.adultWeight.addEventListener('input', ()=>{
  const v=Math.round(parseInt(els.adultWeight.value,10)/5)*5;
  els.adultWeight.value=v; els.adultWeightVal.textContent=v;
});

// ---------- Local date helpers (fixes “day-of” Barkday logic) ----------
const norm = d => new Date(d.getFullYear(), d.getMonth(), d.getDate()); // local midnight
const isLeap = y => (y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0));
const safeBday = (y, m, d) => {
  // Feb 29 → use Feb 29 in leap years, Feb 28 otherwise
  if (m === 1 && d === 29 && !isLeap(y)) return new Date(y, 1, 28);
  return new Date(y, m, d);
};

// Returns calendar-based birthday info using LOCAL dates only
function getBarkdayInfo(dob /* Date */) {
  const today = norm(new Date());
  const birth = norm(dob);

  const bMonth = birth.getMonth();
  const bDate  = birth.getDate();

  const thisYear = today.getFullYear();
  const thisYearBday = norm(safeBday(thisYear, bMonth, bDate));
  const isToday = today.getTime() === thisYearBday.getTime();

  // Next Barkday date (calendar birthday, not the “dog-year” curve)
  let nextBarkday;
  if (isToday) {
    nextBarkday = norm(safeBday(thisYear + 1, bMonth, bDate));
  } else if (today < thisYearBday) {
    nextBarkday = thisYearBday;
  } else {
    nextBarkday = norm(safeBday(thisYear + 1, bMonth, bDate));
  }

  // Age in whole years as humans speak it, holding all day on the birthday
  let ageYears = thisYear - birth.getFullYear();
  if (!isToday && today < thisYearBday) ageYears -= 1;

  return { today, birth, thisYearBday, nextBarkday, isToday, ageYears };
}

// ---------- Math utils ----------
const clamp=(n,min,max)=>Math.min(Math.max(n,min),max);
const daysBetween=(a,b)=>Math.floor((b-a)/(24*60*60*1000));

// Validation feedback (classic pop-up alerts)
function showInline(msg, kind='warn'){
  alert(msg);
  console.warn('[Barkday]', msg);
}
function clearInline(){}

// Weight → slope (5→~7.2)
function slopeFromWeight(lb){
  const w=clamp(lb,5,200);
  if(w<=20) return 5;
  if(w<=50) return 5+(w-20)*(1/30);
  if(w<=90) return 6+(w-50)*(1/40);
  return 7+(w-90)*(0.2/110);
}
function smoothBlend(x,c,w){ const t=clamp((x-(c-w/2))/w,0,1); return t*t*(3-2*t); }
function humanEqYears(tY, lb, smooth){
  const R=slopeFromWeight(lb);
  if(!smooth){ if(tY<=1) return 15*tY; if(tY<=2) return 15+9*(tY-1); return 24+R*(tY-2); }
  const f1=smoothBlend(tY,1,.25), slope12=15+f1*(9-15);
  if(tY<=2){ const a=Math.min(tY,1)*15; const b=tY>1?(tY-1)*slope12:0; return a+b; }
  const f2=smoothBlend(tY,2,.5), post=9+f2*(R-9), upto2=humanEqYears(2,lb,true);
  return upto2+(tY-2)*post;
}
function nextDogYearDate(dob, H, lb, smooth){
  if (!(dob instanceof Date) || isNaN(dob)) return new Date();
  if (!isFinite(H)) return new Date(dob.getTime() + 365.2425*24*60*60*1000);
  const target=Math.floor(H)+1, now=new Date();
  const yearsNow=daysBetween(dob, now)/365.2425;
  let lo=yearsNow, hi=yearsNow+5;
  for(let i=0;i<40;i++){ const mid=(lo+hi)/2; const h=humanEqYears(mid,lb,smooth); if(h>=target) hi=mid; else lo=mid; }
  const t=(lo+hi)/2; return new Date(dob.getTime()+t*365.2425*24*60*60*1000);
}

// ---------- Confetti ----------
function confetti(ms){
  const isMobile = window.matchMedia('(pointer: coarse)').matches || innerWidth < 768;
  ms = ms ?? (isMobile ? 8500 : 3400);

  const c = document.createElement('canvas');
  c.style.position = 'fixed'; c.style.inset = '0'; c.style.pointerEvents = 'none';
  c.width = innerWidth; c.height = innerHeight; document.body.appendChild(c);
  const ctx = c.getContext('2d');
  const colors = ['#4aa3ff','#6ae3b2','#ffd166','#ff6b6b','#a78bfa'];
  const N = 180;
  const parts = Array.from({ length: N }, () => ({
    x: Math.random() * c.width,
    y: -20 - Math.random() * 60,
    vx: (Math.random() - 0.5) * 4,
    vy: 2 + Math.random() * 3,
    g: 0.05 + Math.random() * 0.06,
    s: 4 + Math.random() * 5,
    c: colors[(Math.random() * colors.length) | 0],
    r: Math.random() * Math.PI
  }));

  let st=0;
  (function tick(ts){
    if (!st) st = ts;
    const t = ts - st;
    ctx.clearRect(0, 0, c.width, c.height);
    for (const p of parts){
      p.x += p.vx; p.y += p.vy; p.vy += p.g; p.r += 0.06;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
      ctx.fillStyle = p.c; ctx.fillRect(-p.s/2, -p.s/2, p.s, p.s);
      ctx.restore();
    }
    if (t < ms) requestAnimationFrame(tick); else c.remove();
  })(0);
}


// ---------- Age bands (fallback by group) ----------
const AGE_BANDS = [
  { key:'puppy_1_6',min:1,max:6,label:'Puppy I (1–6 dog-years)' },
  { key:'puppy_7_10',min:7,max:10,label:'Puppy II (7–10 dog-years)' },
  { key:'puppy_11_15',min:11,max:15,label:'Puppy III (11–15 dog-years)' },
  { key:'young_16_24',min:16,max:24,label:'Young (16–24 dog-years)' },
  { key:'adult_25_60',min:25,max:60,label:'Adult (25–60 dog-years)' },
  { key:'senior_61p',min:61,max:999,label:'Senior (61+ dog-years)' }
];
const bandForDY = dy => AGE_BANDS.find(b=>dy>=b.min && dy<=b.max) || AGE_BANDS[AGE_BANDS.length-1];

// ---------- Nearest dog-year lookup ----------
function nearestAgeEntry(agesObj, dogYears){
  if (!agesObj) return null;
  const want = Math.round(dogYears);
  const keys = Object.keys(agesObj).map(k=>parseInt(k,10)).filter(n=>!isNaN(n)).sort((a,b)=>a-b);
  if (!keys.length) return null;
  if (agesObj[String(want)]) return agesObj[String(want)];
  const le = keys.filter(k=>k<=want);
  if (le.length) return agesObj[String(le[le.length-1])];
  let best = keys[0], bd = Math.abs(keys[0]-want);
  for (const k of keys){ const d=Math.abs(k-want); if (d<bd){ bd=d; best=k; } }
  return agesObj[String(best)];
}

// ---------- Plan selection (breed-first → banded → none) ----------
function planFor(group, dogYears){
  const band = bandForDY(Math.round(dogYears));
  const gkey = resolveGroupKey(group);

  const breedInput = (els.breed.value || '').trim();
  const breedEntry = getBreedEntry(breedInput);
  if (breedEntry && breedEntry.ages){
    const entry = nearestAgeEntry(breedEntry.ages, dogYears);
    if (entry && entry.lanes) {
      console.debug('[Barkday] plan source: BREED override', {breed: normalizeBreed(breedInput)||breedInput, age: Math.round(dogYears)});
      return { plan: entry, band };
    }
  }

  const byGroup = (RECO_BANDED && RECO_BANDED[gkey]) ? RECO_BANDED[gkey][band.key] : null;
  if (byGroup){
    console.debug('[Barkday] plan source: GROUP banded fallback', {group: gkey, band: band.key});
    return { plan: byGroup, band };
  }

  console.warn('[Barkday] plan source: NONE', {group, dogYears});
  return { plan: null, band };
}

// ---------- Taxonomy merge helpers (ADD BELOW planFor) ----------

function ensureLanes(plan){
  plan.lanes = plan.lanes || {};
  for (const k of ['training','health','nutrition','exercise','bonding','gear']){
    if (!Array.isArray(plan.lanes[k])) plan.lanes[k] = [];
  }
  return plan;
}
function mergeFillLanes(targetPlan, overlayPlan){
  if (!overlayPlan) return targetPlan;
  ensureLanes(targetPlan); ensureLanes(overlayPlan);
  for (const k of Object.keys(overlayPlan.lanes)){
    if (!targetPlan.lanes[k] || targetPlan.lanes[k].length === 0){
      targetPlan.lanes[k] = overlayPlan.lanes[k].slice(0);
    }
  }
  return targetPlan;
}
function pushUnique(laneArr, text){
  if (!text) return;
  const key = String(text).trim().toLowerCase();
  if (!key) return;
  if (!laneArr.some(x => String(x).trim().toLowerCase() === key)){
    laneArr.push(text);
  }
}
function applyClusterOverlays(targetPlan, clusterIds, maxAdds = 3){
  if (!Array.isArray(clusterIds) || !clusterIds.length || !Array.isArray(BREED_GROUPS)) return targetPlan;
  ensureLanes(targetPlan);

  let added = 0;
  for (const cid of clusterIds){
    if (added >= maxAdds) break;
    const cluster = BREED_GROUPS.find(g => g.id === cid);
    if (!cluster) continue;

    const enrich = Array.isArray(cluster.enrichment) ? cluster.enrichment[0] : null;
    const caution = Array.isArray(cluster.cautions) ? cluster.cautions[0] : null;
    const tip = Array.isArray(cluster.owner_tips) ? cluster.owner_tips[0] : null;

    const before = added;
    if (enrich)  { pushUnique(targetPlan.lanes.training,  enrich);  added++; }
    if (caution) { pushUnique(targetPlan.lanes.health,    caution); added++; }
    if (tip)     { pushUnique(targetPlan.lanes.bonding,   tip);     added++; }

    if (added - before > 0 && added >= maxAdds) break;
  }
  return targetPlan;
}
function getEnrichedPlan(group, upcomingDY){
  const { plan, band } = planFor(group, upcomingDY);
  if (!plan) return { plan:null, band };

  const merged = { ...plan, lanes: { ...(plan.lanes || {}) } };
  ensureLanes(merged);

  const gkey = resolveGroupKey(group);
  const groupPlan = (RECO_BANDED && RECO_BANDED[gkey]) ? RECO_BANDED[gkey][band.key] : null;
  mergeFillLanes(merged, groupPlan);

  const breedCanon = normalizeBreed((els.breed.value || '').trim());
  const tax = breedCanon && BREED_TAXONOMY ? BREED_TAXONOMY[breedCanon] : null;
  const clusters = Array.isArray(tax?.clusters) ? tax.clusters : [];
  applyClusterOverlays(merged, clusters, 3);

  return { plan: merged, band };
}

function renderPlan(group, upcomingDY){
  const box = $('nextPlan'); box.innerHTML = '';
  const gkey = resolveGroupKey(group);
  const { plan, band } = getEnrichedPlan(gkey, upcomingDY);
  const head = $('nextPlanHeading');
  head.textContent = `Next Birthday Plan — ${band ? band.label : ('turning ' + upcomingDY)}`;
  if(!plan){ box.innerHTML='<div class="muted">Recommendations coming soon.</div>'; return; }
  const order=[['training','Training & Enrichment'],['health','Health & Wellness'],['nutrition','Diet & Nutrition'],['exercise','Exercise Needs'],['bonding','Play & Bonding Ideas'],['gear','Helpful Gear (optional)']];

  const lanes = plan.lanes || {};
  for(const key of ['training','health','nutrition','exercise','bonding','gear']){
    if(!Array.isArray(lanes[key])) lanes[key] = [];
  }

  for(const [k,label] of order){
    const items=lanes[k]||[]; if(!items.length) continue;
    const d=document.createElement('div'); d.className='lane'; d.innerHTML=`<h4>${label}</h4>`; const ul=document.createElement('ul');
    items.forEach(t=>{ const li=document.createElement('li'); li.textContent=t; ul.appendChild(li); }); d.appendChild(ul); box.appendChild(d);
  }
}

// ---------- Serialize plan ----------
function planNotesText(group, upcomingDY){
  const {plan, band} = getEnrichedPlan(group, upcomingDY);
  const header = `Next Birthday Plan — ${band ? band.label : ('turning ' + upcomingDY)}`;
  if (!plan || !plan.lanes) return header;

  const order = [
    ['training','Training & Enrichment'],
    ['health','Health & Wellness'],
    ['nutrition','Diet & Nutrition'],
    ['exercise','Exercise Needs'],
    ['bonding','Play & Bonding Ideas'],
    ['gear','Helpful Gear (optional)']
  ];

  const parts = [header, ''];
  for (const [k,label] of order){
    const items = Array.isArray(plan.lanes[k]) ? plan.lanes[k] : [];
    if (!items.length) continue;
    parts.push(label);
    for (const t of items){ parts.push(t); }
    parts.push('');
  }

  const breedCanon = normalizeBreed((els.breed.value || '').trim());
  const tax = breedCanon && BREED_TAXONOMY ? BREED_TAXONOMY[breedCanon] : null;
  if (tax && Array.isArray(tax.clusters) && tax.clusters.length){
    parts.push('— Includes behavioral insights and group-standard fills.');
  }

  return parts.join('\n');
}

/* =========================
   Affiliate link builders + disclosure
   ========================= */
function buildAmazonLink(asinOrUrl, tag = AMAZON_TAG) {
  try {
    const isUrl = /^https?:\/\//i.test(asinOrUrl);
    const url = new URL(isUrl ? asinOrUrl : `https://www.amazon.com/dp/${encodeURIComponent(asinOrUrl)}`);
    if (tag) url.searchParams.set("tag", tag);
    return url.toString();
  } catch (e) {
    console.warn("[AmazonLink] bad input:", asinOrUrl, e);
    return "#";
  }
}
function buildChewyLinkOrFallback(chewyProductUrl) {
  try {
    if (!CHEWY_ENABLED) return chewyProductUrl;
    const url = new URL(CHEWY_IMPACT_BASE);
    url.searchParams.set("u", chewyProductUrl);
    return url.toString();
  } catch (e) {
    console.warn("[ChewyLink] bad input:", chewyProductUrl, e);
    return chewyProductUrl || "#";
  }
}
function hrefForGiftItem(it) {
  const src = String(it.url || "").trim();
  if (/amazon\./i.test(src)) return buildAmazonLink(src);
  if (/chewy\./i.test(src))  return buildChewyLinkOrFallback(src);
  return src || "#";
}
function decorateAffiliateAnchor(aEl) {
  if (!aEl) return;
  aEl.target = "_blank";
  aEl.rel = "nofollow sponsored noopener noreferrer";
}

// --- FTC / program disclosure ---
function getAffiliateDisclosureHTML() {
  const amazonPart = "As an Amazon Associate I may earn from qualifying purchases";
  const chewyPart  = "and as a Chewy Affiliate I may earn a commission from qualifying purchases";
  const both = CHEWY_ENABLED ? `${amazonPart} ${chewyPart}` : amazonPart;

  return `
    <div id="affiliate-disclosure" role="note" aria-label="Affiliate Disclosure" style="
      margin-top:20px;padding:12px 14px;border-top:1px solid #e0e0e0;
      font-size:.92rem;line-height:1.4;color:#4b5563;">
      <strong>Disclosure:</strong> Some of the links above are affiliate links.
      ${both}, at no additional cost to you. This helps support the site.
      Thank you for your support.
    </div>
  `;
}
function insertDisclosureUnder(containerEl) {
  if (!containerEl || document.getElementById("affiliate-disclosure")) return;
  const wrap = document.createElement("div");
  wrap.innerHTML = getAffiliateDisclosureHTML().trim();
  containerEl.appendChild(wrap.firstElementChild);
}

// ---------- Gifts ----------
async function loadGifts(){
  els.gifts.innerHTML=''; els.giftMeta.textContent='Loading…';
  try{
    const res = await fetch(GIFT_FEED_URL,{cache:'no-store'}); const items = await res.json();
    const lb = parseInt(els.adultWeight.value,10);
    const bucket = lb<20 ? 'toy'
             : lb<30 ? 'small'
             : lb<50 ? 'medium'
             : lb<90 ? 'large'
             : 'giant';

    const dyParsed = parseFloat(els.humanYears.textContent);
    const dogYears = Number.isFinite(dyParsed) ? dyParsed : NaN;
    const chewer = (els.chewer.value||'').toLowerCase();

    const results = [];
    for(const it of items){
      let ok = true, score = 0;

      // size
      const sizes = (Array.isArray(it.sizes)? it.sizes : (it.size? String(it.size).split(/[, \t]+/):[])).map(s=>String(s).toLowerCase());
      const sizeOK = !sizes.length || sizes.includes('any') || sizes.includes(bucket);
      if(!els.ignoreSize.checked && !sizeOK) ok=false; else if(sizeOK) score++;

      // chewer
      const chewTag = (it.chewer? String(it.chewer).toLowerCase() : 'any');
      const chewOK = chewTag==='any' || chewTag===chewer;
      if(!els.ignoreChewer.checked && !chewOK) ok=false; else if(chewOK) score++;

      // age (dog-years)
      const minDY = it.minDogYears ?? null, maxDY = it.maxDogYears ?? null;
      let ageOK = true;
      if (Number.isFinite(dogYears) && !els.ignoreAge.checked){
        if(minDY!=null) ageOK = ageOK && dogYears >= Number(minDY);
        if(maxDY!=null) ageOK = ageOK && dogYears <= Number(maxDY);
        if(minDY==null && maxDY==null && it.tag){
          const t=String(it.tag).toLowerCase();
          if(t.includes('puppy')) ageOK = dogYears<=15;
          else if(t.includes('senior')) ageOK = dogYears>=61;
        }
      }
      if(!els.ignoreAge.checked && !ageOK) ok=false; else if(ageOK) score++;

      if(ok) results.push({it, score, rnd:Math.random()});
    }

    results.sort((a,b)=> (b.score-a.score) || (a.rnd-b.rnd));
    const seen = new Set();
    const top = [];
    for(const r of results){
      const key = r.it.id || r.it.url || r.it.title;
      if(!key || seen.has(key)) continue;
      seen.add(key); top.push(r.it);
      if(top.length>=12) break;
    }

    const parts=[]; parts.push(`size=${bucket}`); parts.push(`chewer=${chewer||'normal'}`); if (Number.isFinite(dogYears)) parts.push(`age≈${dogYears.toFixed(2)} DY`);
    const ignored=[]; if(els.ignoreSize.checked) ignored.push('size'); if(els.ignoreChewer.checked) ignored.push('chewer'); if(els.ignoreAge.checked) ignored.push('age');
    els.giftMeta.textContent = `Showing ${top.length} picks • ${parts.join(' • ')}${ignored.length? ' • ignored: '+ignored.join(', '):''}`;

    els.gifts.innerHTML = '';
    for (const it of top) {
      const href = hrefForGiftItem(it);
      const card = document.createElement('div');
      card.className = 'gift';

      const title = document.createElement('h4');
      title.textContent = it.title || 'Gift';
      card.appendChild(title);

      const meta = document.createElement('div');
      meta.className = 'muted';
      meta.textContent = (it.tag||it.ageTag||'').toString();
      card.appendChild(meta);

      const linkWrap = document.createElement('div');
      linkWrap.style.marginTop = '8px';

      const a = document.createElement('a');
      a.className = 'link';
      a.href = href;
      a.textContent = 'View';
      decorateAffiliateAnchor(a);
      linkWrap.appendChild(a);

      card.appendChild(linkWrap);
      els.gifts.appendChild(card);
    }

    insertDisclosureUnder(els.gifts);

  }catch(e){
    els.giftMeta.textContent='Could not load gift ideas.';
    console.warn('[Barkday] gifts load error', e);
  }
}
els.loadGifts?.addEventListener('click', loadGifts);

// Saved drawer event delegation
document.addEventListener('click', (e)=>{
  const inList = e.target.closest?.('#bdSavedBody [data-act]');
  const inFoot = e.target.closest?.('#bdSaved footer');
  if (inList) BarkdaySaved?.onListClick(e);
  if (inFoot) BarkdaySaved?.onFooterClick(e);
});


// ---------- ✅ GLOBAL Results Modal helper (fixed) ----------
window.BarkdayResultsModal = window.BarkdayResultsModal || (() => {
  let lastFocus = null;
  const focusableSel = 'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])';

  function q() {
    const modal  = document.getElementById('resultsModal');
    const dialog = modal?.querySelector('.bd-dialog');
    const bodyEl = modal?.querySelector('#resultsModalBody');
    return { modal, dialog, bodyEl };
  }

  function open(html) {
    const { modal, dialog, bodyEl } = q();
    if (!modal || !dialog || !bodyEl) {
      console.warn('[Barkday] Modal elements not found in DOM.');
      return;
    }
    lastFocus = document.activeElement;
    bodyEl.innerHTML = html || '<p>No results.</p>';
    modal.classList.add('is-open');
    document.body.classList.add('body-lock');
    (dialog.querySelector(focusableSel) || dialog).focus();
    modal.addEventListener('click', onBackdrop);
    document.addEventListener('keydown', onKey);
    dialog.addEventListener('keydown', trap);
  }
  function close() {
    const { modal, dialog } = q();
    if (!modal || !dialog) return;
    modal.classList.remove('is-open');
    document.body.classList.remove('body-lock');
    modal.removeEventListener('click', onBackdrop);
    document.removeEventListener('keydown', onKey);
    dialog.removeEventListener('keydown', trap);
    if (lastFocus?.focus) lastFocus.focus();
  }
  function onBackdrop(e){ if (e.target?.dataset?.close === 'true') close(); }
  function onKey(e){ if (e.key === 'Escape') close(); }
  function trap(e){
    const { dialog } = q();
    if (!dialog || e.key !== 'Tab') return;
    const f = dialog.querySelectorAll(focusableSel); if (!f.length) return;
    const first=f[0], last=f[f.length-1];
    if (e.shiftKey && document.activeElement===first){ e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement===last){ e.preventDefault(); first.focus(); }
  }
  return {
    show(html){ open(html); },
    showFromElement(sel){
      const el = document.querySelector(sel);
      open(el ? el.innerHTML : '');
    },
    close
  };
})();

// ---------- Compute ----------
function compute(){
  clearInline();

  const dobStr = els.dob.value;
  if (!dobStr) {
    alert('Please select a birthdate.');
    return;
  }

  const dob = new Date(dobStr);
  const now = new Date();
  if (isNaN(dob) || dob > now) {
    alert('Birthdate is invalid.');
    return;
  }

  const lb = parseInt(els.adultWeight.value, 10);

  // --- Chronological age (pin to LOCAL midnights so birthdays hold all day)
  const days  = daysBetween(norm(dob), norm(now));
  const years = days / 365.2425;
  const yrs   = Math.floor(years);
  const months= Math.floor((years % 1) * 12);
  els.dogAge.textContent = `${yrs}y ${months}m`;

  // --- Dog-years (your existing model)
  const H = humanEqYears(years, lb, els.smooth.checked);
  els.humanYears.textContent = H.toFixed(2);
  const R = slopeFromWeight(lb);
  els.slopeNote.textContent = `R≈${R.toFixed(2)} (weight-continuous)`;

  // --- Next Barkday (calendar birthday, full-day “today” handling)
  const rawName = els.dogName.value || 'your dog';
  const name = rawName.trim() || 'your dog';

  const info = getBarkdayInfo(dob); // uses norm/safeBday helpers

  // Headline
  if (info.isToday) {
    // Example: “🎉 It’s Barkday today!” (and show the actual age reached)
    els.nextHeadline.textContent = `🎉 It’s Barkday today!`;
  } else {
    // Example: “finn is about to be 5 years old!”
    els.nextHeadline.textContent = `${name} is about to be ${info.ageYears + 1} years old!`;
  }

  // Date line (show the next calendar Barkday)
  els.nextBday.textContent = info.nextBarkday.toDateString();

  // ISO (for reminders/saves) — set to 09:00 local to avoid UTC date flips
  const isoStart = new Date(
    info.nextBarkday.getFullYear(),
    info.nextBarkday.getMonth(),
    info.nextBarkday.getDate(),
    9, 0, 0
  ).toISOString();
  els.nextBday.dataset.iso = isoStart;

  // Days-until label
  const dTo = daysBetween(norm(now), info.nextBarkday);
  els.nextBdayDelta.textContent = info.isToday ? '' : `${dTo} days from now`;
}
  
  // Profile/notes
  const breedTxtRaw = (els.breed.value||'').trim();
  const breedCanon  = normalizeBreed(breedTxtRaw) || breedTxtRaw;
  const mapped      = findGroupByBreedName(breedCanon);
  if (mapped) applyGroupSafe(mapped.name);

  const gname = setGroupFromName(els.breedGroup?.value);
  const gkey  = resolveGroupKey(gname);

  els.profileLine.textContent =
    `Profile: ${name}${breedCanon ? ' — ' + breedCanon : ''} • Group: ${gname} • Weight: ${lb} lb`;

  els.breedNotes.innerHTML =
    (GROUPS[gkey]||[]).map(n=>`• ${n}`).join(' ');

  // Weight/group hint
  let warn='';
  if(els.breedGroup.value.includes('Toy') && lb>30) warn='Breed group "Toy" but weight > 30 lb. Math stays weight-based.';
  if((els.breedGroup.value.includes('Guardian')||els.breedGroup.value.includes('Working')) && lb<20) warn='Breed group suggests large/giant, but weight < 20 lb. Math stays weight-based.';
  els.sizeWarn.style.display = warn? 'block':'none'; els.sizeWarn.textContent = warn;

  // Celebrate & plan
  confetti(); renderPlan(els.breedGroup.value, upcoming);

  // Epigenetic note (optional)
  els.epi.textContent = els.showEpi.checked ? 'Science curve: UCSD DNA-methylation (≥ 1 yr). Note: visualization context; math remains weight-based.' : '';

  // Enable gated buttons now that we have a valid result
  if (els.resetBtn){ els.resetBtn.disabled = false; els.resetBtn.setAttribute('aria-disabled','false'); }
  if (els.shareBtn){ els.shareBtn.disabled = false; els.shareBtn.setAttribute('aria-disabled','false'); }

  // 🔔 Show popup copy of Results (headline + KPIs + plan)
  BarkdayResultsModal.showFromElement('.kpi');   // or '#nextPlan' or a composed HTML

// 🔔 Round 2: toast + auto-scroll (keeps popup too)
bdToast('Results updated — opened popup with details');
scrollResultsIntoView();
  
  // If gifts open, refilter
  if(els.gifts.children.length) loadGifts();
}

// Adapter the Button Bar will call
window.runCalculation = function(){
  compute();

  const hasDate = !!els.nextBday.textContent && els.nextBday.textContent !== '—';
  const hasHY   = !!els.humanYears.textContent && els.humanYears.textContent !== '—';
  const ok = hasDate || hasHY;

  if (!ok) {
    if (window.BarkdayUI?.setButtonsEnabled) window.BarkdayUI.setButtonsEnabled(false);
    return null;
  }

bdSaveRun(); // uses currentRunPayload() and stores to localStorage
  
  const { start, end, title, notes } = getContext();
  return {
    title,
    description: notes,
    start,
    end,
    reminders: [{ minutes: 10 }, { minutes: 1440 }]
  };
};

// ---------- Buttons ----------
if (els.resetBtn) els.resetBtn.addEventListener('click', ()=>{
  els.dogName.value=''; els.dob.value=''; els.adultWeight.value=55; els.adultWeightVal.textContent='55'; els.chewer.value='Normal';
  els.showEpi.checked=false; els.smooth.checked=true; els.breed.value=''; els.breedGroup.value='Working / Herding';
  els.ignoreAge.checked=els.ignoreSize.checked=els.ignoreChewer.checked=false;
  els.nextHeadline.textContent='—'; els.nextBday.textContent='—'; els.nextBdayDelta.textContent='';
  els.dogAge.textContent='—'; els.humanYears.textContent='—'; els.slopeNote.textContent='';
  document.getElementById('nextPlan').innerHTML=''; document.getElementById('nextPlanHeading').textContent='Next Birthday Plan';
  els.sizeWarn.style.display='none'; els.gifts.innerHTML=''; els.giftMeta.textContent=''; els.epi.textContent='';
  renderHero(); updateBreedNotes();

  if (els.resetBtn){ els.resetBtn.disabled = true; els.resetBtn.setAttribute('aria-disabled','true'); }
  if (els.shareBtn){ els.shareBtn.disabled = true; els.shareBtn.setAttribute('aria-disabled','true'); }
});

if (els.shareBtn) els.shareBtn.addEventListener('click', ()=>{
  const p = new URLSearchParams({
    n: els.dogName.value || '',
    d: els.dob.value || '',
    w: els.adultWeight.value,
    c: els.chewer.value,
    g: els.breedGroup.value,
    r: els.breed.value || '',
    s: els.smooth.checked ? 1 : 0,
    e: els.showEpi.checked ? 1 : 0
  });
  const url = location.origin + location.pathname + '?' + p.toString();
  navigator.clipboard.writeText(url)
    .then(()=>alert('Shareable link copied.'))
    .catch(()=>alert(url));
});

/* --------------------
   Calendar context helper
-------------------- */
function getContext(){
  const rawText = els.nextBday.textContent || '';
  const iso = els.nextBday.dataset.iso;
  const start = iso ? new Date(iso) : new Date();
  const end   = new Date(start.getTime() + 60*60*1000);
  const rawName = els.dogName.value || 'your dog';
  const name = rawName.trim() || 'your dog';

  const dob = new Date(els.dob.value), now = new Date();
  const years = daysBetween(dob, now) / 365.2425;
  const H = humanEqYears(years, parseInt(els.adultWeight.value,10), els.smooth.checked);
  const upcoming = Math.floor(H) + 1;

  const notes = planNotesText(resolveGroupKey(els.breedGroup.value), upcoming);
  const title = `🎉 ${name} turns ${upcoming} dog-years! Happy Barkday!`;

  return { start, end, name, upcoming, notes, title };
}

/* --------------------
   Local in-app reminders (beta) — shimmed
-------------------- */
(function inAppReminders(){
  const KEY = 'barkday-local-reminders-v1';

  // Use the same storage shim as Saved Results
  const load = () => {
    try {
      const raw = BarkdayStore.get(KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.warn('[Barkday] reminders.load failed', e);
      return [];
    }
  };
  const save = (list) => {
    const ok = BarkdayStore.set(KEY, JSON.stringify(list || []));
    if (!ok) bdToast('Reminders could not be saved on this device.', 3500);
  };

  window.BarkdayReminders = {
    enableCurrent(){
      if (!els.nextBday.textContent || els.nextBday.textContent==='—') {
        alert('Calculate first.'); return;
      }
      const {name, upcoming} = getContext();
      const when = els.nextBday.dataset.iso || new Date().toISOString();

      // Keep the latest reminder per name
      const list = load().filter(r => r.name !== name);
      list.push({ name, when, upcoming });
      save(list);

      // Let the user know if this is session/memory only
      const note = (BarkdayStore?.kind && BarkdayStore.kind !== 'localStorage')
        ? ' (saved for this session only)'
        : '';
      alert(`In-app reminder saved for ${name} — ${new Date(when).toDateString()}${note}.`);
    },
    list: load
  };

  // Lightweight check (runs on page open)
  function checkNow(){
    const list = load(); if (!list.length) return;
    const now = new Date();
    for (const r of list){
      const when = new Date(r.when);
      const days = Math.floor((when - now)/(24*60*60*1000));
      if (days === 7) alert(`🎁 One week until ${r.name}'s Barkday (turning ${r.upcoming} DY)!`);
      if (days === 1) alert(`🎉 ${r.name}'s Barkday is tomorrow!`);
    }
  }
  checkNow();
})();


// Gifts auto-refilter if visible
function reloadGiftsIfShown(){ if(els.gifts.children.length>0){ loadGifts(); } }
['change'].forEach(ev=>{
  els.adultWeight.addEventListener(ev, reloadGiftsIfShown);
  els.chewer.addEventListener(ev, reloadGiftsIfShown);
  els.ignoreAge.addEventListener(ev, reloadGiftsIfShown);
  els.ignoreSize.addEventListener(ev, reloadGiftsIfShown);
  els.ignoreChewer.addEventListener(ev, reloadGiftsIfShown);
});

// QS hydrate (no auto compute)
(function initFromQS(){
  const q=new URLSearchParams(location.search); if(!q.size) return;
  els.dogName.value=q.get('n')||'';
  const qsDob = q.get('d') || '';
  if (qsDob) els.dob.value=qsDob;
  els.adultWeight.value=q.get('w')||55; els.adultWeightVal.textContent=els.adultWeight.value;
  els.chewer.value=q.get('c')||'Normal'; els.breedGroup.value=q.get('g')||'Working / Herding'; els.breed.value=q.get('r')||'';
  els.smooth.checked=q.get('s')==='1'; els.showEpi.checked=q.get('e')==='1';
  renderHero(); updateBreedNotes();
})();

/* ==== Barkday Button Bar v1 (namespaced) ==== */
(function(){
  window.BarkdayUI = window.BarkdayUI || {};
  const NS = window.BarkdayUI;

  if (NS.__btnbar_initialized) return;

  const has = (k)=> typeof window[k] === 'function';

  if (!NS.fmtICSDate){
    NS.fmtICSDate = function fmtICSDate(dt){
      const z = new Date(dt);
      return z.toISOString()
              .replace(/[-:]/g,'')
              .replace(/\.\d{3}Z$/,'Z');
    };
  }
  if (!NS.downloadFile){
    NS.downloadFile = function downloadFile(name, mime, content){
      const blob = new Blob([content], {type: mime});
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(()=>URL.revokeObjectURL(a.href), 1000);
    };
  }
  if (!NS.buildICSEvent){
    NS.buildICSEvent = function buildICSEvent(evt){
      const uid = evt.uid || ('barkday-' + Math.random().toString(36).slice(2));
      const dtstart = NS.fmtICSDate(evt.start);
      const dtend   = NS.fmtICSDate(evt.end   || (new Date(new Date(evt.start).getTime()+60*60*1000)));
      const now = NS.fmtICSDate(new Date());
      const esc = (s)=> String(s||'').replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
      const alarms = (evt.reminders||[]).map(r=>[
        'BEGIN:VALARM',
        `TRIGGER:-PT${Math.max(0, r.minutes)}M`,
        'ACTION:DISPLAY',
        `DESCRIPTION:${esc(evt.title||'Reminder')}`,
        'END:VALARM'
      ].join('\n')).join('\n');

      return [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Barkday//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${now}`,
        `DTSTART:${dtstart}`,
        `DTEND:${dtend}`,
        `SUMMARY:${esc(evt.title||'Barkday Reminder')}`,
        evt.location? `LOCATION:${esc(evt.location)}` : '',
        evt.description? `DESCRIPTION:${esc(evt.description)}` : '',
        alarms,
        'END:VEVENT',
        'END:VCALENDAR'
      ].filter(Boolean).join('\n');
    };
  }
  if (!NS.openGoogleCalUrl){
    NS.openGoogleCalUrl = function openGoogleCalUrl(evt){
      if (has('openGoogleCalUrl')) return window.openGoogleCalUrl(evt);
      const dt = (d)=> new Date(d).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
      const params = new URLSearchParams({
        action: 'TEMPLATE',
        text: evt.title || 'Barkday Reminder',
        details: evt.description || '',
        location: evt.location || '',
        dates: `${dt(evt.start)}/${dt(evt.end || (new Date(new Date(evt.start).getTime()+60*60*1000)))}`
      });
      window.open('https://www.google.com/calendar/render?' + params.toString(), '_blank');
    };
  }

function render(container){
  container.innerHTML = `
    <div class="btn-bar" data-state="disabled">
      <button type="button" class="primary" id="btnCalc">Calculate</button>
      <button type="button" class="secondary" id="btnSave" disabled>Save result</button>
      <button type="button" class="secondary" id="btnICS" disabled>Download .ics</button>
      <button type="button" class="secondary" id="btnGCal" disabled>Add to Google Calendar</button>
      <button type="button" class="ghost" id="btnSaved" title="Open Saved Results">Saved ▾</button>
      <div id="inline-alert" role="status" aria-live="polite" class="muted" style="margin-left:auto"></div>
    </div>
    <div id="selftestHost" style="display:none"></div>
  `;
}

 function setEnabled(on){
  // Toggle only the action buttons that require a computed result
  ['#btnSave','#btnICS','#btnGCal'].forEach(sel=>{
    document.querySelectorAll('#btnBarMount .btn-bar ' + sel).forEach(b=> b.disabled = !on);
  });
  const bar = document.querySelector('#btnBarMount .btn-bar');
  if (bar) bar.dataset.state = on ? 'enabled' : 'disabled';
}
  NS.updateEventFromCalc = function(evtData){ NS.__lastEvent = evtData || null; setEnabled(!!evtData); };
  NS.setButtonsEnabled = setEnabled;

  function wire(){
    const root = document.getElementById('btnBarMount');
    if (!root) return;

    const btnCalc = root.querySelector('#btnCalc');
    const btnICS  = root.querySelector('#btnICS');
    const btnGCal = root.querySelector('#btnGCal');

    btnCalc.addEventListener('click', ()=>{
      if (typeof window.runCalculation === 'function'){
        const evt = window.runCalculation();
        NS.updateEventFromCalc(evt);
        if (evt && evt.start) NS.setButtonsEnabled(true);
      } else if (typeof window.calculate === 'function'){
        const evt = window.calculate();
        NS.updateEventFromCalc(evt);
        if (evt && evt.start) NS.setButtonsEnabled(true);
      } else {
        root.dispatchEvent(new CustomEvent('barkday:calc:request'));
      }
    });

    // NEW: Save + Saved
const btnSave  = root.querySelector('#btnSave');
const btnSaved = root.querySelector('#btnSaved');

btnSave.addEventListener('click', ()=>{
  // require a valid calc (buttons are enabled only when calc succeeded)
  bdSaveRun();
});

btnSaved.addEventListener('click', ()=>{
  BarkdaySaved.open();
});

    btnICS.addEventListener('click', ()=>{
      if (btnICS.disabled) return;
      const evt = NS.__lastEvent; if (!evt) return;
      const ics = NS.buildICSEvent(evt);
      NS.downloadFile('barkday.ics', 'text/calendar;charset=utf-8', ics);
    });

    btnGCal.addEventListener('click', ()=>{
      if (btnGCal.disabled) return;
      const evt = NS.__lastEvent; if (!evt) return;
      alert('Heads-up: Google Calendar may strip very-early reminders. We’ll include only supported ones.');
      NS.openGoogleCalUrl(evt);
    });
  }

  NS.selfTest = NS.selfTest || {};
  NS.selfTest.run = function(){
    const host = document.getElementById('selftestHost');
    if (!host) return;
    host.style.display = 'block';
    const checks = [];

    const beforeEnabled = Array.from(document.querySelectorAll('#btnBarMount .btn-bar button.secondary')).every(b=> b.disabled);
    checks.push(['Buttons disabled before calc', beforeEnabled]);

    const now = new Date();
    const evt = { title:'Test Barkday', description:'Self-test', start: now, end: new Date(now.getTime()+60*60*1000), reminders:[{minutes:10}] };
    NS.updateEventFromCalc(evt);
    const afterEnabled = Array.from(document.querySelectorAll('#btnBarMount .btn-bar button.secondary')).every(b=> !b.disabled);
    checks.push(['Buttons enabled after calc', afterEnabled]);

    const ics = NS.buildICSEvent(evt);
    checks.push(['ICS contains DTSTART/DTEND', /DTSTART:/.test(ics) && /DTEND:/.test(ics)]);

    host.innerHTML = `
      <div class="selftest">
        <h4>Self-Test</h4>
        ${checks.map(([label, ok])=>`<div class="row"><span>${label}</span><span class="${ok?'ok':'fail'}">${ok?'✅ PASS':'❌ FAIL'}</span></div>`).join('')}
      </div>
    `;
  };

  function maybeRunSelfTest(){
    const params = new URLSearchParams(location.search);
    if (params.get('selftest')==='1') NS.selfTest.run();
    window.addEventListener('keydown', (e)=>{
      if (e.altKey && e.shiftKey && e.key.toLowerCase()==='t'){
        const host = document.getElementById('selftestHost');
        if (host && host.style.display==='none'){ NS.selfTest.run(); }
        else if (host){ host.style.display='none'; }
      }
    });
  }

  function initBtnBar(){
    const mount = document.getElementById('btnBarMount');
    if (!mount) return;
    render(mount);
    wire();
    setEnabled(false);
    maybeRunSelfTest();
    NS.__btnbar_initialized = true;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBtnBar, { once: true });
  } else {
    initBtnBar();
  }
})();

// EXTRA SAFETY: bind #btnCalc only if the Button Bar didn't initialize
document.addEventListener('DOMContentLoaded', () => {
  if (window.BarkdayUI?.__btnbar_initialized) return;

  const bc = document.querySelector('#btnBarMount #btnCalc');
  if (!bc || bc.__barkday_bound) return;

  bc.__barkday_bound = true;
  bc.addEventListener('click', () => {
    const evt = (typeof window.runCalculation === 'function')
      ? window.runCalculation()
      : (typeof window.calculate === 'function' ? window.calculate() : null);

    if (window.BarkdayUI?.updateEventFromCalc) {
      window.BarkdayUI.updateEventFromCalc(evt || null);
      if (evt && evt.start) window.BarkdayUI.setButtonsEnabled(true);
    }
  });
});
