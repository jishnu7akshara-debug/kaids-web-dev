// KAIDS Admin Client Manager
let csrfToken = '';
let currentUser = null;
let allClients = [];
let isPublishing = false;

// DOM Elements
const tableBody = document.getElementById('client-table-body');
const searchInput = document.getElementById('client-search');
const statusFilter = document.getElementById('status-filter');
const totalCountSpan = document.getElementById('client-total-count');

const drawerOverlay = document.getElementById('client-drawer-overlay');
const drawerTitle = document.getElementById('drawer-title');
const clientForm = document.getElementById('client-form');
const btnCloseDrawer = document.getElementById('btn-close-drawer');
const btnCancelDrawer = document.getElementById('btn-cancel-drawer');
const btnSaveClient = document.getElementById('btn-save-client');
const btnAddClient = document.getElementById('btn-add-client');
const btnPublish = document.getElementById('btn-publish');

// Fields
const fieldId = document.getElementById('field-client-id');
const fieldName = document.getElementById('field-name');
const fieldLocation = document.getElementById('field-location');
const fieldLogoKey = document.getElementById('field-logo-key');
const fieldLogoW = document.getElementById('field-logo-w');
const fieldLogoH = document.getElementById('field-logo-h');
const checkHomeStrip = document.getElementById('check-home-strip');
const checkLogoGrid = document.getElementById('check-logo-grid');
const checkNameList = document.getElementById('check-name-list');
const fieldStatus = document.getElementById('field-status');
const nameError = document.getElementById('name-error');

// Dropzone
const dropzone = document.getElementById('logo-dropzone');
const fileInput = document.getElementById('logo-file-input');
const dropzoneEmpty = document.getElementById('dropzone-empty');
const dropzonePreview = document.getElementById('dropzone-preview');
const previewImg = document.getElementById('logo-preview-img');
const dimensionsInfo = document.getElementById('logo-dimensions-info');
const btnRemoveLogo = document.getElementById('btn-remove-logo');

async function init() {
  try {
    const authRes = await fetch('/api/auth');
    if (!authRes.ok) {
      window.location.href = '/admin/login.html';
      return;
    }
    const authData = await authRes.json();
    if (!authData.authenticated) {
      window.location.href = '/admin/login.html';
      return;
    }
    csrfToken = authData.csrfToken;
    currentUser = authData.user;

    await loadClients();
    setupEventListeners();
  } catch (err) {
    console.error('Initialization error:', err);
  }
}

