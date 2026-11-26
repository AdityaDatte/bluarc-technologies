// DOM Elements
const loginSection = document.getElementById('loginSection');
const dashboardSection = document.getElementById('dashboardSection');
const loginForm = document.getElementById('loginForm');
const loginBtn = document.getElementById('loginBtn');
const loginStatus = document.getElementById('loginStatus');
const logoutBtn = document.getElementById('logoutBtn');

const addProjectForm = document.getElementById('addProjectForm');
const addProjBtn = document.getElementById('addProjBtn');
const projectFormStatus = document.getElementById('projectFormStatus');
const adminProjectsList = document.getElementById('adminProjectsList');
const adminInquiriesList = document.getElementById('adminInquiriesList');

// Helper: Safe text display
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

// 1. Check Session on Page Load
async function checkSession() {
  const { data: { session } } = await supabaseClient.auth.getSession();

  if (session) {
    showDashboard();
  } else {
    showLogin();
  }
}

function showDashboard() {
  loginSection.classList.add('hidden');
  dashboardSection.classList.remove('hidden');
  loadAdminProjects();
  loadAdminInquiries();
}

function showLogin() {
  dashboardSection.classList.add('hidden');
  loginSection.classList.remove('hidden');
}

// 2. Admin Login
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('adminEmail').value.trim();
  const password = document.getElementById('adminPassword').value;

  loginBtn.disabled = true;
  loginBtn.textContent = 'Logging in...';
  loginStatus.textContent = '';

  const { error } = await supabaseClient.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    loginStatus.style.color = '#B00020';
    loginStatus.textContent = 'Invalid email or password.';
  } else {
    loginForm.reset();
    showDashboard();
  }

  loginBtn.disabled = false;
  loginBtn.textContent = 'Login';
});

// 3. Admin Logout
logoutBtn.addEventListener('click', async () => {
  await supabaseClient.auth.signOut();
  showLogin();
});

// 4. Add New Project (with Screenshot Upload)
addProjectForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const title = document.getElementById('projTitle').value.trim();
  const category = document.getElementById('projCategory').value.trim();
  const live_url = document.getElementById('projUrl').value.trim();
  const description = document.getElementById('projDesc').value.trim();
  const fileInput = document.getElementById('projImage');
  const file = fileInput.files[0];

  if (!file) {
    projectFormStatus.style.color = '#B00020';
    projectFormStatus.textContent = 'Please select a project screenshot.';
    return;
  }

  addProjBtn.disabled = true;
  addProjBtn.textContent = 'Uploading...';
  projectFormStatus.textContent = '';

  try {
    // Unique filename tayar karun Storage madhe upload karuya
    const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileName = `${Date.now()}-${cleanName}`;

    const { error: uploadError } = await supabaseClient.storage
      .from('project-images')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    // Uploaded image cha public URL gheuya
    const { data: urlData } = supabaseClient.storage
      .from('project-images')
      .getPublicUrl(fileName);

    const image_url = urlData.publicUrl;

    // Database table madhe project save karuya
    const { error: insertError } = await supabaseClient
      .from('projects')
      .insert([{ title, category, live_url, description, image_url }]);

    if (insertError) throw insertError;

    projectFormStatus.style.color = '#1B6B3A';
    projectFormStatus.textContent = 'Project added successfully!';
    addProjectForm.reset();
    loadAdminProjects();
  } catch (err) {
    console.error('Add project error:', err);
    projectFormStatus.style.color = '#B00020';
    projectFormStatus.textContent = 'Error adding project: ' + (err.message || 'Please try again.');
  }

  addProjBtn.disabled = false;
  addProjBtn.textContent = 'Add Project';
});

// 5. Load Projects in Admin Panel
async function loadAdminProjects() {
  const { data, error } = await supabaseClient
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Load projects error:', error);
    adminProjectsList.innerHTML = '<p class="muted-text">Failed to load projects.</p>';
    return;
  }

  if (!data || data.length === 0) {
    adminProjectsList.innerHTML = '<p class="muted-text">No projects added yet.</p>';
    return;
  }

  adminProjectsList.innerHTML = data.map((proj) => `
    <div class="list-item">
      <div class="item-left">
        ${proj.image_url ? `<img src="${proj.image_url}" alt="${escapeHtml(proj.title)}" class="item-thumb">` : ''}
        <div class="item-meta">
          <span class="small-tag">${escapeHtml(proj.category)}</span>
          <h4>${escapeHtml(proj.title)}</h4>
          <p>${escapeHtml(proj.description)}</p>
        </div>
      </div>
      <button class="btn-danger delete-project-btn" data-id="${proj.id}" data-image="${escapeHtml(proj.image_url || '')}">
        Delete
      </button>
    </div>
  `).join('');
}

// Delete Project Click Handler
adminProjectsList.addEventListener('click', async (e) => {
  const btn = e.target.closest('.delete-project-btn');
  if (!btn) return;

  if (!confirm('Ha project permanently delete karaycha ka?')) return;

  const id = btn.dataset.id;
  const imageUrl = btn.dataset.image;

  btn.disabled = true;
  btn.textContent = 'Deleting...';

  const { error } = await supabaseClient
    .from('projects')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Delete project error:', error);
    alert('Project delete karayla error aala.');
    btn.disabled = false;
    btn.textContent = 'Delete';
    return;
  }

  // Storage madhun pan screenshot remove karuya
  if (imageUrl && imageUrl.includes('/project-images/')) {
    const filePath = imageUrl.split('/project-images/')[1];
    if (filePath) {
      await supabaseClient.storage.from('project-images').remove([filePath]);
    }
  }

  loadAdminProjects();
});

// 6. Load Client Inquiries
async function loadAdminInquiries() {
  const { data, error } = await supabaseClient
    .from('inquiries')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Load inquiries error:', error);
    adminInquiriesList.innerHTML = '<p class="muted-text">Failed to load inquiries.</p>';
    return;
  }

  if (!data || data.length === 0) {
    adminInquiriesList.innerHTML = '<p class="muted-text">No client inquiries yet.</p>';
    return;
  }

  adminInquiriesList.innerHTML = data.map((inq) => {
    const dateStr = new Date(inq.created_at).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    return `
      <div class="list-item">
        <div class="item-meta">
          <span class="small-tag">${escapeHtml(inq.project_type)} &bull; ${dateStr}</span>
          <h4>${escapeHtml(inq.name)} (${escapeHtml(inq.email)})</h4>
          <p>${escapeHtml(inq.message)}</p>
        </div>
        <button class="btn-danger delete-inquiry-btn" data-id="${inq.id}">
          Delete
        </button>
      </div>
    `;
  }).join('');
}

// Delete Inquiry Click Handler
adminInquiriesList.addEventListener('click', async (e) => {
  const btn = e.target.closest('.delete-inquiry-btn');
  if (!btn) return;

  if (!confirm('Hi inquiry delete karaychi ka?')) return;

  const id = btn.dataset.id;
  btn.disabled = true;
  btn.textContent = 'Deleting...';

  const { error } = await supabaseClient
    .from('inquiries')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Delete inquiry error:', error);
    alert('Inquiry delete karayla error aala.');
    btn.disabled = false;
    btn.textContent = 'Delete';
    return;
  }

  loadAdminInquiries();
});

// Start App
checkSession();