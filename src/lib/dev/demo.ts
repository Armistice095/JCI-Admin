import type { Me } from '$lib/api/client';

/** Profil de démonstration, utilisé UNIQUEMENT en développement (`npm run dev`) tant que l'authentification (étape 2) n'est pas branchée. */
export const DEMO_ME: Me = {
  id: '00000000-0000-4000-8000-000000000001',
  email: 'fatou@jci-come.bj',
  firstName: 'Fatou',
  lastName: 'Zinsou',
  roles: [{ id: '00000000-0000-4000-8000-0000000000a1', roleCode: 'ADMIN', eventId: null }],
  permissions: [
    'user.manage', 'role.manage', 'event.read', 'event.create', 'event.update', 'event.publish', 'event.close', 'event.cancel',
    'event.delete_draft', 'ticketing.manage', 'order.read', 'finance.view', 'sale.create', 'sale.read_all', 'ticket.cancel',
    'dashboard.view'
  ],
  eventPermissions: {}
};
