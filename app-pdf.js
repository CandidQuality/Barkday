/* Barkday™ PDF Add-on — Reliable per-record "Print PDF"
   - Robust waiting for the Saved drawer
   - Injects buttons for existing + future cards
   - Finds run index via data-idx, data-i, or DOM order
   - Vector-logo with PNG fallback
   - Landscape, print-accurate layout (no mid-rule)
   - Full plan category set; "—" when a lane has no items
   - New-tab print (fallback: download if popup blocked)
*/

(function () {
  // ---------- Config ----------
  const CANON_LANES = [
    'Training & Enrichment',
    'Health & Wellness',
    'Diet & Nutrition',
    'Exercise & Bonding',
    'Grooming & Home',
    'Safety & ID',
    'Socialization & Behavior',
    'Gear & Enrichment Ideas'
  ];
  const SHOW_EMPTY_LANES = true; // always show all categories

  // ---------- Small utilities ----------
  function onceDOMReady(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      fn();
    }
  }

  async function ensurePDFLibs() {
    if (!window.jspdf?.jsPDF) {
      await new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js';
        s.onload = res; s.onerror = rej; document.head.appendChild(s);
      });
    }
    if (!window.svg2pdf) {
      await new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/svg2pdf.js@2.2.4/dist/svg2pdf.umd.min.js';
        s.onload = res; s.onerror = rej; document.head.appendChild(s);
      });
    }
    return window.jspdf.jsPDF;
  }

  async function loadSVGText(url) {
    try {
      const r = await fetch(url, { cache: 'no-store' });
      if (!r.ok) throw new Error(String(r.status));
      return await r.text();
    } catch (e) {
      console.warn('[Barkday] SVG logo load failed', e);
      return null;
    }
  }
  async function loadPNGDataURL(url) {
    try {
      const r = await fetch(url, { cache: 'no-store' });
      if (!r.ok) return null;
      const b = await r.blob();
      return await new Promise(res => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(b); });
    } catch {
      return null;
    }
  }

  // ---------- Notes -> lanes (with canonical fill) ----------
  function normalizeLanesFromNotes(notes) {
    const blocks = [];
    if (notes && typeof notes === 'string') {
      notes.split(/\n\s*\n+/).forEach(block => {
        const lines = block.split(/\n/).map(s => s.trim()).filter(Boolean);
        if (!lines.length) return;
        const title = lines[0].replace(/^[-•]+\s*/, '');
        const items = lines.slice(1).map(s => s.replace(/^[-•]+\s*/, '').trim()).filter(Boolean);
        if (title) blocks.push({ title, items });
      });
    }
    if (!SHOW_EMPTY_LANES) return blocks;

    const map = new Map(blocks.map(b => [b.title, b]));
    CANON_LANES.forEach(name => {
      if (!map.has(name)) map.set(name, { title: name, items: [] });
    });
    // Preserve canonical order
    return CANON_LANES.map(name => map.get(name));
  }

  // ---------- PDF builder ----------
  async function buildRunPDF(run) {
    const jsPDF = await ensurePDFLibs();
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter' }); // 792x612

    // constants (pt)
    const W = 792, H = 612, M = 36, LINE = 16, BUL = 14;
    const RULE = [210, 210, 210];
    const hr = (y) => { doc.setDrawColor(...RULE); doc.setLineWidth(1); doc.line(M, y, W - M, y); };
    const tx = (s, x, y, fs = 11, bold = false) => { doc.setFontSize(fs); doc.setFont(undefined, bold ? 'bold' : 'normal'); doc.text(String(s ?? '—'), x, y); };
    const wrap = (s, w, fs = 11) => doc.splitTextToSize(String(s ?? '—'), w);

    // --- Logo (vector with PNG fallback) ---
    const LOGO = { x: M, y: M, w: 86.4, h: 86.4 };
    let svgText = await loadSVGText('barkday-logo-vector.svg');
    if (svgText) {
      try { await doc.svg(svgText, { x: LOGO.x, y: LOGO.y, width: LOGO.w, height: LOGO.h }); }
      catch (e) { console.warn('[Barkday] svg render failed', e); svgText = null; }
    }
    if (!svgText) {
      const png = await loadPNGDataURL('barkday-logo.png?v=3');
      if (png) doc.addImage(png, 'PNG', LOGO.x, LOGO.y, LOGO.w, LOGO.h);
    }

    // --- Header ---
    tx('Barkday™ — Dog Birthday Record', M + LOGO.w + 18, M + 24, 22, true);
    tx(`Generated: ${new Date(run?.ts || Date.now()).toLocaleString()}`, M + LOGO.w + 18, M + 42, 10);
    const headerBottom = M + LOGO.h + 20;
    hr(headerBottom);

    // --- Columns ---
    const GAP = 18, LEFT_W = (W - 2 * M - GAP) * 0.5, RIGHT_W = (W - 2 * M - GAP) - LEFT_W;
    const X_L = M, X_R = M + LEFT_W + GAP;
    let yL = headerBottom + 24, yR = headerBottom + 24;

    // --- Dog Profile ---
    tx('Dog Profile', X_L, yL, 15, true); yL += LINE;
    const labelW = 170, valueW = LEFT_W - labelW - 6;

    function kv(label, val) {
      tx(label + ':', X_L, yL, 12, true);
      const lines = wrap(val, valueW, 12);
      doc.setFontSize(12); doc.setFont(undefined, 'normal'); doc.text(lines, X_L + labelW + 6, yL);
      yL += Math.max(LINE, lines.length * LINE);
    }

    // Prefer normalized/canonical breed label if your app set it
    kv('Name', run?.dog);
    kv('Breed', run?.breedLabel || run?.breed);
    kv('Group', run?.group);
    kv('Birthdate', run?.dob);
    kv('Adult Weight', Number.isFinite(+run?.weight) ? `${run.weight} lb` : '—');
    kv('Chewer', run?.chewer);
    kv('Milestones', run?.smooth ? 'Smooth enabled' : 'Standard');

    yL += 12; // (no mid-page rule)

    // --- Snapshot (boxed rows, no overlap) ---
    tx('Current Results Snapshot', X_L, yL, 15, true); yL += LINE;
    const tableW = LEFT_W, rowLabelW = 210, rowValW = tableW - rowLabelW - 12;

    function row(lbl, val) {
      const lines = wrap(val, rowValW, 12);
      const h = Math.max(LINE, lines.length * LINE) + 8;
      doc.setDrawColor(...RULE); doc.setLineWidth(0.8); doc.rect(X_L, yL - 12, tableW, h, 'S');
      tx(lbl, X_L + 8, yL, 12, true);
      doc.setFontSize(12); doc.setFont(undefined, 'normal'); doc.text(lines, X_L + rowLabelW, yL);
      yL += h;
    }

    // Short "Reminder Local" (e.g., "Oct 27, 2025, 9:00 AM (CDT)")
    const localStr = (() => {
      const iso = run?.kpi?.nextDateISO;
      if (!iso) return '—';
      const d = new Date(iso);
      const fmt = new Intl.DateTimeFormat([], { dateStyle: 'medium', timeStyle: 'short' });
      const s = fmt.format(d);
      const tz = /\(([^)]+)\)$/.exec(d.toString());
      const abbr = tz ? tz[1].replace(/(^|\s)([A-Z])[a-z]*/g, (_m, _sp, c) => c).replace(/\s+/g, '') : '';
      return abbr ? `${s} (${abbr})` : s;
    })();

    row('Dog-years (human-equiv.)', run?.kpi?.hy);
    row('Chronological age',       run?.kpi?.dogAge);
    row('Next Barkday (title)',    run?.kpi?.nextHeadline);
    row('Next Barkday (date)',     run?.kpi?.nextDate);
    row('Reminder ISO',            run?.kpi?.nextDateISO || '—');
    row('Reminder Local',          localStr);

    // --- Plan (right; two columns; full canonical set) ---
    tx('Next Birthday Plan', X_R, yR, 15, true); yR += LINE;
    const innerGap = 18, subW = (RIGHT_W - innerGap) / 2;
    const colX = [X_R, X_R + subW + innerGap], colY = [yR, yR];

    const lanes = normalizeLanesFromNotes(run?.event?.notes);

    function laneBlock(i, title, items) {
      tx(title || 'Plan', colX[i], colY[i], 12, true); colY[i] += LINE - 2;
      const list = (items && items.length) ? items : ['—'];
      for (const b of list) {
        const lines = wrap('• ' + b, subW - 14, 11);
        doc.setFontSize(11); doc.setFont(undefined, 'normal'); doc.text(lines, colX[i] + 10, colY[i]);
        colY[i] += lines.length * BUL;
      }
      colY[i] += 6;
    }

    for (const lane of lanes) {
      const i = (colY[0] <= colY[1]) ? 0 : 1;
      laneBlock(i, lane.title, lane.items);
    }

    // --- Footer ---
    const footerTop = Math.max(yL, colY[0], colY[1]) + 10; hr(footerTop);
    tx('Privacy: Barkday™ stores data only on this device. This PDF was generated locally in your browser.', M, footerTop + 18, 9);
    tx('Medical disclaimer: Barkday™ is general guidance only and not veterinary advice.', M, footerTop + 34, 9);

    return doc;
  }

  // ---------- Button injection + click handling ----------
  function findSavedHost() {
    // Prefer the inner cards container if present
    const body = document.getElementById('bdSavedBody') || document.getElementById('bdSaved') || document.body;
    const cards = body.querySelector('#bdSavedCards');
    return cards || body;
  }

  function injectButtonsIn(container) {
    const loads = container.querySelectorAll('[data-act="load"]');
    loads.forEach(loadBtn => {
      const card = loadBtn.closest('.bd-card, article, li, div') || loadBtn.parentNode;
      if (!card || card.querySelector('[data-act="pdf"]')) return;

      const idx = loadBtn.dataset.idx || card.getAttribute('data-i');
      const actions = loadBtn.parentNode; // same row as Load/Delete
      const btn = document.createElement('button');
      btn.className = 'ghost';
      btn.type = 'button';
      btn.textContent = 'Print PDF';
      btn.setAttribute('data-act', 'pdf');
      if (idx != null) btn.setAttribute('data-idx', idx);
      actions.appendChild(btn);
    });
  }

  function computeIndexForButton(btn) {
    // 1) explicit data-idx
    let idx = btn.dataset.idx;
    if (idx != null) return Number(idx);

    // 2) nearest card’s data-i
    const card = btn.closest('[data-i]');
    if (card) return Number(card.getAttribute('data-i'));

    // 3) position among current Load buttons
    const allLoads = [...document.querySelectorAll('#bdSavedBody [data-act="load"]')];
    const localLoad = btn.parentNode?.querySelector?.('[data-act="load"]');
    const pos = allLoads.indexOf(localLoad);
    return pos >= 0 ? pos : 0;
  }

  function bindGlobalClick() {
    document.addEventListener('click', async (e) => {
      const btn = e.target.closest && e.target.closest('[data-act="pdf"]');
      if (!btn) return;

      const idx = computeIndexForButton(btn);
      const list = (window.bdStoreList ? bdStoreList() : []);
      const run = list[idx];
      if (!run) { (window.bdToast || alert)('Record not found'); return; }

      const doc = await buildRunPDF(run);
      const url = doc.output('bloburl');
      const w = window.open(url, '_blank');

      if (!w) {
        (window.bdToast || alert)('Popup blocked — saving the PDF instead.');
        const safe = (run?.dog || 'Barkday').replace(/[^\w\- ]+/g, '').trim() || 'Barkday';
        doc.save(`${safe}-Barkday.pdf`);
      } else {
        setTimeout(() => { try { w.focus(); w.print(); } catch { } }, 300);
      }
    });
  }

  function startObserving(host) {
    // Inject now for existing cards
    injectButtonsIn(host);

    // Then observe for future renders
    const mo = new MutationObserver(muts => {
      for (const m of muts) {
        if (m.addedNodes) m.addedNodes.forEach(n => {
          if (n.nodeType === 1) injectButtonsIn(n);
        });
      }
    });
    mo.observe(host, { childList: true, subtree: true });

    // Also “pump” a few times in case the UI renders right after we start
    let pumps = 0;
    const pump = setInterval(() => {
      injectButtonsIn(host);
      if (++pumps >= 20) clearInterval(pump);  // ~5s total at 250ms
    }, 250);
  }

  onceDOMReady(() => {
    const wait = setInterval(() => {
      const host = findSavedHost();
      if (!host) return;
      clearInterval(wait);
      bindGlobalClick();
      startObserving(host);
    }, 50);
    setTimeout(() => clearInterval(wait), 10000); // stop waiting after 10s
  });
})();
