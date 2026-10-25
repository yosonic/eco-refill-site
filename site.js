/* EcoRefill — mobile menu, live opening status, click-to-load map.
   Opening hours live in ONE place: the HOURS table below. */

var HOURS = [
  null,                        /* Sunday */
  null,                        /* Monday */
  null,                        /* Tuesday */
  { open: 630, close: 960 },   /* Wednesday 10.30am – 4pm */
  null,                        /* Thursday */
  { open: 630, close: 960 },   /* Friday    10.30am – 4pm */
  { open: 570, close: 960 }    /* Saturday   9.30am – 4pm */
];

var DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/* ---------- mobile menu ---------- */
(function () {
  var btn = document.querySelector('.menu-btn');
  var nav = document.getElementById('nav');
  if (!btn || !nav) return;
  btn.addEventListener('click', function () {
    var open = nav.classList.toggle('is-open');
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) {
      nav.classList.remove('is-open');
      btn.setAttribute('aria-expanded', 'false');
      btn.focus();
    }
  });
})();

/* ---------- opening status ---------- */
(function () {
  /* The shop's own clock, whatever timezone the visitor is in. */
  function shopNow() {
    try {
      var parts = {};
      new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/London', weekday: 'short',
        hour: '2-digit', minute: '2-digit', hour12: false
      }).formatToParts(new Date()).forEach(function (p) { parts[p.type] = p.value; });
      var days = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
      if (!(parts.weekday in days)) return null;
      return {
        day: days[parts.weekday],
        mins: parseInt(parts.hour, 10) * 60 + parseInt(parts.minute, 10)
      };
    } catch (e) { return null; }
  }

  /* 630 -> "10.30am", 960 -> "4pm" */
  function clock(mins) {
    var h = Math.floor(mins / 60), m = mins % 60;
    var suffix = h < 12 ? 'am' : 'pm';
    var h12 = h % 12; if (h12 === 0) h12 = 12;
    return h12 + (m ? '.' + (m < 10 ? '0' + m : m) : '') + suffix;
  }

  function status(now) {
    var today = HOURS[now.day];
    if (today && now.mins >= today.open && now.mins < today.close) {
      return {
        open: true,
        text: 'Open now · until ' + clock(today.close),
        short: 'Open until ' + clock(today.close)
      };
    }
    if (today && now.mins < today.open) {
      return {
        open: false,
        text: 'Opens today at ' + clock(today.open),
        short: 'Opens ' + clock(today.open)
      };
    }
    for (var i = 1; i <= 7; i++) {
      var d = (now.day + i) % 7, next = HOURS[d];
      if (!next) continue;
      var when = i === 1 ? 'tomorrow' : DAY_NAMES[d];
      return {
        open: false,
        text: 'Closed · opens ' + when + ' ' + clock(next.open),
        short: 'Opens ' + DAY_NAMES[d].slice(0, 3) + ' ' + clock(next.open)
      };
    }
    return null;
  }

  var now = shopNow();
  if (!now) return;                      /* leave the static fallback text */
  var s = status(now);
  if (!s) return;

  var pills = document.querySelectorAll('[data-hours-status]');
  for (var i = 0; i < pills.length; i++) {
    var full = pills[i].querySelector('.hours-pill__full');
    var short = pills[i].querySelector('.hours-pill__short');
    if (full) { full.textContent = s.text; }
    if (short) { short.textContent = s.short; }
    if (!full && !short) { pills[i].textContent = s.text; }
    pills[i].classList.add(s.open ? 'is-open' : 'is-shut');
  }

  /* Mark today's row in the hours list. */
  var row = document.querySelector('#hours-list li[data-day="' + now.day + '"]');
  if (row) {
    row.classList.add('is-today');
    var tag = document.createElement('span');
    tag.className = 'hours-list__today';
    tag.textContent = 'Today';
    row.querySelector('.hours-list__day').appendChild(tag);
  }
})();

/* ---------- click-to-load map (no Google cookies until asked) ---------- */
(function () {
  var map = document.getElementById('map');
  if (!map) return;
  var btn = map.querySelector('.map__load');
  var src = map.getAttribute('data-src');
  if (!btn || !src) return;

  btn.addEventListener('click', function () {
    var frame = document.createElement('iframe');
    frame.src = src;
    frame.title = 'Map showing EcoRefill at Toxteth TV, 37–45 Windsor Street, Liverpool L8 1XE';
    frame.loading = 'lazy';
    frame.setAttribute('referrerpolicy', 'no-referrer-when-downgrade');
    frame.setAttribute('allowfullscreen', '');
    map.innerHTML = '';
    map.appendChild(frame);
    map.classList.add('is-loaded');
  });
})();
