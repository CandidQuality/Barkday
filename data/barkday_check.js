#!/usr/bin/env node
/* Barkday data validator – v1.0
   Checks structure & content of:
   - reco-banded.json
   - reco-breed.json
   - breed_groups.json
   - breed_aliases.json
   - breed_taxonomy.json
   Exits non-zero on any error.
*/

const fs = require('fs');
const path = require('path');

/* ---------- config ---------- */
const REQUIRED_BANDS = [
  'puppy_1_6',
  'puppy_7_10',
  'puppy_11_15',
  'young_16_24',
  'adult_25_60',
  'senior_61p',
];

const REQUIRED_LANES = ['training', 'health', 'nutrition', 'exercise', 'bonding', 'gear'];

const META_KEYS = ['_copyright', '_license', '_dataset_id'];

/* Groups we currently expect across the suite.
   You can pare this down if some are intentionally omitted. */
const EXPECTED_GROUP_NAMES = new Set([
  'Working / Herding',
  'Sporting',
  'Hound',
  'Terrier',
  'Toy',
  'Non-Sporting',
  'Foundation Stock',
  'Miscellaneous',
  'Guardian',
  'Companion',
  'Mixed / Other',
]);

/* ---------- small helpers ---------- */
function fail(msg, ctx) {
  const line = ctx ? `${msg}  ${JSON.stringify(ctx)}` : msg;
  return { ok: false, msg: line };
}
function ok(msg) { return { ok: true, msg }; }

