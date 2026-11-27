/*
 * Prueba end-to-end del flujo MVP de Agenda Fácil en un navegador real (Chromium + Playwright).
 * Recorre la interfaz como lo haría una persona: registro de negocio, configuración de
 * servicios y horarios, registro de cliente, consulta de disponibilidad, reserva,
 * gestión de la cita por el negocio y cancelación por el cliente.
 * Además verifica que no exista desbordamiento horizontal en móvil, tablet y escritorio
 * y guarda capturas en docs/capturas/.
 *
 * Uso:  BASE_URL=http://localhost:4173 node e2e/mvp-flow.cjs
 * Requiere backend y frontend en ejecución (ver README, sección "Pruebas E2E").
 */
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');

const BASE = process.env.BASE_URL || 'http://localhost:4173';
const OUT = path.resolve(__dirname, '..', 'docs', 'capturas');
const RUN = Date.now().toString(36);
const PASSWORD = 'PruebaE2E2026';
const results = [];

const VIEWPORTS = {
  escritorio: { width: 1366, height: 900 },
  tablet: { width: 820, height: 1180 },
  movil: { width: 390, height: 844 },
};

function step(name, fn) {
  return fn()
    .then(() => results.push({ name, ok: true }))
    .catch((err) => {
      results.push({ name, ok: false, error: err.message });
      throw err;
    });
}

function assert(cond, message) {
  if (!cond) throw new Error(`Aserción fallida: ${message}`);
}

async function noHorizontalOverflow(page, label) {
  const { sw, cw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  assert(sw <= cw + 1, `${label}: desbordamiento horizontal (scrollWidth ${sw} > ${cw})`);
}

async function shot(page, name) {
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true });
}

