<script lang="ts">
  import { page } from '$app/state';
  import Icon from './Icon.svelte';
  import Avatar from './Avatar.svelte';
  import { session } from '$lib/stores/session.svelte';
  import { theme, type Theme } from '$lib/stores/theme.svelte';
  import { role } from '$lib/utils/labels';
  import { initials } from '$lib/utils/format';
  import { signOut } from '$lib/auth/auth.svelte';

  interface NavItem { href: string; label: string; show: boolean }
  const items = $derived<NavItem[]>([
    { href: '/', label: 'Tableau de bord', show: session.can('dashboard.view') || session.can('event.read') },
    { href: '/evenements', label: 'Événements', show: session.can('event.read') },
    { href: '/vente-physique', label: 'Vente physique', show: session.can('sale.create') },
    { href: '/membres', label: 'Membres', show: session.can('user.manage') }
  ].filter((i) => i.show));

  const isActive = (href: string) => (href === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(href));

  let menuOpen = $state(false); // menu mobile
  let userOpen = $state(false); // menu utilisateur

  $effect(() => {
    page.url.pathname; // referme les menus à chaque navigation
    menuOpen = false;
    userOpen = false;
  });

  const primaryRole = $derived(role(session.roleCodes[0]).label);
  const themes: { v: Theme; label: string }[] = [
    { v: 'auto', label: 'Automatique' },
    { v: 'light', label: 'Clair' },
    { v: 'dark', label: 'Sombre' }
  ];

  const logout = () => signOut();
</script>

<header class="tb">
  <div class="bar">
    <a href="/" class="brand" aria-label="JCI Comé Excellence — accueil"><img class="logo" src="/logo.png" alt="JCI Comé Excellence" /></a>

    <nav class="nl" aria-label="Navigation principale">
      {#each items as i (i.href)}
        <a class="nv" class:on={isActive(i.href)} href={i.href} aria-current={isActive(i.href) ? 'page' : undefined}>{i.label}</a>
      {/each}
    </nav>

    <div class="rt">
      <div class="pop">
        <button class="ub" aria-haspopup="menu" aria-expanded={userOpen} onclick={() => (userOpen = !userOpen)}>
          <Avatar text={session.me ? initials(session.me.firstName, session.me.lastName) : ''} />
          <span class="tx"><b>{session.fullName}</b><small>{primaryRole}</small></span>
        </button>
        {#if userOpen}
          <div class="pm" role="menu">
            <p class="grp">Thème</p>
            {#each themes as t (t.v)}
              <button class="mi" role="menuitemradio" aria-checked={theme.value === t.v} onclick={() => theme.set(t.v)}>
                <span class="chk">{theme.value === t.v ? '✓' : ''}</span>{t.label}
              </button>
            {/each}
            <hr />
            <button class="mi" role="menuitem" onclick={logout}><Icon name="logout" />Se déconnecter</button>
          </div>
        {/if}
      </div>
      <button class="ib hm" aria-label="Menu" aria-expanded={menuOpen} onclick={() => (menuOpen = !menuOpen)}><Icon name="menu" /></button>
    </div>
  </div>

  {#if menuOpen}
    <nav class="mp" aria-label="Navigation mobile">
      {#each items as i (i.href)}
        <a class="nv" class:on={isActive(i.href)} href={i.href}>{i.label}</a>
      {/each}
    </nav>
  {/if}
</header>

<style>
  .tb { position: sticky; top: 0; z-index: 30; background: var(--card); border-bottom: 1px solid var(--line); }
  .bar { padding: 0 40px; height: 64px; display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 24px; }
  .brand { justify-self: start; }
  .logo { height: 34px; display: block; background: #fff; border-radius: 6px; padding: 2px 6px; }
  .nl { display: flex; gap: 4px; align-items: center; }
  .nv { display: inline-flex; align-items: center; min-height: 44px; padding: 0 14px; border-radius: var(--radius); color: var(--mut); font: 600 15px var(--font); text-decoration: none; position: relative; }
  .nv:hover { background: var(--soft); color: var(--ink); }
  .nv.on { color: var(--ink); font-weight: 800; }
  .nv.on::after { content: ''; position: absolute; left: 14px; right: 14px; bottom: -10px; height: 3px; border-radius: 2px; background: var(--ink); }
  .rt { justify-self: end; display: flex; align-items: center; gap: 8px; }
  .pop { position: relative; }
  .ub { display: flex; align-items: center; gap: 10px; border: 0; background: none; color: var(--ink); cursor: pointer; font: inherit; padding: 4px 8px 4px 4px; border-radius: var(--radius); min-height: 44px; }
  .ub:hover { background: var(--soft); }
  .tx b { display: block; font-size: 14px; line-height: 1.2; text-align: left; }
  .tx small { display: block; color: var(--mut); font-size: 12px; line-height: 1.2; text-align: left; }
  .pm { position: absolute; right: 0; top: calc(100% + 8px); min-width: 240px; background: var(--bg); border: 1px solid var(--line); border-radius: 12px; padding: 8px; box-shadow: 0 12px 32px rgba(10, 8, 30, 0.15); z-index: 40; }
  .grp { margin: 4px 12px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
  hr { border: 0; border-top: 1px solid var(--line); margin: 6px 0; }
  .mi { display: flex; gap: 10px; align-items: center; width: 100%; min-height: 44px; padding: 0 12px; border: 0; background: none; color: var(--ink); font: 600 15px var(--font); border-radius: 8px; cursor: pointer; text-align: left; }
  .mi:hover { background: var(--soft); }
  .chk { width: 20px; text-align: center; color: var(--acc); }
  .ib { width: 44px; height: 44px; border-radius: var(--radius); border: 1px solid var(--line); background: none; color: var(--ink); place-items: center; cursor: pointer; }
  .hm, .mp { display: none; }
  @media (max-width: 900px) {
    .bar { padding: 0 16px; height: 60px; gap: 12px; grid-template-columns: 1fr auto; }
    .logo { height: 30px; }
    .nl { display: none; }
    .hm { display: grid; }
    .tx { display: none; }
    .ub { padding: 4px; }
    .mp { display: block; border-top: 1px solid var(--line); padding: 8px 16px 12px; }
    .mp .nv { width: 100%; }
    .mp .nv.on::after { display: none; }
    .mp .nv.on { background: var(--soft); }
  }
</style>
