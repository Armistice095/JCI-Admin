export interface ToastItem {
  id: number;
  message: string;
  tone: 'ok' | 'err' | 'info';
}

class Toasts {
  items = $state<ToastItem[]>([]);
  private n = 0;

  push(message: string, tone: ToastItem['tone'] = 'info', ms = 4500) {
    const id = ++this.n;
    this.items.push({ id, message, tone });
    setTimeout(() => this.dismiss(id), ms);
  }
  ok = (m: string) => this.push(m, 'ok');
  error = (m: string) => this.push(m, 'err', 7000);
  dismiss(id: number) {
    this.items = this.items.filter((t) => t.id !== id);
  }
}

export const toasts = new Toasts();
