/* ==========================================================================
   RAHA — product catalogue
   Progressive enhancement over server-rendered cards:
     • category filtering + text search
     • quick-view modal built from each card's embedded JSON
     • an enquiry list (localStorage) that exports to WhatsApp or email
   ========================================================================== */
(function () {
  'use strict';

  var grid = document.getElementById('productGrid');
  if (!grid) return;

  var WHATSAPP = '27325431234';
  var EMAIL = 'info@raha.co.za';
  var STORE_KEY = 'raha.enquiry.v1';

  var cards = Array.prototype.slice.call(grid.querySelectorAll('.p-card'));
  var filterButtons = Array.prototype.slice.call(document.querySelectorAll('.filter'));
  var searchInput = document.getElementById('productSearch');
  var countOutput = document.getElementById('resultCount');
  var emptyState = document.getElementById('emptyState');

  /* ---- Card metadata ------------------------------------------------------ */
  function readCard(card) {
    var payload = {};
    var node = card.querySelector('script.p-data');
    if (node) {
      try { payload = JSON.parse(node.textContent); } catch (err) { payload = {}; }
    }
    var img = card.querySelector('.p-card__media img');
    return {
      id: card.dataset.id,
      name: card.dataset.name,
      category: card.dataset.category,
      categoryLabel: card.dataset.categoryLabel || card.dataset.category,
      pack: card.dataset.pack || '',
      image: img ? img.getAttribute('src') : '',
      alt: img ? img.getAttribute('alt') : '',
      blurb: payload.blurb || '',
      specs: payload.specs || {},
      points: payload.points || []
    };
  }

  var catalogue = {};
  cards.forEach(function (card) { catalogue[card.dataset.id] = readCard(card); });

  /* ---- Filtering + search -------------------------------------------------- */
  var activeCategory = 'all';
  var query = '';

  function matches(card) {
    var byCategory = activeCategory === 'all' || card.dataset.category === activeCategory;
    if (!byCategory) return false;
    if (!query) return true;
    return (card.dataset.search || '').indexOf(query) !== -1;
  }

  function applyFilters() {
    var shown = 0;
    cards.forEach(function (card) {
      var visible = matches(card);
      card.classList.toggle('is-hidden', !visible);
      if (visible) shown++;
    });

    if (countOutput) {
      countOutput.innerHTML = 'Showing <strong>' + shown + '</strong> of ' + cards.length + ' products';
    }
    if (emptyState) emptyState.hidden = shown !== 0;
  }

  filterButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      activeCategory = button.dataset.filter;
      filterButtons.forEach(function (other) {
        other.setAttribute('aria-pressed', String(other === button));
      });
      applyFilters();
    });
  });

  if (searchInput) {
    searchInput.addEventListener('input', function () {
      query = searchInput.value.trim().toLowerCase();
      applyFilters();
    });
  }

  applyFilters();

  /* ---- Quick-view modal ---------------------------------------------------- */
  var modal = document.getElementById('quickView');
  var modalMedia = document.getElementById('qvMedia');
  var modalBody = document.getElementById('qvBody');
  var lastFocused = null;

  function openModal(id) {
    var item = catalogue[id];
    if (!item || !modal) return;

    lastFocused = document.activeElement;

    modalMedia.innerHTML = '<img src="' + item.image + '" alt="' + item.alt + '">';

    var rows = Object.keys(item.specs).map(function (key) {
      return '<tr><th scope="row">' + key + '</th><td>' + item.specs[key] + '</td></tr>';
    }).join('');

    var points = item.points.length
      ? '<ul class="check-list">' + item.points.map(function (point) {
          return '<li><i class="fas fa-check" aria-hidden="true"></i>' + point + '</li>';
        }).join('') + '</ul>'
      : '';

    modalBody.innerHTML =
      '<span class="p-card__cat">' + item.categoryLabel + '</span>' +
      '<h2 id="qvTitle">' + item.name + '</h2>' +
      '<p>' + item.blurb + '</p>' +
      points +
      '<table class="spec-table"><caption class="sr-only">Product specification</caption><tbody>' + rows + '</tbody></table>' +
      '<div class="modal__actions">' +
        '<button class="btn btn--primary" data-add="' + item.id + '"><i class="fas fa-plus" aria-hidden="true"></i> Add to enquiry</button>' +
        '<a class="btn btn--outline" href="https://wa.me/' + WHATSAPP + '?text=' +
          encodeURIComponent("Hi RAHA, I'd like pricing on: " + item.name) +
          '" target="_blank" rel="noopener"><i class="fab fa-whatsapp" aria-hidden="true"></i> Ask on WhatsApp</a>' +
      '</div>';

    modal.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    var closeButton = modal.querySelector('.modal__close');
    if (closeButton) closeButton.focus();
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove('is-open');
    if (!drawerIsOpen()) document.body.style.overflow = '';
    if (lastFocused) lastFocused.focus();
  }

  if (modal) {
    modal.addEventListener('click', function (e) {
      if (e.target.closest('.modal__close') || e.target.classList.contains('modal__backdrop')) closeModal();
    });
  }

  /* ---- Enquiry list -------------------------------------------------------- */
  var drawer = document.getElementById('enquiryDrawer');
  var drawerBody = document.getElementById('drawerBody');
  var drawerFoot = document.getElementById('drawerFoot');
  var basketCount = document.getElementById('basketCount');
  var scrim = document.getElementById('scrim');

  var lines = load();

  function load() {
    try {
      var raw = window.localStorage.getItem(STORE_KEY);
      var parsed = raw ? JSON.parse(raw) : [];
      // Drop entries whose product is no longer in the catalogue.
      return Array.isArray(parsed) ? parsed.filter(function (line) { return catalogue[line.id]; }) : [];
    } catch (err) {
      return [];
    }
  }

  function save() {
    try { window.localStorage.setItem(STORE_KEY, JSON.stringify(lines)); } catch (err) { /* private mode */ }
  }

  function totalUnits() {
    return lines.reduce(function (sum, line) { return sum + line.qty; }, 0);
  }

  function addLine(id) {
    if (!catalogue[id]) return;
    var existing = lines.filter(function (line) { return line.id === id; })[0];
    if (existing) existing.qty++;
    else lines.push({ id: id, qty: 1 });
    save();
    renderDrawer();
    toast(catalogue[id].name + ' added to your enquiry');
  }

  function changeQty(id, delta) {
    var line = lines.filter(function (item) { return item.id === id; })[0];
    if (!line) return;
    line.qty += delta;
    if (line.qty < 1) lines = lines.filter(function (item) { return item.id !== id; });
    save();
    renderDrawer();
  }

  function removeLine(id) {
    lines = lines.filter(function (line) { return line.id !== id; });
    save();
    renderDrawer();
  }

  function enquiryText() {
    var body = lines.map(function (line) {
      var item = catalogue[line.id];
      return '• ' + item.name + (item.pack ? ' (' + item.pack + ')' : '') + ' — qty ' + line.qty;
    }).join('\n');
    return 'Hi RAHA, I would like a quote on the following:\n\n' + body +
      '\n\nPlease send pricing and lead times. Thank you.';
  }

  function renderDrawer() {
    if (basketCount) {
      var units = totalUnits();
      basketCount.textContent = String(units);
      basketCount.classList.toggle('is-on', units > 0);
    }
    if (!drawerBody) return;

    if (!lines.length) {
      drawerBody.innerHTML =
        '<div class="drawer__empty">' +
          '<i class="far fa-clipboard" aria-hidden="true"></i>' +
          '<p>Your enquiry list is empty.</p>' +
          '<p style="font-size:.8rem">Add products to request pricing in one go.</p>' +
        '</div>';
      if (drawerFoot) drawerFoot.hidden = true;
      return;
    }

    drawerBody.innerHTML = lines.map(function (line) {
      var item = catalogue[line.id];
      return '<div class="line-item">' +
        '<div class="line-item__img"><img src="' + item.image + '" alt=""></div>' +
        '<div class="line-item__info">' +
          '<span class="line-item__name">' + item.name + '</span>' +
          '<span class="line-item__meta">' + (item.pack || item.categoryLabel) + '</span>' +
          '<div class="qty">' +
            '<button type="button" data-qty="-1" data-id="' + item.id + '" aria-label="Decrease quantity of ' + item.name + '"><i class="fas fa-minus" aria-hidden="true"></i></button>' +
            '<span>' + line.qty + '</span>' +
            '<button type="button" data-qty="1" data-id="' + item.id + '" aria-label="Increase quantity of ' + item.name + '"><i class="fas fa-plus" aria-hidden="true"></i></button>' +
          '</div>' +
        '</div>' +
        '<button type="button" class="line-item__remove" data-remove="' + item.id + '" aria-label="Remove ' + item.name + '"><i class="fas fa-xmark" aria-hidden="true"></i></button>' +
      '</div>';
    }).join('');

    if (drawerFoot) {
      drawerFoot.hidden = false;
      var waLink = drawerFoot.querySelector('[data-wa]');
      var mailLink = drawerFoot.querySelector('[data-mail]');
      if (waLink) waLink.href = 'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(enquiryText());
      if (mailLink) {
        mailLink.href = 'mailto:' + EMAIL +
          '?subject=' + encodeURIComponent('Product enquiry — RAHA') +
          '&body=' + encodeURIComponent(enquiryText());
      }
    }
  }

  function drawerIsOpen() { return drawer && drawer.classList.contains('is-open'); }

  function setDrawer(open) {
    if (!drawer) return;
    drawer.classList.toggle('is-open', open);
    drawer.setAttribute('aria-hidden', String(!open));
    if (scrim) scrim.classList.toggle('is-open', open);
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) {
      var closeButton = drawer.querySelector('[data-drawer-close]');
      if (closeButton) closeButton.focus();
    }
  }

  renderDrawer();

  /* ---- Toast --------------------------------------------------------------- */
  var toastEl = document.getElementById('toast');
  var toastTimer = null;

  function toast(message) {
    if (!toastEl) return;
    toastEl.querySelector('span').textContent = message;
    toastEl.classList.add('is-on');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () { toastEl.classList.remove('is-on'); }, 2600);
  }

  /* ---- Delegated events ----------------------------------------------------- */
  document.addEventListener('click', function (e) {
    var view = e.target.closest('[data-view]');
    if (view) { openModal(view.dataset.view); return; }

    var add = e.target.closest('[data-add]');
    if (add) { addLine(add.dataset.add); return; }

    var qty = e.target.closest('[data-qty]');
    if (qty) { changeQty(qty.dataset.id, parseInt(qty.dataset.qty, 10)); return; }

    var remove = e.target.closest('[data-remove]');
    if (remove) { removeLine(remove.dataset.remove); return; }

    if (e.target.closest('[data-drawer-open]')) { setDrawer(true); return; }
    if (e.target.closest('[data-drawer-close]')) { setDrawer(false); return; }

    if (e.target === scrim) setDrawer(false);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (modal && modal.classList.contains('is-open')) closeModal();
    else if (drawerIsOpen()) setDrawer(false);
  });
})();
