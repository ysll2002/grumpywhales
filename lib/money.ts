export function formatMoney(amount: number, currency = 'GBP'): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(d: string | Date): string {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export type LineItem = {
  description: string;
  quantity:    number;
  unit_price:  number;
};

export function lineItemTotal(item: LineItem): number {
  return +(item.quantity * item.unit_price).toFixed(2);
}

export function subtotal(items: LineItem[]): number {
  return +items.reduce((s, i) => s + lineItemTotal(i), 0).toFixed(2);
}

export function vatAmount(items: LineItem[], vatRate: number): number {
  return +(subtotal(items) * vatRate).toFixed(2);
}

export function total(items: LineItem[], vatRate: number): number {
  return +(subtotal(items) + vatAmount(items, vatRate)).toFixed(2);
}
