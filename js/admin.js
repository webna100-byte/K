/* ===================== Admin Panel Logic ===================== */

if (!Store.isAdminLoggedIn()) {
  location.replace('/admin/login.html');
}

applyDocDir();

const SECTIONS = [
  { key: 'branches', icon: 'store' },
  { key: 'slider', icon: 'images' },
  { key: 'homepage', icon: 'home' },
  { key: 'categories', icon: 'layout-grid' },
  { key: 'products', icon: 'utensils' },
  { key: 'delivery_zones', icon: 'truck' },
  { key: 'colors', icon: 'palette' },
  { key: 'general_settings', icon: 'settings' },
  { key: 'footer', icon: 'panel-bottom' },
  { key: 'login_settings', icon: 'key-round' } // now just an info panel, see renderLogin()
];
const SECTION_ID = { branches: 'branches', slider: 'slider', homepage: 'homepage', categories: 'categories', products: 'products', delivery_zones: 'delivery', colors: 'colors', general_settings: 'general', footer: 'footer', login_settings: 'login' };

window.addEventListener('qrresto:sync-error', (e) => {
  if (e.detail === 'session_expired') {
    toast(t('session_expired'));
    Store.logout();
    setTimeout(() => location.href = '/admin/login.html', 1200);
  } else {
    toast(t('sync_error'));
  }
});

let activeSection = 'branches';

function db() { return Store.get(); }
function persist() {
  try {
    Store.save();
    return true;
  } catch (e) {
    console.error('Save failed', e);
    toast(t('storage_error'));
    return false;
  }
}

/* ---- Layout: nav, topbar ---- */
function renderNav() {
  applySecondaryColor();
  document.getElementById('sideTitle').textContent = t('admin_panel');
  const navHtml = SECTIONS.map(s => `
    <button class="admin-nav-item ${activeSection === s.key ? 'active' : ''}" data-key="${s.key}">
      <i data-lucide="${s.icon}"></i><span>${t(s.key)}</span>
    </button>
  `).join('');
  document.getElementById('sideNav').innerHTML = navHtml;
  document.getElementById('mobileNav').innerHTML = SECTIONS.map(s => `
    <button class="${activeSection === s.key ? 'active' : ''}" data-key="${s.key}">${t(s.key)}</button>
  `).join('');
  document.querySelectorAll('[data-key]').forEach(btn => {
    btn.addEventListener('click', () => {
      activeSection = btn.dataset.key;
      renderAll();
    });
  });
  document.getElementById('viewSiteBtn').textContent = t('go_to_menu');
  document.getElementById('logoutBtn').textContent = t('logout');
  renderIcons();
}


document.getElementById('logoutBtn').addEventListener('click', () => {
  Store.logout();
  location.href = '/admin/login.html';
});

function showSections() {
  Object.entries(SECTION_ID).forEach(([key, id]) => {
    document.getElementById('sec-' + id).classList.toggle('active', key === activeSection);
  });
}

function renderAll() {
  renderNav();
  showSections();
  renderBranches();
  renderSlider();
  renderHomepage();
  renderCategories();
  renderProducts();
  renderDeliveryZones();
  renderColors();
  renderGeneral();
  renderFooterSettings();
  renderLogin();
}

/* ===================== Branches ===================== */
let editingBranch = null;
function renderBranches() {
  const data = db();
  const el = document.getElementById('sec-branches');
  el.innerHTML = `
    <div class="admin-card">
      <div class="checkbox-row">
        <input type="checkbox" id="multiBranchToggle" ${data.settings.multiBranch ? 'checked' : ''}>
        <label for="multiBranchToggle">${t('enable_multi_branch')}</label>
      </div>
    </div>
    <div class="admin-card">
      <div class="admin-topbar"><h3>${t('branches')}</h3><button class="btn-add" id="addBranchBtn">+ ${t('add')}</button></div>
      <div id="branchList"></div>
    </div>
    <div class="admin-card hidden" id="branchFormCard"></div>
  `;
  document.getElementById('multiBranchToggle').addEventListener('change', (e) => {
    data.settings.multiBranch = e.target.checked;
    persist();
    renderGeneral();
  });
  document.getElementById('addBranchBtn').addEventListener('click', () => openBranchForm(null));

  document.getElementById('branchList').innerHTML = data.branches.map(b => `
    <div class="admin-list-item">
      <img src="${b.image || PLACEHOLDER_IMG}">
      <div class="info"><strong>${tField(b.name)}</strong><div class="mini-note">${b.pickupEnabled === false && b.deliveryEnabled !== false ? 'Delivery Only' : b.deliveryEnabled === false && b.pickupEnabled !== false ? 'Pickup Only' : 'Pickup & Delivery'}</div></div>
      <div class="actions">
        <button class="btn-sm btn-edit" data-edit="${b.id}">${t('edit')}</button>
        <button class="btn-sm btn-del" data-del="${b.id}">${t('delete')}</button>
      </div>
    </div>
  `).join('') || `<p class="mini-note">-</p>`;

  document.querySelectorAll('#branchList [data-edit]').forEach(b => b.addEventListener('click', () => openBranchForm(b.dataset.edit)));
  document.querySelectorAll('#branchList [data-del]').forEach(b => b.addEventListener('click', () => {
    if (!confirm(t('confirm_delete'))) return;
    data.branches = data.branches.filter(x => x.id !== b.dataset.del);
    persist(); renderBranches(); renderGeneral();
  }));
}