async function loadClients() {
  const q = searchInput.value.trim();
  const filter = statusFilter.value;
  const isTrash = filter === 'trash';

  let url = `/api/admin/clients?`;
  if (q) url += `q=${encodeURIComponent(q)}&`;
  if (isTrash) {
    url += `show_deleted=true&`;
  } else if (filter !== 'all') {
    url += `status=${encodeURIComponent(filter)}&`;
  }

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to load clients');
    const data = await res.json();
    allClients = data.clients || [];
    renderTable(allClients, isTrash);
  } catch (err) {
    console.error('Error fetching clients:', err);
    tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--alert); padding: 2rem;">Error loading clients.</td></tr>`;
  }
}

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderTable(clients, isTrash) {
  totalCountSpan.textContent = `${clients.length} client${clients.length === 1 ? '' : 's'} listed`;

  if (clients.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 2.5rem; color: var(--graphite);">No clients found matching the filter criteria.</td></tr>`;
    return;
  }

  tableBody.innerHTML = clients.map((client, index) => {
    const isFirst = index === 0;
    const isLast = index === clients.length - 1;
    const isDeleted = Boolean(client.deleted_at);

    const logoHtml = client.logo_key
      ? `<img class="client-logo-thumb" src="../${escapeHtml(client.logo_key)}" alt="" loading="lazy">`
      : `<div class="client-logo-placeholder">No logo</div>`;

    const statusBadge = isDeleted
      ? `<span class="status-chip" data-status="deleted">Deleted</span>`
      : `<span class="status-chip" data-status="${escapeHtml(client.status)}">${escapeHtml(client.status)}</span>`;

    const placementChips = `
      <div class="placement-tags">
        <span class="placement-tag ${client.show_home_strip ? 'is-active' : ''}">Home</span>
        <span class="placement-tag ${client.show_logo_grid ? 'is-active' : ''}">Grid</span>
        <span class="placement-tag ${client.show_name_list ? 'is-active' : ''}">Directory</span>
      </div>
    `;

    const orderControls = isTrash
      ? `<span class="note">—</span>`
      : `
        <div class="order-controls">
          <button type="button" class="order-btn" data-action="move-up" data-id="${client.id}" ${isFirst ? 'disabled' : ''} title="Move up">&#9650;</button>
          <button type="button" class="order-btn" data-action="move-down" data-id="${client.id}" ${isLast ? 'disabled' : ''} title="Move down">&#9660;</button>
        </div>
      `;

    let actionsHtml = '';
    if (isDeleted) {
      actionsHtml = `
        <button type="button" class="btn btn-quiet btn-sm" data-action="restore" data-id="${client.id}">Restore</button>
      `;
    } else {
      actionsHtml = `
        <div style="display: flex; gap: .35rem;">
          <button type="button" class="btn btn-quiet btn-sm" data-action="edit" data-id="${client.id}">Edit</button>
          <button type="button" class="btn btn-quiet btn-sm" data-action="toggle-status" data-id="${client.id}" data-current="${client.status}">${client.status === 'published' ? 'Hide' : 'Show'}</button>
          <button type="button" class="btn btn-quiet btn-sm btn-danger" data-action="delete" data-id="${client.id}">Delete</button>
        </div>
      `;
    }

    return `
      <tr data-client-id="${client.id}">
        <td>${orderControls}</td>
        <td>${logoHtml}</td>
        <td>
          <div style="font-weight: 560; color: var(--ink);">${escapeHtml(client.name)}</div>
          ${client.location ? `<div class="note">${escapeHtml(client.location)}</div>` : ''}
        </td>
        <td>${placementChips}</td>
        <td>${statusBadge}</td>
        <td>${actionsHtml}</td>
      </tr>
    `;
  }).join('');
}

function openDrawer(client = null) {
  nameError.style.display = 'none';
  nameError.textContent = '';

  if (client) {
    drawerTitle.textContent = 'Edit Client';
    fieldId.value = client.id;
    fieldName.value = client.name || '';
    fieldLocation.value = client.location || '';
    fieldLogoKey.value = client.logo_key || '';
    fieldLogoW.value = client.logo_w || '';
    fieldLogoH.value = client.logo_h || '';
    checkHomeStrip.checked = Boolean(client.show_home_strip);
    checkLogoGrid.checked = Boolean(client.show_logo_grid);
    checkNameList.checked = Boolean(client.show_name_list);
    fieldStatus.value = client.status || 'published';

    if (client.logo_key) {
      previewImg.src = `../${client.logo_key}`;
      dimensionsInfo.textContent = client.logo_w && client.logo_h ? `${client.logo_w} × ${client.logo_h} px` : '';
      dropzoneEmpty.style.display = 'none';
      dropzonePreview.style.display = 'block';
    } else {
      dropzoneEmpty.style.display = 'block';
      dropzonePreview.style.display = 'none';
    }
  } else {
    drawerTitle.textContent = 'Add Client';
    fieldId.value = '';
    fieldName.value = '';
    fieldLocation.value = '';
    fieldLogoKey.value = '';
    fieldLogoW.value = '';
    fieldLogoH.value = '';
    checkHomeStrip.checked = false;
    checkLogoGrid.checked = false;
    checkNameList.checked = true;
    fieldStatus.value = 'published';

    dropzoneEmpty.style.display = 'block';
    dropzonePreview.style.display = 'none';
  }

  drawerOverlay.classList.add('is-open');
  drawerOverlay.setAttribute('aria-hidden', 'false');
  fieldName.focus();
}

