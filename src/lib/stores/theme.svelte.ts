export type Theme = 'auto' | 'light' | 'dark';

class ThemeStore {
  value = $state<Theme>('auto');

  init() {
    try {
      const t = localStorage.getItem('jci-theme');
      if (t === 'light' || t === 'dark') this.value = t;
    } catch {}
  }
  set(t: Theme) {
    this.value = t;
    const el = document.documentElement;
    if (t === 'auto') delete el.dataset.theme;
    else el.dataset.theme = t;
    try {
      if (t === 'auto') localStorage.removeItem('jci-theme');
      else localStorage.setItem('jci-theme', t);
    } catch {}
  }
}

export const theme = new ThemeStore();
