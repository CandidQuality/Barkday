// very top of app.js
console.log('[Barkday] app.js loaded v3 (aliases externalized)');
// ====================== Barkday app.js (complete, upgraded) ======================
// ---------- Config ----------
const LOGO_SPLASH_SRC = "barkday-logo.png?v=2";   // full-size on splash
const LOGO_HEADER_SRC = "barkday-logo2.png?v=1";  // smaller header mark

// Data sources
const GIFT_FEED_URL     = "https://raw.githubusercontent.com/CandidQuality/dog-birthday-feed/main/dog-gifts.json";
const RECO_BANDED_URL   = "data/reco-banded.json?v=2";
const RECO_BREED_URL    = "data/reco-breed.json?v=2";
const BREED_GROUPS_URL  = "data/breed_groups.json?v=2";
const BREED_ALIASES_URL = "data/breed_aliases.json?v=1"; // NEW: external aliases

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
themeBtn.textContent = savedTheme==='light' ? '🌙 Dark' : '☀️ Light';
themeBtn.addEventListener('click', () => {
  const now = root.getAttribute('data-theme')==='light'?'dark':'light';
  root.setAttribute('data-theme', now);
  localStorage.setItem('barkday-theme', now);
  themeBtn.textContent = now==='light' ? '🌙 Dark' : '☀️ Light';
});

// ---------- DOM Shortcuts ----------
const $ = id => document.getElementById(id);
const els = {
  dogName: $('dogName'), dob: $('dob'), adultWeight: $('adultWeight'), adultWeightVal: $('adultWeightVal'),
  chewer: $('chewer'), showEpi: $('showEpigenetic'), smooth: $('smoothMilestones'),
  breed: $('breed'), breedGroup: $('breedGroup'), breedExamples: $('breedExamples'),
  ignoreAge: $('ignoreAge'), ignoreSize: $('ignoreSize'), ignoreChewer: $('ignoreChewer'),
  calcBtn: $('calcBtn'), resetBtn: $('resetBtn'), shareBtn: $('shareBtn'), sizeWarn: $('sizeWarn'),
  nextHeadline: $('nextHeadline'), nextBday: $('nextBday'), nextBdayDelta: $('nextBdayDelta'),
  dogAge: $('dogAge'), humanYears: $('humanYears'), slopeNote: $('slopeNote'),
  addCal: $('addCalBtn'), remind: $('remindBtn'), addYearSeries: $('addYearSeries'),
  loadGifts: $('loadGifts'), giftMeta: $('giftMeta'), gifts: $('gifts'),
  heroLine: $('heroLine'), profileLine: $('profileLine'), breedNotes: $('breedNotes'), epi: $('epi')
};

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

