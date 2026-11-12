import type { Me } from '$lib/api/client';
import type { Permission } from '$lib/utils/permissions';

/**
 * Session de l'utilisateur connecté (profil `GET /me`).
 * L'authentification elle-même (Supabase, jeton, rafraîchissement) arrive à l'étape 2.
 */
class Session {
  me = $state<Me | null>(null);
  ready = $state(false);

  get isAuthenticated() {
    return this.me !== null;
  }
  get fullName() {
    return this.me ? `${this.me.firstName} ${this.me.lastName}` : '';
  }
  /** Libellé du rôle principal affiché sous le nom (ex. « Administrateur »). */
  get roleCodes() {
    return [...new Set(this.me?.roles.map((r) => r.roleCode) ?? [])];
  }

  /** Permission globale. Pour un événement précis, passer son id (prend aussi en compte les rôles limités). */
  can(permission: Permission, eventId?: string): boolean {
    if (!this.me) return false;
    if (this.me.permissions.includes(permission)) return true;
    return eventId ? (this.me.eventPermissions[eventId]?.includes(permission) ?? false) : false;
  }

  set(me: Me | null) {
    this.me = me;
    this.ready = true;
  }
  clear() {
    this.set(null);
  }
}

export const session = new Session();
