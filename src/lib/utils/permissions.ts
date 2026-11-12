/** Permissions connues (guide §4). Le serveur reste seul juge : ceci ne sert qu'à afficher/masquer. */
export type Permission =
  | 'user.manage' | 'role.manage' | 'audit.view' | 'settings.manage'
  | 'event.read' | 'event.create' | 'event.update' | 'event.publish' | 'event.close' | 'event.cancel' | 'event.delete_draft'
  | 'ticketing.manage' | 'order.read' | 'finance.view'
  | 'sale.create' | 'sale.read_all'
  | 'participant.read' | 'participant.export'
  | 'ticket.cancel' | 'ticket.resend'
  | 'report.view' | 'dashboard.view'
  | 'checkin.scan' | 'checkin.view' | 'checkin.override';
