// very top of app.js
console.log('[Barkday] app.js loaded v4 (auto-map breed→group + lane-backfill + diagnostics)');
// ====================== Barkday app.js (complete) ======================
// ---------- Config ----------
const LOGO_SPLASH_SRC = "barkday-logo.png?v=2";   // full-size on splash
const LOGO_HEADER_SRC = "barkday-logo2.png?v=1";  // smaller header mark

// Data sources
const GIFT_FEED_URL     = "https://raw.githubusercontent.com/CandidQuality/dog-birthday-feed/main/dog-gifts.json";
const RECO_BANDED_URL   = "data/reco-banded.json?v=2";
const RECO_BREED_URL    = "data/reco-breed.json?v=2";
const BREED_GROUPS_URL  = "data/breed_groups.json?v=2";

// ---------- Affiliate Helper ----------
const AFFILIATE_TAG = "candidquality-20";
function withAffiliate(url) {
  if (!AFFILIATE_TAG) return url;
  try {
    const u = new URL(url);
    if (!/amazon\./i.test(u.hostname)) return url;
    if (!u.searchParams.has("tag")) u.searchParams.set("tag", AFFILIATE_TAG);
    return u.toString();
  } catch {
    return url.includes("?") 
      ? `${url}&tag=${encodeURIComponent(AFFILIATE_TAG)}`
      : `${url}?tag=${encodeURIComponent(AFFILIATE_TAG)}`;
  }
}


