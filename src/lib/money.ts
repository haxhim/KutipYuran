export function decimalToNumber(value: { toString(): string } | string | number) {
  if (typeof value === "number") return value;
  return Number(value.toString());
}

export function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

