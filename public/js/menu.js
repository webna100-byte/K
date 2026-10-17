/* ===================== Menu ===================== */
boot('menu', async (data) => {
if (Store.isMultiBranch() && !Store.getSelectedBranch()) { location.replace('/branches'); return; }
Store.ensureBranch();
const dec = decimals();
const selectedBranch = Store.getSelectedBranch();
const branchObj = data.branches.find(b => b.id === selectedBranch);
if (Store.isMultiBranch() && branchObj) {
  const bar = document.getElementById('branchBar');
  bar.classList.remove('hidden');
  bar.innerHTML = `<span><i data-lucide="map-pin"></i> ${tx(branchObj.name)}</span><a href="/branches">${t('change_branch')}</a>`;
}

/* ---- Slider ---- */
(function initSlider() {
  const slider = document.getElementById('slider');
  const images = data.settings.slider.images || [];
  if (!images.length) { slider.style.display = 'none'; return; }
  slider.innerHTML = images.map((src, i) =>
    `<img src="${escapeHtml(src)}" class="${i === 0 ? 'active' : ''}" alt="" ${i ? 'loading="lazy"' : ''}>`
  ).join('') + `<div class="slider-dots">${images.map((_, i) => `<span class="${i === 0 ? 'active' : ''}"></span>`).join('')}</div>`;

  if (images.length <= 1) return;

  let idx = 0;
  const imgs = slider.querySelectorAll('img');
  const dots = slider.querySelectorAll('.slider-dots span');
  const seconds = Math.max(1, Number(data.settings.slider.intervalSeconds) || 4);
  let timer = null;

  function goTo(newIdx) {
    imgs[idx].classList.remove('active');
    dots[idx].classList.remove('active');
    idx = (newIdx + imgs.length) % imgs.length;
    imgs[idx].classList.add('active');
    dots[idx].classList.add('active');
  }

  function startTimer() {
    clearInterval(timer);
    timer = setInterval(() => goTo(idx + 1), seconds * 1000);
  }

  // A manual swipe/drag/dot-tap jumps immediately and restarts the
  // countdown, so browsing doesn't fight the auto-advance timer.
  function manualGoTo(newIdx) {
    goTo(newIdx);
    startTimer();
  }

  dots.forEach((dot, i) => dot.addEventListener('click', () => manualGoTo(i)));

  let startX = 0, deltaX = 0, dragging = false;
  const SWIPE_THRESHOLD = 40;

  function onStart(x) { dragging = true; startX = x; deltaX = 0; }
  function onMove(x) { if (dragging) deltaX = x - startX; }
  function onEnd() {
    if (!dragging) return;
    dragging = false;
    if (Math.abs(deltaX) > SWIPE_THRESHOLD) {
      const dir = deltaX < 0 ? 1 : -1; // swipe left -> next, swipe right -> prev
      manualGoTo(idx + dir);
    }
  }

  slider.addEventListener('touchstart', (e) => onStart(e.touches[0].clientX), { passive: true });
  slider.addEventListener('touchmove', (e) => onMove(e.touches[0].clientX), { passive: true });
  slider.addEventListener('touchend', onEnd);

  slider.addEventListener('mousedown', (e) => { e.preventDefault(); onStart(e.clientX); });
  window.addEventListener('mousemove', (e) => onMove(e.clientX));
  window.addEventListener('mouseup', onEnd);

  startTimer();
})();

/* ---- Categories & Products ---- */
function availableForBranch(item) { return Pricing.availableForBranch(item, selectedBranch); }
const visibleCategories = sortByOrder(data.categories.filter(availableForBranch));

function productCardHtml(p) {
  const hasDiscount = p.discountPercent > 0;
  const priceHtml = hasDiscount
    ? `<span>${fmtMoney(Pricing.productBasePrice(p, dec))}</span><span class="old-price">${fmtMoney(Pricing.rawBasePrice(p))}</span>`
    : `<span>${fmtMoney(Pricing.rawBasePrice(p))}</span>`;
  return `
    <div class="product-card" data-id="${p.id}">
      <div class="product-image-wrap">
        <img src="${escapeHtml(p.image || PLACEHOLDER_IMG)}" alt="" loading="lazy">
        ${hasDiscount ? `<div class="discount-badge"><i data-lucide="flame"></i><span>${p.discountPercent}%</span></div>` : ''}
      </div>
      <div class="product-info">
        <h3>${tx(p.name)}</h3>
        <p>${tx(p.description)}</p>
        <div class="product-price">${priceHtml}</div>
        <button class="product-add-btn">${t('add_to_cart')}</button>
      </div>
    </div>
  `;
}

function renderCategories() {
  const bar = document.getElementById('categoriesBar');
  // Look chosen in the admin: circles (default) | pills | cards; sticky or not.
  const barCfg = data.settings.categoryBar || {};
  const style = ['circles', 'pills', 'cards'].includes(barCfg.style) ? barCfg.style : 'circles';
  bar.classList.add('cat-style-' + style);
  bar.classList.toggle('cat-static', barCfg.sticky === false);
  document.body.classList.toggle('cat-bar-static', barCfg.sticky === false);
  bar.innerHTML = visibleCategories.map(c => `
    <div class="category-chip" data-id="${c.id}">
      ${style === 'pills' ? '' : `<img src="${escapeHtml(c.image || PLACEHOLDER_IMG)}" alt="">`}
      <span>${tx(c.name)}</span>
    </div>
  `).join('');
  setupCategoryBar(bar);
}

/* Lets the category bar be dragged with the mouse on desktop (touch already
   scrolls natively) and makes tapping a chip jump to its section below. */
function setupCategoryBar(bar) {
  let isDown = false, startX = 0, scrollLeft = 0, moved = false;

  bar.addEventListener('mousedown', (e) => {
    isDown = true; moved = false;
    bar.classList.add('dragging');
    startX = e.pageX;
    scrollLeft = bar.scrollLeft;
  });
  window.addEventListener('mouseup', () => { isDown = false; bar.classList.remove('dragging'); });
  bar.addEventListener('mouseleave', () => { isDown = false; bar.classList.remove('dragging'); });
  bar.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    e.preventDefault();
    const walk = e.pageX - startX;
    if (Math.abs(walk) > 5) moved = true;
    bar.scrollLeft = scrollLeft - walk;
  });

  bar.querySelectorAll('.category-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      if (moved) return;
      const section = document.getElementById('cat-' + chip.dataset.id);
      if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

function renderSections() {
  const wrap = document.getElementById('menuSections');
  const sections = visibleCategories
    .map(c => ({ cat: c, products: sortByOrder(data.products.filter(p => p.categoryId === c.id && availableForBranch(p))) }))
    .filter(x => x.products.length);

  if (!sections.length) {
    wrap.innerHTML = `<p class="mini-note" style="text-align:center;padding:30px 0;">${t('no_products')}</p>`;
    return;
  }

  wrap.innerHTML = sections.map(({ cat, products }) => `
    <div class="menu-category-section" id="cat-${cat.id}">
      <h2 class="menu-category-title">${tx(cat.name)}</h2>
      <div class="products-grid">
        ${products.map(productCardHtml).join('')}
      </div>
    </div>
  `).join('');

  wrap.querySelectorAll('.product-card').forEach(card => {
    card.addEventListener('click', () => openProductModal(card.dataset.id));
  });

  renderIcons();
  setupScrollSpy(sections.map(x => x.cat.id));
}

/* Highlights the category chip matching whichever section is currently in view. */
function setupScrollSpy(ids) {
  const chips = {};
  document.querySelectorAll('.category-chip').forEach(chip => { chips[chip.dataset.id] = chip; });
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const id = entry.target.id.replace('cat-', '');
      document.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'));
      if (chips[id]) chips[id].classList.add('active');
    });
  }, { rootMargin: '-140px 0px -60% 0px', threshold: 0 });
  ids.forEach(id => {
    const el = document.getElementById('cat-' + id);
    if (el) observer.observe(el);
  });
}

