"use strict";
/* Maisonnée · Présences : relevé PDF (A4) et fichier Excel (XLSX), fabriqués SUR LE TÉLÉPHONE.
   Aucune bibliothèque externe, aucun envoi réseau : le PDF et le XLSX sont écrits ici octet par octet.
   Chargé après presences.js. */

/* ---------- données d'un export ---------- */
function prCollect(opts) {
  // seules les journées passées (jusqu'à aujourd'hui) sont relevées : rien n'est prévu ni inventé
  const { kids, from } = opts, to = opts.to > today() ? today() : opts.to, ix = PR.ix;
  return kids.map(c => {
    const days = [];
    for (const d of PRC.eachDay(from, to)) days.push({ d, ...PRC.dayStatus(ix, c.id, d) });
    const kinds = (ix.periods.get(c.id) || []).filter(p => p.start_day <= to && (!p.end_day || p.end_day >= from));
    const n = k => days.filter(x => x.st === k).length;
    return { c, days, kinds, present: n("present"), absent: n("absent"), none: n("none"), unsure: days.filter(x => x.unsure).length, manual: days.filter(x => x.manual).length };
  });
}
const prKindsText = r => r.kinds.length ? r.kinds.map(p => `${PR_KIND[p.kind]} ${p.end_day ? `du ${prD(p.start_day)} au ${prD(p.end_day)}` : `depuis le ${prD(p.start_day)}`}`).join(" ; ") : "Aucune période d'accueil sur cette période";
function prRangesText(days) {
  return PRC.ranges(days).map(([a, b]) => a === b ? prD(a) : a.slice(0, 4) === b.slice(0, 4) ? `du ${a.slice(8, 10)}/${a.slice(5, 7)} au ${prD(b)}` : `du ${prD(a)} au ${prD(b)}`).join(" ; ");
}
const prAscii = s => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9-]+/g, "-").replace(/^-|-$/g, "");
function prFileBase(opts) {
  const p = opts.per === "month" ? opts.from.slice(0, 7) : opts.per === "year" ? opts.from.slice(0, 4) : `${opts.from}_${opts.to}`;
  return `Releve-presence_${p}_${opts.kids.length === 1 ? prAscii(opts.kids[0].first_name) : opts.kids.length + "-enfants"}`;
}
const prPeriodText = o => o.per === "month" ? `${cap(PR_MOIS[+o.from.slice(5, 7) - 1])} ${o.from.slice(0, 4)} (du ${prD(o.from)} au ${prD(o.to)})` : o.per === "year" ? `Année ${o.from.slice(0, 4)} (du ${prD(o.from)} au ${prD(o.to)})` : `Du ${prD(o.from)} au ${prD(o.to)}`;
const prNowText = () => new Date().toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" });
const prSrcText = () => { const l = prSet().last; return `Google Agenda${l && l.at ? ` (dernière synchronisation le ${new Date(l.at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })})` : ""} et corrections saisies dans Maisonnée`; };

