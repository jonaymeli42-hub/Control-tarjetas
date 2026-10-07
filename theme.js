(() => {
  const key = 'control-tarjetas-theme';
  let theme = 'light';
  try { if (localStorage.getItem(key) === 'dark') theme = 'dark'; } catch {}
  const button = document.getElementById('theme-toggle');
  function apply() {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
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
