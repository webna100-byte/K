/* ===================== Cart Page Logic ===================== */

(async function () {
  await Store.ready;

const splashLogo = Store.get().settings.logo;
if (splashLogo) {
  const splashImg = document.getElementById('splashLogo');
  if (splashImg) { splashImg.src = splashLogo; splashImg.style.display = 'block'; }
}

applyDocDir();
applyPageColors('menu');

const dataCart = Store.get();
document.title = t('cart');
renderHeader({ showBack: true, backHref: 'menu.html' });
renderFooter();
document.getElementById('pageTitle').textContent = t('cart');
document.getElementById('totalLabel').textContent = t('total');
document.getElementById('checkoutBtn').innerHTML = `<i data-lucide="arrow-left"></i> ${t('checkout')}`;

function summarizeItem(item) {
  const parts = [];
  (item.optionGroupsSnapshot || []).forEach(g => {
    const sel = item.selections[g.id];
    if (!sel) return;
    if (Array.isArray(sel)) {
      if (!sel.length) return;
      const names = sel.map(optId => {
        const o = g.options.find(x => x.id === optId);
        return o ? tField(o.name) : '';
      }).filter(Boolean);
      if (names.length) parts.push(`${tField(g.name)}: ${names.join(', ')}`);
    } else {
      const o = g.options.find(x => x.id === sel);
      if (o) parts.push(`${tField(g.name)}: ${tField(o.name)}`);
    }
  });
  if (item.notes) parts.push(`${t('notes')}: ${item.notes}`);
  return parts.join(' • ');
}

function itemTotal(item) {
  return item.unitPrice * item.qty;
}

function render() {
  const cart = Store.getCart();
  const list = document.getElementById('cartList');
  const summary = document.getElementById('cartSummary');

  if (!cart.length) {
    list.innerHTML = `
      <div class="empty-state">
        <i data-lucide="shopping-cart"></i>
        <p>${t('empty_cart')}</p>
        <a href="menu.html" class="btn-primary" style="display:inline-flex;width:auto;padding:10px 20px;margin-top:10px;">${t('go_to_menu')}</a>
      </div>`;
    summary.classList.add('hidden');
    renderIcons();
    return;
  }

  list.innerHTML = cart.map(item => `
    <div class="cart-item" data-id="${item.cartItemId}">
      <img src="${item.productImage || PLACEHOLDER_IMG}" alt="">
      <div class="cart-item-info">
        <h3>${tField(item.productName)}</h3>
        <div class="opts">${summarizeItem(item)}</div>
        <div class="cart-item-footer">
          <div class="qty-control">
            <button class="qty-minus">−</button>
            <span>${item.qty}</span>
            <button class="qty-plus">+</button>
          </div>
          <span class="cart-item-price">${fmtMoney(itemTotal(item))}</span>
        </div>
        <button class="remove-link" data-id="${item.cartItemId}">${t('remove')}</button>
      </div>
    </div>
  `).join('');

  const total = cart.reduce((sum, i) => sum + itemTotal(i), 0);
  document.getElementById('totalValue').textContent = fmtMoney(total);
  summary.classList.remove('hidden');

  list.querySelectorAll('.remove-link').forEach(btn => {
    btn.addEventListener('click', () => {
      const cart2 = Store.getCart().filter(i => i.cartItemId !== btn.dataset.id);
      Store.saveCart(cart2);
      updateCartCount();
      render();
    });
  });
  list.querySelectorAll('.qty-minus').forEach(btn => {
    btn.addEventListener('click', () => changeQty(btn.closest('.cart-item').dataset.id, -1));
  });
  list.querySelectorAll('.qty-plus').forEach(btn => {
    btn.addEventListener('click', () => changeQty(btn.closest('.cart-item').dataset.id, 1));
  });

  renderIcons();
}

function changeQty(id, delta) {
  const cart = Store.getCart();
  const item = cart.find(i => i.cartItemId === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) {
    Store.saveCart(cart.filter(i => i.cartItemId !== id));
  } else {
    Store.saveCart(cart);
  }
  updateCartCount();
  render();
}

document.getElementById('checkoutBtn').addEventListener('click', () => {
  location.href = 'checkout.html';
});

render();
hideSplash();
})();
