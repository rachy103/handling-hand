// Small hand-rolled SVG charts: PIP–DIP linkage explorer, simulation force sweep, design radar.
(() => {
  const NS = 'http://www.w3.org/2000/svg';
  const C = {
    s1: '#2a78d6', s2: '#eb6834', s3: '#1baf7a', s4: '#eda100', s7: '#4a3aa7',
    ink: '#0b0b0b', ink2: '#52514e', muted: '#6b6b6b', grid: '#e1e0d9', axis: '#c3c2b7', surface: '#ffffff',
  };
  const el = (tag, attrs = {}, parent) => {
    const n = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    if (parent) parent.appendChild(n);
    return n;
  };
  const txt = (parent, x, y, s, attrs = {}) => {
    const t = el('text', { x, y, fill: C.ink2, 'font-size': 12, ...attrs }, parent);
    t.textContent = s;
    return t;
  };
  const fmt = (v, d = 1) => (Math.round(v * 10 ** d) / 10 ** d).toFixed(d);

  // A shared tooltip element per chart host
  const makeTip = (host) => {
    host.style.position = 'relative';
    const tip = document.createElement('div');
    tip.className = 'chart-tip';
    tip.hidden = true;
    host.appendChild(tip);
    return tip;
  };
  const tipRows = (tip, title, rows) => {
    tip.replaceChildren();
    const h = document.createElement('div');
    h.className = 'chart-tip-title';
    h.textContent = title;
    tip.appendChild(h);
    for (const r of rows) {
      const row = document.createElement('div');
      row.className = 'chart-tip-row';
      if (r.color) {
        const key = document.createElement('span');
        key.className = 'chart-tip-key';
        key.style.background = r.color;
        row.appendChild(key);
      }
      const v = document.createElement('strong');
      v.textContent = r.value;
      const l = document.createElement('span');
      l.textContent = ' ' + r.label;
      row.append(v, l);
      tip.appendChild(row);
    }
  };

  // ------------------------------------------------------------------ linkage
  async function linkage(host) {
    const data = await (await fetch('static/data/pip_dip.json')).json(); // [[theta, phi], ...] 0.5° steps
    const phiOf = (th) => {
      const i = Math.min(data.length - 2, Math.max(0, Math.floor(th / 0.5)));
      const [t0, p0] = data[i], [t1, p1] = data[i + 1];
      return p0 + (p1 - p0) * ((th - t0) / (t1 - t0 || 1));
    };
    // only the theta-phi plot is shown; the mechanism drawing (pivot coordinates) is withheld until the patent filing
    const wrap = document.createElement('div');
    wrap.className = 'row g-3 justify-content-center';
    host.appendChild(wrap);
    const colB = document.createElement('div'); colB.className = 'col-md-9 col-lg-7';
    wrap.append(colB);

    // --- plot
    const PW = Math.round(Math.min(480, Math.max(300, colB.clientWidth || 460))), PH = PW < 400 ? 270 : 300;
    const m = { l: 48, r: 18, t: 16, b: 42 };
    const iw = PW - m.l - m.r, ih = PH - m.t - m.b;
    const sx = (t) => m.l + (t / 90) * iw, sy = (p) => m.t + ih - (p / 90) * ih;
    const svgB = el('svg', { viewBox: `0 0 ${PW} ${PH}`, width: '100%', role: 'img',
      'aria-label': 'DIP angle phi versus PIP angle theta' }, colB);
    for (let v = 0; v <= 90; v += 15) {
      el('line', { x1: sx(0), x2: sx(90), y1: sy(v), y2: sy(v), stroke: v ? C.grid : C.axis, 'stroke-width': 1 }, svgB);
      txt(svgB, m.l - 8, sy(v) + 4, `${v}°`, { 'text-anchor': 'end', fill: C.muted, 'font-size': 11 });
      txt(svgB, sx(v), m.t + ih + 17, `${v}°`, { 'text-anchor': 'middle', fill: C.muted, 'font-size': 11 });
    }
    txt(svgB, m.l + iw / 2, PH - 6, 'PIP joint angle θ (servo-driven)', { 'text-anchor': 'middle' });
    const yl = txt(svgB, 14, m.t + ih / 2, 'DIP joint angle φ (linked)', { 'text-anchor': 'middle' });
    yl.setAttribute('transform', `rotate(-90 14 ${m.t + ih / 2})`);
    el('line', { x1: sx(0), y1: sy(0), x2: sx(90), y2: sy(90), stroke: C.muted, 'stroke-width': 1 }, svgB);
    txt(svgB, sx(70) + 6, sy(70) + 16, 'φ = θ', { fill: C.muted, 'font-size': 11 });
    el('path', { d: 'M' + data.map(([t, p]) => `${sx(t).toFixed(1)},${sy(p).toFixed(1)}`).join('L'),
      fill: 'none', stroke: C.s1, 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, svgB);
    txt(svgB, sx(38), sy(58), 'linkage', { fill: C.ink2, 'font-size': 12 });
    const cross = el('line', { y1: m.t, y2: m.t + ih, stroke: C.axis, 'stroke-width': 1 }, svgB);
    const dot = el('circle', { r: 5, fill: C.s1, stroke: C.surface, 'stroke-width': 2 }, svgB);
    const hit = el('rect', { x: m.l, y: m.t, width: iw, height: ih, fill: 'transparent', style: 'cursor:crosshair' }, svgB);

    const ctl = document.createElement('div');
    ctl.className = 'linkage-controls';
    const play = document.createElement('button');
    play.className = 'btn btn-sm btn-outline-secondary';
    play.type = 'button';
    play.textContent = 'Pause';
    const slider = document.createElement('input');
    Object.assign(slider, { type: 'range', min: 0, max: 90, step: 0.5, value: 0 });
    slider.setAttribute('aria-label', 'PIP angle');
    const read = document.createElement('div');
    read.className = 'linkage-readout';
    ctl.append(play, slider);
    colB.append(ctl, read);

    const draw = (th) => {
      const ph = phiOf(th);
      cross.setAttribute('x1', sx(th)); cross.setAttribute('x2', sx(th));
      dot.setAttribute('cx', sx(th)); dot.setAttribute('cy', sy(ph));
      const d = ph - th;
      read.textContent = th === 0 ? 'Fully extended: θ = φ = 0°.'
        : th >= 89.9 ? 'Fully flexed: θ = φ = 90°.'
          : `θ = ${fmt(th, 1)}°, φ = ${fmt(ph, 1)}°: DIP ${d < 0 ? 'lags' : 'leads'} the PIP by ${fmt(Math.abs(d), 1)}°` +
            (d < 0 ? ' — the fingertip stays straighter while approaching.' : ' — the fingertip curls around the object.');
      slider.value = th;
    };

    let playing = true, th = 0, dir = 1, last = 0;
    const step = (now) => {
      if (playing && host.dataset.visible === '1') {
        if (now - last > 30) {
          th += dir * 0.75;
          if (th >= 90) { th = 90; dir = -1; } else if (th <= 0) { th = 0; dir = 1; }
          draw(th);
          last = now;
        }
      }
      requestAnimationFrame(step);
    };
    new IntersectionObserver((e) => { host.dataset.visible = e[0].isIntersecting ? '1' : '0'; }).observe(host);
    const stop = () => { playing = false; play.textContent = 'Play'; };
    play.addEventListener('click', () => { playing = !playing; play.textContent = playing ? 'Pause' : 'Play'; });
    slider.addEventListener('input', () => { stop(); th = parseFloat(slider.value); draw(th); });
    hit.addEventListener('pointermove', (e) => {
      stop();
      const r = svgB.getBoundingClientRect();
      const x = (e.clientX - r.left) * (PW / r.width);
      th = Math.max(0, Math.min(90, Math.round(((x - m.l) / iw) * 180) / 2));
      draw(th);
    });
    draw(0);
    requestAnimationFrame(step);
  }

  // Re-render a chart whenever its host width changes (charts draw at 1 viewBox unit = 1 CSS px).
  const responsive = (host, render) => {
    let lastW = 0, t = 0;
    const go = () => {
      const w = Math.round(host.clientWidth);
      if (!w || Math.abs(w - lastW) < 4) return;
      lastW = w;
      render(w);
    };
    go();
    new ResizeObserver(() => { clearTimeout(t); t = setTimeout(go, 120); }).observe(host);
  };
  const legendFor = (series) => {
    const legend = document.createElement('div');
    legend.className = 'chart-legend';
    for (const s of series) {
      const it = document.createElement('span');
      const k = document.createElement('span');
      k.className = 'legend-line';
      k.style.background = s.color;
      it.append(k, document.createTextNode(s.label));
      legend.appendChild(it);
    }
    return legend;
  };

  // ------------------------------------------------------------------ sim force sweep
  async function simForce(host) {
    const d = await (await fetch('static/data/sim_quasistatic.json')).json();
    const series = [
      { key: 'force_total_n', label: 'Total', color: C.s1 },
      { key: 'force_fingers_n', label: 'Index–little fingers', color: C.s2 },
      { key: 'force_thumb_n', label: 'Thumb', color: C.s3 },
      { key: 'force_palm_n', label: 'Palm', color: C.s4 },
    ];
    const legend = legendFor(series);
    const holder = document.createElement('div');
    host.append(legend, holder);
    const tip = makeTip(host);
    const xs = d.close_cmd, xmax = 1.2, ymax = 35;

    responsive(holder, (W) => {
      holder.replaceChildren();
      const narrow = W < 520;
      const H = narrow ? 250 : 300;
      const m = { l: 44, r: narrow ? 12 : 118, t: 14, b: 40 };
      const iw = W - m.l - m.r, ih = H - m.t - m.b;
      const sx = (v) => m.l + (v / xmax) * iw, sy = (v) => m.t + ih - (v / ymax) * ih;
      const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'img',
        'aria-label': 'Simulated contact normal force versus close command' }, holder);
      for (let v = 0; v <= 35; v += 5) {
        el('line', { x1: m.l, x2: m.l + iw, y1: sy(v), y2: sy(v), stroke: v ? C.grid : C.axis }, svg);
        txt(svg, m.l - 8, sy(v) + 4, `${v}`, { 'text-anchor': 'end', fill: C.muted, 'font-size': 11 });
      }
      for (let v = 0; v <= 1.2001; v += narrow ? 0.4 : 0.2) {
        txt(svg, sx(v), m.t + ih + 17, fmt(v, 1), { 'text-anchor': 'middle', fill: C.muted, 'font-size': 11 });
      }
      txt(svg, m.l + iw / 2, H - 5, 'Normalized close command', { 'text-anchor': 'middle' });
      const yl = txt(svg, 12, m.t + ih / 2, 'Contact normal force [N]', { 'text-anchor': 'middle' });
      yl.setAttribute('transform', `rotate(-90 12 ${m.t + ih / 2})`);
      const ends = [];
      for (const s of series) {
        const ys = d[s.key];
        const pts = xs.map((x, i) => [x, ys[i], i]).filter(([, , i]) => d.contacts[i] > 0);
        el('path', { d: 'M' + pts.map(([x, y]) => `${sx(x).toFixed(1)},${sy(y).toFixed(1)}`).join('L'),
          fill: 'none', stroke: s.color, 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, svg);
        ends.push({ s, y: sy(ys[ys.length - 1]), v: ys[ys.length - 1] });
      }
      if (!narrow) {  // direct end labels with leader lines, nudged apart
        ends.sort((a, b) => a.y - b.y);
        let prev = -1e9;
        for (const e of ends) {
          const ly = Math.max(e.y, prev + 16);
          prev = ly;
          const x0 = sx(xs[xs.length - 1]);
          el('line', { x1: x0 + 3, y1: e.y, x2: x0 + 14, y2: ly, stroke: C.axis }, svg);
          txt(svg, x0 + 17, ly + 4, `${e.s.label.split(' ')[0]} ${fmt(e.v, 1)} N`, { fill: C.ink2, 'font-size': 11 });
        }
      }
      const tot = d.force_total_n, pk = tot.indexOf(Math.max(...tot));
      el('circle', { cx: sx(xs[pk]), cy: sy(tot[pk]), r: 4.5, fill: C.s1, stroke: C.surface, 'stroke-width': 2 }, svg);
      txt(svg, sx(xs[pk]) - 8, sy(tot[pk]) - 8, `peak ${fmt(tot[pk], 1)} N`, { 'text-anchor': 'end', fill: C.ink, 'font-size': 11 });

      const cross = el('line', { y1: m.t, y2: m.t + ih, stroke: C.axis, visibility: 'hidden' }, svg);
      const hit = el('rect', { x: m.l, y: 0, width: iw, height: H, fill: 'transparent' }, svg);
      const show = (clientX) => {
        const r = svg.getBoundingClientRect();
        const v = ((clientX - r.left - m.l) / iw) * xmax;
        let i = d.contacts[0] > 0 ? 0 : 1;
        for (let k = 1; k < xs.length; k++) if (d.contacts[k] > 0 && Math.abs(xs[k] - v) < Math.abs(xs[i] - v)) i = k;
        cross.setAttribute('x1', sx(xs[i])); cross.setAttribute('x2', sx(xs[i]));
        cross.setAttribute('visibility', 'visible');
        tipRows(tip, `close = ${fmt(xs[i], 2)}`, [
          ...series.map((s) => ({ color: s.color, value: `${fmt(d[s.key][i], 1)} N`, label: s.label })),
          { value: `${d.contacts[i]}`, label: 'contacts' },
          { value: `${fmt(d.mustard_move_mm[i], 1)} mm`, label: 'bottle displacement' },
        ]);
        tip.hidden = false;
        const hr = host.getBoundingClientRect();
        const px = r.left - hr.left + sx(xs[i]);
        const left = px + 14 + tip.offsetWidth > hr.width ? px - 14 - tip.offsetWidth : px + 14;
        tip.style.left = `${Math.max(4, left)}px`;
        tip.style.top = `${r.top - hr.top + 8}px`;
      };
      svg.style.touchAction = 'pan-y';
      hit.addEventListener('pointermove', (e) => show(e.clientX));
      hit.addEventListener('pointerdown', (e) => show(e.clientX));
      hit.addEventListener('pointerleave', (e) => { if (e.pointerType === 'touch') return; tip.hidden = true; cross.setAttribute('visibility', 'hidden'); });
    });
  }

  // ------------------------------------------------------------------ radar
  function radar(host) {
    const axes = ['Low cost', 'Module replaceability', 'User maintainability', 'Human-hand size', 'Number of DoF', 'Ease of control'];
    const series = [
      { label: 'Handling Hand (ours)', color: C.s1, v: [5, 4.5, 4.5, 4, 4, 4], fill: true },
      { label: 'Allegro Hand', color: C.s2, v: [1.5, 3.5, 2.5, 3, 4, 4] },
      { label: 'Shadow Hand', color: C.s3, v: [1, 2, 1.5, 4, 5, 3] },
      { label: 'RUKA / ORCA Hand', color: C.s7, v: [3, 3, 2.5, 4, 4, 3] },
    ];
    const legend = legendFor(series);
    const holder = document.createElement('div');
    host.append(legend, holder);
    const tip = makeTip(host);

    responsive(holder, (Wfull) => {
      holder.replaceChildren();
      const W = Math.min(560, Wfull);
      const R = Math.min(150, Math.max(48, (W - 190) / 2));
      const lf = W < 420 ? 11 : 12.5;
      const cx = W / 2, cy = R + 48, H = 2 * R + 100;
      const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'img', style: 'display:block;margin:0 auto',
        'aria-label': 'Qualitative design comparison radar chart' }, holder);
      const ang = (i) => -Math.PI / 2 + (i * 2 * Math.PI) / axes.length;
      const pt = (i, v) => [cx + Math.cos(ang(i)) * R * (v / 5), cy + Math.sin(ang(i)) * R * (v / 5)];
      for (let r = 1; r <= 5; r++) {
        el('polygon', { points: axes.map((_, i) => pt(i, r).join(',')).join(' '), fill: 'none', stroke: r === 5 ? C.axis : C.grid }, svg);
        txt(svg, cx + 4, cy - (R * r) / 5 + 12, `${r}`, { fill: C.muted, 'font-size': 10 });
      }
      axes.forEach((a, i) => {
        const [x, y] = pt(i, 5);
        el('line', { x1: cx, y1: cy, x2: x, y2: y, stroke: C.grid }, svg);
        const [lx, ly] = pt(i, 5.6);
        const c = Math.cos(ang(i));
        const anchor = Math.abs(c) < 0.2 ? 'middle' : c > 0 ? 'start' : 'end';
        const words = a.split(' ');
        const lines = a.length > 14 && words.length > 1 ? [words.slice(0, -1).join(' '), words[words.length - 1]] : [a];
        const y0 = ly + 4 - (lines.length - 1) * 7 + (Math.sin(ang(i)) > 0.9 ? 8 : 0);
        lines.forEach((ln, k) => txt(svg, lx, y0 + k * 15, ln, { 'text-anchor': anchor, fill: C.ink2, 'font-size': lf }));
      });
      for (const s of [...series].reverse()) {
        el('polygon', { points: s.v.map((v, i) => pt(i, v).join(',')).join(' '),
          fill: s.fill ? s.color : 'none', 'fill-opacity': s.fill ? 0.1 : 0, stroke: s.color, 'stroke-width': 2, 'stroke-linejoin': 'round' }, svg);
      }
      const hit = el('circle', { cx, cy, r: R + 34, fill: 'transparent' }, svg);
      svg.style.touchAction = 'pan-y';
      const showAt = (e) => {
        const r = svg.getBoundingClientRect();
        const x = e.clientX - r.left - cx, y = e.clientY - r.top - cy;
        let a = Math.atan2(y, x) + Math.PI / 2;
        if (a < 0) a += 2 * Math.PI;
        const i = Math.round(a / ((2 * Math.PI) / axes.length)) % axes.length;
        tipRows(tip, axes[i], series.map((s) => ({ color: s.color, value: fmt(s.v[i], 1), label: s.label })));
        tip.hidden = false;
        const hr = host.getBoundingClientRect();
        const px = e.clientX - hr.left;
        const left = px + 14 + tip.offsetWidth > hr.width ? px - 14 - tip.offsetWidth : px + 14;
        tip.style.left = `${Math.max(4, left)}px`;
        tip.style.top = `${e.clientY - hr.top + 12}px`;
      };
      hit.addEventListener('pointermove', showAt);
      hit.addEventListener('pointerdown', showAt);
      hit.addEventListener('pointerleave', (e) => { if (e.pointerType === 'touch') return; tip.hidden = true; });
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    const L = document.getElementById('linkage-explorer'); if (L) linkage(L);
    const F = document.getElementById('sim-force-chart'); if (F) simForce(F);
    const R = document.getElementById('radar-chart'); if (R) radar(R);
  });
})();
