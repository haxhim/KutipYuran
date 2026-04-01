export function normalizeMalaysiaPhone(input: string) {
  const digits = input.replace(/\D/g, "");

  if (digits.startsWith("60")) {
    return digits;
  }

  if (digits.startsWith("0")) {
    return `6${digits}`;
  }

  return digits;
}

export function toWhatsappJid(phone: string) {
  return `${normalizeMalaysiaPhone(phone)}@c.us`;
}

