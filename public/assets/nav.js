// Injects a shared top navigation bar into every page.
(function () {
  const pages = [
    ['basic', 'Basic'], ['links', 'Links'], ['tabs', 'Tabs'], ['frames', 'Frames'], ['popups', 'Popups'],
    ['dynamic', 'Dynamic'], ['waits', 'Waits'], ['tables', 'Tables'], ['dropdowns', 'Dropdowns'], ['mouse', 'Mouse'],
    ['keyboard', 'Keyboard'], ['files', 'Files'], ['auth', 'Auth'], ['network', 'Network'], ['complex', 'Complex'],
    ['shop-catalog', 'Shop'], ['env-info', 'Env Info'], ['oauth-demo', 'OAuth'],
  ];
  const header = document.createElement('header');
  header.className = 'topbar';
  header.setAttribute('data-testid', 'topbar');
  header.innerHTML = '<a class="brand" href="/index.html" data-testid="nav-home">Playwright Demo UI</a>' +
    pages.map(([k, l]) => `<a href="/pages/${k}.html" data-testid="nav-${k}">${l}</a>`).join('');
  document.body.prepend(header);

  // Current user + Logout on the right (only when a session exists).
  fetch('/api/me').then((r) => (r.ok ? r.json() : null)).then((u) => {
    if (!u) return;
    const box = document.createElement('span');
    box.className = 'topbar-user';
    const who = document.createElement('span');
    who.setAttribute('data-testid', 'nav-user');
    who.textContent = `${u.username} (${u.role})`;
    const out = document.createElement('button');
    out.className = 'secondary';
    out.setAttribute('data-testid', 'nav-logout');
    out.textContent = 'Logout';
    out.onclick = async () => {
      await fetch('/api/logout', { method: 'POST' });
      localStorage.removeItem('authToken'); sessionStorage.clear();
      location.href = '/login.html';
    };
    box.append(who, out);
    header.append(box);
  }).catch(() => {});
})();
