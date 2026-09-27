/* ============================================================
   FREE LINE — main.js
   ============================================================ */

(function () {
  'use strict';

  /* ⚠️ رقم واتساب الشركة (صيغة دولية بدون + أو فراغات) */
  var WHATSAPP_NUMBER = '963991777173';

  /* الرقم بصيغة العرض */
  var PHONE_DISPLAY = '+963 991 777 173';

  var DEFAULT_MESSAGE = 'مرحباً، أرغب بالاستفسار عن خدمات الشحن والتخليص الجمركي إلى سوريا.';

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function waLink(message) {
    return 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(message);
  }

  /* ---------- Contact links ---------- */
  document.querySelectorAll('.js-whatsapp').forEach(function (el) {
    el.href = waLink(DEFAULT_MESSAGE);
    el.target = '_blank';
    el.rel = 'noopener';
  });

  document.querySelectorAll('.js-phone-link').forEach(function (el) {
    el.href = 'tel:+' + WHATSAPP_NUMBER;
  });

  document.querySelectorAll('.js-phone-display').forEach(function (el) {
    el.textContent = PHONE_DISPLAY;
  });

  /* ---------- Header state + floating button ---------- */
  var header = document.getElementById('header');
  var waFloat = document.querySelector('.wa-float');
  var hero = document.querySelector('.hero');
  var contact = document.getElementById('contact');

  function onScroll() {
    header.classList.toggle('scrolled', window.scrollY > 8);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* hide the floating button while the hero or contact section (which
     already show WhatsApp buttons) are on screen */
  if ('IntersectionObserver' in window && waFloat) {
    var visible = new Set();
    var floatObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) visible.add(entry.target);
        else visible.delete(entry.target);
      });
      waFloat.classList.toggle('is-hidden', visible.size > 0);
    }, { threshold: 0.25 });
    [hero, contact].forEach(function (el) { if (el) floatObserver.observe(el); });
  }

  /* ---------- Mobile nav ---------- */
  var navToggle = document.getElementById('navToggle');
  var nav = document.getElementById('nav');

  function setNav(open) {
    nav.classList.toggle('open', open);
    document.body.classList.toggle('nav-open', open);
    navToggle.setAttribute('aria-expanded', String(open));
    navToggle.setAttribute('aria-label', open ? 'إغلاق القائمة' : 'فتح القائمة');
  }

  navToggle.addEventListener('click', function () {
    setNav(!nav.classList.contains('open'));
  });

  nav.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () { setNav(false); });
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && nav.classList.contains('open')) {
      setNav(false);
      navToggle.focus();
    }
  });

  window.matchMedia('(min-width: 1081px)').addEventListener('change', function (mq) {
    if (mq.matches) setNav(false);
  });

  /* ---------- Active nav link ---------- */
  if ('IntersectionObserver' in window) {
    var links = {};
    nav.querySelectorAll('a[href^="#"]:not(.btn)').forEach(function (a) {
      links[a.getAttribute('href').slice(1)] = a;
    });

    var sectionObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var link = links[entry.target.id];
        if (!link) return;
        if (entry.isIntersecting) {
          Object.keys(links).forEach(function (k) { links[k].classList.remove('is-active'); });
          link.classList.add('is-active');
        } else {
          link.classList.remove('is-active');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });

    Object.keys(links).forEach(function (id) {
      var section = document.getElementById(id);
      if (section) sectionObserver.observe(section);
    });
  }

  /* ---------- Route map: no looping motion for reduced-motion users ---------- */
  if (reducedMotion) {
    document.querySelectorAll('.map-svg animateMotion').forEach(function (a) { a.remove(); });
  }

  /* ---------- Quote form → WhatsApp ---------- */
  var form = document.getElementById('quoteForm');
  var formNote = document.getElementById('formNote');
  var defaultNote = formNote.textContent;

  var fields = {
    name: document.getElementById('qName'),
    phone: document.getElementById('qPhone'),
    country: document.getElementById('qCountry'),
    type: document.getElementById('qType'),
    volume: document.getElementById('qVolume'),
    weight: document.getElementById('qWeight'),
    notes: document.getElementById('qNotes')
  };

  var validators = {
    name: function (v) { return v.trim().length >= 2; },
    phone: function (v) { return v.replace(/[^\d]/g, '').length >= 8; },
    country: function (v) { return v !== ''; },
    type: function (v) { return v !== ''; }
  };

  function setError(key, show) {
    var field = fields[key];
    var err = document.getElementById(field.getAttribute('aria-describedby'));
    if (show) {
      field.setAttribute('aria-invalid', 'true');
      err.textContent = err.getAttribute('data-msg');
    } else {
      field.removeAttribute('aria-invalid');
      err.textContent = '';
    }
  }

  function validate(key) {
    var ok = validators[key](fields[key].value);
    setError(key, !ok);
    return ok;
  }

  Object.keys(validators).forEach(function (key) {
    var field = fields[key];
    /* re-check as the person fixes a field that was flagged */
    field.addEventListener('input', function () {
      if (field.getAttribute('aria-invalid') === 'true') validate(key);
    });
    field.addEventListener('change', function () {
      if (field.getAttribute('aria-invalid') === 'true') validate(key);
    });
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var firstInvalid = null;
    Object.keys(validators).forEach(function (key) {
      if (!validate(key) && !firstInvalid) firstInvalid = fields[key];
    });

    if (firstInvalid) {
      firstInvalid.focus();
      return;
    }

    var val = function (f) { return f.value.trim(); };

    var lines = [
      '📦 *طلب عرض سعر — فري لاين*',
      '',
      '👤 الاسم: ' + val(fields.name),
      '📱 الهاتف: ' + val(fields.phone),
      '🌍 بلد الشحن: ' + fields.country.value,
      '🚚 نوع الشحن: ' + fields.type.value
    ];

    if (val(fields.volume)) lines.push('📐 الحجم التقريبي: ' + val(fields.volume) + ' م³');
    if (val(fields.weight)) lines.push('⚖️ الوزن التقريبي: ' + val(fields.weight) + ' كغ');
    if (val(fields.notes)) lines.push('📝 ملاحظات: ' + val(fields.notes));

    lines.push('', 'أرجو تزويدي بعرض سعر. شكراً لكم.');

    window.open(waLink(lines.join('\n')), '_blank', 'noopener');

    formNote.textContent = 'تم تجهيز رسالتك في واتساب. اضغط «إرسال» هناك لنستلم طلبك.';
    formNote.classList.add('is-success');
    window.setTimeout(function () {
      formNote.textContent = defaultNote;
      formNote.classList.remove('is-success');
    }, 12000);
  });

  /* ---------- Footer year ---------- */
  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
})();
