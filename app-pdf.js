/* Barkday PDF add-on — per-record Print PDF (landscape, print-accurate v5)
   Non-destructive:
   - Injects a "Print PDF" button on each Saved Result card (next to Load/Delete).
   - Uses your bdStoreList()/bdToast() if present.
   - Embeds barkday-logo-vector.svg as a vector in the PDF header.
*/

(function () {
  // ---- Utilities ----
  async function ensureJsPDF() {
    if (window.jspdf?.jsPDF) return window.jspdf.jsPDF;
    await new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js';
      s.onload = res; s.onerror = rej; document.head.appendChild(s);
    });
    if (!window.svg2pdf) {
      await new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/svg2pdf.js@2.2.4/dist/svg2pdf.umd.min.js';
        s.onload = res; s.onerror = rej; document.head.appendChild(s);
      });
    }
    return window.jspdf.jsPDF;
  }

  function buildPlanLanesFromNotes(notes) {
    const lanes = [];
    if (!notes || typeof notes !== 'string') return lanes;
    const blocks = notes.split(/\n\s*\n+/);
    for (const block of blocks) {
      const lines = block.split(/\n/).map(s => s.trim()).filter(Boolean);
      if (!lines.length) continue;
      const title = lines[0].replace(/^[-•]+\s*/, '');
      const items = lines.slice(1).map(s => s.replace(/^[-•]+\s*/, '').trim()).filter(Boolean);
      if (items.length) lanes.push({ title, items });
    }
    return lanes;
  }

  async function buildRunPDF(run) {
    const jsPDF = await ensureJsPDF();
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter' }); // 792x612 pt

    // constants (pt)
    const W = 792, H = 612, M = 36, LINE = 16, BUL_LH = 14;
    const RULE = [210, 210, 210];

    const hr = (y) => { doc.setDrawColor(...RULE); doc.setLineWidth(1); doc.line(M, y, W - M, y); };
    const text = (s, x, y, fs = 11, bold = false) => { doc.setFontSize(fs); doc.setFont(undefined, bold ? 'bold' : 'normal'); doc.text(String(s ?? '—'), x, y); };
    const wrap = (s, w, fs = 11) => doc.splitTextToSize(String(s ?? '—'), w);

    // Header with vector logo (1.2in square). If missing, silently skip.
    try {
      const svg = await fetch('barkday-logo-vector.svg').then(r => r.text());
      await doc.svg(svg, { x: M, y: M, width: 86.4, height: 86.4 });
    } catch {}

    text('Barkday™ — Dog Birthday Record', M + 86.4 + 18, M + 24, 22, true);
    text(`Generated: ${new Date(run?.ts || Date.now()).toLocaleString()}`, M + 86.4 + 18, M + 42, 10);
    const headerBottom = M + 86.4 + 20;
    hr(headerBottom);

    // columns
    const GAP = 18, LEFT_W = (W - 2 * M - GAP) * 0.5, RIGHT_W = (W - 2 * M - GAP) - LEFT_W;
    const X_L = M, X_R = M + LEFT_W + GAP;
    let yL = headerBottom + 24, yR = headerBottom + 24;

    // Dog Profile (kv)
    text('Dog Profile', X_L, yL, 15, true); yL += LINE;
    const labelW = 170, valueW = LEFT_W - labelW - 6;

    function kv(label, val) {
      text(label + ':', X_L, yL, 12, true);
      const lines = wrap(val, valueW, 12);
      doc.setFontSize(12); doc.setFont(undefined, 'normal');
      doc.text(lines, X_L + labelW + 6, yL);
      yL += Math.max(LINE, lines.length * LINE);
    }

    kv('Name', run?.dog);
    kv('Breed', run?.breed);
    kv('Group', run?.group);
    kv('Birthdate', run?.dob);
    kv('Adult Weight', Number.isFinite(+run?.weight) ? `${run.weight} lb` : '—');
    kv('Chewer', run?.chewer);
    kv('Milestones', run?.smooth ? 'Smooth enabled' : 'Standard');

    // (No mid-page rule — removed per your approval)
    yL += 12;

    // Current Results Snapshot (boxed rows, no overlap)
    text('Current Results Snapshot', X_L, yL, 15, true); yL += LINE;
    const tableW = LEFT_W, rowLabelW = 210, rowValW = tableW - rowLabelW - 12;

    function row(lbl, val) {
      const lines = wrap(val, rowValW, 12);
      const h = Math.max(LINE, lines.length * LINE) + 8;
      doc.setDrawColor(...RULE); doc.setLineWidth(0.8); doc.rect(X_L, yL - 12, tableW, h, 'S');
      text(lbl, X_L + 8, yL, 12, true);
      doc.setFontSize(12); doc.setFont(undefined, 'normal'); doc.text(lines, X_L + rowLabelW, yL);
      yL += h;
    }

    row('Dog-years (human-equiv.)', run?.kpi?.hy);
    row('Chronological age',       run?.kpi?.dogAge);
    row('Next Barkday (title)',    run?.kpi?.nextHeadline);
    row('Next Barkday (date)',     run?.kpi?.nextDate);
    row('Reminder ISO',            run?.kpi?.nextDateISO);
    row('Reminder Local',          run?.kpi?.nextDateISO ? new Date(run.kpi.nextDateISO).toString() : '—');

    // Plan (right side, two subcolumns, all categories from event.notes)
    text('Next Birthday Plan', X_R, yR, 15, true); yR += LINE;
    const innerGap = 18, subW = (RIGHT_W - innerGap) / 2;
    const colX = [X_R, X_R + subW + innerGap], colY = [yR, yR];

    const lanes = buildPlanLanesFromNotes(run?.event?.notes);
    function laneBlock(i, title, items) {
      text(title, colX[i], colY[i], 12, true); colY[i] += LINE - 2;
      for (const b of (items || [])) {
        const lines = wrap('• ' + b, subW - 14, 11);
        doc.setFontSize(11); doc.setFont(undefined, 'normal');
        doc.text(lines, colX[i] + 10, colY[i]); colY[i] += lines.length * 14;
      }
      colY[i] += 6;
    }
    for (const lane of lanes) {
      const i = (colY[0] <= colY[1]) ? 0 : 1;
      laneBlock(i, lane.title || 'Plan', lane.items || []);
    }

    // Footer
    const footerTop = Math.max(yL, colY[0], colY[1]) + 10;
    hr(footerTop);
    text('Privacy: Barkday™ stores data only on this device. This PDF was generated locally in your browser.', M, footerTop + 18, 9);
    text('Medical disclaimer: Barkday™ is general guidance only and not veterinary advice.', M, footerTop + 34, 9);

    return doc;
  }

  async function printRunPDF(run) {
    const doc = await buildRunPDF(run);
    const url = doc.output('bloburl');
    const w = window.open(url, '_blank');
    if (!w) { (window.bdToast || alert)('Popup blocked — allow popups to print'); return; }
    setTimeout(() => { try { w.focus(); w.print(); } catch {} }, 250);
  }

  // ---- Inject “Print PDF” button per saved card & handle clicks ----

  // 1) Delegate clicks in the Saved drawer
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-act="pdf"]');
    if (!btn) return;

    const idx = Number(btn.dataset.idx);
    const list = (window.bdStoreList ? bdStoreList() : []);
    const run = Array.isArray(list) ? list[idx] : null;
    if (!run) { (window.bdToast || alert)('Record not found'); return; }

    printRunPDF(run);
  });

  // 2) When cards render, add a “Print PDF” button next to Load/Delete
  const savedHost = document.getElementById('bdSaved') || document.body;

  const addPDFButton = (card) => {
    if (!card || !(card instanceof HTMLElement)) return;
    const refBtn = card.querySelector?.('[data-act="load"]');
    if (!refBtn) return;
    const idx = refBtn.dataset.idx;
    if (!idx) return;
    if (card.querySelector('[data-act="pdf"]')) return;

    // pick a reasonable actions container
    const actions = card.querySelector('.bd-row, .actions, footer, .btn-row') || refBtn.parentNode || card;
    const b = document.createElement('button');
    b.className = 'ghost';
    b.type = 'button';
    b.textContent = 'Print PDF';
    b.setAttribute('data-act', 'pdf');
    b.setAttribute('data-idx', idx);
    actions.appendChild(b);
  };

  const mo = new MutationObserver((muts) => {
    muts.forEach((m) => {
      m.addedNodes && [...m.addedNodes].forEach((n) => {
        if (n.nodeType !== 1) return;
        // Treat any element with a load button as a saved card
        if (n.querySelector?.('[data-act="load"]')) addPDFButton(n);
        n.querySelectorAll?.('[data-act="load"]').forEach((el) => addPDFButton(el.closest('article, li, div') || el.parentNode));
      });
    });
  });
  mo.observe(savedHost, { childList: true, subtree: true });

})();
