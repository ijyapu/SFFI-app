/**
 * Format a number as a Nepali-locale currency string: "Rs 1,23,456.78"
 * Use this wherever a Rs-prefixed amount appears in the UI.
 */
export function formatAmount(n: number, decimals = 2): string {
  return `Rs ${n.toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

/**
 * Format a number with en-IN locale and fixed decimals — no currency prefix.
 * Use inside table cells whose column header already shows "(Rs)".
 */
export function formatNumber(n: number, decimals = 2): string {
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format a quantity with up to 3 decimal places.
 */
export function formatQty(n: number): string {
  return n.toLocaleString("en-IN", { maximumFractionDigits: 3 });
}
