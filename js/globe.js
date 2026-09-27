/* ============================================================
   FREE LINE — globe.js
   1) Hero globe: dotted orthographic Earth on <canvas>, with
      great-circle arcs from the origin markets to Syria and planes
      riding them. Drag to rotate; springs back to keep Syria in view.
   2) Routes map: equirectangular dot-matrix in one SVG path, with a
      "camera" that frames the selected route.
   Land samples come from js/geo-data.js (window.FL_GEO).
   ============================================================ */

(function () {
  'use strict';

  var D2R = Math.PI / 180;
  var DEST = { lon: 36.29, lat: 33.51, name: 'سوريا' };

  var ORIGINS = [
    { key: 'eu', lon: 4.48, lat: 51.92, name: 'أوروبا', period: 7.5, lx: 0, ly: -12 },
    { key: 'tr', lon: 28.98, lat: 41.01, name: 'تركيا', period: 4.2, lx: -8, ly: -10 },
    { key: 'gulf', lon: 46.72, lat: 24.69, name: 'الخليج', period: 5.2, lx: -6, ly: 22 },
    { key: 'ae', lon: 55.27, lat: 25.2, name: 'الإمارات', period: 5.8, lx: 30, ly: 22 },
    { key: 'cn', lon: 113.26, lat: 23.13, name: 'الصين', period: 9, lx: 0, ly: -12 }
  ];

  function toVec(lon, lat) {
    var l = lon * D2R, p = lat * D2R;
    return [Math.cos(p) * Math.cos(l), Math.cos(p) * Math.sin(l), Math.sin(p)];
  }

  function toLonLat(v) {
    return [Math.atan2(v[1], v[0]) / D2R, Math.asin(Math.max(-1, Math.min(1, v[2]))) / D2R];
  }

  function slerp(a, b, t) {
    var dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    var om = Math.acos(Math.max(-1, Math.min(1, dot)));
    if (om < 1e-6) return a.slice();
    var s = Math.sin(om);
    var k1 = Math.sin((1 - t) * om) / s, k2 = Math.sin(t * om) / s;
    return [a[0] * k1 + b[0] * k2, a[1] * k1 + b[1] * k2, a[2] * k1 + b[2] * k2];
  }

  /* ---------------- Hero globe ---------------- */
  function initGlobe(canvas, opts) {
    opts = opts || {};
    var geo = window.FL_GEO;
    if (!canvas || !geo) return null;

    var ctx = canvas.getContext('2d');
    var wrap = canvas.parentElement;
    var still = !!opts.reducedMotion;

    /* precompute land dots */
    var raw = geo.globe;
    var n = raw.length / 2;
    var pLon = new Float32Array(n), pSin = new Float32Array(n), pCos = new Float32Array(n), pWarm = new Uint8Array(n);
    var dv = toVec(DEST.lon, DEST.lat);
    for (var i = 0; i < n; i++) {
      var lon = raw[i * 2], lat = raw[i * 2 + 1];
      pLon[i] = lon * D2R;
      pSin[i] = Math.sin(lat * D2R);
      pCos[i] = Math.cos(lat * D2R);
      var v = toVec(lon, lat);
      var ang = Math.acos(Math.min(1, v[0] * dv[0] + v[1] * dv[1] + v[2] * dv[2])) / D2R;
      pWarm[i] = ang < 5 ? 2 : ang < 11 ? 1 : 0;
    }

    /* precompute arcs as lon/lat/alt samples */
    var SEG = 90;
    var arcs = ORIGINS.map(function (o, idx) {
      var a = toVec(o.lon, o.lat);
      var dist = Math.acos(Math.min(1, a[0] * dv[0] + a[1] * dv[1] + a[2] * dv[2]));
      var H = 0.05 + dist * 0.28;
      var pts = [];
      for (var s = 0; s <= SEG; s++) {
        var t = s / SEG;
        var ll = toLonLat(slerp(a, dv, t));
        pts.push([ll[0] * D2R, Math.sin(ll[1] * D2R), Math.cos(ll[1] * D2R), 1 + H * Math.sin(Math.PI * t)]);
      }
      return { o: o, pts: pts, offset: idx * 0.23 };
    });

    var W = 0, H2 = 0, dpr = 1, R = 0, cx = 0, cy = 0;
    var baseLon = 54, baseLat = 27;
    var dragLon = 0, dragLat = 0, velLon = 0;
    var zoom = 0; // 0..1 from scroll
    var dragging = false, lastX = 0, lastY = 0;
    var running = false, visible = true, raf = 0, t0 = performance.now();

    function resize() {
      var rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = Math.max(1, Math.round(rect.width * dpr));
      H2 = Math.max(1, Math.round(rect.height * dpr));
      canvas.width = W;
      canvas.height = H2;
      cx = W / 2;
      cy = H2 / 2;
      if (still) draw(performance.now());
    }

    function draw(now) {
      var time = (now - t0) / 1000;
      var auto = still ? 0 : Math.sin(time / 11) * 26;
      var lon0 = baseLon + auto + dragLon;
      var lat0 = baseLat + dragLat;
      /* scroll zoom leans the camera onto Syria */
      lon0 = lon0 + (DEST.lon - lon0) * zoom;
      lat0 = lat0 + (DEST.lat - lat0) * zoom;
      var scale = 1 + zoom * 0.55;
      R = Math.min(W, H2) * 0.4 * scale;

      var l0 = lon0 * D2R, s0 = Math.sin(lat0 * D2R), c0 = Math.cos(lat0 * D2R);
      var px = dpr * Math.max(.8, R / (300 * dpr));

      ctx.clearRect(0, 0, W, H2);

      /* atmosphere */
      var g = ctx.createRadialGradient(cx, cy, R * .85, cx, cy, R * 1.45);
      g.addColorStop(0, 'rgba(230,194,116,.16)');
      g.addColorStop(.35, 'rgba(19,92,59,.18)');
      g.addColorStop(1, 'rgba(6,41,27,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.45, 0, Math.PI * 2);
      ctx.fill();

      /* sphere body */
      var body = ctx.createRadialGradient(cx - R * .35, cy - R * .4, R * .1, cx, cy, R);
      body.addColorStop(0, 'rgba(26,110,72,.55)');
      body.addColorStop(.7, 'rgba(8,48,31,.85)');
      body.addColorStop(1, 'rgba(4,29,19,.95)');
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(230,194,116,.28)';
      ctx.lineWidth = 1 * dpr;
      ctx.stroke();

      /* land dots, bucketed by depth for fewer fills */
      var buckets = [[], [], [], [], []], warm = [[], []];
      for (var i = 0; i < n; i++) {
        var dl = pLon[i] - l0;
        var cosDl = Math.cos(dl);
        var z = s0 * pSin[i] + c0 * pCos[i] * cosDl;
        if (z <= 0.02) continue;
        var x = cx + R * pCos[i] * Math.sin(dl);
        var y = cy - R * (c0 * pSin[i] - s0 * pCos[i] * cosDl);
        if (pWarm[i]) warm[pWarm[i] - 1].push(x, y, z);
        else buckets[Math.min(4, (z * 5) | 0)].push(x, y, z);
      }
      for (var b = 0; b < 5; b++) {
        var arr = buckets[b];
        if (!arr.length) continue;
        ctx.fillStyle = 'rgba(214,236,222,' + (0.16 + b * 0.15).toFixed(2) + ')';
        ctx.beginPath();
        for (var k = 0; k < arr.length; k += 3) {
          var r = px * (0.7 + arr[k + 2] * 0.9);
          ctx.moveTo(arr[k] + r, arr[k + 1]);
          ctx.arc(arr[k], arr[k + 1], r, 0, 6.2832);
        }
        ctx.fill();
      }
      for (var w2 = 0; w2 < 2; w2++) {
        var wa = warm[w2];
        if (!wa.length) continue;
        ctx.fillStyle = w2 === 1 ? 'rgba(240,206,130,.95)' : 'rgba(230,194,116,.55)';
        ctx.beginPath();
        for (var q = 0; q < wa.length; q += 3) {
          var rr = px * (0.8 + wa[q + 2]);
          ctx.moveTo(wa[q] + rr, wa[q + 1]);
          ctx.arc(wa[q], wa[q + 1], rr, 0, 6.2832);
        }
        ctx.fill();
      }

      /* arcs */
      var R2 = R * R;
      function proj(p) {
        var dl = p[0] - l0, cosDl = Math.cos(dl);
        var z = s0 * p[1] + c0 * p[2] * cosDl;
        var x = R * p[3] * p[2] * Math.sin(dl);
        var y = R * p[3] * (c0 * p[1] - s0 * p[2] * cosDl);
        var vis = z > 0 || (x * x + y * y) > R2;
        return [cx + x, cy - y, vis];
      }

      ctx.lineCap = 'round';
      arcs.forEach(function (arc) {
        var pp = arc.pts.map(proj);
        /* faint full path */
        ctx.strokeStyle = 'rgba(230,194,116,.22)';
        ctx.lineWidth = 1.4 * dpr;
        ctx.beginPath();
        var open = false;
        for (var s = 0; s < pp.length; s++) {
          if (!pp[s][2]) { open = false; continue; }
          if (!open) { ctx.moveTo(pp[s][0], pp[s][1]); open = true; } else ctx.lineTo(pp[s][0], pp[s][1]);
        }
        ctx.stroke();

        /* travelling comet + plane */
        var head = still ? 1 : ((time / arc.o.period + arc.offset) % 1);
        var hi = Math.floor(head * SEG);
        var tail = Math.max(0, hi - 26);
        for (var j = tail; j < hi; j++) {
          if (!pp[j][2] || !pp[j + 1][2]) continue;
          var a = (j - tail) / Math.max(1, hi - tail);
          ctx.strokeStyle = 'rgba(240,206,130,' + (a * .95).toFixed(3) + ')';
          ctx.lineWidth = (1 + a * 1.8) * dpr;
          ctx.beginPath();
          ctx.moveTo(pp[j][0], pp[j][1]);
          ctx.lineTo(pp[j + 1][0], pp[j + 1][1]);
          ctx.stroke();
        }
        if (!still && hi > 1 && hi < SEG && pp[hi][2]) {
          var ang = Math.atan2(pp[hi][1] - pp[hi - 1][1], pp[hi][0] - pp[hi - 1][0]);
          drawPlane(pp[hi][0], pp[hi][1], ang, 7 * dpr * (R / (260 * dpr)));
        }

        /* origin marker + label */
        var o = pp[0];
        if (o[2]) {
          ctx.fillStyle = '#06291B';
          ctx.strokeStyle = 'rgba(230,194,116,.9)';
          ctx.lineWidth = 1.6 * dpr;
          ctx.beginPath();
          ctx.arc(o[0], o[1], 3.6 * dpr, 0, 6.2832);
          ctx.fill();
          ctx.stroke();
          label(arc.o.name, o[0] + arc.o.lx * dpr, o[1] + arc.o.ly * dpr, 13, 'rgba(255,255,255,.88)', 600);
        }
      });

      /* destination: Syria */
      var d = proj([DEST.lon * D2R, Math.sin(DEST.lat * D2R), Math.cos(DEST.lat * D2R), 1]);
      if (d[2]) {
        var pulse = still ? .5 : (time % 2.2) / 2.2;
        ctx.strokeStyle = 'rgba(230,194,116,' + (1 - pulse).toFixed(3) + ')';
        ctx.lineWidth = 1.5 * dpr;
        ctx.beginPath();
        ctx.arc(d[0], d[1], (6 + pulse * 22) * dpr, 0, 6.2832);
        ctx.stroke();
        ctx.fillStyle = '#F0CE82';
        ctx.beginPath();
        ctx.arc(d[0], d[1], 5.5 * dpr, 0, 6.2832);
        ctx.fill();
        label(DEST.name, d[0] - 12 * dpr, d[1] + 6 * dpr, 17, '#F0CE82', 800, 'right');
      }
    }

    function label(text, x, y, size, color, weight, align) {
      ctx.font = weight + ' ' + (size * dpr) + 'px Alexandria, "IBM Plex Sans Arabic", sans-serif';
      ctx.direction = 'rtl';
      ctx.textAlign = align || 'center';
      ctx.lineWidth = 4 * dpr;
      ctx.strokeStyle = 'rgba(6,41,27,.85)';
      ctx.strokeText(text, x, y);
      ctx.fillStyle = color;
      ctx.fillText(text, x, y);
    }

    /* top-view cargo plane, nose along +x */
    function drawPlane(x, y, ang, s) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(ang);
      ctx.scale(s / 10, s / 10);
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.moveTo(11, 0);
      ctx.bezierCurveTo(11, -1.4, 9.5, -2, 7, -2);
      ctx.lineTo(2.5, -2); ctx.lineTo(-3.5, -10); ctx.lineTo(-6.5, -10); ctx.lineTo(-3, -2);
      ctx.lineTo(-8, -2); ctx.lineTo(-10.5, -5.5); ctx.lineTo(-12.5, -5.5); ctx.lineTo(-11, 0);
      ctx.lineTo(-12.5, 5.5); ctx.lineTo(-10.5, 5.5); ctx.lineTo(-8, 2); ctx.lineTo(-3, 2);
      ctx.lineTo(-6.5, 10); ctx.lineTo(-3.5, 10); ctx.lineTo(2.5, 2); ctx.lineTo(7, 2);
      ctx.bezierCurveTo(9.5, 2, 11, 1.4, 11, 0);
      ctx.fill();
      ctx.restore();
    }

    function loop(now) {
      raf = 0;
      if (!dragging) {
        dragLon += velLon;
        velLon *= 0.94;
        /* ease back so Syria stays on the visible face */
        dragLon *= 0.992;
        dragLat *= 0.97;
      }
      draw(now);
      if (running) raf = requestAnimationFrame(loop);
    }

    function start() {
      if (still || running || !visible || document.hidden) return;
      running = true;
      raf = requestAnimationFrame(loop);
    }
    function stop() {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    }

    /* drag to rotate */
    wrap.addEventListener('pointerdown', function (e) {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      velLon = 0;
      wrap.classList.add('is-dragging');
      if (e.pointerType === 'mouse') wrap.setPointerCapture(e.pointerId);
    });
    window.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var dx = e.clientX - lastX, dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      var k = 180 / Math.max(200, R / dpr * 2.4);
      dragLon -= dx * k;
      velLon = -dx * k * .6;
      if (e.pointerType === 'mouse') dragLat = Math.max(-30, Math.min(30, dragLat + dy * k));
      if (still) draw(performance.now());
    });
    function endDrag() {
      if (!dragging) return;
      dragging = false;
      wrap.classList.remove('is-dragging');
    }
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (visible) start(); else stop();
      }).observe(canvas);
    }
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop(); else start();
    });
    window.addEventListener('resize', resize);

    resize();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { draw(performance.now()); });
    if (still) draw(performance.now()); else start();

    return {
      setZoom: function (p) { zoom = Math.max(0, Math.min(1, p)); if (still) draw(performance.now()); }
    };
  }

  /* ---------------- Routes map ---------------- */
  var ROUTE_INFO = {
    tr: { name: 'تركيا', lon: 28.98, lat: 41.01, modes: ['truck', 'plane', 'ship'], note: 'الشحن البري يصل عادة خلال 5–10 أيام، مع خيارات جوية وبحرية من إسطنبول ومرسين.' },
    ae: { name: 'الإمارات', lon: 55.27, lat: 25.2, modes: ['truck', 'plane', 'ship'], note: 'خطوط منتظمة من دبي وأبوظبي والشارقة جواً وبحراً وبراً.' },
    cn: { name: 'الصين', lon: 113.26, lat: 23.13, modes: ['plane', 'ship'], note: 'الشحن البحري يستغرق نحو 30–45 يوماً، والجوي 3–7 أيام للبضائع العاجلة.' },
    gulf: { name: 'دول الخليج', lon: 46.72, lat: 24.69, modes: ['truck', 'plane'], note: 'شحن سريع وموثوق من السعودية والكويت وقطر والبحرين وعُمان.' },
    eu: { name: 'أوروبا', lon: 4.48, lat: 51.92, modes: ['plane', 'ship'], note: 'من الدول الأوروبية كافة، مع تخليص جمركي كامل عند الوصول.' }
  };
  var MODE_LABEL = { truck: 'بري', plane: 'جوي', ship: 'بحري' };

  function initRoutesMap(svg, ui, opts) {
    opts = opts || {};
    var geo = window.FL_GEO;
    if (!svg || !geo) return null;
    var NS = 'http://www.w3.org/2000/svg';
    var still = !!opts.reducedMotion;

    function X(lon) { return (lon + 6) * 10; }
    function Y(lat) { return (58 - lat) * 10; }
    function el(tag, attrs, parent) {
      var e = document.createElementNS(NS, tag);
      for (var k in attrs) e.setAttribute(k, attrs[k]);
      (parent || svg).appendChild(e);
      return e;
    }

    /* dot matrix: one path per tone, dots drawn as zero-length round-capped segments */
    var raw = geo.region, dCool = [], dWarm = [];
    var dx0 = X(DEST.lon), dy0 = Y(DEST.lat);
    for (var i = 0; i < raw.length; i += 2) {
      var x = X(raw[i]), y = Y(raw[i + 1]);
      var dd = Math.hypot(x - dx0, y - dy0);
      (dd < 70 ? dWarm : dCool).push('M' + x.toFixed(1) + ' ' + y.toFixed(1) + 'h0');
    }
    el('path', { d: dCool.join(''), stroke: 'rgba(214,236,222,.2)', 'stroke-width': 5, 'stroke-linecap': 'round' });
    el('path', { d: dWarm.join(''), stroke: 'rgba(230,194,116,.55)', 'stroke-width': 5, 'stroke-linecap': 'round' });

    var gLines = el('g', {}), gNodes = el('g', {});
    var routes = {};
    Object.keys(ROUTE_INFO).forEach(function (key) {
      var r = ROUTE_INFO[key];
      var x1 = X(r.lon), y1 = Y(r.lat);
      var mx = (x1 + dx0) / 2, my = (y1 + dy0) / 2;
      var len = Math.hypot(dx0 - x1, dy0 - y1);
      /* bulge the curve northwards */
      var nx = -(dy0 - y1) / len, ny = (dx0 - x1) / len;
      if (ny > 0) { nx = -nx; ny = -ny; }
      var bulge = Math.min(140, len * .28);
      var cxp = mx + nx * bulge, cyp = my + ny * bulge;
      var d = 'M' + x1 + ' ' + y1 + ' Q' + cxp.toFixed(1) + ' ' + cyp.toFixed(1) + ' ' + dx0 + ' ' + dy0;
      var path = el('path', { d: d, class: 'rt-line' }, gLines);
      var node = el('circle', { cx: x1, cy: y1, r: 8, class: 'rt-node' }, gNodes);
      var lbl = el('text', { x: x1, y: y1 + (key === 'gulf' ? 38 : -18), 'text-anchor': 'middle', class: 'rt-label' }, gNodes);
      lbl.textContent = r.name;
      routes[key] = { path: path, node: node, label: lbl, x: x1, y: y1, cx: cxp, cy: cyp };
    });

    el('circle', { cx: dx0, cy: dy0, r: 12, class: 'rt-dest-ring' });
    el('circle', { cx: dx0, cy: dy0, r: 9, class: 'rt-dest' });
    var dl = el('text', { x: dx0 - 20, y: dy0 + 36, 'text-anchor': 'end', class: 'rt-dest-label' });
    dl.textContent = DEST.name;

    var mover = el('path', {
      class: 'rt-mover',
      d: 'M11 0C11-1.4 9.5-2 7-2L2.5-2-3.5-10-6.5-10-3-2-8-2-10.5-5.5-12.5-5.5-11 0-12.5 5.5-10.5 5.5-8 2-3 2-6.5 10-3.5 10 2.5 2 7 2C9.5 2 11 1.4 11 0Z'
    });

    /* camera: tween the viewBox to frame the active route */
    var vb = { x: 0, y: 0, w: 1300, h: 500 }, vbTarget = null;
    function frameFor(key) {
      var r = routes[key];
      var rect = svg.getBoundingClientRect();
      var aspect = rect.width / Math.max(1, rect.height);
      var minX = Math.min(r.x, dx0, r.cx), maxX = Math.max(r.x, dx0, r.cx);
      var minY = Math.min(r.y, dy0, r.cy), maxY = Math.max(r.y, dy0, r.cy);
      /* on wide screens the info panel overlays the map bottom */
      var overlay = window.matchMedia('(min-width: 761px)').matches;
      var padX = overlay ? 130 : 70, padY = overlay ? 90 : 60;
      var w = Math.max(overlay ? 940 : 460, maxX - minX + padX * 2), h = maxY - minY + padY * 2;
      if (w / h > aspect) h = w / aspect; else w = h * aspect;
      var cxv = (minX + maxX) / 2, cyv = (minY + maxY) / 2 + (overlay ? h * .14 : 0);
      return { x: cxv - w / 2, y: cyv - h / 2, w: w, h: h };
    }
    function applyVb() { svg.setAttribute('viewBox', vb.x.toFixed(1) + ' ' + vb.y.toFixed(1) + ' ' + vb.w.toFixed(1) + ' ' + vb.h.toFixed(1)); }

    var active = null, moverT = 0, lastNow = 0, rafId = 0, inView = true;

    function tick(now) {
      rafId = 0;
      var dt = lastNow ? Math.min(.05, (now - lastNow) / 1000) : 0;
      lastNow = now;
      if (vbTarget) {
        var k = still ? 1 : 1 - Math.pow(.002, dt);
        vb.x += (vbTarget.x - vb.x) * k;
        vb.y += (vbTarget.y - vb.y) * k;
        vb.w += (vbTarget.w - vb.w) * k;
        vb.h += (vbTarget.h - vb.h) * k;
        applyVb();
      }
      if (active) {
        var p = routes[active].path, L = p.getTotalLength();
        moverT = still ? .55 : (moverT + dt / 3.2) % 1;
        var a = p.getPointAtLength(moverT * L), b = p.getPointAtLength(Math.min(L, moverT * L + 2));
        var ang = Math.atan2(b.y - a.y, b.x - a.x) / D2R;
        var s = vb.w / 1300 * 1.9 + .6;
        mover.setAttribute('transform', 'translate(' + a.x.toFixed(1) + ' ' + a.y.toFixed(1) + ') rotate(' + ang.toFixed(1) + ') scale(' + s.toFixed(2) + ')');
      }
      if (!still && inView && !document.hidden) rafId = requestAnimationFrame(tick);
    }
    function kick() { if (!rafId) { lastNow = 0; rafId = requestAnimationFrame(tick); } }

    function setActive(key) {
      if (!routes[key]) return;
      Object.keys(routes).forEach(function (k) {
        var on = k === key;
        routes[k].path.classList.toggle('is-active', on);
        routes[k].node.classList.toggle('is-active', on);
        routes[k].label.classList.toggle('is-active', on);
      });
      /* redraw the active line */
      var p = routes[key].path, L = p.getTotalLength();
      if (!still) {
        p.style.transition = 'none';
        p.style.strokeDasharray = L;
        p.style.strokeDashoffset = L;
        p.getBoundingClientRect();
        p.style.transition = 'stroke-dashoffset 1.1s cubic-bezier(.16,1,.3,1)';
        p.style.strokeDashoffset = 0;
      }
      Object.keys(routes).forEach(function (k) {
        if (k !== key) { routes[k].path.style.strokeDasharray = ''; routes[k].path.style.strokeDashoffset = ''; routes[k].path.style.transition = ''; }
      });
      active = key;
      moverT = 0;
      vbTarget = frameFor(key);
      if (still) { vb = vbTarget; applyVb(); tick(performance.now()); }
      else kick();

      /* panel */
      var info = ROUTE_INFO[key];
      if (ui) {
        ui.title.textContent = info.name + ' ← سوريا';
        ui.note.textContent = info.note;
        ui.modes.innerHTML = info.modes.map(function (m) {
          return '<li><svg aria-hidden="true"><use href="#i-' + m + '"/></svg>' + MODE_LABEL[m] + '</li>';
        }).join('');
      }
    }

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        inView = entries[0].isIntersecting;
        if (inView) kick();
      }).observe(svg);
    }
    window.addEventListener('resize', function () { if (active) { vbTarget = frameFor(active); kick(); } });
    document.addEventListener('visibilitychange', function () { if (!document.hidden) kick(); });

    return { setActive: setActive, info: ROUTE_INFO };
  }

  window.FLGlobe = { initGlobe: initGlobe, initRoutesMap: initRoutesMap };
})();
