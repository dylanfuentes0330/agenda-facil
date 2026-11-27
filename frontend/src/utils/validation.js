// Validaciones del lado del cliente (el backend vuelve a validar todo).

// Concordancia de género: "La contraseña es obligatoria" / "El nombre es obligatorio".
const obligatorio = (label) => `${label} es ${/^(la|las)\s/i.test(label) ? 'obligatoria' : 'obligatorio'}`;

export const rules = {
  required: (label) => (v) => (String(v ?? '').trim() ? null : obligatorio(label)),
  minLength: (n, label) => (v) => (String(v ?? '').trim().length >= n ? null : `${label} debe tener al menos ${n} caracteres`),
  email: (v) => (!v || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v).trim()) ? null : 'Correo electrónico inválido'),
  password: (v) => {
    const s = String(v ?? '');
    if (s.length < 8) return 'La contraseña debe tener al menos 8 caracteres';
    if (!/[A-Za-z]/.test(s) || !/\d/.test(s)) return 'Debe contener letras y números';
    return null;
  },
  phone: (v) => (!v || /^[+\d][\d\s()-]{6,29}$/.test(String(v).trim()) ? null : 'Teléfono inválido'),
  number: (min, max, label) => (v) => {
    if (v === '' || v === null || v === undefined) return obligatorio(label);
    const n = Number(v);
    if (Number.isNaN(n)) return `${label} debe ser un número`;
    if (n < min) return `${label} debe ser al menos ${min}`;
    if (n > max) return `${label} no puede superar ${max}`;
    return null;
  },
};

/** Ejecuta un mapa { campo: [reglas] } y devuelve { campo: primerError }. */
export function validateForm(values, schema) {
  const errors = {};
  Object.entries(schema).forEach(([field, fieldRules]) => {
    for (const rule of fieldRules) {
      const msg = rule(values[field], values);
      if (msg) {
        errors[field] = msg;
        break;
      }
    }
  });
  return errors;
}
