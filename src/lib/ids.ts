import slugify from "slugify";

export function createOrganizationSlug(name: string) {
  return slugify(name, { lower: true, strict: true, trim: true });
}

export function generateReference(prefix: string) {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