function closeDrawer() {
  drawerOverlay.classList.remove('is-open');
  drawerOverlay.setAttribute('aria-hidden', 'true');
}

async function saveClient() {
  const id = fieldId.value;
  const name = fieldName.value.trim();
  const location = fieldLocation.value.trim() || null;
  const logo_key = fieldLogoKey.value.trim() || null;
  const logo_w = fieldLogoW.value ? parseInt(fieldLogoW.value, 10) : null;
  const logo_h = fieldLogoH.value ? parseInt(fieldLogoH.value, 10) : null;
  const show_home_strip = checkHomeStrip.checked;
  const show_logo_grid = checkLogoGrid.checked;
  const show_name_list = checkNameList.checked;
  const status = fieldStatus.value;

  if (!name || name.length < 2 || name.length > 120) {
    nameError.textContent = 'Company name must be between 2 and 120 characters';
    nameError.style.display = 'block';
    fieldName.focus();
    return;
  }

  // Duplicate name check in memory
  const duplicate = allClients.find(c => c.name.toLowerCase() === name.toLowerCase() && c.id !== id && !c.deleted_at);
  if (duplicate) {
    nameError.textContent = 'A client with this name already exists';
    nameError.style.display = 'block';
    fieldName.focus();
    return;
  }

  const payload = {
    name,
    location,
    logo_key,
    logo_w,
    logo_h,
    show_home_strip,
    show_logo_grid,
    show_name_list,
    status
  };

  btnSaveClient.disabled = true;
  btnSaveClient.textContent = 'Saving...';

  try {
    const isEdit = Boolean(id);
    const url = isEdit ? `/api/admin/clients/${id}` : '/api/admin/clients';
    const method = isEdit ? 'PATCH' : 'POST';

    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': csrfToken
      },
      body: JSON.stringify(payload)
    });

    if (res.status === 409) {
      nameError.textContent = 'A client with this name already exists';
      nameError.style.display = 'block';
      fieldName.focus();
      return;
    }

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to save client');
    }

    closeDrawer();
    await loadClients();
  } catch (err) {
    alert(err.message);
  } finally {
    btnSaveClient.disabled = false;
    btnSaveClient.textContent = 'Save Client';
  }
}

async function handleReorder(fromIndex, toIndex) {
  if (toIndex < 0 || toIndex >= allClients.length) return;
  const reordered = [...allClients];
  const [moved] = reordered.splice(fromIndex, 1);
  reordered.splice(toIndex, 0, moved);

  renderTable(reordered, statusFilter.value === 'trash');

  const ids = reordered.map(c => c.id);
  try {
    const res = await fetch('/api/admin/clients/reorder', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': csrfToken
      },
      body: JSON.stringify({ ids })
    });
    if (!res.ok) throw new Error('Reorder failed');
    allClients = reordered;
  } catch (err) {
    console.error('Error reordering:', err);
    await loadClients();
  }
}