function readJson(p) {
  try {
    const raw = fs.readFileSync(p, 'utf8');
    return { ok: true, data: JSON.parse(raw) };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

/** Resolve a passed path or best-match a base name in CWD
 *  e.g., base "reco-breed" will match "reco-breed (4).json".
 */
function resolvePathFromArgOrGuess(flagValue, base) {
  if (flagValue) return flagValue;
  const files = fs.readdirSync(process.cwd());
  const exact = files.find(f => f === `${base}.json`);
  if (exact) return exact;
  // match "base*.json"
  const re = new RegExp(`^${base.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}.*\\.json$`, 'i');
  const match = files.find(f => re.test(f));
  if (match) return match;
  return `${base}.json`; // fall back (may 404; we’ll error clearly)
}

function nonEmptyString(x) { return typeof x === 'string' && x.trim().length > 0; }
function isStringArray(a) {
  return Array.isArray(a) && a.every(nonEmptyString);
}
function reportSection(title) {
  console.log('\n' + title);
  console.log('-'.repeat(title.length));
}

/* ---------- validators ---------- */

// Validate reco-banded.json
function validateRecoBanded(obj) {
  const errs = [];
  // meta
  for (const k of META_KEYS) {
    if (!(k in obj) || !nonEmptyString(obj[k])) errs.push(`Missing or empty meta key: ${k}`);
  }
  // groups
  const groupKeys = Object.keys(obj).filter(k => !META_KEYS.includes(k));
  if (groupKeys.length === 0) errs.push('No groups found.');
  // Expected group names present?
  const missingGroups = [...EXPECTED_GROUP_NAMES].filter(g => !groupKeys.includes(g));
  if (missingGroups.length) {
    errs.push(`Missing expected groups: ${missingGroups.join(', ')}`);
  }
  for (const g of groupKeys) {
    const group = obj[g];
    if (typeof group !== 'object' || Array.isArray(group) || !group) {
      errs.push(`Group "${g}" must be an object.`);
      continue;
    }
    // bands present
    for (const band of REQUIRED_BANDS) {
      if (!(band in group)) {
        errs.push(`Group "${g}" missing band "${band}"`);
        continue;
      }
      const bandObj = group[band];
      if (!bandObj || typeof bandObj !== 'object') {
        errs.push(`Group "${g}" band "${band}" must be an object`);
        continue;
      }
      if (!('lanes' in bandObj) || typeof bandObj.lanes !== 'object' || !bandObj.lanes) {
        errs.push(`Group "${g}" band "${band}" missing "lanes" object`);
        continue;
      }
      // lanes
      for (const lane of REQUIRED_LANES) {
        if (!(lane in bandObj.lanes)) {
          errs.push(`Group "${g}" band "${band}" missing lane "${lane}"`);
          continue;
        }
        const val = bandObj.lanes[lane];
        if (!isStringArray(val)) {
          errs.push(`Group "${g}" band "${band}" lane "${lane}" must be a non-empty string array`);
        }
      }
    }
  }
  return errs;
}

// Validate breed_groups.json (array of group descriptors)
function validateBreedGroups(arr) {
  const errs = [];
  if (!Array.isArray(arr)) return ['breed_groups must be an array'];
  const seenIds = new Set();
  const seenNames = new Set();
  for (const [i, g] of arr.entries()) {
    const where = `index ${i}`;
    if (typeof g !== 'object' || !g) { errs.push(`Item ${where} must be object`); continue; }
    // required-ish fields we’ve seen in your file
    const req = ['id', 'name', 'examples', 'core_traits', 'enrichment', 'owner_tips', 'notification_short', 'cautions', 'gift_tags'];
    for (const k of req) {
      if (!(k in g)) errs.push(`Missing "${k}" in ${where}`);
    }
    if (!nonEmptyString(g.id)) errs.push(`Invalid id at ${where}`);
    if (!nonEmptyString(g.name)) errs.push(`Invalid name at ${where}`);
    if (!isStringArray(g.examples)) errs.push(`"examples" must be string[] at ${where}`);
    if (!isStringArray(g.core_traits)) errs.push(`"core_traits" must be string[] at ${where}`);
    if (!isStringArray(g.enrichment)) errs.push(`"enrichment" must be string[] at ${where}`);
    if (!isStringArray(g.owner_tips)) errs.push(`"owner_tips" must be string[] at ${where}`);
    if (!nonEmptyString(g.notification_short)) errs.push(`"notification_short" must be string at ${where}`);
    if (!isStringArray(g.cautions)) errs.push(`"cautions" must be string[] at ${where}`);
    if (!isStringArray(g.gift_tags)) errs.push(`"gift_tags" must be string[] at ${where}`);

    if (seenIds.has(g.id)) errs.push(`Duplicate id "${g.id}"`);
    seenIds.add(g.id);
    if (seenNames.has(g.name)) errs.push(`Duplicate name "${g.name}"`);
    seenNames.add(g.name);
  }
  return errs;
}

// Validate breed_aliases.json (object: alias -> canonical or array of aliases)
function validateAliases(obj) {
  const errs = [];
  if (Array.isArray(obj) || typeof obj !== 'object' || !obj) return ['breed_aliases must be an object'];
  for (const [alias, val] of Object.entries(obj)) {
    if (!nonEmptyString(alias)) errs.push('Empty alias key');
    const okVal = nonEmptyString(val) || isStringArray(val);
    if (!okVal) errs.push(`Alias "${alias}" must map to a non-empty string (canonical) or string[]`);
  }
  return errs;
}

// Validate breed_taxonomy.json (light check; structure varies)
function validateTaxonomy(obj) {
  const errs = [];
  if (!obj || typeof obj !== 'object') return ['breed_taxonomy must be an object'];
  const keys = Object.keys(obj);
  if (!keys.length) errs.push('taxonomy has no keys');
  // Spot check: values should be objects/arrays/strings—just ensure not null/undefined
  for (const k of keys) {
    const v = obj[k];
    if (v === null || v === undefined) errs.push(`taxonomy key "${k}" has null/undefined value`);
  }
  return errs;
}

// Validate reco-breed.json (per-breed content must follow band/lanes structure)
function validateRecoBreed(obj) {
  const errs = [];
  if (!obj || typeof obj !== 'object') return ['reco-breed must be an object'];
  // allow meta keys optionally
  const breedKeys = Object.keys(obj).filter(k => !META_KEYS.includes(k));
  if (!breedKeys.length) errs.push('No breed entries found in reco-breed');
  for (const b of breedKeys) {
    const entry = obj[b];
    if (!entry || typeof entry !== 'object') { errs.push(`Breed "${b}" must be object`); continue; }
    for (const band of REQUIRED_BANDS) {
      if (!(band in entry)) { errs.push(`Breed "${b}" missing band "${band}"`); continue; }
      const bandObj = entry[band];
      if (!bandObj || typeof bandObj !== 'object') { errs.push(`Breed "${b}" band "${band}" must be object`); continue; }
      if (!('lanes' in bandObj) || typeof bandObj.lanes !== 'object' || !bandObj.lanes) {
        errs.push(`Breed "${b}" band "${band}" missing "lanes" object`); continue;
      }
      for (const lane of REQUIRED_LANES) {
        if (!(lane in bandObj.lanes)) { errs.push(`Breed "${b}" band "${band}" missing lane "${lane}"`); continue; }
        if (!isStringArray(bandObj.lanes[lane])) {
          errs.push(`Breed "${b}" band "${band}" lane "${lane}" must be non-empty string[]`);
        }
      }
    }
  }
  return errs;
}

/* ---------- run ---------- */
(function main() {
  // CLI args
  const args = process.argv.slice(2);
  const getArg = (name) => {
    const idx = args.findIndex(a => a === name || a.startsWith(name + '='));
    if (idx === -1) return null;
    const a = args[idx];
    if (a.includes('=')) return a.split('=').slice(1).join('=');
    return args[idx + 1] || null;
  };

  const pRecoBanded = resolvePathFromArgOrGuess(getArg('--recoBanded'), 'reco-banded');
  const pRecoBreed   = resolvePathFromArgOrGuess(getArg('--recoBreed'), 'reco-breed');
  const pGroups      = resolvePathFromArgOrGuess(getArg('--groups'), 'breed_groups');
  const pAliases     = resolvePathFromArgOrGuess(getArg('--aliases'), 'breed_aliases');
  const pTaxonomy    = resolvePathFromArgOrGuess(getArg('--taxonomy'), 'breed_taxonomy');

  const files = [
    ['reco-banded', pRecoBanded, validateRecoBanded],
    ['reco-breed',  pRecoBreed,  validateRecoBreed],
    ['breed_groups', pGroups,    validateBreedGroups],
    ['breed_aliases', pAliases,  validateAliases],
    ['breed_taxonomy', pTaxonomy, validateTaxonomy],
  ];

  let anyError = false;
  console.log('Barkday data validation');
  console.log('=======================\n');
  console.log('Files under test:');
  for (const [label, p] of files) console.log(`- ${label}: ${path.resolve(p)}`);

  for (const [label, p, validator] of files) {
    reportSection(`\nChecking ${label}`);
    if (!fs.existsSync(p)) {
      console.error(`✖ File not found: ${p}`);
      anyError = true;
      continue;
    }
    const parsed = readJson(p);
    if (!parsed.ok) {
      console.error(`✖ JSON parse error: ${parsed.error}`);
      anyError = true;
      continue;
    }
    const errs = validator(parsed.data);
    if (errs.length) {
      anyError = true;
      for (const e of errs) console.error('✖', e);
    } else {
      console.log('✔ OK');
    }
  }

  reportSection('\nSummary');
  if (anyError) {
    console.error('❌ Validation failed. See errors above.');
    process.exit(1);
  } else {
    console.log('✅ All checks passed.');
    process.exit(0);
  }
})();