function openBranchForm(id) {
  const data = db();
  const branch = id ? data.branches.find(x => x.id === id) : { id: null, name: { ar: '', en: '' }, image: '', pickupEnabled: true, deliveryEnabled: true };
  const card = document.getElementById('branchFormCard');
  card.classList.remove('hidden');
  const serviceType = (branch.pickupEnabled === false && branch.deliveryEnabled !== false) ? 'delivery'
    : (branch.deliveryEnabled === false && branch.pickupEnabled !== false) ? 'pickup' : 'both';
  card.innerHTML = `
    <h3>${id ? t('edit') : t('add')}</h3>
    <img src="${branch.image || PLACEHOLDER_IMG}" class="image-preview" id="branchImgPreview">
    <div class="form-group"><label>${t('image')}</label><input type="file" id="branchImgInput" accept="image/*"></div>
    <div class="form-group"><label>${t('name_en')}</label><input type="text" id="branchNameEn" value="${escapeHtml(branch.name?.en || branch.name?.ar || '')}"></div>
    <div class="form-group"><label>Order Options</label>
      <select id="branchServiceType">
        <option value="both" ${serviceType === 'both' ? 'selected' : ''}>Pickup & Delivery</option>
        <option value="pickup" ${serviceType === 'pickup' ? 'selected' : ''}>Pickup Only</option>
        <option value="delivery" ${serviceType === 'delivery' ? 'selected' : ''}>Delivery Only</option>
      </select>
      <p class="mini-note">If nothing was previously selected, Pickup & Delivery is used automatically.</p>
    </div>
    <div style="display:flex;gap:10px;">
      <button class="btn-primary" id="saveBranchBtn" style="width:auto;padding:10px 24px;">${t('save')}</button>
      <button class="btn-sm" id="cancelBranchBtn" style="background:var(--light-bg);">${t('cancel')}</button>
    </div>
  `;
  let newImage = branch.image;
  document.getElementById('branchImgInput').addEventListener('change', async (e) => {
    if (e.target.files[0]) { newImage = await fileToDataURL(e.target.files[0]); document.getElementById('branchImgPreview').src = newImage; }
  });
  document.getElementById('cancelBranchBtn').addEventListener('click', () => card.classList.add('hidden'));
  document.getElementById('saveBranchBtn').addEventListener('click', () => {
    const nameText = document.getElementById('branchNameEn').value.trim();
    if (!nameText) { toast(t('required')); return; }
    const type = document.getElementById('branchServiceType').value;
    const flags = { both: [true,true], pickup: [true,false], delivery: [false,true] }[type] || [true,true];
    const name = { ar: '', en: nameText };
    if (id) {
      branch.name = name; branch.image = newImage; branch.pickupEnabled = flags[0]; branch.deliveryEnabled = flags[1];
      if (branch.deliveryEnabled === false) delete branch.deliveryZones;
      else if (!Array.isArray(branch.deliveryZones)) branch.deliveryZones = [];
    } else {
      const newBranch = { id: uid('branch'), name, image: newImage, pickupEnabled: flags[0], deliveryEnabled: flags[1] };
      if (flags[1]) newBranch.deliveryZones = [];
      data.branches.push(newBranch);
    }
    persist();
    toast(t('saved_successfully'));
    card.classList.add('hidden');
    renderBranches();
    renderGeneral();
  });
}

