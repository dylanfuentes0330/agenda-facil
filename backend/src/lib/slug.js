export function slugify(text) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120) || 'negocio';
}

export async function uniqueBusinessSlug(tx, name) {
  const base = slugify(name);
  let candidate = base;
  for (let i = 2; await tx.business.findUnique({ where: { slug: candidate } }); i += 1) {
    candidate = `${base}-${i}`;
  }
  return candidate;
}