async function toggleStatus(clientId, currentStatus) {
  const newStatus = currentStatus === 'published' ? 'hidden' : 'published';
  try {
    const res = await fetch(`/api/admin/clients/${clientId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': csrfToken
      },
      body: JSON.stringify({ status: newStatus })
    });
    if (!res.ok) throw new Error('Failed to update status');
    await loadClients();
  } catch (err) {
    alert(err.message);
  }
}

async function deleteClient(clientId) {
  if (!confirm('Are you sure you want to delete this client? It will be moved to Trash.')) return;
  try {
    const res = await fetch(`/api/admin/clients/${clientId}`, {
      method: 'DELETE',
      headers: {
        'x-csrf-token': csrfToken
      }
    });
    if (!res.ok) throw new Error('Failed to delete client');
    await loadClients();
  } catch (err) {
    alert(err.message);
  }
}

async function restoreClient(clientId) {
  try {
    const res = await fetch(`/api/admin/clients/restore`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': csrfToken
      },
      body: JSON.stringify({ id: clientId })
    });
    if (!res.ok) throw new Error('Failed to restore client');
    await loadClients();
  } catch (err) {
    alert(err.message);
  }
}

async function handleLogoUpload(file) {
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) {
    alert('File size exceeds 2 MB limit');
    return;
  }

  const reader = new FileReader();
  reader.onload = async () => {
    const base64Data = reader.result;
    try {
      const res = await fetch('/api/admin/clients/logo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken
        },
        body: JSON.stringify({
          data: base64Data,
          filename: file.name,
          mimeType: file.type
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to upload logo');
      }

      const uploadData = await res.json();
      fieldLogoKey.value = uploadData.logo_key;
      fieldLogoW.value = uploadData.logo_w || '';
      fieldLogoH.value = uploadData.logo_h || '';

      previewImg.src = `../${uploadData.logo_key}`;
      dimensionsInfo.textContent = `${uploadData.logo_w} × ${uploadData.logo_h} px`;
      dropzoneEmpty.style.display = 'none';
      dropzonePreview.style.display = 'block';

      // Auto-check placements if logo is uploaded
      checkHomeStrip.checked = true;
      checkLogoGrid.checked = true;
    } catch (err) {
      alert(err.message);
    }
  };
  reader.readAsDataURL(file);
}

async function publishSite() {
  if (isPublishing) return;
  isPublishing = true;
  btnPublish.disabled = true;
  btnPublish.textContent = 'Publishing...';

  try {
    const res = await fetch('/api/admin/publish', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': csrfToken
      }
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Publish failed');
    }

    const data = await res.json();
    btnPublish.textContent = `Published (${data.totalClients} clients)`;
    setTimeout(() => {
      btnPublish.textContent = 'Publish Changes';
      btnPublish.disabled = false;
      isPublishing = false;
    }, 3000);
  } catch (err) {
    alert(err.message);
    btnPublish.textContent = 'Publish Changes';
    btnPublish.disabled = false;
    isPublishing = false;
  }
}

function setupEventListeners() {
  searchInput.addEventListener('input', () => loadClients());
  statusFilter.addEventListener('change', () => loadClients());

  btnAddClient.addEventListener('click', () => openDrawer());
  btnCloseDrawer.addEventListener('click', () => closeDrawer());
  btnCancelDrawer.addEventListener('click', () => closeDrawer());
  btnSaveClient.addEventListener('click', () => saveClient());

  drawerOverlay.addEventListener('click', (e) => {
    if (e.target === drawerOverlay) closeDrawer();
  });

  btnPublish.addEventListener('click', () => publishSite());

  // Dropzone click
  dropzone.addEventListener('click', (e) => {
    if (e.target === btnRemoveLogo) return;
    fileInput.click();
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files && fileInput.files[0]) {
      handleLogoUpload(fileInput.files[0]);
    }
  });

  btnRemoveLogo.addEventListener('click', (e) => {
    e.stopPropagation();
    fieldLogoKey.value = '';
    fieldLogoW.value = '';
    fieldLogoH.value = '';
    previewImg.src = '';
    dropzonePreview.style.display = 'none';
    dropzoneEmpty.style.display = 'block';
    checkHomeStrip.checked = false;
    checkLogoGrid.checked = false;
  });

  // Table actions via delegation
  tableBody.addEventListener('click', (e) => {
    const target = e.target.closest('button');
    if (!target) return;

    const action = target.getAttribute('data-action');
    const clientId = target.getAttribute('data-id');
    const client = allClients.find(c => c.id === clientId);

    if (action === 'edit' && client) {
      openDrawer(client);
    } else if (action === 'toggle-status') {
      const current = target.getAttribute('data-current');
      toggleStatus(clientId, current);
    } else if (action === 'delete') {
      deleteClient(clientId);
    } else if (action === 'restore') {
      restoreClient(clientId);
    } else if (action === 'move-up') {
      const index = allClients.findIndex(c => c.id === clientId);
      handleReorder(index, index - 1);
    } else if (action === 'move-down') {
      const index = allClients.findIndex(c => c.id === clientId);
      handleReorder(index, index + 1);
    }
  });
}

init();