/* ---------- mini-générateur PDF (Helvetica, WinAnsi) ---------- */
const PR_HW = {"Helvetica":[278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584,761,556,0,222,556,333,1000,556,556,333,1000,667,333,1000,0,611,0,0,222,222,333,333,350,556,1000,333,1000,500,333,944,0,500,667,278,333,556,556,556,556,260,556,333,737,370,556,584,333,737,333,400,584,333,333,333,556,537,278,333,333,365,556,834,834,834,611,667,667,667,667,667,667,1000,722,667,667,667,667,278,278,278,278,722,722,778,778,778,778,778,584,778,722,722,722,722,667,667,611,556,556,556,556,556,556,889,500,556,556,556,556,278,278,278,278,556,556,556,556,556,556,556,584,611,556,556,556,556,500,556,500],"Helvetica-Bold":[278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584,761,556,0,278,556,500,1000,556,556,333,1000,667,333,1000,0,611,0,0,278,278,500,500,350,556,1000,333,1000,556,333,944,0,500,667,278,333,556,556,556,556,280,556,333,737,370,556,584,333,737,333,400,584,333,333,333,611,556,278,333,333,365,556,834,834,834,611,722,722,722,722,722,722,1000,722,667,667,667,667,278,278,278,278,722,722,778,778,778,778,778,584,778,722,722,722,722,667,667,611,556,556,556,556,556,556,889,556,556,556,556,556,278,278,278,278,611,611,611,611,611,611,611,584,611,611,611,611,611,556,611,556]};
const PR_W1252 = { 0x20AC: 128, 0x201A: 130, 0x0192: 131, 0x201E: 132, 0x2026: 133, 0x2020: 134, 0x2021: 135, 0x02C6: 136, 0x2030: 137, 0x0160: 138, 0x2039: 139, 0x0152: 140, 0x017D: 142, 0x2018: 145, 0x2019: 146, 0x201C: 147, 0x201D: 148, 0x2022: 149, 0x2013: 150, 0x2014: 151, 0x02DC: 152, 0x2122: 153, 0x0161: 154, 0x203A: 155, 0x0153: 156, 0x017E: 158, 0x0178: 159 };
const prCode = ch => { const u = ch.codePointAt(0); if (u === 0x202F || u === 0x00A0) return 32; if (u < 128 || (u >= 160 && u < 256)) return u; return PR_W1252[u] || 63; };
function PrPdf() {
  const K = 72 / 25.4, pages = [];
  let cur = null;
  const n = v => (Math.round(v * 100) / 100).toString();
  const rgb = h => { const x = parseInt(h.slice(1), 16); return [(x >> 16) / 255, ((x >> 8) & 255) / 255, (x & 255) / 255].map(v => v.toFixed(3)).join(" "); };
  const enc = s => [...String(s)].map(ch => { const c = prCode(ch); const b = String.fromCharCode(c); return b === "(" || b === ")" || b === "\\" ? "\\" + b : b; }).join("");
  const api = {
    W: 210, H: 297,
    page() { cur = []; pages.push(cur); return api; },
    width(s, size, bold) { const t = PR_HW[bold ? "Helvetica-Bold" : "Helvetica"]; let w = 0; for (const ch of String(s)) { const c = prCode(ch); w += c >= 32 ? t[c - 32] || 556 : 0; } return w / 1000 * size / K; },
    text(x, y, s, o = {}) {
      const size = o.size || 10, w = api.width(s, size, o.bold);
      const X = o.align === "right" ? x - w : o.align === "center" ? x - w / 2 : x;
      cur.push(`BT /${o.bold ? "F2" : "F1"} ${n(size)} Tf ${rgb(o.color || "#1b2433")} rg ${n(X * K)} ${n((api.H - y) * K)} Td (${enc(s)}) Tj ET`);
    },
    rect(x, y, w, h, o = {}) {
      const ops = [];
      if (o.fill) ops.push(`${rgb(o.fill)} rg`);
      if (o.stroke) ops.push(`${rgb(o.stroke)} RG ${n((o.lw || .2) * K)} w`);
      ops.push(`${n(x * K)} ${n((api.H - y - h) * K)} ${n(w * K)} ${n(h * K)} re ${o.fill && o.stroke ? "B" : o.fill ? "f" : "S"}`);
      cur.push(ops.join(" "));
    },
    line(x1, y1, x2, y2, o = {}) { cur.push(`${rgb(o.color || "#9aa7bd")} RG ${n((o.lw || .2) * K)} w ${n(x1 * K)} ${n((api.H - y1) * K)} m ${n(x2 * K)} ${n((api.H - y2) * K)} l S`); },
    wrap(s, size, bold, maxw) {
      const out = []; let line = "";
      for (const word of String(s).split(" ")) { const t = line ? line + " " + word : word; if (api.width(t, size, bold) > maxw && line) { out.push(line); line = word; } else line = t; }
      if (line) out.push(line); return out;
    },
    get pageCount() { return pages.length; },
    get index() { return pages.length; },
    goto(i) { cur = pages[i - 1]; },
    blob(title) {
      const objs = [], off = [];
      objs.push("<< /Type /Catalog /Pages 2 0 R >>");
      const kids = pages.map((_, i) => `${5 + i * 2} 0 R`).join(" ");
      objs.push(`<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`);
      objs.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
      objs.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
      pages.forEach((ops, i) => {
        const body = ops.join("\n");
        objs.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${6 + i * 2} 0 R >>`);
        objs.push(`<< /Length ${body.length} >>\nstream\n${body}\nendstream`);
      });
      const d = new Date(), z = x => String(x).padStart(2, "0");
      objs.push(`<< /Title (${enc(title)}) /Producer (Maisonnee) /CreationDate (D:${d.getFullYear()}${z(d.getMonth() + 1)}${z(d.getDate())}${z(d.getHours())}${z(d.getMinutes())}${z(d.getSeconds())}) >>`);
      let s = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
      objs.forEach((o, i) => { off.push(s.length); s += `${i + 1} 0 obj\n${o}\nendobj\n`; });
      const xref = s.length;
      s += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${off.map(o => String(o).padStart(10, "0") + " 00000 n \n").join("")}`;
      s += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R /Info ${objs.length} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
      const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i) & 255;
      return new Blob([u], { type: "application/pdf" });
    }
  };
  return api;
}

const PR_PDF_C = { present: ["#d8f5e1", "#127a3b", "P"], absent: ["#fbdcdc", "#b3261e", "A"], none: ["#eceff4", "#6b778c", "–"] };
async function prPdf(opts) {
  const R = prCollect(opts), doc = PrPdf(), M = 14, W = 210 - 2 * M, navy = "#13284a", foyer = S.hh && S.hh.name ? S.hh.name : "";
  let y = 0;
  const newPage = () => { doc.page(); y = 16; doc.text(M, y, "Relevé de présence", { size: 19, bold: true, color: navy }); doc.text(210 - M, y - 1, `Maisonnée${foyer ? " · " + foyer : ""}`, { size: 8.5, align: "right", color: "#5d6a80" }); y += 4; doc.rect(M, y, W, .7, { fill: "#2f6fe4" }); y += 8; };
  const need = h => { if (y + h > 297 - 20) { newPage(); return true; } return false; };
  const para = (label, text, o = {}) => {
    const lines = doc.wrap(text || "—", 9.5, false, W - 36);
    need(lines.length * 4.6 + 2);
    doc.text(M, y, label, { size: 9.5, bold: true, color: o.color || navy });
    lines.forEach((l, i) => doc.text(M + 36, y + i * 4.6, l, { size: 9.5, color: o.color }));
    y += lines.length * 4.6 + 2.4;
  };
  for (const r of R) {
    newPage();
    para("Enfant", prName(r.c) + (r.c.archived ? " (accueil terminé)" : ""));
    para("Type d'accueil", prKindsText(r));
    para("Période", prPeriodText(opts));
    para("Source", prSrcText());
    if (opts.to > today()) para("Arrêté au", `${prD(today())} : les journées suivantes ne sont pas encore relevées.`);
    y += 2;
    // chiffres clés
    const boxes = [["Jours de présence", r.present, "#127a3b", "#e3f6ea"], ["Jours d'absence", r.absent, "#b3261e", "#fde7e7"], ["Jours sans accueil", r.none, "#5d6a80", "#eef1f5"]].concat(r.unsure ? [["Jours à vérifier", r.unsure, "#b25b00", "#fff1dd"]] : []);
    const bw = (W - (boxes.length - 1) * 4) / boxes.length;
    boxes.forEach(([t, v, c, bg], i) => { const x = M + i * (bw + 4); doc.rect(x, y, bw, 17, { fill: bg, stroke: c, lw: .3 }); doc.text(x + bw / 2, y + 9, String(v), { size: 15, bold: true, color: c, align: "center" }); doc.text(x + bw / 2, y + 14.2, t, { size: 8, color: c, align: "center" }); });
    y += 24;
    // tableau des journées : une ligne par mois, une colonne par jour
    const LW = 21, TW = 11, cw = (W - LW - 2 * TW) / 31, rh = 6.4;
    const head = () => {
      doc.text(M, y, "Tableau des journées", { size: 11, bold: true, color: navy }); y += 3;
      doc.rect(M, y, W, 5.4, { fill: "#13284a" });
      doc.text(M + 1.5, y + 3.8, "Mois", { size: 7, bold: true, color: "#ffffff" });
      for (let i = 1; i <= 31; i++) doc.text(M + LW + (i - .5) * cw, y + 3.8, String(i), { size: 6.5, bold: true, color: "#ffffff", align: "center" });
      doc.text(M + LW + 31 * cw + TW / 2, y + 3.8, "Prés.", { size: 6.5, bold: true, color: "#ffffff", align: "center" });
      doc.text(M + LW + 31 * cw + TW * 1.5, y + 3.8, "Abs.", { size: 6.5, bold: true, color: "#ffffff", align: "center" });
      y += 5.4;
    };
    need(30); head();
    const months = []; for (let d = opts.from.slice(0, 7) + "-01"; d <= opts.to; d = PRC.dAdd(PRC.mLast(+d.slice(0, 4), +d.slice(5, 7)), 1)) months.push(d.slice(0, 7));
    const byDay = new Map(r.days.map(x => [x.d, x]));
    for (const ym of months) {
      if (need(rh + 2)) head();
      const [yy, mm] = ym.split("-").map(Number), nd = PRC.monthDays(yy, mm);
      let p = 0, a = 0;
      doc.rect(M, y, LW, rh, { fill: "#f4f6fa", stroke: "#c9d2e0", lw: .15 });
      doc.text(M + 1.5, y + 4.3, `${PR_MC[mm - 1]} ${yy}`, { size: 7.5, bold: true, color: navy });
      for (let i = 1; i <= 31; i++) {
        const x = M + LW + (i - 1) * cw, d = `${ym}-${String(i).padStart(2, "0")}`, s = i <= nd ? byDay.get(d) : null;
        if (i > nd) { doc.rect(x, y, cw, rh, { fill: "#d9dee7", stroke: "#c9d2e0", lw: .15 }); continue; }
        if (!s) { doc.rect(x, y, cw, rh, { fill: "#ffffff", stroke: "#c9d2e0", lw: .15 }); continue; }
        const [bg, fg, l] = PR_PDF_C[s.st]; if (s.st === "present") p++; if (s.st === "absent") a++;
        doc.rect(x, y, cw, rh, { fill: s.unsure ? "#ffe7c2" : bg, stroke: "#c9d2e0", lw: .15 });
        doc.text(x + cw / 2, y + 4.3, l + (s.manual ? "*" : "") + (s.unsure ? "?" : ""), { size: s.manual || s.unsure ? 6 : 7.5, bold: true, color: s.unsure ? "#b25b00" : fg, align: "center" });
      }
      const tx = M + LW + 31 * cw;
      doc.rect(tx, y, TW, rh, { fill: "#e3f6ea", stroke: "#c9d2e0", lw: .15 }); doc.text(tx + TW / 2, y + 4.3, String(p), { size: 8, bold: true, color: "#127a3b", align: "center" });
      doc.rect(tx + TW, y, TW, rh, { fill: "#fde7e7", stroke: "#c9d2e0", lw: .15 }); doc.text(tx + TW * 1.5, y + 4.3, String(a), { size: 8, bold: true, color: "#b3261e", align: "center" });
      y += rh;
    }
    y += 3;
    need(6); doc.text(M, y, "P = présent   A = absent   – = pas d'accueil   * = corrigé manuellement   ? = à vérifier   case blanche = hors période du relevé", { size: 7, color: "#5d6a80" }); y += 7;
    para("Total", `${plural(r.present, "journée de présence", "journées de présence")}`, { color: "#127a3b" });
    para("Dates de présence", prRangesText(r.days.filter(x => x.st === "present").map(x => x.d)) || "aucune");
    para("Dates d'absence", prRangesText(r.days.filter(x => x.st === "absent").map(x => x.d)) || "aucune");
    if (r.manual) para("Corrigé à la main", r.days.filter(x => x.manual).map(x => `${prD(x.d)} : ${PR_ST[x.st].toLowerCase()}`).join(" ; "));
    if (r.unsure) para("Statut incertain", r.days.filter(x => x.unsure).map(x => `${prD(x.d)} (« ${x.evs.filter(e => e.it === "ambig").map(e => e.ev.title).join(" », « ")} »)`).join(" ; ") + ". Ces journées n'ont pas encore été confirmées.", { color: "#b25b00" });
  }
  if (R.length > 1) {
    newPage();
    doc.text(M, y, "Récapitulatif", { size: 12, bold: true, color: navy }); y += 4;
    para("Période", prPeriodText(opts));
    const cols = [["Enfant", 50], ["Type d'accueil", 46], ["Présences", 22], ["Absences", 22], ["Sans accueil", 22], ["À vérifier", 20]];
    const row = (vals, o = {}) => { let x = M; need(7); cols.forEach(([, w], i) => { doc.rect(x, y, w, 7, { fill: o.fill || "#ffffff", stroke: "#c9d2e0", lw: .15 }); doc.text(i < 2 ? x + 1.5 : x + w / 2, y + 4.7, String(vals[i]), { size: 8.5, bold: !!o.bold, color: o.color || "#1b2433", align: i < 2 ? "left" : "center" }); x += w; }); y += 7; };
    row(cols.map(c => c[0]), { fill: "#13284a", color: "#ffffff", bold: true });
    for (const r of R) row([prName(r.c), [...new Set(r.kinds.map(k => PR_KIND[k.kind]))].join(" puis ") || "—", r.present, r.absent, r.none, r.unsure || ""]);
    row(["Total", "", R.reduce((s, r) => s + r.present, 0), R.reduce((s, r) => s + r.absent, 0), R.reduce((s, r) => s + r.none, 0), R.reduce((s, r) => s + r.unsure, 0) || ""], { fill: "#eef1f5", bold: true });
  }
  const tot = doc.pageCount, gen = `Généré le ${prNowText()} avec Maisonnée. Document confidentiel : données personnelles d'un enfant confié.`;
  for (let i = 1; i <= tot; i++) { doc.goto(i); doc.line(M, 284, 210 - M, 284, { color: "#c9d2e0" }); doc.text(M, 288.5, gen, { size: 7, color: "#5d6a80" }); doc.text(210 - M, 288.5, `Page ${i} / ${tot}`, { size: 7, color: "#5d6a80", align: "right" }); }
  return { blob: doc.blob("Relevé de présence"), name: prFileBase(opts) + ".pdf" };
}

/* ---------- mini-générateur XLSX (zip sans compression) ---------- */
const PR_CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const prCrc = u => { let c = 0xFFFFFFFF; for (let i = 0; i < u.length; i++) c = PR_CRC[(c ^ u[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
function prZip(files) {
  const te = new TextEncoder(), parts = [], cen = [];
  let off = 0;
  const d = new Date(), time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1), date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  for (const [name, text] of files) {
    const data = te.encode(text), nm = te.encode(name), crc = prCrc(data);
    const h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true); h.setUint16(10, time, true); h.setUint16(12, date, true);
    h.setUint32(14, crc, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, nm.length, true); h.setUint16(28, 0, true);
    parts.push(new Uint8Array(h.buffer), nm, data);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true); c.setUint16(12, time, true); c.setUint16(14, date, true);
    c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true); c.setUint16(28, nm.length, true); c.setUint32(42, off, true);
    cen.push(new Uint8Array(c.buffer), nm);
    off += 30 + nm.length + data.length;
  }
  const cs = cen.reduce((s, x) => s + x.length, 0), e = new DataView(new ArrayBuffer(22));
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, cs, true); e.setUint32(16, off, true);
  return new Blob([...parts, ...cen, new Uint8Array(e.buffer)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}
const prX = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
const prCol = i => { let s = ""; i++; while (i) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = (i - m - 1) / 26; } return s; };
// styles : 0 normal · 1 en-tête · 2 date · 3 présent · 4 absent · 5 sans accueil · 6 titre · 7 total (gras) · 8 à vérifier
const PR_XSTYLE = { present: 3, absent: 4, none: 5 };
function prSheet(rows, o = {}) {
  const xml = rows.map((r, ri) => `<row r="${ri + 1}">${r.map((v, ci) => {
    if (v === null || v === undefined || v === "") return "";
    const ref = prCol(ci) + (ri + 1); let s = 0, val = v;
    if (v && typeof v === "object") { s = v.s || 0; val = v.v; }
    if (typeof val === "number") return `<c r="${ref}" s="${s}"><v>${val}</v></c>`;
    return `<c r="${ref}" s="${s}" t="inlineStr"><is><t xml:space="preserve">${prX(val)}</t></is></c>`;
  }).join("")}</row>`).join("");
  const cols = o.cols ? `<cols>${o.cols.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join("")}</cols>` : "";
  const pane = o.freeze ? `<sheetViews><sheetView workbookViewId="0"><pane ${o.freeze[1] ? `xSplit="${o.freeze[1]}" ` : ""}ySplit="${o.freeze[0]}" topLeftCell="${prCol(o.freeze[1] || 0)}${o.freeze[0] + 1}" activePane="bottomRight" state="frozen"/></sheetView></sheetViews>` : "";
  const af = o.filter && rows.length > 1 ? `<autoFilter ref="A${o.filter}:${prCol(rows[o.filter - 1].length - 1)}${rows.length}"/>` : "";
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">${pane}${cols}<sheetData>${xml}</sheetData>${af}</worksheet>`;
}
const prXDate = s => ({ v: Math.round((Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) - Date.UTC(1899, 11, 30)) / 864e5), s: 2 });
const PR_JL = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];
async function prXlsx(opts) {
  const R = prCollect(opts), H = t => ({ v: t, s: 1 });
  // 1. Journées
  const j = [["Enfant", "Nom", "Date", "Jour", "Type d'accueil", "Statut", "Origine", "À vérifier", "Événement(s) Google Agenda"].map(H)];
  for (const r of R) for (const x of r.days) j.push([r.c.first_name, r.c.last_name || "", prXDate(x.d), PR_JL[PRC.dow(x.d)], x.kind ? PR_KIND[x.kind] : "Hors accueil", { v: PR_ST[x.st], s: PR_XSTYLE[x.st] }, x.manual ? "Correction manuelle" : "Calcul automatique", x.unsure ? { v: "Oui", s: 8 } : "", x.evs.map(e => e.ev.title).join(" | ")]);
  // 2. Grille par mois
  const months = []; for (let d = opts.from.slice(0, 7) + "-01"; d <= opts.to; d = PRC.dAdd(PRC.mLast(+d.slice(0, 4), +d.slice(5, 7)), 1)) months.push(d.slice(0, 7));
  const g = [[H("Enfant"), H("Mois"), ...Array.from({ length: 31 }, (_, i) => H(i + 1)), H("Présences"), H("Absences")]];
  for (const r of R) { const by = new Map(r.days.map(x => [x.d, x])); for (const ym of months) { let p = 0, a = 0; const cells = Array.from({ length: 31 }, (_, i) => { const x = by.get(`${ym}-${String(i + 1).padStart(2, "0")}`); if (!x) return ""; if (x.st === "present") p++; if (x.st === "absent") a++; return { v: { present: "P", absent: "A", none: "–" }[x.st] + (x.manual ? "*" : "") + (x.unsure ? "?" : ""), s: x.unsure ? 8 : PR_XSTYLE[x.st] }; }); g.push([r.c.first_name, `${PR_MOIS[+ym.slice(5) - 1]} ${ym.slice(0, 4)}`, ...cells, { v: p, s: 7 }, { v: a, s: 7 }]); } }
  // 3. Totaux mensuels et 4. annuels
  const tm = [["Enfant", "Mois", "Type d'accueil", "Présences", "Absences", "Sans accueil", "Journées d'accueil", "À vérifier", "Corrigées à la main"].map(H)];
  const ta = [["Enfant", "Année", "Présences", "Absences", "Sans accueil", "Journées d'accueil", "À vérifier"].map(H)];
  for (const r of R) {
    const grp = (f) => { const m = new Map(); for (const x of r.days) { const k = f(x.d); if (!m.has(k)) m.set(k, []); m.get(k).push(x); } return m; };
    const cnt = l => ({ p: l.filter(x => x.st === "present").length, a: l.filter(x => x.st === "absent").length, n: l.filter(x => x.st === "none").length, u: l.filter(x => x.unsure).length, m: l.filter(x => x.manual).length });
    for (const [k, l] of grp(d => d.slice(0, 7))) { const c = cnt(l); tm.push([r.c.first_name, `${PR_MOIS[+k.slice(5) - 1]} ${k.slice(0, 4)}`, [...new Set(l.map(x => x.kind).filter(Boolean).map(k => PR_KIND[k]))].join(" puis ") || "—", c.p, c.a, c.n, c.p + c.a, c.u || "", c.m || ""]); }
    for (const [k, l] of grp(d => d.slice(0, 4))) { const c = cnt(l); ta.push([r.c.first_name, +k, c.p, c.a, c.n, c.p + c.a, c.u || ""]); }
  }
  const sum = (rows, i) => rows.slice(1).reduce((s, r) => s + (+r[i] || 0), 0);
  tm.push([{ v: "Total", s: 7 }, "", "", { v: sum(tm, 3), s: 7 }, { v: sum(tm, 4), s: 7 }, { v: sum(tm, 5), s: 7 }, { v: sum(tm, 6), s: 7 }]);
  ta.push([{ v: "Total", s: 7 }, "", { v: sum(ta, 2), s: 7 }, { v: sum(ta, 3), s: 7 }, { v: sum(ta, 4), s: 7 }, { v: sum(ta, 5), s: 7 }]);
  // 5. Informations
  const info = [[{ v: "Relevé de présence", s: 6 }], [], ["Foyer", S.hh && S.hh.name || ""], ["Période", prPeriodText(opts)], ...(opts.to > today() ? [["Arrêté au", prD(today()) + " (les journées suivantes ne sont pas encore relevées)"]] : []), ["Enfants", R.map(r => prName(r.c)).join(", ")], ["Généré le", prNowText()], ["Source", prSrcText()], [],
    [H("Légende")], ["P / Présent", "journée de présence comptabilisée"], ["A / Absent", "absence d'un enfant en accueil permanent"], ["– / Aucun accueil", "jour hors période d'accueil, ou sans relais prévu"], ["*", "journée corrigée à la main (prioritaire sur Google Agenda)"], ["?", "statut incertain : à vérifier dans Maisonnée"], [], ["Document confidentiel", "données personnelles d'enfants confiés"]];
  const sheets = [["Journées", prSheet(j, { cols: [14, 14, 12, 11, 15, 14, 20, 11, 50], freeze: [1, 1], filter: 1 })], ["Grille", prSheet(g, { cols: [14, 16, ...Array(31).fill(4.2), 10, 10], freeze: [1, 2] })], ["Totaux mensuels", prSheet(tm, { cols: [14, 16, 20, 11, 11, 13, 17, 11, 18], freeze: [1, 0] })], ["Totaux annuels", prSheet(ta, { cols: [14, 8, 11, 11, 13, 17, 11], freeze: [1, 0] })], ["Informations", prSheet(info, { cols: [22, 80] })]];
  const fill = c => `<fill><patternFill patternType="solid"><fgColor rgb="FF${c}"/><bgColor indexed="64"/></patternFill></fill>`;
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/></numFmts>
<fonts count="5"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><b/><sz val="16"/><color rgb="FF13284A"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFB25B00"/><name val="Calibri"/></font></fonts>
<fills count="7"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>${fill("13284A")}${fill("D8F5E1")}${fill("FBDCDC")}${fill("ECEFF4")}${fill("FFE7C2")}</fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="9"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="0" fontId="0" fillId="3" borderId="0" xfId="0" applyFill="1"/><xf numFmtId="0" fontId="0" fillId="4" borderId="0" xfId="0" applyFill="1"/><xf numFmtId="0" fontId="0" fillId="5" borderId="0" xfId="0" applyFill="1"/><xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="0" fontId="4" fillId="6" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
  const files = [
    ["[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>`],
    ["_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
    ["xl/workbook.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map(([n], i) => `<sheet name="${prX(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets></workbook>`],
    ["xl/_rels/workbook.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
    ["xl/styles.xml", styles],
    ...sheets.map(([, x], i) => [`xl/worksheets/sheet${i + 1}.xml`, x])
  ];
  return { blob: prZip(files), name: prFileBase(opts) + ".xlsx" };
}

/* ---------- remise du fichier ---------- */
// Appelé depuis un bouton (geste de l'utilisateur) : sur iPhone, la feuille de partage permet d'enregistrer, imprimer ou envoyer.
async function prDeliver(blob, name) {
  const file = typeof File === "function" ? new File([blob], name, { type: blob.type }) : null;
  if (file && navigator.canShare && navigator.share && /iPhone|iPad|Android/i.test(navigator.userAgent) && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: name }); return; } catch (e) { if (e && e.name === "AbortError") return; }
  }
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 5000);
}
