/* EcoRefill — live price list.
   Reads the shop's Google Sheet ("Eco Refill Catalogue & Price lists") every
   time the page opens, so a price changed in the sheet shows here straight away.

   To add or remove a tab, edit TABS below. `gid` is the number after "gid=" in
   the sheet's address bar when that tab is open. The `cols` numbers say which
   sheet column holds what (A = 0, B = 1, C = 2 ...). */

var SHEET_ID = '17NkGhVBMrWBjORApHX6iD7ZFC9GNuGRIWp7DStZF2pI';

var TABS = [
  { key: 'food',       title: 'Food',                    gid: 446220969,  cols: { name: 0, tag: 2, price: 3, desc: 4 } },
  { key: 'liquids',    title: 'Liquids & oils',          gid: 270146892,  cols: { name: 0, tag: 1, price: 2 } },
  { key: 'teas',       title: 'Teas & coffee',           gid: 2070449544, cols: { name: 0, tag: 1, price: 2, desc: 3 } },
  { key: 'spices',     title: 'Spices & herbs',          gid: 388558157,  cols: { name: 0, tag: 1, price: 2 } },
  { key: 'cleaning',   title: 'Cleaning',                gid: 1727003106, cols: { name: 0, price: 1, desc: 2 } },
  { key: 'toiletries', title: 'Toiletries',              gid: 0,          cols: { name: 0, price: 1, desc: 2 } },
  { key: 'seasonal',   title: 'Seasonal & local gifts',  gid: 1446488831, cols: { name: 0, size: 1, price: 2, desc: 3 }, sectionNotes: true }
];

