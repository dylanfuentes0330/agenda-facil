// Uso: node e2e/verificar-produccion.mjs https://<url-publica>   (crea un negocio y un cliente de prueba)
// Verificación de producción: logo en S3 (URL prefirmada), validaciones, aislamiento y cabeceras.
const BASE = process.argv[2];
const out = [];
const log = (ok, msg) => { out.push(`${ok ? '[OK]  ' : '[FALLO]'} ${msg}`); if (!ok) process.exitCode = 1; };
const j = async (method, path, { token, body, form } = {}) => {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${BASE}${path}`, { method, headers, body: form || (body ? JSON.stringify(body) : undefined) });
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data, headers: res.headers, size: text.length };
};
const run = Date.now().toString(36);
const reg = await j('POST', '/api/auth/register/business', { body: {
  name: 'Verificación Producción', email: `verif-${run}@example.com`, password: 'VerifProd2026x', phone: '+57 300 000 0000',
  business: { name: `Verificación ${run}`, category: 'Barbería', city: 'Barranquilla', planCode: 'BASICO' } } });
log(reg.status === 201, `Registro de negocio en RDS → ${reg.status}`);
const token = reg.data.token;

// PNG 1x1 válido
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const fd = new FormData();
fd.append('logo', new Blob([png], { type: 'image/png' }), 'logo.png');
const up = await j('POST', '/api/business/logo', { token, form: fd });
const logoUrl = up.data?.business?.logoUrl;
log(up.status === 200 && /amazonaws\.com/.test(logoUrl || ''), `Subida de logo a S3 → ${up.status}, URL prefirmada de S3: ${logoUrl ? 'sí' : 'no'}`);
if (logoUrl) {
  const img = await fetch(logoUrl);
  log(img.status === 200 && (img.headers.get('content-type') || '').startsWith('image/png'), `Descarga del logo por URL prefirmada → ${img.status} ${img.headers.get('content-type')}`);
  const noSig = await fetch(logoUrl.split('?')[0]);
  log(noSig.status === 403, `El mismo objeto sin firma (bucket privado) → ${noSig.status}`);
}
const bad = await j('PUT', '/api/business/hours', { token, body: { hours: Array.from({ length: 30000 }, () => ({})) } });
log(bad.status === 400 && bad.size < 2048, `Horarios con 30 000 filas → ${bad.status}, respuesta de ${bad.size} bytes (H-16)`);
const noAuth = await j('GET', '/api/business/profile');
log(noAuth.status === 401, `Panel sin token → ${noAuth.status}`);
const cli = await j('POST', '/api/auth/register/client', { body: { name: 'Cliente Verif', email: `cli-${run}@example.com`, password: 'VerifProd2026x' } });
const asClient = await j('GET', '/api/business/profile', { token: cli.data.token });
log(asClient.status === 403, `Cliente intentando abrir el panel del negocio → ${asClient.status}`);
const home = await fetch(`${BASE}/`);
const h = (n) => home.headers.get(n);
log(home.status === 200 && h('strict-transport-security') && h('x-content-type-options') === 'nosniff' && h('x-frame-options'),
  `Frontend: ${home.status}; HSTS="${h('strict-transport-security')}", nosniff="${h('x-content-type-options')}", XFO="${h('x-frame-options')}", server="${h('server')}"`);
const spa = await fetch(`${BASE}/panel/agenda`);
log(spa.status === 200, `Ruta interna de la SPA (/panel/agenda) → ${spa.status}`);
const health = await j('GET', '/api/health');
log(health.data.database === 'ok', `/api/health → ${JSON.stringify(health.data)}`);
const httpRedirect = await fetch(BASE.replace('https://', 'http://') + '/', { redirect: 'manual' });
log(httpRedirect.status === 301 && (httpRedirect.headers.get('location') || '').startsWith('https://'), `HTTP → ${httpRedirect.status} ${httpRedirect.headers.get('location')}`);
console.log(`# Verificación de producción (${new Date().toISOString()})\nURL: ${BASE}\n\n${out.join('\n')}`);
