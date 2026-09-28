function configuredPrice(raw: string | undefined, fallback: number) {
  const value = Number(raw);
  return Number.isSafeInteger(value) && value > 0 ? value : fallback;
}

export const PLANS = {
  month_1: { months: 1, priceMnt: configuredPrice(process.env.NEXT_PUBLIC_PREMIUM_1_MONTH_MNT, 3000), label: "1 сар" },
  month_3: { months: 3, priceMnt: configuredPrice(process.env.NEXT_PUBLIC_PREMIUM_3_MONTH_MNT, 8000), label: "3 сар", note: "Санал болгож буй" },
  month_6: { months: 6, priceMnt: configuredPrice(process.env.NEXT_PUBLIC_PREMIUM_6_MONTH_MNT, 15000), label: "6 сар", note: "Хамгийн хямд" },
} as const;

export type PlanCode = keyof typeof PLANS;

export function isPlanCode(value: unknown): value is PlanCode {
  return typeof value === "string" && Object.hasOwn(PLANS, value);
}

export function formatMnt(value: number) {
  return `${new Intl.NumberFormat("mn-MN").format(value)}₮`;
}