/** Próxima fecha AAAA-MM-DD con el día de la semana indicado (1 = lunes), al menos 2 días adelante. */
function nextWeekday(dow) {
  const d = new Date();
  d.setDate(d.getDate() + 2);
  while (d.getDay() !== dow) d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

async function newPage(browser, viewport = VIEWPORTS.escritorio) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2, locale: 'es-CO', timezoneId: 'America/Bogota' });
  return ctx.newPage();
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const businessName = `Barbería Prueba E2E ${RUN}`;
  const ownerEmail = `negocio.e2e.${RUN}@pruebas.test`;
  const clientEmail = `cliente.e2e.${RUN}@pruebas.test`;
  const client2Email = `cliente2.e2e.${RUN}@pruebas.test`;
  const monday = nextWeekday(1);
  let slug;

  try {
    const biz = await newPage(browser);

    await step('Landing page carga con planes desde la API', async () => {
      await biz.goto(BASE);
      await biz.getByRole('heading', { name: /Tu agenda organizada/ }).waitFor();
      await biz.getByRole('heading', { name: 'Plan Básico' }).waitFor();
      await biz.getByRole('heading', { name: 'Plan Profesional' }).waitFor();
      await shot(biz, '01-landing-escritorio');
    });

    await step('Registro de negocio y redirección al panel', async () => {
      await biz.goto(`${BASE}/registro`);
      await biz.getByRole('button', { name: 'Registrar negocio' }).click();
      await biz.getByText('El nombre es obligatorio').first().waitFor();
      await shot(biz, '02-registro-validaciones');
      await biz.getByLabel('Nombre completo').fill('Dueño Prueba E2E');
      await biz.getByLabel('Correo electrónico').fill(ownerEmail);
      await biz.getByLabel(/^Contraseña/).fill(PASSWORD);
      await biz.getByLabel('Confirmar contraseña').fill(PASSWORD);
      await biz.getByLabel('Nombre del negocio').fill(businessName);
      await biz.getByLabel('Ciudad').fill('Ciudad de prueba');
      await biz.getByRole('button', { name: 'Registrar negocio' }).click();
      await biz.waitForURL(/\/panel$/);
      await biz.getByRole('heading', { name: 'Resumen' }).waitFor();
      await shot(biz, '03-panel-negocio-nuevo');
    });

    await step('Crear servicios con precio y duración', async () => {
      await biz.getByRole('complementary').getByRole('link', { name: 'Servicios' }).click();
      for (const [name, dur, price] of [
        ['Corte de cabello', '30', '25000'],
        ['Corte y barba', '60', '40000'],
      ]) {
        await biz.getByRole('button', { name: /Nuevo servicio|Crear el primer servicio/ }).first().click();
        await biz.getByLabel('Nombre del servicio').fill(name);
        await biz.getByLabel('Duración (minutos)').fill(dur);
        await biz.getByLabel('Precio').fill(price);
        await biz.getByRole('dialog').getByRole('button', { name: 'Guardar' }).click();
        await biz.getByRole('heading', { name }).waitFor();
      }
      await shot(biz, '04-servicios');
    });

    await step('Configurar horario (abrir sábado 09:00-13:00)', async () => {
      await biz.getByRole('complementary').getByRole('link', { name: 'Horarios' }).click();
      await biz.getByText('Sábado').waitFor();
      await biz.locator('.hours-row', { hasText: 'Sábado' }).locator('.switch').click();
      const sat = biz.locator('.hours-row', { hasText: 'Sábado' });
      await sat.locator('input[type=time]').nth(0).fill('09:00');
      await sat.locator('input[type=time]').nth(1).fill('13:00');
      await biz.getByRole('button', { name: 'Guardar horario' }).click();
      await biz.getByText('Horario guardado').waitFor();
      await shot(biz, '05-horarios');
    });

    await step('Obtener enlace público de reservas', async () => {
      await biz.getByRole('complementary').getByRole('link', { name: 'Configuración' }).click();
      const url = await biz.locator('.copy-row code').innerText();
      slug = url.split('/reservar/')[1];
      assert(slug, 'slug del negocio');
    });

    const cli = await newPage(browser);
    await step('Registro de cliente', async () => {
      await cli.goto(`${BASE}/registro?tipo=cliente`);
      await cli.getByLabel('Nombre completo').fill('Cliente Prueba E2E');
      await cli.getByLabel('Correo electrónico').fill(clientEmail);
      await cli.getByLabel(/^Contraseña/).fill(PASSWORD);
      await cli.getByLabel('Confirmar contraseña').fill(PASSWORD);
      await cli.getByRole('button', { name: 'Crear cuenta' }).click();
      await cli.waitForURL(/\/mis-reservas$/);
    });

    let bookedSlot;
    await step('Cliente busca el negocio, consulta disponibilidad y reserva', async () => {
      await cli.goto(`${BASE}/reservar`);
      await cli.getByLabel('Buscar negocio').fill(RUN);
      await cli.getByRole('button', { name: 'Buscar' }).click();
      await cli.getByRole('link', { name: new RegExp(businessName) }).click();
      await cli.getByRole('radio', { name: /Corte y barba/ }).click();
      await cli.getByLabel('Fecha').fill(monday);
      await cli.getByRole('option', { name: '10:00' }).waitFor();
      await shot(cli, '06-reserva-disponibilidad');
      await cli.getByRole('option', { name: '10:00' }).click();
      bookedSlot = `${monday}T10:00`;
      await cli.getByRole('button', { name: 'Confirmar reserva' }).click();
      await cli.getByRole('heading', { name: 'Reserva confirmada' }).waitFor();
      await shot(cli, '07-reserva-confirmada');
    });

    await step('Una segunda reserva del cliente (para cancelarla luego)', async () => {
      await cli.getByRole('button', { name: 'Reservar otra cita' }).click();
      await cli.getByRole('radio', { name: /Corte de cabello/ }).click();
      await cli.getByLabel('Fecha').fill(monday);
      await cli.getByRole('option', { name: '15:00' }).click();
      await cli.getByRole('button', { name: 'Confirmar reserva' }).click();
      await cli.getByRole('heading', { name: 'Reserva confirmada' }).waitFor();
    });

    await step('Otro cliente ve el horario reservado como no disponible', async () => {
      const cli2 = await newPage(browser, VIEWPORTS.movil);
      await cli2.goto(`${BASE}/registro?tipo=cliente`);
      await cli2.getByLabel('Nombre completo').fill('Segundo Cliente E2E');
      await cli2.getByLabel('Correo electrónico').fill(client2Email);
      await cli2.getByLabel(/^Contraseña/).fill(PASSWORD);
      await cli2.getByLabel('Confirmar contraseña').fill(PASSWORD);
      await cli2.getByRole('button', { name: 'Crear cuenta' }).click();
      await cli2.waitForURL(/\/mis-reservas$/);
      await cli2.goto(`${BASE}/reservar/${slug}`);
      await cli2.getByRole('radio', { name: /Corte de cabello/ }).click();
      await cli2.getByLabel('Fecha').fill(monday);
      const taken = cli2.getByRole('option', { name: '10:00' });
      await taken.waitFor();
      assert(await taken.isDisabled(), '10:00 debe estar ocupado (reserva de 60 min a las 10:00)');
      assert(await cli2.getByRole('option', { name: '10:30' }).isDisabled(), '10:30 también debe estar ocupado');
      assert(!(await cli2.getByRole('option', { name: '11:00' }).isDisabled()), '11:00 debe estar libre');
      await noHorizontalOverflow(cli2, 'Reserva (móvil)');
      await shot(cli2, '08-reserva-movil-horarios-ocupados');
      await cli2.context().close();
    });

    await step('El negocio ve las citas en su panel y en la agenda', async () => {
      await biz.getByRole('complementary').getByRole('link', { name: 'Citas' }).click();
      await biz.getByRole('button', { name: 'Todo el historial' }).click();
      await biz.getByRole('cell', { name: /Corte y barba/ }).waitFor();
      await biz.getByRole('cell', { name: /Corte de cabello/ }).waitFor();
      await shot(biz, '09-agenda-negocio');
    });

    await step('El negocio reprograma la cita (modificar)', async () => {
      await biz.getByRole('button', { name: /Modificar cita de Cliente Prueba E2E/ }).first().click();
      const dialog = biz.getByRole('dialog');
      await dialog.getByLabel('Fecha').fill(monday);
      await dialog.getByRole('option', { name: '11:30' }).click();
      await dialog.getByRole('button', { name: 'Guardar cambios' }).click();
      await biz.getByText('Cita modificada').waitFor();
      await biz.getByRole('cell', { name: /11:30/ }).waitFor();
    });

    await step('El negocio crea una cita manual con cliente nuevo', async () => {
      await biz.getByRole('button', { name: 'Nueva cita' }).click();
      const dialog = biz.getByRole('dialog');
      await dialog.getByRole('button', { name: 'Cliente nuevo' }).click();
      await dialog.getByLabel('Nombre').fill('Cliente Presencial E2E');
      await dialog.getByLabel('Teléfono').fill('3000000000');
      await dialog.getByLabel('Fecha').fill(monday);
      await dialog.getByRole('option', { name: '09:00' }).click();
      await shot(biz, '10-nueva-cita-modal');
      await dialog.getByRole('button', { name: 'Crear cita' }).click();
      await biz.getByText('Cita creada').waitFor();
    });

    await step('El negocio cancela la cita manual', async () => {
      const row = biz.locator('tr', { hasText: 'Cliente Presencial E2E' });
      await row.getByRole('button', { name: 'Cancelar' }).click();
      await biz.getByRole('dialog').getByRole('button', { name: 'Confirmar' }).click();
      await biz.getByText('Cita marcada como cancelada').waitFor();
      await row.getByText('Cancelada').waitFor();
    });

    await step('El cliente consulta y cancela una reserva', async () => {
      await cli.goto(`${BASE}/mis-reservas`);
      await cli.getByRole('heading', { name: 'Corte de cabello' }).waitFor();
      await shot(cli, '11-mis-reservas');
      const card = cli.locator('.reservation-card', { hasText: 'Corte de cabello' });
      await card.getByRole('button', { name: 'Cancelar' }).click();
      await cli.getByRole('dialog').getByRole('button', { name: 'Sí, cancelar' }).click();
      await cli.getByText('Reserva cancelada').waitFor();
      await cli.getByRole('tab', { name: 'Historial' }).click();
      await cli.locator('.reservation-card', { hasText: 'Corte de cabello' }).getByText('Cancelada').waitFor();
    });

    await step('Historial del cliente en la ficha del negocio', async () => {
      await biz.getByRole('complementary').getByRole('link', { name: 'Clientes' }).click();
      await biz.locator('tr', { hasText: 'Cliente Prueba E2E' }).getByRole('link', { name: 'Ver ficha e historial' }).click();
      await biz.getByRole('heading', { name: 'Historial de reservas' }).waitFor();
      await biz.getByText('Reservas totales: 2').waitFor();
      await shot(biz, '12-ficha-cliente-historial');
    });

    await step('Panel del negocio (resumen) y diseño responsive', async () => {
      await biz.getByRole('complementary').getByRole('link', { name: 'Resumen' }).click();
      await biz.getByText('Citas de hoy').waitFor();
      await shot(biz, '13-dashboard-escritorio');
      for (const [label, vp] of Object.entries(VIEWPORTS)) {
        await biz.setViewportSize(vp);
        for (const route of ['/panel', '/panel/citas', '/panel/servicios', '/panel/horarios', '/panel/clientes', '/panel/configuracion']) {
          await biz.goto(`${BASE}${route}`);
          await biz.locator('.page-header h1').waitFor();
          await biz.locator('.spinner').waitFor({ state: 'detached' }).catch(() => {});
          await noHorizontalOverflow(biz, `${route} (${label})`);
        }
      }
      await biz.setViewportSize(VIEWPORTS.movil);
      await biz.goto(`${BASE}/panel`);
      await biz.getByText('Citas de hoy').waitFor();
      await shot(biz, '14-dashboard-movil');
      await biz.getByRole('button', { name: 'Abrir menú' }).click();
      await shot(biz, '15-menu-movil');
      await biz.setViewportSize(VIEWPORTS.tablet);
      await biz.goto(`${BASE}/panel/citas`);
      await biz.getByRole('cell').first().waitFor();
      await shot(biz, '16-agenda-tablet');
    });

    await step('Páginas públicas sin desbordamiento en móvil y tablet', async () => {
      const p = await newPage(browser, VIEWPORTS.movil);
      for (const [label, vp] of Object.entries(VIEWPORTS)) {
        await p.setViewportSize(vp);
        for (const route of ['/', '/ingresar', '/registro', '/reservar', `/reservar/${slug}`]) {
          await p.goto(`${BASE}${route}`);
          await p.locator('h1').first().waitFor();
          await noHorizontalOverflow(p, `${route} (${label})`);
        }
      }
      await p.setViewportSize(VIEWPORTS.movil);
      await p.goto(BASE);
      await shot(p, '17-landing-movil');
      await p.context().close();
    });

    await step('Control de acceso: un cliente no puede abrir el panel del negocio', async () => {
      await cli.goto(`${BASE}/panel`);
      await cli.waitForURL(/\/mis-reservas$/);
    });
  } catch (err) {
    console.error('\nERROR:', err.message);
  } finally {
    await browser.close();
    const passed = results.filter((r) => r.ok).length;
    const report = [
      `# Resultado prueba E2E (${new Date().toISOString()})`,
      `Base URL: ${BASE} · Ejecución: ${RUN}`,
      '',
      ...results.map((r) => `- [${r.ok ? 'x' : ' '}] ${r.name}${r.ok ? '' : ` — ${r.error}`}`),
      '',
      `Total: ${passed}/${results.length} pasos correctos`,
    ].join('\n');
    console.log(report);
    fs.writeFileSync(path.resolve(__dirname, '..', 'docs', 'evidencias', 'resultado-e2e.md'), `${report}\n`);
    process.exit(results.every((r) => r.ok) && results.length > 0 ? 0 : 1);
  }
})();