function escapeHtml(v) { return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

/* ===================== Slider ===================== */
function renderSlider() {
  const data = db();
  const el = document.getElementById('sec-slider');
  el.innerHTML = `
    <div class="admin-card">
      <h3>${t('slider_images')}</h3>
      <div style="display:flex;flex-wrap:wrap;gap:10px;" id="sliderImgs"></div>
      <div class="form-group" style="margin-top:12px;" id="sliderAddWrap">
        <label>${t('upload_image')}</label>
        <input type="file" id="sliderImgInput" accept="image/*">
      </div>
      <div class="form-group">
        <label>${t('slider_interval')}</label>
        <input type="number" min="1" id="sliderInterval" value="${data.settings.slider.intervalSeconds}" style="max-width:120px;">
      </div>
      <button class="btn-primary" id="saveSliderBtn" style="width:auto;padding:10px 24px;">${t('save')}</button>
    </div>
  `;
  const imgsWrap = document.getElementById('sliderImgs');
  imgsWrap.innerHTML = data.settings.slider.images.map((src, i) => `
    <div style="position:relative;">
      <img src="${src}" style="width:110px;height:70px;object-fit:cover;border-radius:8px;">
      <button data-i="${i}" class="btn-sm btn-del" style="position:absolute;top:2px;inset-inline-end:2px;">×</button>
    </div>
  `).join('');
  imgsWrap.querySelectorAll('[data-i]').forEach(btn => btn.addEventListener('click', () => {
    data.settings.slider.images.splice(Number(btn.dataset.i), 1);
    persist(); renderSlider();
  }));
  if (data.settings.slider.images.length >= 3) {
    document.getElementById('sliderAddWrap').classList.add('hidden');
  } else {
    document.getElementById('sliderImgInput').addEventListener('change', async (e) => {
      if (e.target.files[0]) {
        const url = await fileToDataURL(e.target.files[0]);
        data.settings.slider.images.push(url);
        if (!persist()) data.settings.slider.images.pop();
        renderSlider();
      }
    });
  }
  document.getElementById('saveSliderBtn').addEventListener('click', () => {
    data.settings.slider.intervalSeconds = Number(document.getElementById('sliderInterval').value) || 4;
    persist();
    toast(t('saved_successfully'));
  });
}

/* ===================== Homepage ===================== */
function renderHomepage() {
  const data = db();
  const el = document.getElementById('sec-homepage');
  if (!el) return;
  const hp = data.settings.homepage || {};
  const hero = hp.hero || {}, categories = hp.categories || {}, featured = hp.featured || {}, cta = hp.cta || {};
  el.innerHTML = `
    <div class="admin-card">
      <h3>Homepage Text</h3>
      <p class="mini-note">All homepage text below is editable. Leave a field empty if you want that text hidden.</p>
      <h4>Hero</h4>
      <div class="form-group"><label>Eyebrow</label><input type="text" id="homeHeroEyebrow" value="${escapeHtml(hero.eyebrow || '')}" placeholder="Fresh. Fast. Made for you."></div>
      <div class="form-group"><label>Title</label><input type="text" id="homeHeroTitle" value="${escapeHtml(hero.title || '')}" placeholder="Restaurant Name"></div>
      <div class="form-group"><label>Description</label><input type="text" id="homeHeroText" value="${escapeHtml(hero.text || '')}" placeholder="Order your favorites online for pickup or delivery."></div>
      <div class="form-group"><label>Menu Button</label><input type="text" id="homeHeroButton" value="${escapeHtml(hero.button || '')}" placeholder="View Menu"></div>
      <div class="form-group"><label>Hero Background Image</label>
        <img src="${hero.image || PLACEHOLDER_IMG}" class="image-preview" id="homeHeroImgPreview" style="max-height:220px;object-fit:cover;width:100%;border-radius:14px;">
        <input type="file" id="homeHeroImgInput" accept="image/*">
        <p class="mini-note">This image appears behind the hero text on the homepage.</p>
      </div>
      <h4>Categories Section</h4>
      <div class="form-group"><label>Eyebrow</label><input type="text" id="homeCatEyebrow" value="${escapeHtml(categories.eyebrow || '')}" placeholder="What we serve"></div>
      <div class="form-group"><label>Title</label><input type="text" id="homeCatTitle" value="${escapeHtml(categories.title || '')}" placeholder="Made to crave"></div>
      <div class="form-group"><label>Categories to show on Homepage</label>
        <div class="selection-grid">${sortByOrder(data.categories).map(c => `<label class="selection-option"><input type="checkbox" class="home-cat-select" value="${c.id}" ${(categories.selectedIds || []).includes(c.id) ? 'checked' : ''}> <span>${escapeHtml(tField(c.name))}</span></label>`).join('')}</div>
        <p class="mini-note">Select any number of categories. Only selected categories appear on the homepage.</p>
      </div>
      <h4>Featured Products Section</h4>
      <div class="form-group"><label>Eyebrow</label><input type="text" id="homeFavEyebrow" value="${escapeHtml(featured.eyebrow || '')}" placeholder="Customer favorites"></div>
      <div class="form-group"><label>Title</label><input type="text" id="homeFavTitle" value="${escapeHtml(featured.title || '')}" placeholder="Popular picks"></div>
      <div class="form-group"><label>Product Button</label><input type="text" id="homeFavButton" value="${escapeHtml(featured.button || '')}" placeholder="Order Now"></div>
      <div class="form-group"><label>Products to show on Homepage</label>
        <div class="selection-grid">${sortByOrder(data.products).map(p => `<label class="selection-option"><input type="checkbox" class="home-product-select" value="${p.id}" ${(featured.selectedIds || []).includes(p.id) ? 'checked' : ''}> <span>${escapeHtml(tField(p.name))}</span></label>`).join('')}</div>
        <p class="mini-note">Select any number of products. Only selected products appear in Popular Picks.</p>
      </div>
      <h4>Bottom Call to Action</h4>
      <div class="form-group"><label>Eyebrow</label><input type="text" id="homeCtaEyebrow" value="${escapeHtml(cta.eyebrow || '')}" placeholder="Hungry?"></div>
      <div class="form-group"><label>Title</label><input type="text" id="homeCtaTitle" value="${escapeHtml(cta.title || '')}" placeholder="Your next favorite meal is one click away."></div>
      <div class="form-group"><label>Button</label><input type="text" id="homeCtaButton" value="${escapeHtml(cta.button || '')}" placeholder="Start Your Order"></div>
      <button class="btn-primary" id="saveHomepageBtn" style="width:auto;padding:10px 24px;">${t('save')}</button>
    </div>
  `;
  let heroImage = hero.image || '';
  document.getElementById('homeHeroImgInput').addEventListener('change', async (e) => {
    if (e.target.files[0]) {
      heroImage = await fileToDataURL(e.target.files[0]);
      document.getElementById('homeHeroImgPreview').src = heroImage;
    }
  });
  document.getElementById('saveHomepageBtn').addEventListener('click', () => {
    data.settings.homepage = {
      hero: {
        eyebrow: document.getElementById('homeHeroEyebrow').value.trim(),
        title: document.getElementById('homeHeroTitle').value.trim(),
        text: document.getElementById('homeHeroText').value.trim(),
        button: document.getElementById('homeHeroButton').value.trim(),
        image: heroImage
      },
      categories: {
        eyebrow: document.getElementById('homeCatEyebrow').value.trim(),
        title: document.getElementById('homeCatTitle').value.trim(),
        selectedIds: Array.from(document.querySelectorAll('.home-cat-select:checked')).map(x => x.value)
      },
      featured: {
        eyebrow: document.getElementById('homeFavEyebrow').value.trim(),
        title: document.getElementById('homeFavTitle').value.trim(),
        button: document.getElementById('homeFavButton').value.trim(),
        selectedIds: Array.from(document.querySelectorAll('.home-product-select:checked')).map(x => x.value)
      },
      cta: {
        eyebrow: document.getElementById('homeCtaEyebrow').value.trim(),
        title: document.getElementById('homeCtaTitle').value.trim(),
        button: document.getElementById('homeCtaButton').value.trim()
      }
    };
    persist();
    toast(t('saved_successfully'));
  });
}

/* ===================== Categories ===================== */
function renderCategories() {
  const data = db();
  const el = document.getElementById('sec-categories');
  el.innerHTML = `
    <div class="admin-card">
      <div class="admin-topbar"><h3>${t('categories')}</h3><button class="btn-add" id="addCatBtn">+ ${t('add')}</button></div>
      <div id="catList"></div>
    </div>
    <div class="admin-card hidden" id="catFormCard"></div>
  `;
  document.getElementById('addCatBtn').addEventListener('click', () => openCatForm(null));
  document.getElementById('catList').innerHTML = sortByOrder(data.categories).map(c => `
    <div class="admin-list-item">
      <img src="${c.image || PLACEHOLDER_IMG}">
      <div class="info"><strong>${tField(c.name)}</strong><div class="mini-note">${t('sort_order')}: ${c.order || 0}</div></div>
      <div class="actions">
        <button class="btn-sm btn-edit" data-edit="${c.id}">${t('edit')}</button>
        <button class="btn-sm btn-del" data-del="${c.id}">${t('delete')}</button>
      </div>
    </div>
  `).join('') || `<p class="mini-note">-</p>`;
  document.querySelectorAll('#catList [data-edit]').forEach(b => b.addEventListener('click', () => openCatForm(b.dataset.edit)));
  document.querySelectorAll('#catList [data-del]').forEach(b => b.addEventListener('click', () => {
    if (!confirm(t('confirm_delete'))) return;
    data.categories = data.categories.filter(x => x.id !== b.dataset.del);
    persist(); renderCategories();
  }));
}

function branchCheckboxesHtml(name, selectedIds) {
  const data = db();
  if (data.branches.length <= 1) return '';
  return `
    <div class="form-group">
      <label>${t('branch_availability')}</label>
      <div class="branch-checkbox-list">
        ${data.branches.map(b => `
          <label><input type="checkbox" class="${name}-branch" value="${b.id}" ${selectedIds.includes(b.id) ? 'checked' : ''}> ${tField(b.name)}</label>
        `).join('')}
      </div>
      <p class="mini-note">${t('all_branches_note')}</p>
    </div>
  `;
}
function readCheckedBranches(name) {
  return Array.from(document.querySelectorAll(`.${name}-branch:checked`)).map(cb => cb.value);
}

function openCatForm(id) {
  const data = db();
  const cat = id ? data.categories.find(x => x.id === id) : { id: null, name: { ar: '', en: '' }, image: '', branchIds: [], order: data.categories.length };
  const card = document.getElementById('catFormCard');
  card.classList.remove('hidden');
  card.innerHTML = `
    <h3>${id ? t('edit') : t('add')}</h3>
    <img src="${cat.image || PLACEHOLDER_IMG}" class="image-preview" id="catImgPreview">
    <div class="form-group"><label>${t('image')}</label><input type="file" id="catImgInput" accept="image/*"></div>
    <div class="form-row">
      <div class="form-group"><label>${t('name_en')}</label><input type="text" id="catNameEn" value="${cat.name.en || cat.name.ar || ''}"></div>
      <div class="form-group"><label>${t('sort_order')}</label><input type="number" step="1" id="catOrder" value="${cat.order || 0}"></div>
    </div>
    ${branchCheckboxesHtml('cat', cat.branchIds || [])}
    <div style="display:flex;gap:10px;">
      <button class="btn-primary" id="saveCatBtn" style="width:auto;padding:10px 24px;">${t('save')}</button>
      <button class="btn-sm" id="cancelCatBtn" style="background:var(--light-bg);">${t('cancel')}</button>
    </div>
  `;
  let newImage = cat.image;
  document.getElementById('catImgInput').addEventListener('change', async (e) => {
    if (e.target.files[0]) { newImage = await fileToDataURL(e.target.files[0]); document.getElementById('catImgPreview').src = newImage; }
  });
  document.getElementById('cancelCatBtn').addEventListener('click', () => card.classList.add('hidden'));
  document.getElementById('saveCatBtn').addEventListener('click', () => {
    const nameText = document.getElementById('catNameEn').value.trim();
    if (!nameText) { toast(t('required')); return; }
    const name = { ar: '', en: nameText };
    const branchIds = readCheckedBranches('cat');
    const order = Number(document.getElementById('catOrder').value) || 0;
    if (id) { cat.name = name; cat.image = newImage; cat.branchIds = branchIds; cat.order = order; }
    else { data.categories.push({ id: uid('cat'), name, image: newImage, branchIds, order }); }
    persist();
    toast(t('saved_successfully'));
    card.classList.add('hidden');
    renderCategories();
  });
}

/* ===================== Products ===================== */
function renderProducts() {
  const data = db();
  const el = document.getElementById('sec-products');
  el.innerHTML = `
    <div class="admin-card">
      <div class="admin-topbar"><h3>${t('products')}</h3><button class="btn-add" id="addProdBtn">+ ${t('add')}</button></div>
      <div id="prodList"></div>
    </div>
    <div class="admin-card hidden" id="prodFormCard"></div>
  `;
  document.getElementById('addProdBtn').addEventListener('click', () => openProdForm(null));
  document.getElementById('prodList').innerHTML = sortByOrder(data.products).map(p => {
    const cat = data.categories.find(c => c.id === p.categoryId);
    const priceLabel = p.discountPercent > 0 ? `${fmtMoney(productBasePrice(p))} (${fmtMoney(rawBasePrice(p))})` : fmtMoney(rawBasePrice(p));
    return `
    <div class="admin-list-item">
      <img src="${p.image || PLACEHOLDER_IMG}">
      <div class="info"><strong>${tField(p.name)}</strong><div class="mini-note">${cat ? tField(cat.name) : ''} • ${priceLabel} • ${t('sort_order')}: ${p.order || 0}</div></div>
      <div class="actions">
        <button class="btn-sm btn-edit" data-edit="${p.id}">${t('edit')}</button>
        <button class="btn-sm btn-del" data-del="${p.id}">${t('delete')}</button>
      </div>
    </div>`;
  }).join('') || `<p class="mini-note">-</p>`;
  document.querySelectorAll('#prodList [data-edit]').forEach(b => b.addEventListener('click', () => openProdForm(b.dataset.edit)));
  document.querySelectorAll('#prodList [data-del]').forEach(b => b.addEventListener('click', () => {
    if (!confirm(t('confirm_delete'))) return;
    data.products = data.products.filter(x => x.id !== b.dataset.del);
    persist(); renderProducts();
  }));
}

function openProdForm(id) {
  const data = db();
  const product = id
    ? JSON.parse(JSON.stringify(data.products.find(x => x.id === id)))
    : { id: null, categoryId: data.categories[0] ? data.categories[0].id : '', image: '', price: 0, discountPercent: 0, branchIds: [], order: data.products.length, name: { ar: '', en: '' }, description: { ar: '', en: '' }, optionGroups: [] };
  const card = document.getElementById('prodFormCard');
  card.classList.remove('hidden');

  function optionTypeLabel(type) {
    return { single_price: t('type_single_price'), single_flat: t('type_single_flat'), multi_priced: t('type_multi_priced'), multi_flat: t('type_multi_flat') }[type];
  }

  function renderForm() {
    card.innerHTML = `
      <h3>${id ? t('edit') : t('add')}</h3>
      <img src="${product.image || PLACEHOLDER_IMG}" class="image-preview" id="prodImgPreview">
      <div class="form-group"><label>${t('image')}</label><input type="file" id="prodImgInput" accept="image/*"></div>
      <div class="form-row">
        <div class="form-group"><label>${t('name_en')}</label><input type="text" id="prodNameEn" value="${product.name.en || product.name.ar || ''}"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>${t('desc_en')}</label><input type="text" id="prodDescEn" value="${product.description.en || product.description.ar || ''}"></div>
      </div>
      <div class="form-row">
        <div class="form-group" id="priceFieldWrap">
          <label>${t('price')}</label>
          <input type="number" step="0.01" min="0" id="prodPrice" value="${product.price}">
          <p class="mini-note hidden" id="priceFromGroupNote"></p>
        </div>
        <div class="form-group"><label>${t('category')}</label>
          <select id="prodCategory">
            ${data.categories.map(c => `<option value="${c.id}" ${c.id === product.categoryId ? 'selected' : ''}>${tField(c.name)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>${t('discount_percent')}</label><input type="number" step="1" min="0" max="100" id="prodDiscount" value="${product.discountPercent || 0}"></div>
        <div class="form-group"><label>${t('sort_order')}</label><input type="number" step="1" id="prodOrder" value="${product.order || 0}"></div>
      </div>
      ${branchCheckboxesHtml('prod', product.branchIds || [])}

      <h4>${t('option_groups')}</h4>
      <div id="optionGroupsWrap"></div>
      <button type="button" class="btn-sm btn-edit" id="addGroupBtn" style="margin-bottom:14px;">+ ${t('add_option_group')}</button>

      <div style="display:flex;gap:10px;">
        <button class="btn-primary" id="saveProdBtn" style="width:auto;padding:10px 24px;">${t('save')}</button>
        <button class="btn-sm" id="cancelProdBtn" style="background:var(--light-bg);">${t('cancel')}</button>
      </div>
    `;
    renderGroups();
    updatePriceFieldState();

    document.getElementById('prodImgInput').addEventListener('change', async (e) => {
      if (e.target.files[0]) { product.image = await fileToDataURL(e.target.files[0]); document.getElementById('prodImgPreview').src = product.image; }
    });
    document.getElementById('addGroupBtn').addEventListener('click', () => {
      product.optionGroups.push({ id: uid('grp'), type: 'single_price', name: { ar: '', en: '' }, options: [] });
      renderGroups();
    });
    document.getElementById('cancelProdBtn').addEventListener('click', () => card.classList.add('hidden'));
    document.getElementById('saveProdBtn').addEventListener('click', saveProduct);
  }

  function updatePriceFieldState() {
    const pg = pricingGroup(product);
    const priceInput = document.getElementById('prodPrice');
    const note = document.getElementById('priceFromGroupNote');
    if (pg) {
      priceInput.disabled = true;
      priceInput.value = pg.options[0].priceDelta || 0;
      note.textContent = t('price_from_group_note');
      note.classList.remove('hidden');
    } else {
      priceInput.disabled = false;
      note.classList.add('hidden');
    }
  }

  function renderGroups() {
    const wrap = document.getElementById('optionGroupsWrap');
    wrap.innerHTML = product.optionGroups.map((g, gi) => `
      <div class="option-group-card" data-gi="${gi}">
        <div class="form-row">
          <div class="form-group"><label>${t('name_en')}</label><input type="text" class="grp-name-en" value="${g.name.en || g.name.ar || ''}"></div>
        </div>
        <div class="form-group">
          <label>${t('group_type')}</label>
          <select class="grp-type">
            <option value="single_price" ${g.type === 'single_price' ? 'selected' : ''}>${t('type_single_price')}</option>
            <option value="single_flat" ${g.type === 'single_flat' ? 'selected' : ''}>${t('type_single_flat')}</option>
            <option value="multi_priced" ${g.type === 'multi_priced' ? 'selected' : ''}>${t('type_multi_priced')}</option>
            <option value="multi_flat" ${g.type === 'multi_flat' ? 'selected' : ''}>${t('type_multi_flat')}</option>
          </select>
        </div>
        <label class="mini-note">${t('options')}</label>
        <div class="opt-list">
          ${g.options.map((o, oi) => `
            <div class="option-line" data-oi="${oi}">
              <input type="text" class="opt-name-en" placeholder="${t('name_en')}" value="${o.name.en || o.name.ar || ''}">
              ${g.type === 'single_price' || g.type === 'multi_priced' ? `<input type="number" step="0.01" class="opt-delta" placeholder="${t('price_delta')}" value="${o.priceDelta}" style="max-width:90px;">` : ''}
              <button type="button" class="btn-sm btn-del opt-del">×</button>
            </div>
          `).join('')}
        </div>
        <button type="button" class="btn-sm btn-edit add-opt-btn">+ ${t('add_option')}</button>
        <button type="button" class="btn-sm btn-del del-grp-btn" style="float:inline-end;">${t('delete')} ${t('option_groups')}</button>
        <div style="clear:both;"></div>
      </div>
    `).join('');

    wrap.querySelectorAll('.option-group-card').forEach(gcard => {
      const gi = Number(gcard.dataset.gi);
      const g = product.optionGroups[gi];
      gcard.querySelector('.grp-name-en').addEventListener('input', e => g.name.en = e.target.value);
      gcard.querySelector('.grp-type').addEventListener('change', e => { g.type = e.target.value; renderGroups(); });
      gcard.querySelector('.add-opt-btn').addEventListener('click', () => {
        g.options.push({ id: uid('opt'), name: { ar: '', en: '' }, priceDelta: 0 });
        renderGroups();
      });
      gcard.querySelector('.del-grp-btn').addEventListener('click', () => {
        product.optionGroups.splice(gi, 1);
        renderGroups();
      });
      gcard.querySelectorAll('.option-line').forEach(line => {
        const oi = Number(line.dataset.oi);
        const o = g.options[oi];
        line.querySelector('.opt-name-en').addEventListener('input', e => o.name.en = e.target.value);
        const deltaInput = line.querySelector('.opt-delta');
        if (deltaInput) deltaInput.addEventListener('input', e => { o.priceDelta = Number(e.target.value) || 0; updatePriceFieldState(); });
        line.querySelector('.opt-del').addEventListener('click', () => { g.options.splice(oi, 1); renderGroups(); });
      });
    });
    updatePriceFieldState();
  }

  function saveProduct() {
    const nameText = document.getElementById('prodNameEn').value.trim();
    const descText = document.getElementById('prodDescEn').value.trim();
    product.name = { ar: '', en: nameText };
    product.description = { ar: '', en: descText };
    product.price = Number(document.getElementById('prodPrice').value) || 0;
    product.categoryId = document.getElementById('prodCategory').value;
    product.discountPercent = Math.min(100, Math.max(0, Number(document.getElementById('prodDiscount').value) || 0));
    product.branchIds = readCheckedBranches('prod');
    product.order = Number(document.getElementById('prodOrder').value) || 0;
    if (!product.name.en) { toast(t('required')); return; }
    if (id) {
      const idx = data.products.findIndex(x => x.id === id);
      data.products[idx] = product;
    } else {
      product.id = uid('prod');
      data.products.push(product);
    }
    persist();
    toast(t('saved_successfully'));
    card.classList.add('hidden');
    renderProducts();
  }

  renderForm();
}

/* ===================== Delivery Zones ===================== */
function renderDeliveryZones() {
  const data = db();
  const el = document.getElementById('sec-delivery');
  const deliveryBranches = (data.branches || []).filter(b => b.deliveryEnabled !== false);
  if (!deliveryBranches.length) {
    el.innerHTML = `<div class="admin-card"><h3>${t('delivery_zones')}</h3><p class="mini-note">No branches are currently configured for delivery. Delivery zones are only available for branches that have Delivery enabled.</p></div>`;
    return;
  }
  const firstBranchId = deliveryBranches[0].id;
  el.innerHTML = `
    <div class="admin-card">
      <div class="admin-topbar"><h3>${t('delivery_zones')}</h3><button class="btn-add" id="addZoneBtn">+ ${t('add')}</button></div>
      <p class="mini-note">Delivery zones are independent for each delivery-enabled branch. Pickup-only branches do not have delivery zones.</p>
      <div class="form-group"><label>Branch</label>
        <select id="zoneBranchSelect">
          ${deliveryBranches.map(b => `<option value="${escapeHtml(b.id)}">${escapeHtml(tField(b.name))}</option>`).join('')}
        </select>
      </div>
      <div id="zoneList"></div>
    </div>
    <div class="admin-card hidden" id="zoneFormCard"></div>
  `;
  const branchSelect = document.getElementById('zoneBranchSelect');
  branchSelect.value = firstBranchId;
  branchSelect.addEventListener('change', renderZoneList);
  document.getElementById('addZoneBtn').addEventListener('click', () => openZoneForm(null, branchSelect.value));

  function renderZoneList() {
    const branch = data.branches.find(b => b.id === branchSelect.value);
    const zones = (branch && Array.isArray(branch.deliveryZones)) ? branch.deliveryZones : [];
    document.getElementById('zoneList').innerHTML = zones.map(z => `
      <div class="admin-list-item">
        <div class="info"><strong>${tField(z.name)}</strong><div class="mini-note">${fmtMoney(z.price)}</div></div>
        <div class="actions">
          <button class="btn-sm btn-edit" data-edit="${z.id}">${t('edit')}</button>
          <button class="btn-sm btn-del" data-del="${z.id}">${t('delete')}</button>
        </div>
      </div>
    `).join('') || `<p class="mini-note">No delivery zones configured for this branch.</p>`;

    document.querySelectorAll('#zoneList [data-edit]').forEach(b => b.addEventListener('click', () => openZoneForm(b.dataset.edit, branchSelect.value)));
    document.querySelectorAll('#zoneList [data-del]').forEach(b => b.addEventListener('click', () => {
      if (!confirm(t('confirm_delete'))) return;
      const target = data.branches.find(x => x.id === branchSelect.value);
      if (target) target.deliveryZones = (target.deliveryZones || []).filter(x => x.id !== b.dataset.del);
      persist(); renderZoneList();
    }));
  }

  renderZoneList();
}

function openZoneForm(id, branchId) {
  const data = db();
  const branch = data.branches.find(x => x.id === branchId);
  if (!branch || branch.deliveryEnabled === false) return;
  if (!Array.isArray(branch.deliveryZones)) branch.deliveryZones = [];
  const zone = id ? branch.deliveryZones.find(x => x.id === id) : { id: null, name: { ar: '', en: '' }, price: 0 };
  const card = document.getElementById('zoneFormCard');
  card.classList.remove('hidden');
  card.innerHTML = `
    <h3>${id ? t('edit') : t('add')} — ${escapeHtml(tField(branch.name))}</h3>
    <div class="form-row">
      <div class="form-group"><label>${t('name_en')}</label><input type="text" id="zoneNameEn" value="${escapeHtml(zone.name.en || zone.name.ar || '')}"></div>
    </div>
    <div class="form-group"><label>${t('zone_price')}</label><input type="number" step="0.01" min="0" id="zonePrice" value="${zone.price || 0}"></div>
    <div style="display:flex;gap:10px;">
      <button class="btn-primary" id="saveZoneBtn" style="width:auto;padding:10px 24px;">${t('save')}</button>
      <button class="btn-sm" id="cancelZoneBtn" style="background:var(--light-bg);">${t('cancel')}</button>
    </div>
  `;
  document.getElementById('cancelZoneBtn').addEventListener('click', () => card.classList.add('hidden'));
  document.getElementById('saveZoneBtn').addEventListener('click', () => {
    const nameText = document.getElementById('zoneNameEn').value.trim();
    const name = { ar: '', en: nameText };
    const price = Number(document.getElementById('zonePrice').value) || 0;
    if (!nameText) { toast(t('required')); return; }
    if (id) {
      zone.name = name; zone.price = price;
    } else {
      branch.deliveryZones.push({ id: uid('zone'), name, price });
    }
    persist();
    toast(t('saved_successfully'));
    card.classList.add('hidden');
    renderDeliveryZones();
  });
}

/* ===================== Colors ===================== */
function renderColorBlock(pageKey, titleKey) {
  const c = db().settings.colors[pageKey];
  return `
    <div class="admin-card" data-page="${pageKey}">
      <h3>${t(titleKey)}</h3>
      <div class="form-group">
        <label>${t('color_type')}</label>
        <select class="color-type">
          <option value="solid" ${c.type === 'solid' ? 'selected' : ''}>${t('solid')}</option>
          <option value="gradient" ${c.type === 'gradient' ? 'selected' : ''}>${t('gradient')}</option>
        </select>
      </div>
      <div class="form-row">
        <div class="form-group"><label>${t('color1')}</label><input type="color" class="color1" value="${c.color1}"></div>
        <div class="form-group gradient-only ${c.type === 'gradient' ? '' : 'hidden'}"><label>${t('color2')}</label><input type="color" class="color2" value="${c.color2}"></div>
        <div class="form-group gradient-only ${c.type === 'gradient' ? '' : 'hidden'}"><label>${t('angle')}</label><input type="number" class="angle" value="${c.angle || 135}" style="max-width:100px;"></div>
      </div>
      <div class="color-preview" data-preview></div>
      <button class="btn-primary save-color-btn" style="width:auto;padding:10px 24px;">${t('save')}</button>
    </div>
  `;
}

function renderColors() {
  const el = document.getElementById('sec-colors');
  el.innerHTML =
    renderColorBlock('header', 'header_color') +
    renderColorBlock('homepage', 'homepage_background_color') +
    renderColorBlock('branches', 'branches_page_colors') +
    renderColorBlock('menu', 'menu_page_colors') +
    renderColorBlock('checkout', 'checkout_page_colors') +
    renderColorBlock('secondary', 'secondary_color');

  el.querySelectorAll('[data-page]').forEach(card => {
    const pageKey = card.dataset.page;
    const typeSel = card.querySelector('.color-type');
    const color1Input = card.querySelector('.color1');
    const color2Input = card.querySelector('.color2');
    const angleInput = card.querySelector('.angle');
    const preview = card.querySelector('[data-preview]');

    function updatePreview() {
      preview.style.background = typeSel.value === 'gradient'
        ? `linear-gradient(${Number(angleInput.value) || 135}deg, ${color1Input.value}, ${color2Input.value})`
        : color1Input.value;
    }
    [typeSel, color1Input, color2Input, angleInput].forEach(input => {
      input.addEventListener('input', updatePreview);
      input.addEventListener('change', updatePreview);
    });
    typeSel.addEventListener('change', () => {
      card.querySelectorAll('.gradient-only').forEach(g => g.classList.toggle('hidden', typeSel.value !== 'gradient'));
    });
    updatePreview();

    card.querySelector('.save-color-btn').addEventListener('click', () => {
      const data = db();
      data.settings.colors[pageKey] = {
        type: typeSel.value,
        color1: color1Input.value,
        color2: color2Input.value,
        angle: Number(angleInput.value) || 135
      };
      persist();
      toast(t('saved_successfully'));
      if (pageKey === 'secondary') applySecondaryColor();
    });
  });
}

/* ===================== General Settings ===================== */
function renderGeneral() {
  const data = db();
  const el = document.getElementById('sec-general');
  el.innerHTML = `
    <div class="admin-card">
      <h3>${t('general_settings')}</h3>
      <img src="${data.settings.logo || PLACEHOLDER_IMG}" class="image-preview" id="logoPreview">
      <div class="form-group"><label>${t('logo')}</label><input type="file" id="logoInput" accept="image/*"></div>
      <div class="form-group"><label>${t('restaurant_name')}</label><input type="text" id="restNameEn" value="${data.settings.restaurantName.en || data.settings.restaurantName.ar || ''}" required></div>
      <div class="form-group"><label>Orders Email</label><input type="email" id="restaurantEmail" value="${data.settings.restaurantEmail || ''}" placeholder="orders@restaurant.com"></div>
      <div class="form-row">
        <div class="form-group"><label>Minimum Delivery Order</label><input type="number" min="0" step="0.01" id="minimumOrder" value="${data.settings.minimumOrder ?? 15}"></div>
        <div class="form-group"><label>Free Delivery Over</label><input type="number" min="0" step="0.01" id="freeDeliveryThreshold" value="${data.settings.freeDeliveryThreshold ?? 30}"></div>
      </div>
      <div class="form-group"><label>Tax Rate (%)</label><input type="number" min="0" step="0.01" id="taxRate" value="${data.settings.taxRate ?? 0}"></div>
      <div class="form-group"><label>${t('currency')}</label>
        <select id="currencySelect">
          ${CURRENCIES.map(c => `<option value="${c.code}" ${c.code === (data.settings.currency || 'ILS') ? 'selected' : ''}>${tField(c.name)} (${c.symbol})</option>`).join('')}
        </select>
      </div>
      <button class="btn-primary" id="saveGeneralBtn" style="width:auto;padding:10px 24px;">${t('save')}</button>
    </div>
  `;
  let newLogo = data.settings.logo;
  document.getElementById('logoInput').addEventListener('change', async (e) => {
    if (e.target.files[0]) { newLogo = await fileToDataURL(e.target.files[0]); document.getElementById('logoPreview').src = newLogo; }
  });
  document.getElementById('saveGeneralBtn').addEventListener('click', () => {
    data.settings.logo = newLogo;
    const restaurantName = document.getElementById('restNameEn').value.trim();
    data.settings.restaurantName = { ar: restaurantName, en: restaurantName };
    data.settings.restaurantEmail = document.getElementById('restaurantEmail').value.trim();
    data.settings.minimumOrder = Math.max(0, Number(document.getElementById('minimumOrder').value) || 0);
    data.settings.freeDeliveryThreshold = Math.max(0, Number(document.getElementById('freeDeliveryThreshold').value) || 0);
    data.settings.taxRate = Math.max(0, Number(document.getElementById('taxRate').value) || 0);
    data.settings.currency = document.getElementById('currencySelect').value;
    persist();
    toast(t('saved_successfully'));
    renderNav();
  });
}

/* ===================== Footer Settings ===================== */
function renderFooterSettings() {
  const data = db();
  const el = document.getElementById('sec-footer');
  if (!el) return;
  const social = data.settings.socialLinks || {};
  el.innerHTML = `
    <div class="admin-card">
      <h3>Footer</h3>
      <p class="mini-note">Only fields you fill in will appear on the public footer.</p>
      <div class="form-group"><label>Phone</label><input type="tel" id="footerPhone" value="${escapeHtml(data.settings.phone || '')}" placeholder="+1 555 123 4567"></div>
      <div class="form-group"><label>Email</label><input type="email" id="footerEmail" value="${escapeHtml(data.settings.footerEmail || '')}" placeholder="hello@restaurant.com"></div>
      <div class="form-group"><label>Address</label><input type="text" id="footerAddress" value="${escapeHtml(data.settings.address || '')}" placeholder="123 Main Street"></div>
      <h4 style="margin:18px 0 10px;">Social Media</h4>
      <div class="form-group"><label>Facebook URL</label><input type="url" id="socialFacebook" value="${escapeHtml(social.facebook || '')}" placeholder="https://facebook.com/yourpage"></div>
      <div class="form-group"><label>Instagram URL</label><input type="url" id="socialInstagram" value="${escapeHtml(social.instagram || '')}" placeholder="https://instagram.com/yourpage"></div>
      <div class="form-group"><label>TikTok URL</label><input type="url" id="socialTiktok" value="${escapeHtml(social.tiktok || '')}" placeholder="https://tiktok.com/@yourpage"></div>
      <div class="form-group"><label>X URL</label><input type="url" id="socialX" value="${escapeHtml(social.x || '')}" placeholder="https://x.com/yourpage"></div>
      <div class="form-group"><label>YouTube URL</label><input type="url" id="socialYoutube" value="${escapeHtml(social.youtube || '')}" placeholder="https://youtube.com/@yourpage"></div>
      <button class="btn-primary" id="saveFooterBtn" style="width:auto;padding:10px 24px;">${t('save')}</button>
    </div>
  `;
  document.getElementById('saveFooterBtn').addEventListener('click', () => {
    data.settings.phone = document.getElementById('footerPhone').value.trim();
    data.settings.footerEmail = document.getElementById('footerEmail').value.trim();
    data.settings.address = document.getElementById('footerAddress').value.trim();
    data.settings.socialLinks = {
      facebook: document.getElementById('socialFacebook').value.trim(),
      instagram: document.getElementById('socialInstagram').value.trim(),
      tiktok: document.getElementById('socialTiktok').value.trim(),
      x: document.getElementById('socialX').value.trim(),
      youtube: document.getElementById('socialYoutube').value.trim()
    };
    persist();
    toast(t('saved_successfully'));
    renderFooterSettings();
  });
}

/* ===================== Login Settings ===================== */
/* The admin password used to live inside the shared data file, but that file
   is now public (served as data.json), so keeping a password there would
   leak it to anyone. The password is now a single secret set outside the
   app, as the ADMIN_SECRET environment variable on the hosting project. */
function renderLogin() {
  const el = document.getElementById('sec-login');
  el.innerHTML = `
    <div class="admin-card">
      <h3>${t('login_settings')}</h3>
      <p class="mini-note">${t('login_settings_info')}</p>
    </div>
  `;
}

(async function initAdmin() {
  await Store.ready;
  renderAll();
})();