renderCategories();
renderSections();
if (location.hash) { const target = document.querySelector(location.hash.replace(/[^#\w-]/g, '')); if (target) setTimeout(() => target.scrollIntoView({ block: 'start' }), 60); }

/* ---- Product Modal ---- */
const modalOverlay = document.getElementById('productModal');
const modalContent = document.getElementById('modalContent');
document.getElementById('closeModal').addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeModal(); });

function closeModal() {
  modalOverlay.classList.add('hidden');
  document.body.classList.remove('no-scroll');
  modalContent.innerHTML = '';
}

function openProductModal(productId) {
  const product = data.products.find(p => p.id === productId);
  if (!product) return;

  const pricingGrp = Pricing.pricingGroup(product);

  const state = { qty: 1, selections: {}, notes: '' };
  (product.optionGroups = product.optionGroups || []).forEach(g => {
    if (g.type.startsWith('multi')) {
      state.selections[g.id] = [];
    } else {
      // Pre-select the first option so the displayed price always matches
      // a real selection (and the card price, which is this same option).
      state.selections[g.id] = g.options[0] ? g.options[0].id : null;
    }
  });

  function calcPrice() {
    return Pricing.unitPrice(product, state.selections, dec).price * state.qty;
  }

  function renderModal() {
    modalContent.innerHTML = `
      <img src="${escapeHtml(product.image || PLACEHOLDER_IMG)}" alt="">
      <div class="modal-body">
        <h2>${tx(product.name)}</h2>
        <p class="desc">${tx(product.description)}</p>
        ${product.optionGroups.map(g => renderGroup(g)).join('')}
        <div class="option-group">
          <div class="option-group-title">${t('notes')}</div>
          <textarea class="notes-field" id="notesField" maxlength="300" placeholder="${t('notes_ph')}">${escapeHtml(state.notes)}</textarea>
        </div>
        <div class="qty-row">
          <div class="qty-control">
            <button id="qtyMinus">−</button>
            <span id="qtyVal">${state.qty}</span>
            <button id="qtyPlus">+</button>
          </div>
          <div class="cart-item-price" id="livePrice">${fmtMoney(calcPrice())}</div>
        </div>
        <button class="btn-primary" id="addToCartBtn"><i data-lucide="shopping-cart"></i> ${t('add_to_cart')}</button>
      </div>
    `;
    renderIcons();
    bindEvents();
  }

  function renderGroup(g) {
    const isSingle = g.type === 'single_price' || g.type === 'single_flat';
    const isPricingGroup = g === pricingGrp;
    return `
      <div class="option-group" data-group="${g.id}">
        <div class="option-group-title">${tx(g.name)}</div>
        ${g.options.map(o => `
          <div class="option-row">
            <label>
              <input type="${isSingle ? 'radio' : 'checkbox'}" name="grp_${g.id}" value="${o.id}" ${isSingle && state.selections[g.id] === o.id ? 'checked' : ''}>
              <span>${tx(o.name)}</span>
            </label>
            ${isPricingGroup
              ? `<span class="delta">${fmtMoney(o.priceDelta)}</span>`
              : (g.type === 'single_price' || g.type === 'multi_priced' ? `<span class="delta">${Number(o.priceDelta) > 0 ? '+' : ''}${fmtPrice(o.priceDelta)}</span>` : '')}
          </div>
        `).join('')}
      </div>
    `;
  }

  function bindEvents() {
    product.optionGroups.forEach(g => {
      const isMulti = g.type.startsWith('multi');
      modalContent.querySelectorAll(`input[name="grp_${g.id}"]`).forEach(input => {
        input.addEventListener('change', () => {
          if (isMulti) {
            const checked = Array.from(modalContent.querySelectorAll(`input[name="grp_${g.id}"]:checked`)).map(i => i.value);
            state.selections[g.id] = checked;
          } else {
            state.selections[g.id] = input.value;
          }
          document.getElementById('livePrice').textContent = fmtMoney(calcPrice());
        });
      });
    });
    document.getElementById('notesField').addEventListener('input', (e) => { state.notes = e.target.value; });
    document.getElementById('qtyMinus').addEventListener('click', () => {
      if (state.qty > 1) { state.qty--; updateQty(); }
    });
    document.getElementById('qtyPlus').addEventListener('click', () => {
      state.qty++; updateQty();
    });
    document.getElementById('addToCartBtn').addEventListener('click', addToCart);
  }

  function updateQty() {
    document.getElementById('qtyVal').textContent = state.qty;
    document.getElementById('livePrice').textContent = fmtMoney(calcPrice());
  }

  function addToCart() {
    const cart = Store.getCart();
    cart.push({
      cartItemId: uid('cart'),
      productId: product.id,
      selections: JSON.parse(JSON.stringify(state.selections)),
      notes: state.notes.trim().slice(0, 300),
      qty: state.qty
    });
    Store.saveCart(cart);
    updateCartCount();
    toast(t('item_added'));
    closeModal();
  }

  renderModal();
  modalOverlay.classList.remove('hidden');
  document.body.classList.add('no-scroll');
}
}, { colors: 'menu' });
