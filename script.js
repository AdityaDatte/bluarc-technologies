// 1. Mobile Navbar Toggle
const menuToggle = document.getElementById('menuToggle');
const navLinks = document.getElementById('navLinks');

menuToggle.addEventListener('click', () => {
  navLinks.classList.toggle('active');
});

navLinks.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('active');
  });
});

// Helper: Safe text display
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

// 2. Load Projects from Supabase
async function loadProjects() {
  const projectsGrid = document.getElementById('projectsGrid');

  const { data, error } = await supabaseClient
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error loading projects:', error);
    projectsGrid.innerHTML = '<p style="text-align:center; color: var(--text-muted); grid-column: 1 / -1;">Unable to load projects right now.</p>';
    return;
  }

  if (!data || data.length === 0) {
    projectsGrid.innerHTML = '<p style="text-align:center; color: var(--text-muted); grid-column: 1 / -1;">Projects coming soon. Stay tuned!</p>';
    return;
  }

  projectsGrid.innerHTML = data.map((project) => `
    <article class="project-card">
      <div class="project-thumb">
        ${
          project.image_url
            ? `<img src="${project.image_url}" alt="${escapeHtml(project.title)}">`
            : `<span class="thumb-placeholder">Project Preview</span>`
        }
      </div>
      <div class="project-info">
        <span class="project-category">${escapeHtml(project.category)}</span>
        <h3>${escapeHtml(project.title)}</h3>
        <p>${escapeHtml(project.description)}</p>
        <a href="${escapeHtml(project.live_url)}" target="_blank" rel="noopener noreferrer" class="project-link">
          View Live Site &rarr;
        </a>
      </div>
    </article>
  `).join('');
}

// 3. Contact Form Submit to Supabase
const contactForm = document.getElementById('contactForm');
const formStatus = document.getElementById('formStatus');

contactForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const submitBtn = contactForm.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Sending...';
  formStatus.textContent = '';

  const inquiryData = {
    name: document.getElementById('clientName').value.trim(),
    email: document.getElementById('clientEmail').value.trim(),
    project_type: document.getElementById('projectType').value,
    message: document.getElementById('clientMessage').value.trim(),
  };

  const { error } = await supabaseClient
    .from('inquiries')
    .insert([inquiryData]);

  if (error) {
    console.error('Inquiry error:', error);
    formStatus.style.color = '#B00020';
    formStatus.textContent = 'Something went wrong. Please try again.';
  } else {
    formStatus.style.color = '#1B6B3A';
    formStatus.textContent = "Message sent! We'll get back to you soon.";
    contactForm.reset();
  }

  submitBtn.disabled = false;
  submitBtn.textContent = 'Send Message';
});

// Page load jhalyavar projects fetch kar
loadProjects();