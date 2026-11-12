// Applique le thème avant le premier rendu (évite le flash clair/sombre). Fichier externe : la CSP interdit les scripts inline.
try {
  var t = localStorage.getItem('jci-theme');
  if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
} catch (e) {}
