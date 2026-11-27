import { describe, expect, it } from 'vitest';
import { rules, validateForm } from '../utils/validation';
import { addDaysISO, formatMoney, formatTime, formatDateLong } from '../utils/format';

describe('validaciones del cliente', () => {
  it('valida correo, contraseña y teléfono', () => {
    expect(rules.email('no-es-correo')).toMatch(/inválido/);
    expect(rules.email('ana@correo.com')).toBeNull();
    expect(rules.password('corta1')).toMatch(/8 caracteres/);
    expect(rules.password('solamenteletras')).toMatch(/letras y números/);
    expect(rules.password('Segura123')).toBeNull();
    expect(rules.phone('abc')).toMatch(/inválido/);
    expect(rules.phone('+57 300 123 4567')).toBeNull();
  });

  it('validateForm devuelve el primer error de cada campo', () => {
    const errors = validateForm(
      { name: '', price: '-1' },
      { name: [rules.required('El nombre')], price: [rules.number(0, 100, 'El precio')] },
    );
    expect(errors).toEqual({ name: 'El nombre es obligatorio', price: 'El precio debe ser al menos 0' });
  });
});

describe('formato de fechas y dinero', () => {
  it('no desplaza la hora local del negocio por la zona del navegador', () => {
    expect(formatTime('2026-12-01T09:30')).toBe('09:30');
    expect(formatDateLong('2026-12-01T09:30')).toMatch(/1 de diciembre de 2026/);
    expect(addDaysISO('2026-12-31', 1)).toBe('2027-01-01');
  });
  it('formatea precios', () => {
    expect(formatMoney(35000)).toMatch(/^\$35.?000$/);
  });
});
