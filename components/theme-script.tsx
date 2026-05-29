/** Runs before paint to reduce theme flash. */
export function ThemeScript() {
  const script = `
(function () {
  try {
    var key = 'ledgerstack-theme';
    var stored = localStorage.getItem(key);
    var theme = 'dark';
    if (stored === 'light' || stored === 'dark') {
      theme = stored;
    } else if (stored === 'system' && window.matchMedia('(prefers-color-scheme: light)').matches) {
      theme = 'light';
    }
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {}
})();
`

  return (
    <script
      dangerouslySetInnerHTML={{ __html: script }}
      suppressHydrationWarning
    />
  )
}
