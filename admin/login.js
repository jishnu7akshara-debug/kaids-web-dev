const form = document.getElementById('login-form');
const errBox = document.getElementById('login-error');
const btn = document.getElementById('login-btn');

if (form && errBox && btn) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errBox.textContent = '';
    btn.disabled = true;

    const email = form.email.value.trim();
    const password = form.password.value;

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        errBox.textContent = data.error || 'Email or password is incorrect';
        return;
      }
      window.location.href = '/admin/';
    } catch {
      errBox.textContent = 'Network error. Please try again.';
    } finally {
      btn.disabled = false;
    }
  });
}