// ---------- Splash + Logos ----------
(function(){
  const hideSplash = () => document.getElementById("splash")?.classList.add("hide");
  window.addEventListener("load", () => setTimeout(hideSplash, 1800)); // doubled
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
  heroLine: $('heroLine'), profileLine: $('profileLine'), breedNotes: $('breedNotes'), epi: $('epi'),
  nextPlan: $('nextPlan'), nextPlanHeading: $('nextPlanHeading')
};

// Track if user manually changed group; if true we won't auto-map from breed (Update #1)
let manualGroupOverride = false;
els.breedGroup.addEventListener('change', () => { manualGroupOverride = true; });

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

// ---------- External data (breed groups + recos) ----------
let BREED_GROUPS = [];       // prior format array with id/name/examples/etc.
let RECO_BANDED = null;      // banded recommendations by group
let RECO_BREED  = null;      // per-breed, per-dog-year overrides
let BREED_NAME_MAP = {};     // lowercased alias → canonical breed name

async function loadBreedGroups(){
  try{
    const res = await fetch(BREED_GROUPS_URL, { cache: 'no-store' });
    BREED_GROUPS = await res.json();
    console.debug('[Barkday] breed_groups.json loaded:', BREED_GROUPS?.length ?? 0, 'groups');
  }catch(e){
    console.warn('[Barkday] Could not load breed_groups.json', e);
    BREED_GROUPS = [];
  }
}
function normalizeBreedReco(raw){
  if (!raw) return {};
  return raw.breeds ? raw.breeds : raw; // accept {breeds:{...}} or direct map
}
function rebuildBreedIndex(){
  BREED_NAME_MAP = {};
  if (!RECO_BREED) return;
  for (const k of Object.keys(RECO_BREED)) BREED_NAME_MAP[k.toLowerCase()] = k;
  // lightweight aliases (expand later)
  const add = (alias, canon) => { if (RECO_BREED[canon]) BREED_NAME_MAP[alias.toLowerCase()] = canon; };
  add("aussie", "Australian Shepherd");
  add("lab", "Labrador Retriever");
  add("frenchie", "French Bulldog");
  add("gsp", "German Shorthaired Pointer");
}
async function loadReco(){
  try{
    const [bandedRes, breedRes] = await Promise.allSettled([
      fetch(RECO_BANDED_URL, { cache:'no-store' }),
      fetch(RECO_BREED_URL,   { cache:'no-store' })
    ]);
    if (bandedRes.status === 'fulfilled') {
      RECO_BANDED = await bandedRes.value.json();
      console.debug('[Barkday] reco-banded.json groups:', Object.keys(RECO_BANDED||{}));
    }
    if (breedRes.status  === 'fulfilled') {
      const raw = await breedRes.value.json();
      RECO_BREED = normalizeBreedReco(raw);
      rebuildBreedIndex();
      console.debug('[Barkday] reco-breed.json breeds:', Object.keys(RECO_BREED||{}).length);
    }
    if (!RECO_BANDED) RECO_BANDED = {};
  }catch(e){
    console.warn('[Barkday] Could not load reco files', e);
    RECO_BANDED = RECO_BANDED || {};
    RECO_BREED  = RECO_BREED  || null;
    rebuildBreedIndex();
  }
}
loadBreedGroups();
loadReco();

// Map typed breed → BREED_GROUPS entry (exact match against examples)
function findGroupByBreedName(name){
  if(!name || !BREED_GROUPS.length) return null;
  const n = name.trim().toLowerCase();
  for (const g of BREED_GROUPS){
    const ex = Array.isArray(g.examples)? g.examples : [];
    if (ex.some(e => String(e).trim().toLowerCase() === n)) return g;
  }
  return null;
}

// Fuzzy breed lookup from RECO_BREED
function getBreedEntry(input){
  if (!input || !RECO_BREED) return null;
  const q = input.trim().toLowerCase();
  // exact alias/case-insensitive
  if (BREED_NAME_MAP[q]) return RECO_BREED[BREED_NAME_MAP[q]];
  // prefix match
  for (const key in BREED_NAME_MAP){
    if (key.startsWith(q)) return RECO_BREED[BREED_NAME_MAP[key]];
  }
  return null;
}

// Helper: return mapped group name (e.g., "Toy") from typed breed if known (Update #1)
function mappedGroupFromBreedText(txt){
  const m = findGroupByBreedName((txt||'').trim());
  return m ? m.name : null;
}

// ---------- Breed notes + examples under selectors (Updates #1–#3) ----------
function updateBreedNotes(){
  const name = els.dogName.value || 'your dog';
  const breedTxt = (els.breed.value||'').trim();

  // Prefer mapped group from breed when available; otherwise use dropdown
  const mappedName = mappedGroupFromBreedText(breedTxt);
  const groupForUI = mappedName || els.breedGroup.value;

  const lb = parseInt(els.adultWeight.value,10) || 55;

  // Examples: from external map if breed recognized; else fallback meta
  const mapped = findGroupByBreedName(breedTxt);
  if (mapped) {
    els.breedExamples.textContent = `${mapped.name}: examples — ${(mapped.examples||[]).join(', ')}`;
  } else {
    const meta = GROUP_META[groupForUI];
    els.breedExamples.textContent = meta ? `${meta.desc} Examples: ${meta.examples.join(', ')}` : '';
  }

  // Profile line always reflects breed + effective group
  const breedBit = breedTxt ? ` — ${breedTxt}` : '';
  const groupBit = groupForUI ? ` (${groupForUI})` : '';
  els.profileLine.textContent = `Profile: ${name}${breedBit}${groupBit} • Weight: ${lb} lb`;

  // Small guideline bullets also use the effective group
  els.breedNotes.innerHTML = (GROUPS[groupForUI]||[]).map(n=>`• ${n}`).join(' ');
}

// Wire handlers and soft auto-map on breed typing (Update #1)
['input','change'].forEach(ev=>{
  els.breed.addEventListener(ev, updateBreedNotes);
  els.breedGroup.addEventListener(ev, updateBreedNotes);
  els.dogName.addEventListener(ev, updateBreedNotes);
  els.adultWeight.addEventListener(ev, updateBreedNotes);
});
els.breed.addEventListener('input', () => {
  const mg = mappedGroupFromBreedText(els.breed.value);
  if (mg && !manualGroupOverride) {
    if ([...els.breedGroup.options].some(o => o.value === mg)) {
      els.breedGroup.value = mg;
    }
  }
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

// ---------- Confetti (multicolor; duration doubled) ----------
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

// ---------- Lane merge (fills all 6 lanes) ----------
const LANE_KEYS = ['training','health','nutrition','exercise','bonding','gear'];
function ensureAllLanes(obj){ const o = obj && obj.lanes ? { ...obj } : { lanes:{} };
  o.lanes = o.lanes || {};
  for(const k of LANE_KEYS){ if(!Array.isArray(o.lanes[k])) o.lanes[k] = []; }
  return o;
}
function mergeLanes(baseObj, overrideObj){
  const base = ensureAllLanes(baseObj);
  const over = ensureAllLanes(overrideObj);
  const merged = { lanes: {} };
  for(const k of LANE_KEYS){
    merged.lanes[k] = over.lanes[k].length ? over.lanes[k] : base.lanes[k];
  }
  return merged;
}

// ---------- Plan selection (breed-first → merge with banded → else banded) ----------
function planFor(group, dogYears){
  const band = bandForDY(Math.round(dogYears));
  const byGroup = (RECO_BANDED && RECO_BANDED[group]) ? RECO_BANDED[group][band.key] : null;

  const breedInput = (els.breed.value || '').trim();
  const breedEntry = getBreedEntry(breedInput);
  if (breedEntry && breedEntry.ages){
    const entry = nearestAgeEntry(breedEntry.ages, dogYears);
    if (entry && entry.lanes){
      const merged = byGroup ? mergeLanes(byGroup, entry) : ensureAllLanes(entry);
      console.debug('[Barkday] Plan source=breed+banded merge', { breed: breedInput, band: band?.key, mergedFrom: { breedAge: true, banded: !!byGroup }});
      return { plan: merged, band };
    }
  }

  if (byGroup){
    console.debug('[Barkday] Plan source=banded fallback', { band: band?.key, group: group });
    return { plan: ensureAllLanes(byGroup), band };
  }

  console.warn('[Barkday] No plan data found (breed nor banded).');
  return { plan: { lanes: { training:[], health:[], nutrition:[], exercise:[], bonding:[], gear:[] } }, band };
}

function renderPlan(group, upcomingDY){
  const box=els.nextPlan; box.innerHTML='';
  const {plan,band}=planFor(group,upcomingDY);
  const head=els.nextPlanHeading;
  head.textContent = `Next Birthday Plan — ${band?band.label:('turning '+upcomingDY)}`;

  const order=[['training','Training & Enrichment'],['health','Health & Wellness'],['nutrition','Diet & Nutrition'],['exercise','Exercise Needs'],['bonding','Play & Bonding Ideas'],['gear','Helpful Gear (optional)']];
  let totalItems = 0;
  for(const [k,label] of order){
    const items=(plan.lanes&&plan.lanes[k])?plan.lanes[k]:[]; if(!items.length) continue;
    totalItems += items.length;
    const d=document.createElement('div'); d.className='lane'; d.innerHTML=`<h4>${label}</h4>`; const ul=document.createElement('ul');
    items.forEach(t=>{ const li=document.createElement('li'); li.textContent=t; ul.appendChild(li); }); d.appendChild(ul); box.appendChild(d);
  }
  if (!totalItems){
    box.innerHTML='<div class="muted">Recommendations coming soon.</div>';
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
    els.gifts.innerHTML = top.map(it=>`<div class="gift"><h4>${it.title||'Gift'}</h4><div class="muted">${(it.tag||it.ageTag||'').toString()}</div><div style="margin-top:8px"><a class="link" href="${withAffiliate(it.url)}" target="_blank" rel="noopener">View</a></div></div>`).join('');
  }catch(e){ els.giftMeta.textContent='Could not load gift ideas.'; }
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
  const name=els.dogName.value || 'your dog';
  const upcoming=Math.floor(H)+1;
  els.nextHeadline.textContent = `${name} is about to be ${upcoming} years old!`;
  const nbd=nextDogYearDate(dob,H,lb,els.smooth.checked); els.nextBday.textContent=nbd.toDateString(); const dTo=daysBetween(now, nbd); els.nextBdayDelta.textContent = dTo>0? `${dTo} days from now` : '';

  // Profile/notes — use mapped group when available (Update #4)
  const breedTxt=(els.breed.value||'').trim();
  const mappedName = mappedGroupFromBreedText(breedTxt);
  const group = mappedName || els.breedGroup.value;

  els.profileLine.textContent = `Profile: ${name}${breedTxt?' — '+breedTxt:''}${group?` (${group})`:''} • Weight: ${lb} lb`;
  els.breedNotes.innerHTML = (GROUPS[group]||[]).map(n=>`• ${n}`).join(' ');

  // Weight/group hint
  let warn=''; if(group.includes('Toy') && lb>30) warn='Breed group "Toy" but weight > 30 lb. Math stays weight-based.';
  if((group.includes('Guardian')||group.includes('Working')) && lb<20) warn='Breed group suggests large/giant, but weight < 20 lb. Math stays weight-based.';
  els.sizeWarn.style.display = warn? 'block':'none'; els.sizeWarn.textContent = warn;

  // Celebrate & plan
  confetti(); renderPlan(group, upcoming);

  // Epigenetic note (optional)
  els.epi.textContent = els.showEpi.checked ? 'Science curve: UCSD DNA-methylation (≥ 1 yr). Note: visualization context; math remains weight-based.' : '';

  // If gifts open, refilter
  if(els.gifts.children.length) loadGifts();

  console.log('[Barkday] click compute took', performance.now().toFixed(0), 'ms');
}

// ---------- Buttons ----------
$('calcBtn').addEventListener('click', compute);
$('resetBtn').addEventListener('click', ()=>{
  els.dogName.value=''; els.dob.value=''; els.adultWeight.value=55; els.adultWeightVal.textContent='55'; els.chewer.value='Normal';
  els.showEpi.checked=false; els.smooth.checked=true; els.breed.value=''; els.breedGroup.value='Working / Herding';
  manualGroupOverride = false;
  els.ignoreAge.checked=els.ignoreSize.checked=els.ignoreChewer.checked=false;
  els.nextHeadline.textContent='—'; els.nextBday.textContent='—'; els.nextBdayDelta.textContent='';
  els.dogAge.textContent='—'; els.humanYears.textContent='—'; els.slopeNote.textContent='';
  els.nextPlan.innerHTML=''; els.nextPlanHeading.textContent='Next Birthday Plan';
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
  manualGroupOverride = false;
  renderHero(); updateBreedNotes();
})();
