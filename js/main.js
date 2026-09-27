/* ============================================================
   FREE LINE — main.js (v2)
   GSAP + ScrollTrigger + Lenis drive the motion. Everything is
   progressive: without the CDN scripts the page stays complete and
   readable; with reduced motion, pins/scrubs/smooth-scroll are off.
   ============================================================ */

(function () {
  'use strict';

  /* ⚠️ رقم واتساب الشركة (صيغة دولية بدون + أو فراغات) */
  var WHATSAPP_NUMBER = '963991777173';
  var PHONE_DISPLAY = '+963 991 777 173';
  var DEFAULT_MESSAGE = 'مرحباً، أرغب بالاستفسار عن خدمات الشحن والتخليص الجمركي إلى سوريا.';

  var root = document.documentElement;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(pointer: fine)').matches;
  var hasGsap = !!(window.gsap && window.ScrollTrigger);
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  function waLink(message) {
    return 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(message);
  }

  /* ---------- Contact links ---------- */
  $$('.js-whatsapp').forEach(function (el) {
    el.href = waLink(DEFAULT_MESSAGE);
    el.target = '_blank';
    el.rel = 'noopener';
  });
  $$('.js-phone-link').forEach(function (el) { el.href = 'tel:+' + WHATSAPP_NUMBER; });
  $$('.js-phone-display').forEach(function (el) { el.textContent = PHONE_DISPLAY; });
  var yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Word splitting (Arabic-safe: whole words only) ---------- */
  $$('[data-split]').forEach(function (el) {
    var words = el.textContent.trim().split(/\s+/);
    el.setAttribute('aria-label', el.textContent.trim());
    el.innerHTML = words.map(function (w) {
      return '<span class="w" aria-hidden="true"><span class="wi">' + w + '</span></span>';
    }).join(' ');
  });

  var statement = $('#statement');
  var GOLD_WORDS = ['بضاعتك', 'شريكاً', 'الطريق،', 'الجمارك،'];
  if (statement) {
    var sw = statement.textContent.trim().split(/\s+/);
    statement.innerHTML = sw.map(function (w) {
      return '<span class="sw' + (GOLD_WORDS.indexOf(w) > -1 ? ' gold' : '') + '">' + w + '</span>';
    }).join(' ');
  }

  /* ---------- Globe + routes map ---------- */
  var globe = window.FLGlobe ? window.FLGlobe.initGlobe($('#globe'), { reducedMotion: reduced }) : null;

  var routesSvg = $('#routesSvg');
  var routesCanvas = $('#routesCanvas');
  if (routesCanvas) routesCanvas.remove();
  var routesMap = window.FLGlobe ? window.FLGlobe.initRoutesMap(routesSvg, {
    title: $('#rpTitle'), note: $('#rpNote'), modes: $('#rpModes')
  }, { reducedMotion: reduced }) : null;

  /* route tabs: click, keyboard arrows, gentle auto-cycle until touched */
  var tabs = $$('.route-tab');
  var tabIndex = 0, autoCycle = !reduced, cycleTimer = null, cycleStart = 0;
  var CYCLE_MS = 6000;
  tabs.forEach(function (t) {
    var bar = document.createElement('span');
    bar.className = 'tab-timer';
    t.appendChild(bar);
  });
  function selectTab(i, focus) {
    tabIndex = (i + tabs.length) % tabs.length;
    tabs.forEach(function (t, k) {
      var on = k === tabIndex;
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      t.querySelector('.tab-timer').style.transform = 'scaleX(0)';
    });
    if (focus) tabs[tabIndex].focus();
    if (routesMap) routesMap.setActive(tabs[tabIndex].getAttribute('data-route'));
    cycleStart = performance.now();
  }
  function stopCycle() {
    autoCycle = false;
    tabs.forEach(function (t) { t.querySelector('.tab-timer').style.transform = 'scaleX(0)'; });
  }
  tabs.forEach(function (t, k) {
    t.addEventListener('click', function () { stopCycle(); selectTab(k); });
    t.addEventListener('keydown', function (e) {
      var dir = e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowRight' || e.key === 'ArrowUp' ? -1 : 0;
      if (!dir) return;
      e.preventDefault();
      stopCycle();
      selectTab(tabIndex + dir, true);
    });
  });
  selectTab(0);

  var routesSection = $('#routes');
  var routesVisible = false;
  if ('IntersectionObserver' in window && routesSection) {
    new IntersectionObserver(function (entries) {
      routesVisible = entries[0].isIntersecting;
      if (routesVisible) cycleStart = performance.now();
    }, { threshold: .35 }).observe(routesSection);
  }
  (function cycle(now) {
    if (autoCycle && routesVisible && !document.hidden) {
      var p = (now - cycleStart) / CYCLE_MS;
      var bar = tabs[tabIndex] && tabs[tabIndex].querySelector('.tab-timer');
      if (bar) bar.style.transform = 'scaleX(' + Math.min(1, p).toFixed(3) + ')';
      if (p >= 1) selectTab(tabIndex + 1);
    }
    if (autoCycle) requestAnimationFrame(cycle);
  })(performance.now());

  /* ---------- Hero tracking card (illustrative) ---------- */
  var TRACKS = [
    { from: 'إسطنبول', mode: 'truck', status: 'في الطريق براً', eta: '5–10 أيام' },
    { from: 'دبي', mode: 'plane', status: 'على متن رحلة شحن', eta: '3–7 أيام' },
    { from: 'الصين', mode: 'ship', status: 'في البحر', eta: '30–45 يوماً' }
  ];
  var trackEls = { from: $('#trackFrom'), use: $('#trackModeUse'), status: $('#trackStatus'), eta: $('#trackEta'), fill: $('#trackFill'), dot: $('#trackDot') };
  var trackI = 0;
  function renderTrack(p) {
    trackEls.fill.style.transform = 'scaleX(' + p.toFixed(3) + ')';
    trackEls.dot.style.right = (p * 100).toFixed(1) + '%';
  }
  function nextTrack() {
    var t = TRACKS[trackI % TRACKS.length];
    trackEls.from.textContent = t.from;
    trackEls.use.setAttribute('href', '#i-' + t.mode);
    trackEls.status.textContent = t.status;
    trackEls.eta.textContent = t.eta;
    trackI++;
  }
  if (trackEls.from) {
    nextTrack();
    if (reduced) renderTrack(.55);
    else {
      var tStart = performance.now();
      (function trackLoop(now) {
        var p = ((now - tStart) % 4200) / 4200;
        if (p < ((now - 16 - tStart) % 4200) / 4200) nextTrack();
        renderTrack(Math.min(1, p * 1.15));
        requestAnimationFrame(trackLoop);
      })(tStart);
    }
  }

  /* ---------- Header, progress, nav ---------- */
  var header = $('#header');
  var progressBar = $('#scrollProgress');
  var hero = $('.hero');
  var lastY = window.scrollY;

  function onScrollUI() {
    var y = window.scrollY;
    var heroBottom = hero ? hero.offsetHeight - 90 : 0;
    header.classList.toggle('is-solid', y > heroBottom);
    var goingDown = y > lastY + 4, goingUp = y < lastY - 4;
    if (goingDown && y > 500 && !document.body.classList.contains('nav-open')) header.classList.add('is-hidden');
    else if (goingUp || y < 200) header.classList.remove('is-hidden');
    lastY = y;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    progressBar.style.transform = 'scaleX(' + (max > 0 ? y / max : 0).toFixed(4) + ')';
  }
  window.addEventListener('scroll', onScrollUI, { passive: true });
  onScrollUI();

  var navToggle = $('#navToggle');
  var nav = $('#nav');
  var lenis = null;
  function setNav(open) {
    nav.classList.toggle('open', open);
    document.body.classList.toggle('nav-open', open);
    navToggle.setAttribute('aria-expanded', String(open));
    navToggle.setAttribute('aria-label', open ? 'إغلاق القائمة' : 'فتح القائمة');
    if (lenis) { if (open) lenis.stop(); else lenis.start(); }
  }
  navToggle.addEventListener('click', function () { setNav(!nav.classList.contains('open')); });
  $$('a', nav).forEach(function (a) { a.addEventListener('click', function () { setNav(false); }); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && nav.classList.contains('open')) { setNav(false); navToggle.focus(); }
  });
  window.matchMedia('(min-width: 1081px)').addEventListener('change', function (mq) { if (mq.matches) setNav(false); });

  /* active nav link */
  if ('IntersectionObserver' in window) {
    var links = {};
    $$('a[href^="#"]:not(.btn)', nav).forEach(function (a) { links[a.getAttribute('href').slice(1)] = a; });
    var secObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var l = links[en.target.id];
        if (!l) return;
        if (en.isIntersecting) {
          Object.keys(links).forEach(function (k) { links[k].classList.remove('is-active'); });
          l.classList.add('is-active');
        } else l.classList.remove('is-active');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(links).forEach(function (id) { var s = document.getElementById(id); if (s) secObs.observe(s); });
  }

  /* floating WhatsApp hides where WhatsApp buttons are already on screen */
  var waFloat = $('.wa-float');
  if ('IntersectionObserver' in window && waFloat) {
    var shown = new Set();
    var fo = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) shown.add(en.target); else shown.delete(en.target); });
      waFloat.classList.toggle('is-hidden', shown.size > 0);
    }, { threshold: .2 });
    [hero, $('#contact'), $('#quote')].forEach(function (s) { if (s) fo.observe(s); });
  }

  /* ---------- Quote form: live WhatsApp preview + validation ---------- */
  var form = $('#quoteForm');
  var formNote = $('#formNote');
  var defaultNote = formNote.textContent;
  var preview = $('#waPreview');
  var typing = $('#waTyping');
  var waStatus = $('#waStatus');
  var F = {
    name: $('#qName'), phone: $('#qPhone'), country: $('#qCountry'),
    volume: $('#qVolume'), weight: $('#qWeight'), notes: $('#qNotes')
  };
  var typeGroup = $('#qTypeGroup');
  function typeValue() { var c = $('input[name="type"]:checked', form); return c ? c.value : ''; }
  function v(f) { return f.value.trim(); }

  function buildMessage(forPreview) {
    var lines = ['📦 *طلب عرض سعر — فري لاين*', ''];
    var add = function (label, val, fallback) {
      if (val) lines.push(label + val);
      else if (forPreview && fallback) lines.push(label + fallback);
    };
    add('👤 الاسم: ', v(F.name), '…');
    /* isolate the number so it keeps its LTR order inside Arabic text */
    add('📱 الهاتف: ', v(F.phone) ? (forPreview ? '⁦' + v(F.phone) + '⁩' : v(F.phone)) : '', '…');
    add('🌍 بلد الشحن: ', F.country.value, '…');
    add('🚚 نوع الشحن: ', typeValue(), '…');
    if (v(F.volume)) lines.push('📐 الحجم التقريبي: ' + v(F.volume) + ' م³');
    if (v(F.weight)) lines.push('⚖️ الوزن التقريبي: ' + v(F.weight) + ' كغ');
    if (v(F.notes)) lines.push('📝 ملاحظات: ' + v(F.notes));
    lines.push('', 'أرجو تزويدي بعرض سعر. شكراً لكم.');
    return lines.join('\n');
  }

  var typingTimer = null;
  function refreshPreview() {
    preview.textContent = buildMessage(true).replace(/\*/g, '');
    typing.classList.add('is-on');
    waStatus.textContent = 'يكتب الآن…';
    clearTimeout(typingTimer);
    typingTimer = setTimeout(function () {
      typing.classList.remove('is-on');
      waStatus.textContent = 'متصل الآن';
    }, 900);
  }
  preview.textContent = buildMessage(true).replace(/\*/g, '');

  var validators = {
    name: function () { return v(F.name).length >= 2; },
    phone: function () { return v(F.phone).replace(/[^\d]/g, '').length >= 8; },
    country: function () { return F.country.value !== ''; },
    type: function () { return typeValue() !== ''; }
  };
  var targets = { name: F.name, phone: F.phone, country: F.country, type: typeGroup };

  function setError(key, show) {
    var t = targets[key];
    var err = document.getElementById(t.getAttribute('aria-describedby'));
    if (show) { t.setAttribute('aria-invalid', 'true'); err.textContent = err.getAttribute('data-msg'); }
    else { t.removeAttribute('aria-invalid'); err.textContent = ''; }
  }
  function validate(key) { var ok = validators[key](); setError(key, !ok); return ok; }

  form.addEventListener('input', function (e) {
    refreshPreview();
    Object.keys(targets).forEach(function (k) {
      var t = targets[k];
      if (t.getAttribute('aria-invalid') === 'true' && (t === e.target || t.contains(e.target))) validate(k);
    });
  });
  form.addEventListener('change', function () { refreshPreview(); });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var firstBad = null;
    Object.keys(validators).forEach(function (k) {
      if (!validate(k) && !firstBad) firstBad = k;
    });
    if (firstBad) {
      var t = targets[firstBad];
      (t.matches('fieldset') ? $('input', t) : t).focus();
      if (hasGsap && !reduced) gsap.fromTo(t, { x: -8 }, { x: 0, duration: .5, ease: 'elastic.out(1, .3)' });
      return;
    }
    window.open(waLink(buildMessage(false)), '_blank', 'noopener');
    formNote.textContent = 'تم تجهيز رسالتك في واتساب. اضغط «إرسال» هناك لنستلم طلبك.';
    formNote.classList.add('is-success');
    setTimeout(function () { formNote.textContent = defaultNote; formNote.classList.remove('is-success'); }, 12000);
  });

  /* ---------- FAQ: animated open/close ---------- */
  $$('.faq-item').forEach(function (item) {
    var summary = $('summary', item);
    var body = $('.faq-body', item);
    summary.addEventListener('click', function (e) {
      if (!hasGsap || reduced) return;
      e.preventDefault();
      if (item.open) {
        gsap.to(body, { height: 0, opacity: 0, duration: .45, ease: 'power3.inOut', onComplete: function () { item.open = false; gsap.set(body, { clearProps: 'height,opacity' }); } });
      } else {
        $$('.faq-item[open]').forEach(function (o) {
          if (o === item) return;
          var ob = $('.faq-body', o);
          gsap.to(ob, { height: 0, opacity: 0, duration: .4, ease: 'power3.inOut', onComplete: function () { o.open = false; gsap.set(ob, { clearProps: 'height,opacity' }); } });
        });
        item.open = true;
        gsap.fromTo(body, { height: 0, opacity: 0 }, { height: 'auto', opacity: 1, duration: .55, ease: 'power3.out', clearProps: 'height' });
      }
    });
  });

  /* ---------- Pointer niceties (desktop only) ---------- */
  var desktopFx = finePointer && !reduced && window.innerWidth > 1080;

  if (desktopFx) {
    /* cursor */
    var cursor = $('.cursor'), dot = $('.cursor-dot'), ring = $('.cursor-ring');
    var mx = -100, my = -100, rx = -100, ry = -100;
    window.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      mx = e.clientX; my = e.clientY;
      cursor.classList.add('is-on');
    }, { passive: true });
    document.addEventListener('pointerleave', function () { cursor.classList.remove('is-on'); });
    (function follow() {
      rx += (mx - rx) * .18; ry += (my - ry) * .18;
      dot.style.transform = 'translate(' + mx + 'px,' + my + 'px)';
      ring.style.transform = 'translate(' + rx.toFixed(1) + 'px,' + ry.toFixed(1) + 'px)';
      requestAnimationFrame(follow);
    })();
    $$('a, button, .chip, summary, .globe-wrap').forEach(function (el) {
      el.addEventListener('pointerenter', function () { cursor.classList.add('is-hover'); });
      el.addEventListener('pointerleave', function () { cursor.classList.remove('is-hover'); });
    });

    /* magnetic buttons */
    $$('.magnetic').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var x = (e.clientX - r.left - r.width / 2) * .22, y = (e.clientY - r.top - r.height / 2) * .3;
        el.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
      });
      el.addEventListener('pointerleave', function () {
        el.style.transition = 'transform .5s cubic-bezier(.16,1,.3,1)';
        el.style.transform = '';
        setTimeout(function () { el.style.transition = ''; }, 500);
      });
    });

    /* 3D tilt + spotlight cards */
    $$('.tilt').forEach(function (card) {
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        card.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
        card.style.setProperty('--my', (py * 100).toFixed(1) + '%');
        card.style.transform = 'rotateX(' + ((.5 - py) * 10).toFixed(2) + 'deg) rotateY(' + ((px - .5) * 12).toFixed(2) + 'deg)';
      });
      card.addEventListener('pointerleave', function () {
        card.style.transition = 'transform .6s cubic-bezier(.16,1,.3,1), box-shadow .4s ease, border-color .4s ease';
        card.style.transform = '';
        setTimeout(function () { card.style.transition = ''; }, 600);
      });
    });
  }

  /* ---------- Service art: loop only when visible ---------- */
  var svcs = $$('.svc');
  if ('IntersectionObserver' in window) {
    var artObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { en.target.classList.toggle('is-live', en.isIntersecting); });
    }, { threshold: .35 });
    svcs.forEach(function (s) { artObs.observe(s); });
  } else svcs.forEach(function (s) { s.classList.add('is-live'); });

  /* ---------- Numbers (plain fallback: already show final values) ---------- */
  var counters = $$('[data-count]');

  /* ---------- Preloader ---------- */
  var pre = $('#preloader');

  function hidePreloaderPlain() {
    if (!pre) return;
    pre.style.transition = 'opacity .5s ease';
    pre.style.opacity = '0';
    setTimeout(function () { pre.remove(); }, 520);
    document.body.classList.remove('is-loading');
  }

  if (!hasGsap || reduced) {
    if (!reduced) window.addEventListener('load', hidePreloaderPlain);
    else if (pre) pre.remove();
    return;
  }

  /* ================================================================
     GSAP motion
     ================================================================ */
  gsap.registerPlugin(ScrollTrigger);
  document.body.classList.add('is-loading');

  /* smooth scroll */
  if (window.Lenis) {
    lenis = new Lenis({ duration: 1.15, easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); }, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
    lenis.stop();

    /* anchor links go through Lenis with header offset */
    $$('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var id = a.getAttribute('href');
        if (id.length < 2) return;
        var target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        lenis.scrollTo(target, { offset: id === '#top' ? 0 : -70, duration: 1.4 });
        if (id !== '#top') history.replaceState(null, '', id);
      });
    });
  }

  /* initial states (only now that GSAP is confirmed) */
  var heroWords = $$('.hero-title .wi');
  gsap.set(heroWords, { yPercent: 115 });
  gsap.set('.hero-copy [data-anim]', { y: 30, autoAlpha: 0 });
  gsap.set('.globe-wrap', { scale: .82, autoAlpha: 0 });
  gsap.set('.track-card', { y: 40, autoAlpha: 0 });

  /* preloader → hero entrance, one orchestrated moment */
  var countEl = $('#preCount');
  var counter = { v: 0 };
  var tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
  tl.to(counter, {
      v: 100, duration: 1.3, ease: 'power2.inOut',
      onUpdate: function () { countEl.textContent = Math.round(counter.v); }
    })
    .to('.preloader-bar', { scaleX: 1, duration: 1.3, ease: 'power2.inOut' }, 0)
    .to('.preloader-plane', { x: -220, duration: 1.3, ease: 'power2.inOut' }, 0)
    .to('.preloader-inner', { autoAlpha: 0, y: -20, duration: .4, ease: 'power2.in' }, '+=.1')
    .to('.preloader-panel-a', { yPercent: -100, duration: 1, ease: 'expo.inOut' }, '<.1')
    .to('.preloader-panel-b', { yPercent: 100, duration: 1, ease: 'expo.inOut' }, '<')
    .add(function () {
      if (pre) pre.remove();
      document.body.classList.remove('is-loading');
      if (lenis) lenis.start();
    })
    .to('.hero-kicker', { y: 0, autoAlpha: 1, duration: .8 }, '-=.55')
    .to(heroWords, { yPercent: 0, duration: 1.1, stagger: .06 }, '<.05')
    .to('.hero-sub', { y: 0, autoAlpha: 1, duration: .9 }, '<.35')
    .to('.hero-actions', { y: 0, autoAlpha: 1, duration: .9 }, '<.12')
    .to('.globe-wrap', { scale: 1, autoAlpha: 1, duration: 1.6, ease: 'expo.out' }, '<-.7')
    .to('.track-card', { y: 0, autoAlpha: 1, duration: 1 }, '<.6');

  /* hero scroll: copy drifts up, globe zooms onto Syria */
  ScrollTrigger.create({
    trigger: '.hero',
    start: 'top top',
    end: 'bottom top',
    scrub: true,
    onUpdate: function (self) { if (globe) globe.setZoom(self.progress * 1.2); }
  });
  gsap.to('.hero-copy', { yPercent: -18, autoAlpha: .15, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('.track-card', { yPercent: -60, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });

  /* pointer depth on the hero */
  if (desktopFx) {
    var qx = gsap.quickTo('.globe-wrap', 'x', { duration: 1, ease: 'power3.out' });
    var qy = gsap.quickTo('.globe-wrap', 'y', { duration: 1, ease: 'power3.out' });
    var cx2 = gsap.quickTo('.hero-copy', 'x', { duration: 1.2, ease: 'power3.out' });
    hero.addEventListener('pointermove', function (e) {
      var px = e.clientX / window.innerWidth - .5, py = e.clientY / window.innerHeight - .5;
      qx(px * 26); qy(py * 18); cx2(px * -10);
    });
  }

  /* generic reveals */
  $$('[data-split]').forEach(function (el) {
    if (el.closest('.hero')) return;
    gsap.from($$('.wi', el), {
      yPercent: 115, duration: 1, ease: 'power4.out', stagger: .05,
      scrollTrigger: { trigger: el, start: 'top 85%' }
    });
  });
  $$('[data-anim="fade-up"]').forEach(function (el) {
    if (el.closest('.hero')) return;
    gsap.from(el, { y: 36, autoAlpha: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%' } });
  });

  /* marquee: continuous, speeds up with scroll velocity and follows direction */
  var mTrack = $('#marqueeTrack');
  if (mTrack) {
    var group = $('.marquee-group', mTrack);
    for (var c = 0; c < 3; c++) mTrack.appendChild(group.cloneNode(true));
    var gw = group.getBoundingClientRect().width;
    var mPos = 0, mDir = 1, boost = 0;
    ScrollTrigger.create({
      trigger: '.marquee', start: 'top bottom', end: 'bottom top',
      onUpdate: function (self) {
        mDir = self.direction;
        boost = Math.min(8, Math.abs(self.getVelocity()) / 300);
      }
    });
    gsap.ticker.add(function (t, dt) {
      boost *= .94;
      mPos += (1 + boost) * mDir * dt * .06;
      gw = gw || group.getBoundingClientRect().width;
      var x = ((mPos % gw) + gw) % gw;
      mTrack.style.transform = 'translate3d(' + x.toFixed(1) + 'px,0,0)';
    });
    window.addEventListener('resize', function () { gw = group.getBoundingClientRect().width; });
  }

  var mm = gsap.matchMedia();

  /* services: pinned horizontal scroll on wide screens */
  mm.add('(min-width: 761px)', function () {
    var track = $('#servicesTrack');
    var viewport = $('.services-viewport');
    var dist = function () { return Math.max(0, track.scrollWidth - viewport.clientWidth); };
    var tween = gsap.to(track, {
      x: function () { return dist(); },
      ease: 'none',
      scrollTrigger: {
        trigger: '.services-pin',
        start: 'top top',
        end: function () { return '+=' + dist(); },
        pin: true,
        scrub: 1,
        invalidateOnRefresh: true,
        onUpdate: function (self) {
          $('#servicesBar').style.transform = 'scaleX(' + self.progress.toFixed(4) + ')';
        }
      }
    });
    /* art panels wipe open as the section arrives (inner elements, so the
       card's own hover transform never fights GSAP) */
    gsap.from('.svc-art', {
      clipPath: 'inset(100% 0 0 0)', duration: 1.2, ease: 'expo.inOut', stagger: .08,
      scrollTrigger: { trigger: '.services', start: 'top 70%' }
    });
    return function () { tween.kill(); };
  });

  /* numbers: count up */
  counters.forEach(function (el) {
    var end = parseInt(el.getAttribute('data-count'), 10);
    var o = { v: 0 };
    el.textContent = '0';
    gsap.to(o, {
      v: end, duration: end > 100 ? 2.2 : 1.6, ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 90%' },
      onUpdate: function () { el.textContent = Math.round(o.v).toLocaleString('en-US').replace(/,/g, ','); }
    });
  });
  gsap.from('.num', { y: 40, autoAlpha: 0, duration: 1, ease: 'power3.out', stagger: .1, scrollTrigger: { trigger: '.numbers', start: 'top 80%' } });

  /* routes */
  gsap.from('.route-tab', { x: 40, autoAlpha: 0, duration: .9, ease: 'power3.out', stagger: .07, scrollTrigger: { trigger: '.routes-layout', start: 'top 80%' } });
  gsap.from('.routes-stage', { clipPath: 'inset(0 0 100% 0 round 24px)', duration: 1.4, ease: 'expo.inOut', scrollTrigger: { trigger: '.routes-layout', start: 'top 80%' } });

  /* process: pinned journey on desktop */
  var stations = $$('.station');
  mm.add('(min-width: 1081px)', function () {
    var section = $('.process');
    section.classList.add('is-scrub');
    var fill = $('#journeyFill');
    var truck = $('#journeyTruck');
    var journey = $('.journey');
    var L = fill.getTotalLength();
    function place(p) {
      fill.style.strokeDashoffset = (1 - p).toFixed(4);
      var pt = fill.getPointAtLength(p * L), pt2 = fill.getPointAtLength(Math.min(L, p * L + 1));
      var w = journey.clientWidth / 1200, h = journey.clientHeight / 160;
      var ang = Math.atan2((pt2.y - pt.y) * h, (pt2.x - pt.x) * w) * 180 / Math.PI;
      /* truck art faces left; flip the angle frame so it drives along the path */
      truck.style.transform = 'translate(' + (pt.x * w).toFixed(1) + 'px,' + (pt.y * h).toFixed(1) + 'px) rotate(' + (ang + 180).toFixed(1) + 'deg)';
      stations.forEach(function (s, i) { s.classList.toggle('is-on', p >= i / 3 - .02); });
    }
    place(0);
    var st = ScrollTrigger.create({
      trigger: '.process-pin',
      start: 'top top',
      end: '+=160%',
      pin: true,
      scrub: .8,
      onUpdate: function (self) { place(self.progress); }
    });
    return function () { st.kill(); section.classList.remove('is-scrub'); stations.forEach(function (s) { s.classList.remove('is-on'); }); };
  });
  mm.add('(max-width: 1080px)', function () {
    stations.forEach(function (s) {
      ScrollTrigger.create({ trigger: s, start: 'top 75%', onEnter: function () { s.classList.add('is-on'); } });
    });
    gsap.from('.station', { y: 40, autoAlpha: 0, duration: .9, stagger: .1, ease: 'power3.out', scrollTrigger: { trigger: '.stations', start: 'top 85%' } });
  });

  /* statement: word-by-word lighting */
  if (statement) {
    statement.classList.add('is-scrub');
    var words = $$('.sw', statement);
    var light = function (p) {
      var n = Math.round(p * words.length);
      words.forEach(function (w, i) { w.classList.toggle('lit', i < n); });
    };
    mm.add('(min-width: 1081px)', function () {
      var st = ScrollTrigger.create({ trigger: '.statement-pin', start: 'top top', end: '+=120%', pin: true, scrub: .5, onUpdate: function (s) { light(s.progress); } });
      return function () { st.kill(); };
    });
    mm.add('(max-width: 1080px)', function () {
      var st = ScrollTrigger.create({ trigger: statement, start: 'top 80%', end: 'bottom 45%', scrub: .5, onUpdate: function (s) { light(s.progress); } });
      return function () { st.kill(); };
    });
  }

  /* why cards: multi-directional stagger */
  gsap.from('.why-card', {
    y: 70, rotateX: -18, autoAlpha: 0, duration: 1.1, ease: 'power3.out',
    stagger: { each: .1, from: 'start' },
    scrollTrigger: { trigger: '.why-grid', start: 'top 85%' }
  });

  /* quote */
  gsap.from('.quote-form .field, .quote-form .chips-field, .quote-form .btn', {
    y: 30, autoAlpha: 0, duration: .8, ease: 'power3.out', stagger: .05,
    scrollTrigger: { trigger: '.quote-form', start: 'top 85%' }
  });
  gsap.from('.phone', { y: 120, rotate: 6, autoAlpha: 0, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: '.phone-col', start: 'top 85%' } });

  /* faq */
  gsap.from('.faq-item', { y: 24, autoAlpha: 0, duration: .7, ease: 'power3.out', stagger: .06, scrollTrigger: { trigger: '.faq-list', start: 'top 85%' } });

  /* CTA: circle iris opens as it arrives */
  gsap.fromTo('#ctaIris',
    { clipPath: 'circle(12% at 50% 100%)' },
    { clipPath: 'circle(150% at 50% 100%)', ease: 'none', scrollTrigger: { trigger: '.cta', start: 'top 95%', end: 'top 15%', scrub: true } });
  gsap.from('.contact-item', { y: 50, autoAlpha: 0, duration: 1, ease: 'power3.out', stagger: .1, scrollTrigger: { trigger: '.contact-grid', start: 'top 88%' } });

  /* footer giant type rises */
  gsap.from('.footer-giant span', { yPercent: 70, autoAlpha: 0, duration: 1.4, ease: 'expo.out', stagger: .12, scrollTrigger: { trigger: '.footer-giant', start: 'top 95%' } });

  /* recalc once fonts settle */
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
})();
