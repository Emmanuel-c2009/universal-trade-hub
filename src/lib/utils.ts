import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a number as EUR with comma grouping: €1,340.35 */
export function formatEUR(amount: number, decimals = 2): string {
  return `€${amount.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

/** Format a number with comma grouping (no currency symbol) */
export function formatNumber(amount: number, decimals = 2): string {
  return amount.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
