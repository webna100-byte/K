/* ===================== Branches ===================== */
boot('home', async (data) => {
  document.getElementById('pageTitle').textContent = t('branches_title');
  const current = Store.getSelectedBranch();
  const grid = document.getElementById('branchesGrid');
  grid.innerHTML = data.branches.map(b => `
    <button class="branch-card ${b.id === current ? 'selected' : ''}" data-id="${escapeHtml(b.id)}">
      <img src="${escapeHtml(b.image || PLACEHOLDER_IMG)}" alt="" loading="lazy">
      <div class="branch-name">${tx(b.name)}</div>
      <div class="branch-modes">${b.pickupEnabled !== false ? `<span>${t('pickup')}</span>` : ''}${b.deliveryEnabled !== false ? `<span>${t('delivery')}</span>` : ''}</div>
    </button>`).join('');
  grid.querySelectorAll('.branch-card').forEach(card => card.addEventListener('click', () => {
    Store.setSelectedBranch(card.dataset.id);
    location.href = '/menu';
  }));
}, { colors: 'branches' });
