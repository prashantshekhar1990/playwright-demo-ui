// Injects a shared top navigation bar into every page.
(function () {
  const pages = [
    ['basic', 'Basic'], ['links', 'Links'], ['tabs', 'Tabs'], ['frames', 'Frames'], ['popups', 'Popups'],
    ['dynamic', 'Dynamic'], ['waits', 'Waits'], ['tables', 'Tables'], ['dropdowns', 'Dropdowns'], ['mouse', 'Mouse'],
    ['keyboard', 'Keyboard'], ['files', 'Files'], ['auth', 'Auth'], ['network', 'Network'], ['complex', 'Complex'],
  ];
  const header = document.createElement('header');
  header.className = 'topbar';
  header.setAttribute('data-testid', 'topbar');
  header.innerHTML = '<a class="brand" href="/index.html" data-testid="nav-home">Playwright Demo UI</a>' +
    pages.map(([k, l]) => `<a href="/pages/${k}.html" data-testid="nav-${k}">${l}</a>`).join('');
  document.body.prepend(header);
})();