(function () {
  var root = document.getElementById('prices');
  if (!root) return;
  var statusEl = document.getElementById('prices-status');
  var searchEl = document.getElementById('prices-search');
  var jumpEl = document.getElementById('prices-jump');
  var countEl = document.getElementById('prices-count');

  /* ---------- CSV ---------- */
  function parseCSV(text) {
    var rows = [], row = [], cell = '', quoted = false, i = 0, ch;
    for (; i < text.length; i++) {
      ch = text[i];
      if (quoted) {
        if (ch === '"') {
          if (text[i + 1] === '"') { cell += '"'; i++; } else { quoted = false; }
        } else { cell += ch; }
      } else if (ch === '"') { quoted = true; }
      else if (ch === ',') { row.push(cell); cell = ''; }
      else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
      else if (ch !== '\r') { cell += ch; }
    }
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    return rows;
  }

  function at(row, index) {
    return index === undefined ? '' : String(row[index] === undefined ? '' : row[index]).replace(/\s+/g, ' ').trim();
  }

  function tidyHeading(text) {
    if (text === text.toUpperCase() && /[A-Z]/.test(text)) {
      return text.charAt(0) + text.slice(1).toLowerCase();
    }
    return text;
  }

  /* "Price per 100g (£)" -> "per 100g"; "per item (£)" -> "each"; "Price (£)" -> "" */
  function unitFrom(header) {
    var m = /per\s+([^()]+?)\s*(\(|$)/i.exec(header);
    if (!m) return '';
    return /^item$/i.test(m[1]) ? 'each' : 'per ' + m[1];
  }

  /* A name or section that states its own pack size is sold by the item. */
  var PACK = /\b\d+(\.\d+)?\s?(g|kg|ml|l)\b|\bx\s?\d+|\bkit\b|\bbottled\b/i;

  /* ---------- sheet rows -> sections of products ---------- */
  function readTab(tab, rows) {
    var c = tab.cols, sections = [], current = null, unit = '', sectionEach = false, last = null;

    function open(title, note) {
      current = { title: title, note: note || '', items: [] };
      sections.push(current);
    }

    for (var i = 1; i < rows.length; i++) {            /* row 0 is the tab's title */
      var row = rows[i];
      var name = at(row, c.name), price = at(row, c.price), tag = at(row, c.tag),
          size = at(row, c.size), desc = at(row, c.desc);
      if (!name && !price && !tag && !size && !desc) continue;

      if (/price|per item/i.test(price) && price.indexOf('£') !== 0) {   /* a header row */
        unit = unitFrom(price);
        if (name) { open(tidyHeading(name)); sectionEach = false; }
        continue;
      }
      if (!name) continue;

      if (name.charAt(0) === '-') {                    /* "- Ready Salted": a variety of the row above */
        if (last) last.varieties.push(name.replace(/^-\s*/, ''));
        continue;
      }

      var nextName = i + 1 < rows.length ? at(rows[i + 1], c.name) : '';
      if (!price && !tag && !size && nextName && (!desc || tab.sectionNotes)) {
        open(tidyHeading(name), desc);
        sectionEach = PACK.test(name) && !/per\s+\d/i.test(name);
        continue;
      }

      if (!current) open('');
      var isNew = /^new\b!?\s*[-–]?\s*/i.test(name);
      var cleanName = name.replace(/^new\b!?\s*[-–]?\s*/i, '');
      var itemUnit = unit;
      if (unit && unit !== 'each' && (sectionEach || PACK.test(cleanName))) itemUnit = 'each';
      last = {
        name: cleanName, isNew: isNew, tag: tag, desc: desc, price: price,
        size: /^\d+$/.test(size) ? '' : size,
        unit: price && /^£[\d.,]+$/.test(price) ? itemUnit : '',
        varieties: []
      };
      current.items.push(last);
    }
    return sections.filter(function (s) { return s.items.length; });
  }

  /* ---------- page ---------- */
  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function tagLabel(tag) {
    var t = tag.toLowerCase().replace(/[-\s]+/g, ' ');
    if (t === 'non organic') return '';
    return tag.charAt(0).toUpperCase() + tag.slice(1).toLowerCase();
  }

  function renderItem(item, sectionTitle, tabTitle) {
    var li = el('li', 'price-row');
    var main = el('div', 'price-row__main');
    var title = el('p', 'price-row__name', item.name);
    if (item.isNew) title.appendChild(el('span', 'chip chip--new', 'New'));
    var label = tagLabel(item.tag);
    if (label) title.appendChild(el('span', 'chip', label));
    main.appendChild(title);
    var extra = [];
    if (item.size) extra.push(item.size);
    if (item.varieties.length) extra.push(item.varieties.join(', '));
    if (item.desc) extra.push(item.desc);
    if (extra.length) main.appendChild(el('p', 'price-row__desc', extra.join(' · ')));
    li.appendChild(main);

    var cost = el('p', 'price-row__price');
    if (item.price) {
      cost.appendChild(el('strong', '', item.price));
      if (item.unit) cost.appendChild(el('span', '', ' ' + item.unit));
    } else {
      cost.appendChild(el('span', '', 'Ask in store'));
    }
    li.appendChild(cost);
    li.setAttribute('data-search', [item.name, item.tag, item.desc, item.varieties.join(' '), sectionTitle, tabTitle].join(' ').toLowerCase());
    return li;
  }

  function renderTab(tab, sections) {
    var block = el('section', 'price-cat');
    block.id = 'prices-' + tab.key;
    block.appendChild(el('h2', 'headline', tab.title));
    sections.forEach(function (section) {
      var group = el('div', 'price-group');
      if (section.title) group.appendChild(el('h3', 'title', section.title));
      if (section.note) group.appendChild(el('p', 'price-group__note', section.note));
      var list = el('ul', 'price-list');
      section.items.forEach(function (item) { list.appendChild(renderItem(item, section.title, tab.title)); });
      group.appendChild(list);
      block.appendChild(group);
    });
    return block;
  }

  function applySearch() {
    var words = (searchEl ? searchEl.value : '').toLowerCase().split(/\s+/).filter(Boolean);
    var shown = 0;
    root.querySelectorAll('.price-cat').forEach(function (cat) {
      var catShown = 0;
      cat.querySelectorAll('.price-group').forEach(function (group) {
        var groupShown = 0;
        group.querySelectorAll('.price-row').forEach(function (rowEl) {
          var hay = rowEl.getAttribute('data-search');
          var match = words.every(function (w) { return hay.indexOf(w) !== -1; });
          rowEl.hidden = !match;
          if (match) groupShown++;
        });
        group.hidden = !groupShown;
        catShown += groupShown;
      });
      cat.hidden = !catShown;
      shown += catShown;
    });
    if (countEl) {
      countEl.textContent = words.length
        ? (shown ? shown + (shown === 1 ? ' product matches' : ' products match') : 'Nothing matches that. Try a shorter word, or ask us in store.')
        : '';
    }
  }

  function csvUrl(tab) {
    return 'https://docs.google.com/spreadsheets/d/' + SHEET_ID + '/export?format=csv&gid=' + tab.gid;
  }

  function fail() {
    root.textContent = '';
    if (statusEl) statusEl.hidden = true;
    var fallback = document.getElementById('prices-fallback');
    if (fallback) fallback.hidden = false;
    var tools = document.getElementById('prices-tools');
    if (tools) tools.hidden = true;
  }

  Promise.all(TABS.map(function (tab) {
    return fetch(csvUrl(tab)).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.text();
    }).then(function (text) {
      if (/^\s*<(!doctype|html)/i.test(text)) throw new Error('not a sheet');
      return { tab: tab, sections: readTab(tab, parseCSV(text)) };
    }).catch(function () { return { tab: tab, sections: null }; });
  })).then(function (results) {
    var good = results.filter(function (r) { return r.sections && r.sections.length; });
    if (!good.length) return fail();
    root.textContent = '';
    good.forEach(function (r) {
      root.appendChild(renderTab(r.tab, r.sections));
      if (jumpEl) {
        var link = el('a', 'chip chip--link', r.tab.title);
        link.href = '#prices-' + r.tab.key;
        jumpEl.appendChild(link);
      }
    });
    if (statusEl) statusEl.hidden = true;
    var tools = document.getElementById('prices-tools');
    if (tools) tools.hidden = false;
    if (searchEl) searchEl.addEventListener('input', applySearch);
    if (location.hash && document.getElementById(location.hash.slice(1))) {
      document.getElementById(location.hash.slice(1)).scrollIntoView();
    }
  }).catch(fail);
})();
