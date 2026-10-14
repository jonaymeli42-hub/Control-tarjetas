(() => {
  const key = 'control-tarjetas-theme';
  let theme = 'light';
  try { if (localStorage.getItem(key) === 'dark') theme = 'dark'; } catch {}
  const button = document.getElementById('theme-toggle');
  function apply() {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    // Keep Android/browser chrome aligned with the selected appearance.
    document.documentElement.style.colorScheme = theme;
    document.documentElement.style.backgroundColor = theme === 'dark' ? '#111827' : '#f3f4f6';
    let scheme = document.querySelector('meta[name="color-scheme"]');
    if (!scheme) { scheme = document.createElement('meta'); scheme.name = 'color-scheme'; document.head.append(scheme); }
    scheme.content = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#111827' : '#f3f4f6');

    button.textContent = theme === 'dark' ? 'Claro' : 'Oscuro';
    button.setAttribute('aria-label', theme === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro');
    button.setAttribute('aria-pressed', String(theme === 'dark'));
  }
  button.addEventListener('click', () => {
    theme = theme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem(key, theme); } catch {}
    apply();
  });
  apply();
})();
