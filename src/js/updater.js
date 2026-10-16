(function (g) {
  const OWNER = 'chillywilly33';
  const REPO = 'Mi-portafolio';
  const releaseApi = `https://api.github.com/repos/${OWNER}/${REPO}/releases/latest`;
  const currentVersion = document.querySelector('meta[name="app-version"]')?.content || '0.0.0';

  function compareVersions(left, right) {
    const a = String(left).replace(/^v/i, '').split('.').map((n) => parseInt(n, 10) || 0);
    const b = String(right).replace(/^v/i, '').split('.').map((n) => parseInt(n, 10) || 0);
    for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
      if ((a[i] || 0) !== (b[i] || 0)) return (a[i] || 0) - (b[i] || 0);
    }
    return 0;
  }

  async function checkAndroidUpdate() {
    if (!g.MisInversionesMobile?.isAndroid()) return;
    try {
      const response = await fetch(releaseApi, { headers: { Accept: 'application/vnd.github+json' } });
      if (!response.ok) return;
      const release = await response.json();
      if (release.draft || release.prerelease || compareVersions(release.tag_name, currentVersion) <= 0) return;
      const apk = (release.assets || []).find((asset) => asset.name.toLowerCase().endsWith('.apk'));
      if (!apk) return;
      const yes = window.confirm(`Mis Inversiones ${release.tag_name} está disponible.\n\n¿Quieres abrir GitHub para descargar la actualización?`);
      if (yes) await g.MisInversionesMobile.openRelease(release.html_url);
    } catch (e) { console.info('No se pudo revisar actualizaciones de Android:', e.message); }
  }

  document.addEventListener('DOMContentLoaded', () => setTimeout(checkAndroidUpdate, 2500), { once: true });
})(window);