// ---------- External data (breed groups + recos + aliases) ----------
let BREED_GROUPS = [];       // array with id/name/examples/etc.
let RECO_BANDED = null;      // banded recommendations by group
let RECO_BREED  = null;      // per-breed, per-dog-year overrides
let BREED_NAME_MAP = {};     // lowercased alias → canonical breed name (from reco-breed keys)
let BREED_ALIASES = {};      // canonical → [aliases] (from external JSON)

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
  // a few lightweight extras kept for prefix matches (external aliases handle most)
  const add = (alias, canon) => { if (RECO_BREED[canon]) BREED_NAME_MAP[alias.toLowerCase()] = canon; };
  add("aussie", "Australian Shepherd");
  add("lab", "Labrador Retriever");
  add("frenchie", "French Bulldog");
}
async function loadReco(){
  try{
    const [bandedRes, breedRes] = await Promise.allSettled([
      fetch(RECO_BANDED_URL, { cache:'no-store' }),
      fetch(RECO_BREED_URL,   { cache:'no-store' })
    ]);
    if (bandedRes.status === 'fulfilled') RECO_BANDED = await bandedRes.value.json();
    if (breedRes.status  === 'fulfilled') {
      const raw = await breedRes.value.json();
      RECO_BREED = normalizeBreedReco(raw);
      rebuildBreedIndex();
    }
    if (!RECO_BANDED) RECO_BANDED = {};
    console.debug('[Barkday] reco files loaded:', { banded: !!RECO_BANDED, breed: !!RECO_BREED });
  }catch(e){
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
/**
 * Normalize user-typed breed to a canonical display name if possible.
 * Order of attempts:
 *  1) Canonical key exact match (case-insensitive)
 *  2) Alias array contains typed (case-insensitive)
 *  3) Reco-breed canonical keys (exact / prefix)
 *  4) Return original text if no match
 */
function normalizeBreed(input){
  if (!input) return null;
  const q = String(input).trim().toLowerCase();

  // 1) Canonical keys (from alias file)
  for (const canon of Object.keys(BREED_ALIASES)){
    if (canon.toLowerCase() === q) return canon;
  }
  // 2) Alias arrays
  for (const [canon, aliases] of Object.entries(BREED_ALIASES)){
    if (Array.isArray(aliases) && aliases.some(a => String(a).toLowerCase() === q)) {
      return canon;
    }
  }
  // 3) Reco-breed keys (built from reco-breed.json)
  if (BREED_NAME_MAP[q]) return BREED_NAME_MAP[q];
  for (const key in BREED_NAME_MAP){
    if (key.startsWith(q)) return BREED_NAME_MAP[key];
  }
  // 4) No normalization
  return input.trim();
}

// Kick off data loads
loadBreedGroups();
loadReco();
loadAliases();

// Map typed breed → BREED_GROUPS entry (using normalizer + fuzzy)
function findGroupByBreedName(name){
  if(!name || !BREED_GROUPS.length) return null;

  const typed = String(name).trim();
  const canonical = normalizeBreed(typed) || typed;
  const typedLC = typed.toLowerCase();
  const canonicalLC = canonical.toLowerCase();

  for (const g of BREED_GROUPS){
    const ex = Array.isArray(g.examples)? g.examples : [];

    // Exact match (case-insensitive)
    if (ex.some(e => String(e).trim().toLowerCase() === canonicalLC)) return g;

    // Prefix fuzzy (either side) to handle "Labrador" vs "Labrador Retriever"
    if (ex.some(e => {
      const elc = String(e).trim().toLowerCase();
      return elc.startsWith(canonicalLC) || canonicalLC.startsWith(elc) ||
             elc.startsWith(typedLC)     || typedLC.startsWith(elc);
    })) return g;

    // Inclusion fallback (multi-word variants)
    if (ex.some(e => {
      const elc = String(e).trim().toLowerCase();
      return elc.includes(canonicalLC) || canonicalLC.includes(elc) ||
             elc.includes(typedLC)     || typedLC.includes(elc);
    })) return g;
  }
  return null;
}

// Fuzzy breed lookup from RECO_BREED (unchanged)
function getBreedEntry(input){
  if (!input || !RECO_BREED) return null;
  const qNorm = normalizeBreed(input); // use canonicalized value
  const q = (qNorm || input).trim().toLowerCase();

  // exact alias/case-insensitive via BREED_NAME_MAP
  if (BREED_NAME_MAP[q]) return RECO_BREED[BREED_NAME_MAP[q]];
  // prefix match
  for (const key in BREED_NAME_MAP){
    if (key.startsWith(q)) return RECO_BREED[BREED_NAME_MAP[key]];
  }
  return null;
}

// ---------- Breed notes + examples under selectors ----------
function updateBreedNotes(){
  const name = els.dogName.value || 'your dog';
  const breedTxtRaw = (els.breed.value||'').trim();
  const breedTxt = normalizeBreed(breedTxtRaw) || breedTxtRaw;
  const group = els.breedGroup.value;
  const lb = parseInt(els.adultWeight.value,10) || 55;

  // Show examples from external map if we recognize the (normalized) breed; else fallback meta
  const mapped = findGroupByBreedName(breedTxt);
  if (mapped) {
    els.breedExamples.textContent = `${mapped.name}: examples — ${(mapped.examples||[]).join(', ')}`;
    // Auto-set dropdown to mapped if user hasn't manually overridden
    if (group !== mapped.name) {
      els.breedGroup.value = mapped.name;
    }
  } else {
    const meta = GROUP_META[group];
    els.breedExamples.textContent = meta ? `${meta.desc} Examples: ${meta.examples.join(', ')}` : '';
  }

  els.profileLine.textContent = `Profile: ${name}${breedTxt ? ' — ' + breedTxt : ''} • Group: ${els.breedGroup.value} • Weight: ${lb} lb`;
  els.breedNotes.innerHTML = (GROUPS[els.breedGroup.value]||[]).map(n=>`• ${n}`).join(' ');
}
['input','change'].forEach(ev=>{
  els.breed.addEventListener(ev, updateBreedNotes);
  els.breedGroup.addEventListener(ev, updateBreedNotes);
  els.dogName.addEventListener(ev, updateBreedNotes);
  els.adultWeight.addEventListener(ev, updateBreedNotes);
});
updateBreedNotes();

// ---------- Slider label (5-lb steps) ----------
els.adultWeight.addEventListener('input', ()=>{
  const v=Math.round(parseInt(els.adultWeight.value,10)/5)*5;
  els.adultWeight.value=v; els.adultWeightVal.textContent=v;
});

// ---------- Math utils ----------
const clamp=(n,min,max)=>Math.min(Math.max(n,min),max);
const daysBetween=(a,b)=>Math.floor((b-a)/(24*60*60*1000));
const pad2=n=>String(n).padStart(2,'0');
const fmtUTC=d=>d.getUTCFullYear()+pad2(d.getUTCMonth()+1)+pad2(d.getUTCDate())+'T'+pad2(d.getUTCHours())+pad2(d.getUTCMinutes())+pad2(d.getUTCSeconds())+'Z';

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
  const target=Math.floor(H)+1, now=new Date();
  const yearsNow=daysBetween(dob, now)/365.2425;
  let lo=yearsNow, hi=yearsNow+5;
  for(let i=0;i<40;i++){ const mid=(lo+hi)/2; const h=humanEqYears(mid,lb,smooth); if(h>=target) hi=mid; else lo=mid; }
  const t=(lo+hi)/2; return new Date(dob.getTime()+t*365.2425*24*60*60*1000);
}

// ---------- Confetti (multicolor; default ~3.4s) ----------
function confetti(ms = 3400){
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
  let st = null;
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
  // otherwise closest absolute
  let best = keys[0], bd = Math.abs(keys[0]-want);
  for (const k of keys){ const d=Math.abs(k-want); if (d<bd){ bd=d; best=k; } }
  return agesObj[String(best)];
}

// ---------- Plan selection (breed-first → banded → none) ----------
function planFor(group, dogYears){
  const band = bandForDY(Math.round(dogYears));

  // 1) Breed-specific (fuzzy) → nearest age
  const breedInput = (els.breed.value || '').trim();
  const breedEntry = getBreedEntry(breedInput);
  if (breedEntry && breedEntry.ages){
    const entry = nearestAgeEntry(breedEntry.ages, dogYears);
    if (entry && entry.lanes) {
      console.debug('[Barkday] plan source: BREED override', {breed: normalizeBreed(breedInput)||breedInput, age: Math.round(dogYears)});
      return { plan: entry, band };
    }
  }

  // 2) Group-banded fallback
  const byGroup = (RECO_BANDED && RECO_BANDED[group]) ? RECO_BANDED[group][band.key] : null;
  if (byGroup){
    console.debug('[Barkday] plan source: GROUP banded fallback', {group, band: band.key});
    return { plan: byGroup, band };
  }

  // 3) Nothing found
  console.warn('[Barkday] plan source: NONE', {group, dogYears});
  return { plan: null, band };
}

function renderPlan(group, upcomingDY){
  const box=$('nextPlan'); box.innerHTML='';
  const {plan,band}=planFor(group, upcomingDY);
  const head=$('nextPlanHeading'); head.textContent = `Next Birthday Plan — ${band?band.label:('turning '+upcomingDY)}`;
  if(!plan){ box.innerHTML='<div class="muted">Recommendations coming soon.</div>'; return; }
  const order=[['training','Training & Enrichment'],['health','Health & Wellness'],['nutrition','Diet & Nutrition'],['exercise','Exercise Needs'],['bonding','Play & Bonding Ideas'],['gear','Helpful Gear (optional)']];

  // Ensure all 6 lanes exist (merge empty arrays if missing)
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

// ---------- Gifts ----------
async function loadGifts(){
  els.gifts.innerHTML=''; els.giftMeta.textContent='Loading…';
  try{
    const res = await fetch(GIFT_FEED_URL,{cache:'no-store'}); const items = await res.json();
    const lb = parseInt(els.adultWeight.value,10);
    const bucket = lb<20?'toy':lb<30?'small':lb<50?'medium':lb<90?'large':'giant';
    const dogYears = parseFloat(els.humanYears.textContent);
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
      if(!isNaN(dogYears) && !els.ignoreAge.checked){
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

    // Sort & dedupe top picks
    results.sort((a,b)=> (b.score-a.score) || (a.rnd-b.rnd));
    const seen = new Set();
    const top = [];
    for(const r of results){
      const key = r.it.id || r.it.url || r.it.title;
      if(!key || seen.has(key)) continue;
      seen.add(key); top.push(r.it);
      if(top.length>=12) break;
    }

    const parts=[]; parts.push(`size=${bucket}`); parts.push(`chewer=${chewer||'normal'}`); if(!isNaN(dogYears)) parts.push(`age≈${dogYears.toFixed(2)} DY`);
    const ignored=[]; if(els.ignoreSize.checked) ignored.push('size'); if(els.ignoreChewer.checked) ignored.push('chewer'); if(els.ignoreAge.checked) ignored.push('age');
    els.giftMeta.textContent = `Showing ${top.length} picks • ${parts.join(' • ')}${ignored.length? ' • ignored: '+ignored.join(', '):''}`;
    els.gifts.innerHTML = top.map(it=>`<div class="gift"><h4>${it.title||'Gift'}</h4><div class="muted">${(it.tag||it.ageTag||'').toString()}</div><div style="margin-top:8px"><a class="link" href="${it.url}" target="_blank" rel="noopener">View</a></div></div>`).join('');
  }catch(e){ els.giftMeta.textContent='Could not load gift ideas.'; console.warn('[Barkday] gifts load error', e); }
}
$('loadGifts').addEventListener('click', loadGifts);

// ---------- Compute ----------
function compute(){
  const dobStr=els.dob.value; if(!dobStr){ alert('Please select a birthdate.'); return; }
  const dob=new Date(dobStr), now=new Date(); if(isNaN(dob)||dob>now){ alert('Birthdate is invalid.'); return; }
  const lb=parseInt(els.adultWeight.value,10);

  // Chronological age
  const days=daysBetween(dob, now), years=days/365.2425, yrs=Math.floor(years), months=Math.floor((years%1)*12);
  els.dogAge.textContent = `${yrs}y ${months}m`;

  // Dog-years
  const H=humanEqYears(years, lb, els.smooth.checked); els.humanYears.textContent=H.toFixed(2); const R=slopeFromWeight(lb); els.slopeNote.textContent=`R≈${R.toFixed(2)} (weight-continuous)`;

  // Next dog-year birthday
  const rawName=els.dogName.value || 'your dog';
  const name = rawName.trim() || 'your dog';
  const upcoming=Math.floor(H)+1;
  els.nextHeadline.textContent = `${name} is about to be ${upcoming} years old!`;
  const nbd=nextDogYearDate(dob,H,lb,els.smooth.checked); els.nextBday.textContent=nbd.toDateString(); const dTo=daysBetween(now, nbd); els.nextBdayDelta.textContent = dTo>0? `${dTo} days from now` : '';

  // Profile/notes (use normalized breed for display + mapping)
  const breedTxtRaw=(els.breed.value||'').trim();
  const breedCanon = normalizeBreed(breedTxtRaw) || breedTxtRaw;
  const mapped = findGroupByBreedName(breedCanon);
  if (mapped) els.breedGroup.value = mapped.name;

  els.profileLine.textContent = `Profile: ${name}${breedCanon?' — '+breedCanon:''} • Group: ${els.breedGroup.value} • Weight: ${lb} lb`;
  els.breedNotes.innerHTML = (GROUPS[els.breedGroup.value]||[]).map(n=>`• ${n}`).join(' ');

  // Weight/group hint
  let warn=''; if(els.breedGroup.value.includes('Toy') && lb>30) warn='Breed group "Toy" but weight > 30 lb. Math stays weight-based.';
  if((els.breedGroup.value.includes('Guardian')||els.breedGroup.value.includes('Working')) && lb<20) warn='Breed group suggests large/giant, but weight < 20 lb. Math stays weight-based.';
  els.sizeWarn.style.display = warn? 'block':'none'; els.sizeWarn.textContent = warn;

  // Celebrate & plan
  confetti(); renderPlan(els.breedGroup.value, upcoming);

  // Epigenetic note (optional)
  els.epi.textContent = els.showEpi.checked ? 'Science curve: UCSD DNA-methylation (≥ 1 yr). Note: visualization context; math remains weight-based.' : '';

  // If gifts open, refilter
  if(els.gifts.children.length) loadGifts();
}

// ---------- Buttons ----------
$('calcBtn').addEventListener('click', compute);
$('resetBtn').addEventListener('click', ()=>{
  els.dogName.value=''; els.dob.value=''; els.adultWeight.value=55; els.adultWeightVal.textContent='55'; els.chewer.value='Normal';
  els.showEpi.checked=false; els.smooth.checked=true; els.breed.value=''; els.breedGroup.value='Working / Herding';
  els.ignoreAge.checked=els.ignoreSize.checked=els.ignoreChewer.checked=false;
  els.nextHeadline.textContent='—'; els.nextBday.textContent='—'; els.nextBdayDelta.textContent='';
  els.dogAge.textContent='—'; els.humanYears.textContent='—'; els.slopeNote.textContent='';
  document.getElementById('nextPlan').innerHTML=''; document.getElementById('nextPlanHeading').textContent='Next Birthday Plan';
  els.sizeWarn.style.display='none'; els.gifts.innerHTML=''; els.giftMeta.textContent=''; els.epi.textContent='';
  renderHero(); updateBreedNotes();
});
$('shareBtn').addEventListener('click', ()=>{
  const p=new URLSearchParams({ n:els.dogName.value||'', d:els.dob.value||'', w:els.adultWeight.value, c:els.chewer.value, g:els.breedGroup.value, r:els.breed.value||'', s:els.smooth.checked?1:0, e:els.showEpi.checked?1:0 });
  const url=location.origin+location.pathname+'?'+p.toString();
  navigator.clipboard.writeText(url).then(()=>alert('Shareable link copied.')).catch(()=>alert(url));
});
$('addCalBtn').addEventListener('click', ()=>{
  if(!els.nextBday.textContent || els.nextBday.textContent==='—'){ alert('Calculate first.'); return; }
  const start=new Date(els.nextBday.textContent), end=new Date(start.getTime()+60*60*1000);
  const name=els.dogName.value||'Your dog';
  const ics=`BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Barkday//EN
BEGIN:VEVENT
UID:${Date.now()}@barkday
DTSTAMP:${fmtUTC(new Date())}
DTSTART:${fmtUTC(start)}
DTEND:${fmtUTC(end)}
SUMMARY:${name} — Next Dog-Year Birthday
END:VEVENT
END:VCALENDAR`;
  const blob=new Blob([ics],{type:'text/calendar'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='barkday.ics'; document.body.appendChild(a); a.click(); a.remove();
});
$('remindBtn').addEventListener('click', ()=> alert('Reminder integration placeholder.'));
$('addYearSeries').addEventListener('click', ()=>{
  if(!els.dob.value){ alert('Calculate first.'); return; }
  const name=els.dogName.value||'Your dog', dob=new Date(els.dob.value), lb=parseInt(els.adultWeight.value,10);
  const now=new Date(), years=daysBetween(dob, now)/365.2425, H=humanEqYears(years, lb, els.smooth.checked);
  let cur=nextDogYearDate(dob, H, lb, els.smooth.checked), dogYears=Math.floor(H)+1;
  let ics='BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Barkday//EN\n';
  for(let i=0;i<3;i++){
    const start=cur, end=new Date(start.getTime()+60*60*1000);
    ics+=`BEGIN:VEVENT\nUID:${Date.now()+Math.random()}@barkday\nDTSTAMP:${fmtUTC(new Date())}\nDTSTART:${fmtUTC(start)}\nDTEND:${fmtUTC(end)}\nSUMMARY:${name} — Dog-Year ${dogYears}\nEND:VEVENT\n`;
    dogYears++; cur=nextDogYearDate(dob, dogYears-1, lb, els.smooth.checked);
  }
  ics+='END:VCALENDAR'; const blob=new Blob([ics],{type:'text/calendar'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='barkday_series.ics'; document.body.appendChild(a); a.click(); a.remove();
});

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
  els.dogName.value=q.get('n')||''; els.dob.value=q.get('d')||''; els.adultWeight.value=q.get('w')||55; els.adultWeightVal.textContent=els.adultWeight.value;
  els.chewer.value=q.get('c')||'Normal'; els.breedGroup.value=q.get('g')||'Working / Herding'; els.breed.value=q.get('r')||'';
  els.smooth.checked=q.get('s')==='1'; els.showEpi.checked=q.get('e')==='1';
  renderHero(); updateBreedNotes();
})();
