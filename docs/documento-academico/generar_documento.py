#!/usr/bin/env python3
"""Genera el documento académico de Agenda Fácil en formato APA 7 (DOCX) y su versión PDF.

Uso (desde la raíz del repositorio):
    python3 docs/documento-academico/generar_documento.py
Requisitos: python-docx, Pillow y, para el PDF, LibreOffice (soffice) o Microsoft Word (Windows);
PyMuPDF para calcular las páginas de la tabla de contenido y de las listas de tablas y figuras.

Estructura basada en la plantilla indicada por el docente, sin las secciones que la rúbrica del corte 3
excluye: Nota de aceptación, Dedicatoria, Agradecimientos, Resumen, Abstract y Recomendaciones.
Los datos personales (nombre, código, programa, curso, docente, fecha) se completan en el diccionario
PORTADA. Mientras contengan corchetes, aparecen resaltados en amarillo como pendientes.
"""
import os
import re
import shutil
import subprocess
import tempfile
from pathlib import Path

from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK, WD_COLOR_INDEX, WD_LINE_SPACING
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = Path(__file__).resolve().parent
DOCX = OUT_DIR / 'Agenda_Facil_Documento_APA.docx'

PORTADA = {
    'autor': '[Nombre completo del estudiante]',
    'codigo': 'Código estudiantil: [pendiente]',
    'institucion': '[Programa académico], Universidad de la Costa',
    'semestre': 'Cuarto semestre · Proyecto individual',
    'curso': '[Código y nombre del curso]',
    'docente': '[Nombre del docente]',
    'fecha': '[Fecha de entrega]',
}

FONT = 'Times New Roman'
_fig = 0
_tab = 0
FIGURAS = []   # títulos de figuras en orden (para la lista de figuras)
TABLAS = []    # títulos de tablas en orden (para la lista de tablas)


# ----------------------------------------------------------------------------- utilidades de formato
def setup(doc):
    sec = doc.sections[0]
    sec.page_width, sec.page_height = Inches(8.5), Inches(11)
    for side in ('left_margin', 'right_margin', 'top_margin', 'bottom_margin'):
        setattr(sec, side, Inches(1))
    normal = doc.styles['Normal']
    normal.font.name = FONT
    normal.font.size = Pt(12)
    normal.element.rPr.rFonts.set(qn('w:eastAsia'), FONT)
    pf = normal.paragraph_format
    pf.line_spacing_rule = WD_LINE_SPACING.DOUBLE
    pf.space_before = Pt(0)
    pf.space_after = Pt(0)
    for name, size in (('Heading 1', 12), ('Heading 2', 12), ('Heading 3', 12)):
        st = doc.styles[name]
        st.font.name = FONT
        st.font.size = Pt(size)
        st.font.bold = True
        st.font.color.rgb = RGBColor(0, 0, 0)
        st.element.rPr.rFonts.set(qn('w:eastAsia'), FONT)
        st.element.rPr.rFonts.set(qn('w:ascii'), FONT)
        st.element.rPr.rFonts.set(qn('w:hAnsi'), FONT)
        for attr in ('w:asciiTheme', 'w:hAnsiTheme', 'w:eastAsiaTheme', 'w:cstheme'):
            st.element.rPr.rFonts.attrib.pop(qn(attr), None)
        st.paragraph_format.space_before = Pt(0)
        st.paragraph_format.space_after = Pt(0)
        st.paragraph_format.line_spacing_rule = WD_LINE_SPACING.DOUBLE
        st.paragraph_format.keep_with_next = True
    doc.styles['Heading 1'].paragraph_format.alignment = WD_ALIGN_PARAGRAPH.CENTER
    doc.styles['Heading 3'].font.italic = True
    # Número de página arriba a la derecha (APA 7)
    header = sec.header.paragraphs[0]
    header.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    add_field(header.add_run(), 'PAGE')


def add_field(run, instr):
    for tag, text in (('begin', None), ('instr', instr), ('separate', None), ('text', '1'), ('end', None)):
        if tag == 'instr':
            el = OxmlElement('w:instrText')
            el.set(qn('xml:space'), 'preserve')
            el.text = instr
        elif tag == 'text':
            el = OxmlElement('w:t')
            el.text = '1'
        else:
            el = OxmlElement('w:fldChar')
            el.set(qn('w:fldCharType'), tag)
        run._r.append(el)


def runs(p, text):
    """Texto con **negrita**, *cursiva* y [pendiente] resaltado en amarillo."""
    text = text.replace('`', '')
    for part in re.split(r'(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\])', text):
        if not part:
            continue
        if part.startswith('**'):
            r = p.add_run(part[2:-2]); r.bold = True
        elif part.startswith('*'):
            r = p.add_run(part[1:-1]); r.italic = True
        elif part.startswith('[') and part not in ('[Documento no publicado]', '[AWS]', '[ISRG]'):
            r = p.add_run(part); r.font.highlight_color = WD_COLOR_INDEX.YELLOW
        else:
            p.add_run(part)
    return p


def para(doc, text, indent=True, align=None, keep=False):
    p = doc.add_paragraph()
    if indent:
        p.paragraph_format.first_line_indent = Inches(0.5)
    if align:
        p.alignment = align
    if keep:
        p.paragraph_format.keep_with_next = True
    return runs(p, text)


def bullets(doc, items):
    for it in items:
        p = doc.add_paragraph()
        p.paragraph_format.left_indent = Inches(0.5)
        p.paragraph_format.first_line_indent = Inches(-0.25)
        runs(p, '•\t' + it)
        p.paragraph_format.tab_stops.add_tab_stop(Inches(0.5))


def h1(doc, text):
    doc.add_heading(text, level=1)


def h2(doc, text):
    doc.add_heading(text, level=2)


def h3(doc, text):
    doc.add_heading(text, level=3)


def page_break(doc):
    doc.add_paragraph().add_run().add_break(WD_BREAK.PAGE)


def set_borders(cell, top=None, bottom=None):
    tcPr = cell._tc.get_or_add_tcPr()
    borders = OxmlElement('w:tcBorders')
    for edge, val in (('top', top), ('bottom', bottom), ('left', None), ('right', None)):
        el = OxmlElement(f'w:{edge}')
        if val:
            el.set(qn('w:val'), 'single'); el.set(qn('w:sz'), str(val)); el.set(qn('w:color'), '000000')
        else:
            el.set(qn('w:val'), 'nil')
        borders.append(el)
    tcPr.append(borders)


def table(doc, title, header, rows, widths=None, note=None, size=10):
    global _tab
    _tab += 1
    TABLAS.append(title)
    p = doc.add_paragraph(); p.paragraph_format.keep_with_next = True
    p.add_run(f'Tabla {_tab}').bold = True
    p = doc.add_paragraph(); p.paragraph_format.keep_with_next = True
    p.add_run(title).italic = True
    t = doc.add_table(rows=1 + len(rows), cols=len(header))
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    for i, row in enumerate([header] + rows):
        for j, val in enumerate(row):
            cell = t.cell(i, j)
            cell.text = ''
            cp = cell.paragraphs[0]
            cp.paragraph_format.line_spacing = 1.0
            cp.paragraph_format.first_line_indent = Inches(0)
            runs(cp, str(val))
            for r in cp.runs:
                r.font.size = Pt(size)
                if i == 0:
                    r.bold = True
            last = i == len(rows)
            set_borders(cell, top=8 if i <= 1 else None, bottom=8 if last else None)
            if widths:
                cell.width = Inches(widths[j])
    if note:
        p = doc.add_paragraph(); p.paragraph_format.line_spacing = 2.0
        r = p.add_run('Nota. '); r.italic = True
        runs(p, note)
    else:
        doc.add_paragraph()
    return t


def figure(doc, title, image, width=6.0, note=None, max_height=7.2):
    global _fig
    _fig += 1
    FIGURAS.append(title)
    p = doc.add_paragraph(); p.paragraph_format.keep_with_next = True
    p.add_run(f'Figura {_fig}').bold = True
    p = doc.add_paragraph(); p.paragraph_format.keep_with_next = True
    p.add_run(title).italic = True
    w, h = Image.open(image).size
    width = min(width, max_height * w / h)
    p = doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.line_spacing = 1.0
    p.paragraph_format.keep_with_next = bool(note)
    p.add_run().add_picture(str(image), width=Inches(width))
    if note:
        p = doc.add_paragraph()
        r = p.add_run('Nota. '); r.italic = True
        runs(p, note)


def reference(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.left_indent = Inches(0.5)
    p.paragraph_format.first_line_indent = Inches(-0.5)
    runs(p, text)


def prepare_images(tmp):
    """Recorta capturas muy altas y reduce diagramas para el documento."""
    out = {}
    cap, dia = ROOT / 'docs' / 'capturas', ROOT / 'docs' / 'diagramas'

    def crop(src, ratio, width):
        im = Image.open(src).convert('RGB')
        w, h = im.size
        if h > w * ratio:
            im = im.crop((0, 0, w, int(w * ratio)))
        if im.size[0] > width:
            im = im.resize((width, int(im.size[1] * width / im.size[0])), Image.LANCZOS)
        dst = Path(tmp) / (src.parent.name + '-' + src.stem + '.jpg')
        im.save(dst, quality=88)
        return dst

    # Capturas de producción (E2E contra https://52-54-96-26.sslip.io y navegador sin sesión)
    for name, ratio, width in [
        ('prod-00-primera-vista-landing', 0.66, 1800), ('prod-18-panel-sin-sesion-redirige-login', 0.66, 1800),
        ('prod-02-registro-validaciones', 0.9, 1800), ('prod-04-servicios', 0.66, 1800), ('prod-05-horarios', 0.66, 1800),
        ('prod-06-reserva-disponibilidad', 0.75, 1800), ('prod-07-reserva-confirmada', 0.75, 1800),
        ('prod-09-agenda-negocio', 0.66, 1800), ('prod-10-nueva-cita-modal', 0.66, 1800), ('prod-11-mis-reservas', 0.66, 1800),
        ('prod-12-ficha-cliente-historial', 0.66, 1800), ('prod-13-dashboard-escritorio', 0.66, 1800),
        ('prod-16-agenda-tablet', 1.2, 1400), ('prod-14-dashboard-movil', 2.0, 780),
        ('prod-08-reserva-movil-horarios-ocupados', 2.0, 780)]:
        out[name] = crop(cap / 'aws' / f'{name}.png', ratio, width)
    for name in ['gh-02-pull-requests-cerrados', 'gh-06-actions', 'gh-07-deploy-3-verde', 'gh-04-ramas']:
        out[name] = crop(cap / 'github' / f'{name}.png', 0.75, 1800)
    for d in ['07-arquitectura-aws-desplegada', '01-arquitectura-aws', '02-componentes', '03-flujo-reservas',
              '04-modelo-entidad-relacion', '05-pipeline-cicd', '06-flujo-git']:
        out[d] = crop(dia / f'{d}.png', 10, 2400)
    return out


# ----------------------------------------------------------------------------- contenido
TITULO = 'Agenda Fácil: Plataforma SaaS de Gestión de Citas y Reservas Desplegada en Amazon Web Services'
PROPUESTA = '*Propuesta de Proyecto SaaS*, 2026'  # cita en el texto (obra sin autor declarado: el título ocupa su lugar)
URL = 'https://52-54-96-26.sslip.io'

TOC = [
    ('', 'Lista de tablas'), ('', 'Lista de figuras'),
    ('1', 'Introducción'), ('2', 'Planteamiento del problema'), ('3', 'Justificación'), ('4', 'Objetivos'),
    ('5', 'Alcance del proyecto'), ('6', 'Requisitos funcionales y no funcionales'), ('7', 'Arquitectura tecnológica'),
    ('8', 'Del modelo propuesto al modelo implementado'), ('9', 'Arquitectura AWS desplegada'), ('10', 'Diagramas'),
    ('11', 'Modelo de base de datos'), ('12', 'Descripción del frontend React'), ('13', 'Descripción del backend'),
    ('14', 'Seguridad y control de acceso'), ('15', 'Implementación de CI/CD'),
    ('16', 'Estrategia Git/GitHub y modalidad individual'), ('17', 'Proceso de despliegue'), ('18', 'Pruebas y resultados'),
    ('19', 'Análisis de costos'), ('20', 'Limitaciones de AWS Academy'), ('21', 'Estado del proyecto'),
    ('22', 'Conclusiones'), ('', 'Referencias'), ('', 'Anexo A. Capturas adicionales de la aplicación en producción'),
    ('', 'Anexo B. Evidencias de GitHub y del despliegue'),
]

PROD = f'Captura de producción ({URL}) generada el 28 de noviembre de 2026 por la prueba E2E automatizada.'


def dotted(doc, label, pg, indent=0.0):
    p = doc.add_paragraph()
    p.paragraph_format.left_indent = Inches(indent)
    p.paragraph_format.tab_stops.add_tab_stop(Inches(6.5), alignment=2, leader=1)  # derecha, puntos
    p.add_run(f'{label}\t{pg}')


def build(img, pages=None):
    global _fig, _tab
    _fig = _tab = 0
    FIGURAS.clear(); TABLAS.clear()
    pages = pages or {}
    fig_titles = pages.get('__figuras__', [])
    tab_titles = pages.get('__tablas__', [])
    doc = Document()
    setup(doc)

    # ---------------- Portada (APA 7, trabajo de estudiantes; proyecto individual)
    for _ in range(3):
        doc.add_paragraph()
    p = doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.add_run(TITULO).bold = True
    doc.add_paragraph()
    for key in ('autor', 'codigo', 'institucion', 'semestre', 'curso', 'docente', 'fecha'):
        p = doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        runs(p, PORTADA[key])
    page_break(doc)

    # ---------------- Tabla de contenido, lista de tablas y lista de figuras (páginas calculadas del PDF)
    h1(doc, 'Tabla de contenido')
    for num, title in TOC:
        dotted(doc, f'{num}. {title}' if num else title, pages.get(title, '00'))
    page_break(doc)
    h1(doc, 'Lista de tablas')
    for i, (title, pg) in enumerate(tab_titles, start=1):
        dotted(doc, f'Tabla {i}. {title}', pg)
    if not tab_titles:
        doc.add_paragraph('(se completa en la segunda pasada)')
    page_break(doc)
    h1(doc, 'Lista de figuras')
    for i, (title, pg) in enumerate(fig_titles, start=1):
        dotted(doc, f'Figura {i}. {title}', pg)
    if not fig_titles:
        doc.add_paragraph('(se completa en la segunda pasada)')

    # ---------------- Título en la primera página del texto
    p = doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.page_break_before = True
    p.add_run(TITULO).bold = True

    # 1
    h1(doc, '1. Introducción')
    para(doc, f'Los pequeños y medianos negocios que trabajan con citas —barberías, peluquerías, salones de belleza, consultorios, estudios de tatuajes y centros de estética— suelen administrar su agenda mediante mensajes de WhatsApp, llamadas telefónicas o un cuaderno. Este documento adapta la propuesta anterior del proyecto ({PROPUESTA}) al modelo de arquitectura que finalmente se implementó y desplegó: una plataforma de software como servicio (SaaS) que permite a cada negocio publicar sus servicios y horarios, y a sus clientes reservar en línea sin conflictos de horario.')
    para(doc, f'El proyecto se desarrolló en **modalidad individual** en el cuarto semestre, en la Universidad de la Costa. La aplicación se encuentra desplegada en AWS Academy Learner Lab y es accesible en {URL}. El informe presenta el problema, los objetivos y el alcance; los requisitos; la arquitectura tecnológica; la evolución de la arquitectura de la propuesta a la implementada y su justificación; la base de datos, el frontend en React y el backend en Node.js; la seguridad y el control de acceso; la integración y el despliegue continuos (CI/CD); la estrategia de Git y GitHub; el despliegue real, las pruebas con sus resultados verificados, los costos y las limitaciones del laboratorio. Se distingue en todo momento lo **diseñado**, lo **desarrollado**, lo **probado**, lo **desplegado** y lo **pendiente**. El documento sigue la séptima edición del manual de la American Psychological Association (2020).')

    # 2
    h1(doc, '2. Planteamiento del problema')
    para(doc, 'La gestión manual de reservas presenta tres fallas recurrentes. Primero, la **doble reserva**: cuando dos clientes piden el mismo horario por canales distintos, nada impide asignar ambos. Segundo, la **saturación de mensajes**: el personal dedica parte de su jornada a responder consultas de disponibilidad, confirmar y reprogramar citas. Tercero, la **pérdida de información**: los datos de los clientes y su historial quedan dispersos en conversaciones y no pueden consultarse con facilidad.')
    para(doc, 'Estas fallas se traducen en citas olvidadas, clientes insatisfechos y pérdida de ingresos. La pregunta que orienta el proyecto es: ¿cómo ofrecer a negocios pequeños una herramienta sencilla y de bajo costo que centralice su agenda, impida reservas incompatibles y permita a sus clientes reservar por sí mismos, garantizando que la información de cada negocio permanezca aislada y protegida?')

    # 3
    h1(doc, '3. Justificación')
    para(doc, 'Un modelo SaaS permite que muchos negocios compartan la misma aplicación sin instalar ni mantener servidores propios, pagando por niveles de servicio (Plan Básico y Plan Profesional) tras un periodo de prueba gratuito. La nube de AWS aporta servicios administrados —cómputo, base de datos gestionada y almacenamiento de objetos— que reducen la carga operativa y permiten crecer según la demanda (Amazon Web Services [AWS], s.f.-c).')
    para(doc, 'Desde la perspectiva académica, el proyecto integra desarrollo frontend y backend, modelado de datos, seguridad de aplicaciones, control de versiones, automatización CI/CD y arquitectura en la nube, en un producto funcional, desplegado y verificable públicamente.')

    # 4
    h1(doc, '4. Objetivos')
    h2(doc, 'Objetivo general')
    para(doc, 'Desarrollar, desplegar y documentar Agenda Fácil, una plataforma SaaS funcional de gestión de citas y reservas para pequeños negocios, sobre una arquitectura en AWS adaptada a las condiciones reales de AWS Academy, con automatización CI/CD.')
    h2(doc, 'Objetivos específicos')
    bullets(doc, [
        'Implementar las funcionalidades para negocios y clientes descritas en la propuesta mediante una interfaz web responsive en español.',
        'Construir una API REST segura con autenticación, autorización por roles y aislamiento de datos entre negocios.',
        'Garantizar en el backend que no existan reservas duplicadas ni solapadas, incluso ante peticiones simultáneas.',
        'Diseñar una base de datos relacional MySQL con migraciones versionadas, restricciones e índices.',
        'Automatizar la verificación (lint, pruebas, build) y el despliegue mediante GitHub Actions con aprobación de producción.',
        'Desplegar la infraestructura en AWS como código (CloudFormation) y adaptarla a las restricciones del laboratorio.',
        'Verificar el sistema con pruebas automatizadas unitarias, de API, de componentes y de extremo a extremo, también contra producción.',
    ])

    # 5
    h1(doc, '5. Alcance del proyecto')
    para(doc, '**Incluido:** registro e inicio de sesión de negocios y clientes; perfil, logo y preferencias del negocio; gestión de servicios, horarios, clientes y citas; panel del día con estadísticas; portal público de reservas con disponibilidad en tiempo real; consulta y cancelación de reservas por el cliente con margen configurable; planes Básico y Profesional con límites reales y periodo de prueba; infraestructura como código, pipelines de CI/CD y despliegue en AWS Academy.')
    para(doc, '**Fuera del alcance (trabajo futuro, según la propuesta):** pasarela de pagos y cobro real de suscripciones —los planes no simulan cobros—, recordatorios por WhatsApp o correo, múltiples usuarios por negocio en el Plan Profesional, reportes avanzados de ventas y aplicación móvil nativa.')

    # 6
    h1(doc, '6. Requisitos funcionales y no funcionales')
    table(doc, 'Requisitos funcionales y su implementación', ['ID', 'Requisito', 'Implementación'], [
        ['RF-01', 'Crear y administrar cuenta y perfil del negocio', 'Registro de negocio; página Configuración'],
        ['RF-02', 'Registrar servicios y precios', 'CRUD de servicios con duración y precio'],
        ['RF-03', 'Configurar horarios y días de atención', 'Horario semanal por día (abierto/cerrado, apertura y cierre)'],
        ['RF-04', 'Crear, modificar y cancelar reservas', 'Agenda del negocio: crear, reprogramar, cambiar estado'],
        ['RF-05', 'Panel con citas del día', 'Resumen: citas de hoy, próximas, estadísticas'],
        ['RF-06', 'Base de datos de clientes', 'CRUD de clientes con búsqueda'],
        ['RF-07', 'Historial de reservas', 'Ficha del cliente y filtros por fecha y estado'],
        ['RF-08', 'Consultar servicios disponibles', 'Directorio y página pública del negocio'],
        ['RF-09', 'Visualizar horarios libres', 'Cálculo de franjas disponibles por fecha y servicio'],
        ['RF-10', 'Solicitar una cita', 'Reserva en línea con confirmación'],
        ['RF-11', 'Consultar la reserva', 'Mis reservas (próximas e historial)'],
        ['RF-12', 'Cancelar dentro del margen', 'Cancelación hasta N horas antes (configurable)'],
        ['RF-13', 'Planes y prueba gratuita', 'Planes con límites; prueba de 14 días sin cobro'],
        ['RF-14', 'Impedir reservas incompatibles', 'Transacción con bloqueo y validación de solapamiento'],
        ['RF-15', 'Acceso controlado al servicio', 'Landing page como primera vista; panel solo con inicio de sesión y rol'],
    ], widths=[0.7, 2.6, 3.2], note='Elaboración propia a partir de la propuesta del proyecto.')
    table(doc, 'Requisitos no funcionales', ['ID', 'Atributo', 'Criterio y mecanismo'], [
        ['RNF-01', 'Seguridad', 'bcrypt, JWT, roles, validación, rate limiting, HTTPS, RDS y S3 privados'],
        ['RNF-02', 'Aislamiento multi-tenant', 'Ningún negocio accede a datos de otro (verificado con pruebas)'],
        ['RNF-03', 'Consistencia', 'Transacciones y bloqueo pesimista por negocio'],
        ['RNF-04', 'Usabilidad', 'Interfaz en español, responsive en móvil, tablet y escritorio'],
        ['RNF-05', 'Escalabilidad', 'API sin estado (JWT); opción de CDN con EnableCloudFront=true'],
        ['RNF-06', 'Mantenibilidad', 'Lint, pruebas automatizadas, migraciones versionadas, CI'],
        ['RNF-07', 'Portabilidad', 'Configuración por variables de entorno; infraestructura como código'],
        ['RNF-08', 'Costo', 'Instancias micro, Single-AZ, sin NAT Gateway; seguimiento de créditos'],
    ], widths=[0.8, 1.6, 4.1])

    # 7
    h1(doc, '7. Arquitectura tecnológica')
    para(doc, 'La solución se organiza en tres capas. El **frontend** es una aplicación de página única (SPA) construida con React 19 y Vite (Meta Open Source, s.f.; Vite, s.f.), compilada a archivos estáticos. El **backend** es una API REST en Node.js 22 con Express (OpenJS Foundation, s.f.-a), que concentra las reglas de negocio. La **capa de datos** usa MySQL 8.4 a través del ORM Prisma, que genera consultas parametrizadas y administra migraciones versionadas (Prisma Data, s.f.).')
    table(doc, 'Tecnologías seleccionadas y justificación', ['Componente', 'Tecnología', 'Justificación'], [
        ['Frontend', 'React 19, Vite 6, React Router 7', 'Componentes reutilizables; build estático servido por Nginx'],
        ['Backend', 'Node.js 22, Express 4', 'Despliegue sencillo en EC2; ecosistema maduro'],
        ['Validación', 'Zod', 'Esquemas declarativos con mensajes en español'],
        ['Datos', 'MySQL 8.4, Prisma 6', 'Compatible con Amazon RDS; migraciones y consultas seguras'],
        ['Autenticación', 'JWT, bcrypt', 'Sesión sin estado; hash adaptativo de contraseñas'],
        ['Pruebas', 'Vitest, Supertest, Testing Library, Playwright, Newman', 'Unidades, API, interfaz y flujo completo'],
        ['Servidor web', 'Nginx, Let\'s Encrypt, systemd', 'Proxy inverso, HTTPS gratuito y proceso administrado'],
        ['Infraestructura', 'AWS CloudFormation', 'Infraestructura reproducible y versionada'],
        ['CI/CD', 'GitHub Actions', 'Integrado con el repositorio, los Pull Requests y los entornos'],
    ], widths=[1.2, 2.2, 3.1])
    para(doc, 'Entre las decisiones relevantes se cuentan: servir frontend y API bajo el mismo dominio —Nginx entrega la SPA y reenvía `/api/*` a Node.js—, lo que evita problemas de CORS; almacenar las horas de las reservas como hora local del negocio junto con su zona horaria; y usar un bloqueo pesimista sobre la fila del negocio para serializar las reservas concurrentes, dado que MySQL no ofrece índices únicos parciales que resuelvan solapamientos de duración variable (Oracle, s.f.).')

    # 8
    h1(doc, '8. Del modelo propuesto al modelo implementado')
    para(doc, f'La propuesta ({PROPUESTA}) planteaba seis servicios: Amazon EC2, Amazon RDS, Amazon S3, Amazon CloudFront, Amazon Route 53 y AWS IAM. Antes de desplegar se ejecutó un script de verificación de solo lectura en el laboratorio, que reveló que la cuenta de AWS Academy **deniega todas las acciones de CloudFront** (incluidas las de consulta). En consecuencia, la plantilla de CloudFormation se amplió con el parámetro EnableCloudFront: con el valor true conserva la arquitectura con CDN, y con false —el usado en el despliegue real— Nginx en EC2 sirve el frontend y la API por HTTPS con un certificado de Let\'s Encrypt (Internet Security Research Group [ISRG], s.f.). La Tabla 4 resume la adaptación.')
    table(doc, 'Adaptación de la arquitectura propuesta a la implementada', ['Servicio', 'Propuesta', 'Implementado y motivo'], [
        ['Amazon EC2', 'Servidor backend', 't3.micro con Nginx + Node.js 22; IP elástica 52.54.96.26'],
        ['Amazon RDS', 'Base de datos relacional', 'MySQL 8.4.11 db.t3.micro, Single-AZ, privada y cifrada (8.4 LTS evita el soporte extendido de 8.0)'],
        ['Amazon S3', 'Archivos e imágenes', 'Bucket privado para logos con URLs prefirmadas'],
        ['Amazon CloudFront', 'CDN', 'No desplegado: bloqueado por el laboratorio. Disponible en la plantilla'],
        ['Amazon Route 53', 'DNS del dominio', 'No desplegado: sin dominio propio; nombre público en sslip.io (dominio personalizado pendiente)'],
        ['AWS IAM', 'Mínimo privilegio', 'LabInstanceProfile (el laboratorio no permite crear roles); políticas objetivo documentadas'],
        ['Añadidos', '—', 'VPC propia, grupos de seguridad, Let\'s Encrypt y CloudFormation'],
    ], widths=[1.2, 1.5, 3.8], note='Elaboración propia. Verificación de servicios en docs/evidencias/verificacion-servicios.txt del repositorio.')

    # 9
    h1(doc, '9. Arquitectura AWS desplegada')
    para(doc, f'La Figura 1 muestra la infraestructura que realmente se creó en la región us-east-1 (stack agenda-facil en estado CREATE_COMPLETE). Los usuarios acceden por HTTPS a {URL}; el nombre lo resuelve el servicio DNS público sslip.io hacia la IP elástica de la instancia. La instancia Amazon EC2 (AWS, s.f.-e) se ubica en una subred pública de una VPC propia; su grupo de seguridad admite los puertos 80 (que solo redirige a HTTPS), 443 y 22 (administración y despliegue, solo con llave). Nginx entrega los archivos de React y reenvía las rutas /api/* a Node.js, que se ejecuta como servicio de systemd con un usuario sin privilegios.')
    para(doc, 'La base de datos Amazon RDS for MySQL (AWS, s.f.-f) reside en dos subredes privadas sin ruta a Internet y solo acepta conexiones en el puerto 3306 desde el grupo de seguridad de la instancia; la API se conecta con un usuario de aplicación limitado a la base agenda_facil. Los logos se guardan en un bucket de Amazon S3 privado (AWS, s.f.-g) y se entregan mediante URLs prefirmadas. La instancia obtiene credenciales temporales del perfil LabInstanceProfile (AWS, s.f.-d). No se creó NAT Gateway ni instancias Multi-AZ para contener el costo. Toda la infraestructura se define en una plantilla de AWS CloudFormation (AWS, s.f.-h).')
    figure(doc, 'Arquitectura de Agenda Fácil desplegada en AWS Academy Learner Lab', img['07-arquitectura-aws-desplegada'], 6.3, 'Elaboración propia. Solo incluye servicios implementados y verificados el 28 de noviembre de 2026.')
    table(doc, 'Recursos desplegados y su función', ['Recurso', 'Configuración verificada', 'Función'], [
        ['VPC 10.20.0.0/16', '2 subredes públicas, 2 privadas, Internet Gateway, sin NAT', 'Aislamiento de red'],
        ['EC2 agenda-facil-api', 't3.micro, Amazon Linux 2023, IMDSv2, EBS gp3 cifrado', 'Nginx + API Node.js'],
        ['IP elástica', '52.54.96.26', 'Dirección pública fija'],
        ['RDS agenda-facil-db', 'MySQL 8.4.11, db.t3.micro, Single-AZ, 20 GB cifrados, no pública', 'Persistencia de datos'],
        ['S3 de logos', 'Bloqueo de acceso público, cifrado, versionado', 'Archivos de los negocios'],
        ['Grupos de seguridad', 'Web: 80, 443, 22. Base de datos: 3306 solo desde web', 'Cortafuegos'],
        ['Certificado TLS', 'Let\'s Encrypt, vence el 25/02/2027, renovación automática', 'HTTPS'],
    ], widths=[1.6, 3.2, 1.7], note='Valores obtenidos con la CLI de AWS (docs/evidencias/despliegue-aws.md).')

    # 10
    h1(doc, '10. Diagramas')
    para(doc, 'Además del diagrama de la arquitectura desplegada, se elaboraron el diagrama de la arquitectura objetivo con CloudFront (Figura 2), el de componentes (Figura 3), el de secuencia del flujo de reservas (Figura 4), el del pipeline de CI/CD (Figura 5) y el del flujo de ramas de Git (Figura 6). Sus fuentes están versionadas en formato Mermaid en docs/diagramas.')
    figure(doc, 'Arquitectura objetivo con CloudFront (EnableCloudFront=true)', img['01-arquitectura-aws'], 6.0, 'Elaboración propia. No desplegada: el laboratorio bloquea CloudFront.')
    figure(doc, 'Diagrama de componentes del frontend y el backend', img['02-componentes'], 6.3, 'Elaboración propia.')
    figure(doc, 'Flujo de una reserva con control de concurrencia', img['03-flujo-reservas'], 6.0, 'Elaboración propia. El candado por negocio obliga a que reservas simultáneas se procesen una a una.')
    figure(doc, 'Pipeline de integración y despliegue continuos', img['05-pipeline-cicd'], 6.3, 'Elaboración propia a partir de los archivos ci.yml y deploy.yml.')
    figure(doc, 'Flujo de ramas de Git', img['06-flujo-git'], 6.3, 'Elaboración propia.')

    # 11
    h1(doc, '11. Modelo de base de datos')
    para(doc, 'El modelo relacional (Figura 7) consta de siete entidades. **Plans** define los límites de cada plan; **Users** almacena las cuentas con su rol (administrador de negocio o cliente) y el hash de la contraseña; **Businesses** contiene el perfil, la zona horaria, el intervalo de franjas, el margen de cancelación, el plan y la fecha de fin de la prueba; **Services**, **BusinessHours** y **Clients** pertenecen a un negocio; y **Reservations** relaciona negocio, servicio y cliente con hora de inicio, hora de fin, estado y precio al momento de reservar.')
    para(doc, 'Se definieron claves foráneas con reglas de borrado coherentes, restricciones únicas (correo de usuario, slug del negocio, nombre de servicio por negocio, un horario por día y negocio, cliente por correo y negocio) e índices compuestos por negocio y fecha. El esquema se versiona con migraciones de Prisma; en el despliegue, el workflow aplica las migraciones pendientes en RDS antes de activar cada versión.')
    figure(doc, 'Modelo entidad-relación', img['04-modelo-entidad-relacion'], 6.0, 'Elaboración propia a partir de backend/prisma/schema.prisma.', max_height=7.6)

    # 12
    h1(doc, '12. Descripción del frontend React')
    para(doc, 'El frontend no usa Next.js: es una SPA de React con Vite, cuyo archivo de configuración es frontend/vite.config.js (servidor de desarrollo con proxy hacia la API, carpeta de compilación dist y pruebas con Vitest). El punto de entrada es frontend/index.html, que carga src/main.jsx; este monta los proveedores de enrutamiento, notificaciones y sesión, y el componente principal src/App.jsx define las rutas. Los componentes reutilizables están en src/components, las pantallas en src/pages, el cliente HTTP en src/api/client.js, los estilos en src/styles/global.css y los archivos estáticos en public.')
    table(doc, 'Archivos y carpetas principales del frontend', ['Ruta', 'Función'], [
        ['index.html', 'HTML base y punto de montaje (div#root)'],
        ['vite.config.js', 'Configuración de Vite: desarrollo, proxy, build y pruebas'],
        ['src/main.jsx', 'Punto de entrada: BrowserRouter, ToastProvider, AuthProvider'],
        ['src/App.jsx', 'Componente principal: rutas públicas y protegidas'],
        ['src/components/', 'UI reutilizable, Layouts y RequireRole (control de acceso)'],
        ['src/pages/', 'Landing, autenticación, cliente y panel del negocio'],
        ['src/api/client.js', 'Peticiones a /api con token JWT y manejo de errores'],
        ['src/styles/global.css', 'Estilos globales y responsive'],
        ['public/', 'Archivos estáticos (favicon)'],
    ], widths=[1.8, 4.7])
    para(doc, 'Se construyeron componentes reutilizables —botones, campos con mensajes de error accesibles, modales, diálogos de confirmación, insignias de estado, tarjetas de indicadores y un selector de franjas horarias— y dos contextos de React: sesión y notificaciones. El diseño es responsive: en móvil la barra lateral se convierte en menú desplegable y las tablas en tarjetas. Las Figuras 8 a 13 son capturas de la aplicación desplegada.')
    figure(doc, 'Primera vista en producción: landing page', img['prod-00-primera-vista-landing'], 6.0, 'Captura de producción tomada el 28 de noviembre de 2026 con un navegador sin sesión.')
    figure(doc, 'Panel del negocio: resumen del día', img['prod-13-dashboard-escritorio'], 6.0, PROD)
    figure(doc, 'Portal de reservas: selección de servicio, fecha y hora', img['prod-06-reserva-disponibilidad'], 6.0, PROD)
    figure(doc, 'Agenda del negocio con filtros y acciones', img['prod-09-agenda-negocio'], 6.0, PROD)
    figure(doc, 'Ficha del cliente con historial de reservas', img['prod-12-ficha-cliente-historial'], 6.0, PROD)
    figure(doc, 'Vista móvil del panel del negocio', img['prod-14-dashboard-movil'], 2.6, PROD + ' Viewport de 390 × 844 píxeles.', max_height=5.2)

    # 13
    h1(doc, '13. Descripción del backend')
    para(doc, 'La API REST expone rutas públicas (salud, planes, directorio, detalle y disponibilidad de un negocio), de autenticación (registro, inicio de sesión, perfil y cambio de contraseña), de cliente (crear, consultar y cancelar reservas) y de negocio (perfil, configuración, plan, logo, horarios, servicios, clientes, reservas, disponibilidad y panel). Las respuestas de error siguen un formato uniforme con código, mensaje y detalle por campo, con un máximo de 20 detalles para evitar respuestas desproporcionadas.')
    para(doc, 'La regla crítica se implementa en el servicio de reservas: dentro de una transacción se ejecuta SELECT … FOR UPDATE sobre la fila del negocio, se validan las reglas (servicio activo, día abierto, dentro del horario, no en el pasado, como máximo 90 días adelante y coincidencia con la grilla de franjas) y se comprueba que no exista otra reserva activa que se solape; solo entonces se inserta. Si dos clientes reservan a la vez, la segunda transacción espera y recibe un error 409 de horario no disponible (Oracle, s.f.). Cada cliente puede tener como máximo cinco reservas futuras confirmadas por negocio. El identificador del negocio nunca se recibe del cliente: se obtiene del usuario autenticado y todas las consultas se filtran por él.')

    # 14
    h1(doc, '14. Seguridad y control de acceso')
    para(doc, f'La primera vista del servicio es una landing page (Figura 8); el panel del negocio exige iniciar sesión con el rol correspondiente. En producción, al abrir {URL}/panel sin sesión, la aplicación redirige al formulario de inicio de sesión (Figura 14). La protección efectiva está en la API: sin token responde 401 y con un rol incorrecto 403, lo que se verificó contra producción. Los controles se seleccionaron a partir de los riesgos más frecuentes en aplicaciones web (OWASP Foundation, 2021) y de las recomendaciones de Express (OpenJS Foundation, s.f.-b) y de IAM (AWS, s.f.-d).')
    figure(doc, 'Acceso a /panel sin sesión: redirección al inicio de sesión', img['prod-18-panel-sin-sesion-redirige-login'], 6.0, 'Captura de producción tomada el 28 de noviembre de 2026 con un navegador sin sesión.')
    table(doc, 'Controles de seguridad implementados', ['Riesgo', 'Control', 'Verificación'], [
        ['Exposición de contraseñas', 'bcrypt con 12 rondas (Provos y Mazières, 1999)', 'Prueba automatizada del hash'],
        ['Suplantación de sesión', 'JWT con emisor, audiencia y expiración de 8 h (Jones et al., 2015)', 'Pruebas 401; producción 401'],
        ['Escalada de privilegios', 'Autorización por rol en cada grupo de rutas', 'Pruebas 403; producción 403'],
        ['Acceso entre negocios', 'Filtro por negocio derivado del token', '6 pruebas de aislamiento'],
        ['Inyección SQL', 'Consultas parametrizadas de Prisma', 'Revisión de código'],
        ['Entradas maliciosas', 'Zod, límite de 100 KB, tipo real de imágenes, máximo 20 errores de validación', 'Pruebas 400; producción: 30 000 filas → 244 bytes'],
        ['Fuerza bruta', 'Rate limiting: 20 intentos / 15 min por IP', 'Prueba 429'],
        ['Secreto JWT débil', 'El servidor no inicia en producción con secretos de ejemplo', 'Prueba unitaria'],
        ['Transporte', 'HTTPS (Let\'s Encrypt), HSTS, redirección 301, cabeceras de seguridad', 'Verificado en producción'],
        ['Red', 'RDS privada; SG de base de datos solo desde la instancia; IMDSv2', 'Verificado con la CLI de AWS'],
        ['Secretos', 'Secretos del entorno production de GitHub; archivo de entorno 600 en el servidor', 'Escaneo del repositorio'],
    ], widths=[1.5, 3.0, 2.0])
    para(doc, 'Riesgos residuales reconocidos: la conexión entre la API y RDS no exige TLS (require_secure_transport desactivado por defecto, aunque el tráfico circula por la red privada); el puerto 22 está abierto a Internet para permitir el despliegue desde GitHub Actions (solo con llave); el token se guarda en el almacenamiento local del navegador (mitigado con expiración corta y el escape automático de React); y el perfil del laboratorio tiene permisos más amplios que los diseñados.')

    # 15
    h1(doc, '15. Implementación de CI/CD')
    para(doc, 'Se configuraron dos flujos de GitHub Actions (GitHub, s.f.-b). El flujo **CI** (ci.yml) se ejecuta en cada Pull Request y en cada push a develop y main con permisos de solo lectura y cuatro trabajos: backend (instalación, lint, build y 50 pruebas contra un contenedor MySQL 8.4), frontend (instalación, lint, 10 pruebas y build publicado como artefacto), infraestructura (cfn-lint, ShellCheck y actionlint) y una prueba de extremo a extremo con Playwright (Microsoft, s.f.) que depende de los dos primeros. La rama main está protegida: solo admite cambios por Pull Request con los cuatro trabajos en verde.')
    para(doc, 'El flujo **Deploy** (deploy.yml) se activa cuando CI termina con éxito por un push a main. Su primer trabajo, sin acceso a secretos, comprueba que el commit pertenezca a main y no provenga de un fork. Los trabajos de backend y frontend usan el entorno production, que exige la aprobación manual del propietario y solo acepta la rama main. El backend se empaqueta, se copia por SSH a la instancia y un script crea una nueva versión, instala dependencias, aplica las migraciones en RDS, cambia un enlace simbólico, reinicia el servicio y verifica el endpoint de salud; si falla, restaura la versión anterior. El frontend se compila y se publica en la instancia de forma atómica. La ejecución Deploy #3 terminó con sus tres trabajos en verde (Anexo B).')

    # 16
    h1(doc, '16. Estrategia Git/GitHub y modalidad individual')
    para(doc, 'Se adoptó un flujo con una rama de producción (main), una de integración (develop) y ramas de trabajo con prefijo por tipo: feature/ (frontend, backend, database, aws-deployment, documentation), fix/ (auditoría, seguridad de despliegue, validación, despliegue sin CloudFront) y docs/ (evidencias). Los cambios llegan a develop mediante Pull Requests con descripción y CI en verde, y develop se integra en main al publicar una versión (GitHub, s.f.-a; Chacon y Straub, 2014). Los mensajes de commit siguen la convención tipo(área): descripción. Hasta la fecha se integraron diez Pull Requests.')
    para(doc, 'Por tratarse de un proyecto **individual**, el repositorio tiene un único colaborador y los Pull Requests no cuentan con revisión de otro integrante; como control sustituto se exige CI obligatorio y aprobación manual de producción. El desarrollo contó con asistencia de una herramienta de inteligencia artificial (Claude Code) dirigida por el estudiante: el historial lo refleja con transparencia (26 commits con la identidad del asistente y 14 con la cuenta del estudiante, incluidas las integraciones de los Pull Requests) y no se modificó ni se atribuyó trabajo a terceros. Los criterios de la rúbrica que requieren adaptación por la modalidad individual se detallan en docs/MODALIDAD_INDIVIDUAL.md.')

    # 17
    h1(doc, '17. Proceso de despliegue')
    para(doc, 'El despliegue se realizó el 28 de noviembre de 2026 en AWS Academy Learner Lab (AWS, s.f.-a) con los siguientes pasos:')
    bullets(doc, [
        'Inicio del laboratorio y ejecución del script de verificación de servicios (solo lectura), que detectó el bloqueo de CloudFront.',
        'Creación de la infraestructura con CloudFormation y EnableCloudFront=false; la instancia se configuró automáticamente con Node.js 22, Nginx y un servicio de systemd.',
        'Creación en RDS, desde la instancia, de un usuario de aplicación con privilegios limitados.',
        'Emisión del certificado de Let\'s Encrypt con un script propio, redirección a HTTPS y renovación automática (con simulacro de renovación exitoso).',
        'Registro de secretos y variables en el entorno production de GitHub (sin credenciales de AWS) y despliegue con el flujo Deploy tras la aprobación del propietario.',
        'Verificación: endpoint de salud con la base de datos operativa, prueba E2E y verificación técnica contra la URL pública.',
    ])
    para(doc, 'Durante el primer despliegue se detectó y corrigió un defecto en la comprobación final del frontend, y en la siguiente ejecución todos los trabajos terminaron correctamente. El **dominio personalizado está pendiente**: el nombre actual (52-54-96-26.sslip.io) es un servicio DNS gratuito que incluye la IP, no un dominio propio. El procedimiento para conectar un dominio del GitHub Student Developer Pack (registros A hacia la IP elástica y certificado con el mismo script) está preparado y probado.')

    # 18
    h1(doc, '18. Pruebas y resultados')
    para(doc, 'Las pruebas se ejecutaron entre el 27 y el 28 de noviembre de 2026 con Node.js 22 y MySQL 8.4. Las pruebas de backend crean una base de datos temporal en cada ejecución y la eliminan al terminar, de modo que nunca usan la base de producción. Los resultados se resumen en la Tabla 8 y los registros completos están en docs/evidencias.')
    table(doc, 'Resultados de las pruebas ejecutadas', ['Tipo de prueba', 'Herramienta', 'Alcance', 'Resultado'], [
        ['Unitarias y de API', 'Vitest + Supertest (Vitest, s.f.)', 'Autenticación, roles, servicios, horarios, disponibilidad, reservas, concurrencia, aislamiento, validación, rate limiting, archivos', '50 de 50 aprobadas'],
        ['Componentes', 'Vitest + Testing Library', 'Validaciones, formato, login, rutas protegidas, selector de franjas', '10 de 10 aprobadas'],
        ['Extremo a extremo (local)', 'Playwright (Chromium)', 'Flujo MVP completo y responsive', '18 de 18 pasos'],
        ['Extremo a extremo (producción)', 'Playwright contra la URL pública', 'Mismo flujo sobre AWS', '18 de 18 pasos'],
        ['Verificación técnica (producción)', 'Script Node.js', 'S3 y URL prefirmada, 401/403, validación, cabeceras, HTTPS, salud', '11 de 11'],
        ['API (colección)', 'Postman / Newman', '42 peticiones en orden de uso real', '55 de 55 aserciones'],
        ['Concurrencia (mutación)', 'Vitest', 'Misma prueba con el bloqueo desactivado', 'Falla: 9 de 10 duplicadas'],
        ['Infraestructura', 'cfn-lint, ShellCheck, actionlint', 'Plantilla, scripts y workflows', '0 errores (1 advertencia documentada)'],
        ['Integración continua', 'GitHub Actions', 'Los 4 trabajos de CI en cada Pull Request', 'En verde en los 10 Pull Requests'],
    ], widths=[1.3, 1.4, 2.5, 1.3])
    para(doc, 'La prueba de concurrencia envía diez solicitudes simultáneas para el mismo horario: con el bloqueo, exactamente una se confirma y nueve reciben 409. Al desactivar el bloqueo la prueba falla porque se crean nueve reservas duplicadas, lo que demuestra que detecta el defecto que pretende evitar. En producción, la base de datos registró operaciones reales de negocios, clientes, servicios, reservas y logos durante las pruebas.')

    # 19
    h1(doc, '19. Análisis de costos')
    para(doc, 'La propuesta estimó con AWS Pricing Calculator (AWS, s.f.-b) USD 43.26 mensuales, incluidos CloudFront (USD 11.00) y Route 53 (USD 0.50), que finalmente no se desplegaron. La Tabla 9 presenta una estimación aproximada de la infraestructura realmente creada con precios bajo demanda de us-east-1; debe recalcularse en la calculadora antes de usarse en una decisión.')
    table(doc, 'Estimación aproximada del costo de la infraestructura desplegada', ['Recurso', 'USD por hora (aprox.)', 'Observación'], [
        ['EC2 t3.micro', '0.0104', 'El laboratorio la detiene al terminar cada sesión'],
        ['RDS db.t3.micro Single-AZ', '0.017', 'Conviene detenerla cuando no se usa'],
        ['Dirección IPv4 pública (IP elástica)', '0.005', 'Se cobra también con la instancia detenida'],
        ['Almacenamiento EBS y RDS', '≈ 0.005', 'Se cobra siempre'],
        ['S3 y transferencia', '≈ 0', 'Volumen de demostración'],
        ['**Total con todo encendido**', '**≈ 0.037 (≈ 0.90 por día)**', 'Frente a USD 43.26 al mes de la propuesta'],
    ], widths=[2.2, 1.6, 2.7], note='Elaboración propia. En AWS Academy el consumo se descuenta de un crédito de USD 50; el contador mostró USD 0.8 usados tras el despliegue.')

    # 20
    h1(doc, '20. Limitaciones de AWS Academy')
    table(doc, 'Limitaciones encontradas y alternativas aplicadas', ['Limitación', 'Impacto', 'Alternativa'], [
        ['CloudFront denegado', 'No se puede usar la CDN propuesta', 'EnableCloudFront=false: Nginx + Let\'s Encrypt en EC2'],
        ['No se pueden crear roles IAM', 'No se aplica el rol de mínimo privilegio diseñado', 'LabInstanceProfile; políticas objetivo documentadas'],
        ['Credenciales temporales por sesión', 'Caducan al terminar la sesión', 'El despliegue no necesita credenciales de AWS en GitHub'],
        ['Sesiones de duración limitada', 'La aplicación no está disponible fuera de la sesión', 'IP elástica; iniciar el laboratorio antes de la revisión'],
        ['Créditos limitados (USD 50)', 'Riesgo de agotar el presupuesto', 'Recursos micro, Single-AZ, sin NAT; seguimiento del consumo'],
        ['Sin registro de dominios', 'No se adquiere el dominio en AWS', 'Dominio del GitHub Student Developer Pack (pendiente)'],
    ], widths=[1.9, 2.1, 2.5])

    # 21
    h1(doc, '21. Estado del proyecto')
    table(doc, 'Estado de cada componente', ['Componente', 'Diseñado', 'Desarrollado', 'Probado', 'Desplegado'], [
        ['Frontend React', 'Sí', 'Sí', 'Sí (local y producción)', 'Sí'],
        ['API REST y reglas de negocio', 'Sí', 'Sí', 'Sí (local y producción)', 'Sí'],
        ['Base de datos y migraciones', 'Sí', 'Sí', 'Sí (MySQL 8.4 y RDS)', 'Sí'],
        ['CI (GitHub Actions)', 'Sí', 'Sí', 'Ejecutado en GitHub', '—'],
        ['CD con aprobación de producción', 'Sí', 'Sí', 'Deploy #3 en verde', 'Sí'],
        ['Infraestructura AWS (CloudFormation)', 'Sí', 'Sí', 'cfn-lint + CREATE_COMPLETE', 'Sí (sin CloudFront)'],
        ['Control de acceso (landing + login)', 'Sí', 'Sí', 'Sí (producción)', 'Sí'],
        ['Dominio personalizado', 'Sí', 'Script preparado y probado', 'No', 'Pendiente'],
        ['Pagos, notificaciones, multiusuario', 'Trabajo futuro', 'No', 'No', 'No'],
    ], widths=[2.3, 0.9, 1.3, 1.3, 0.8])
    para(doc, '**Pendiente:** obtener y conectar el dominio personalizado; completar los datos personales de la portada; capturas de la consola de AWS; autorización del docente para los criterios que dependen de un equipo; verificación de los enlaces de las referencias.')

    # 22
    h1(doc, '22. Conclusiones')
    para(doc, 'Se desarrolló y desplegó una versión funcional de Agenda Fácil que cubre las funcionalidades para negocios y clientes de la propuesta. La regla más crítica —impedir reservas incompatibles— se resolvió en el backend con transacciones y un bloqueo por negocio, y se comprobó con una prueba de concurrencia cuya validez se demostró desactivando el mecanismo. El aislamiento entre negocios y el control de acceso se verificaron tanto en pruebas como en producción.')
    para(doc, 'La arquitectura se adaptó a las condiciones reales del laboratorio sin perder sus propiedades esenciales: la base de datos sigue aislada en subredes privadas, los archivos en almacenamiento privado y todo el tráfico de los usuarios cifrado. Verificar los servicios antes de desplegar permitió detectar el bloqueo de CloudFront y resolverlo mediante un parámetro de la plantilla, sin duplicar la infraestructura. La automatización con GitHub Actions, protegida por una aprobación manual y con vuelta atrás automática, hizo que cada publicación fuera repetible y verificable.')
    para(doc, 'Como trabajo futuro quedan el dominio personalizado, TLS obligatorio entre la API y RDS, recordatorios por WhatsApp o correo, pasarela de pagos, múltiples usuarios por negocio y escalado horizontal con un balanceador de carga.')

    # Referencias
    page_break(doc)
    h1(doc, 'Referencias')
    refs = [
        'Amazon Web Services. (s.f.-a). *AWS Academy*. https://aws.amazon.com/training/awsacademy/',
        'Amazon Web Services. (s.f.-b). *AWS Pricing Calculator*. https://calculator.aws/',
        'Amazon Web Services. (s.f.-c). *AWS Well-Architected Framework*. https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html',
        'Amazon Web Services. (s.f.-d). *Security best practices in IAM*. AWS Identity and Access Management User Guide. https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html',
        'Amazon Web Services. (s.f.-e). *What is Amazon EC2?* Amazon EC2 User Guide. https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/concepts.html',
        'Amazon Web Services. (s.f.-f). *What is Amazon Relational Database Service (Amazon RDS)?* Amazon RDS User Guide. https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Welcome.html',
        'Amazon Web Services. (s.f.-g). *What is Amazon S3?* Amazon Simple Storage Service User Guide. https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html',
        'Amazon Web Services. (s.f.-h). *What is AWS CloudFormation?* AWS CloudFormation User Guide. https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/Welcome.html',
        'American Psychological Association. (2020). *Publication manual of the American Psychological Association* (7.ª ed.). https://doi.org/10.1037/0000165-000',
        'Chacon, S., y Straub, B. (2014). *Pro Git* (2.ª ed.). Apress. https://git-scm.com/book/es/v2',
        'GitHub. (s.f.-a). *Collaborating with pull requests*. GitHub Docs. https://docs.github.com/en/pull-requests/collaborating-with-pull-requests',
        'GitHub. (s.f.-b). *GitHub Actions documentation*. GitHub Docs. https://docs.github.com/en/actions',
        'Internet Security Research Group. (s.f.). *Let\'s Encrypt documentation*. https://letsencrypt.org/docs/',
        'Jones, M., Bradley, J., y Sakimura, N. (2015). *JSON Web Token (JWT)* (RFC 7519). Internet Engineering Task Force. https://doi.org/10.17487/RFC7519',
        'Meta Open Source. (s.f.). *React documentation*. https://react.dev/learn',
        'Microsoft. (s.f.). *Playwright documentation*. https://playwright.dev/docs/intro',
        'OpenJS Foundation. (s.f.-a). *Node.js v22 documentation*. https://nodejs.org/docs/latest-v22.x/api/',
        'OpenJS Foundation. (s.f.-b). *Production best practices: Security*. Express. https://expressjs.com/en/advanced/best-practice-security.html',
        'Oracle. (s.f.). *Locking reads*. MySQL 8.4 Reference Manual. https://dev.mysql.com/doc/refman/8.4/en/innodb-locking-reads.html',
        'OWASP Foundation. (2021). *OWASP Top 10:2021*. https://owasp.org/Top10/',
        'Prisma Data. (s.f.). *Prisma ORM documentation*. https://www.prisma.io/docs/orm',
        '*Propuesta de proyecto SaaS: Agenda Fácil*. (2026). [Documento no publicado].',
        'Provos, N., y Mazières, D. (1999). A future-adaptable password scheme. En *Proceedings of the 1999 USENIX Annual Technical Conference*. USENIX Association. https://www.usenix.org/legacy/events/usenix99/provos/provos.pdf',
        'Vite. (s.f.). *Getting started*. https://vite.dev/guide/',
        'Vitest. (s.f.). *Getting started*. https://vitest.dev/guide/',
    ]
    for r in refs:
        reference(doc, r)

    # Anexos
    page_break(doc)
    h1(doc, 'Anexo A. Capturas adicionales de la aplicación en producción')
    para(doc, f'Capturas generadas por la prueba E2E automatizada contra {URL} el 28 de noviembre de 2026.', indent=False)
    figure(doc, 'Gestión de servicios', img['prod-04-servicios'], 6.0)
    figure(doc, 'Configuración de horarios de atención', img['prod-05-horarios'], 6.0)
    figure(doc, 'Creación de una cita desde el panel del negocio', img['prod-10-nueva-cita-modal'], 6.0)
    figure(doc, 'Reserva confirmada por el cliente', img['prod-07-reserva-confirmada'], 6.0)
    figure(doc, 'Mis reservas del cliente', img['prod-11-mis-reservas'], 6.0)
    figure(doc, 'Validaciones del formulario de registro', img['prod-02-registro-validaciones'], 5.5)
    figure(doc, 'Agenda en tablet', img['prod-16-agenda-tablet'], 4.5)
    figure(doc, 'Horarios ocupados vistos por otro cliente (móvil)', img['prod-08-reserva-movil-horarios-ocupados'], 2.6, max_height=5.2)

    page_break(doc)
    h1(doc, 'Anexo B. Evidencias de GitHub y del despliegue')
    para(doc, 'Capturas de las páginas públicas del repositorio https://github.com/dylanfuentes0330/agenda-facil tomadas el 28 de noviembre de 2026.', indent=False)
    figure(doc, 'Ejecución Deploy #3 con sus tres trabajos en verde y las aprobaciones del entorno production', img['gh-07-deploy-3-verde'], 6.0)
    figure(doc, 'Ejecuciones de GitHub Actions', img['gh-06-actions'], 6.0)
    figure(doc, 'Pull Requests integrados', img['gh-02-pull-requests-cerrados'], 6.0)
    figure(doc, 'Ramas del repositorio', img['gh-04-ramas'], 6.0)
    return doc


def to_pdf(docx_path):
    """PDF con LibreOffice o, en Windows, con Microsoft Word (automatización COM por PowerShell)."""
    pdf = docx_path.with_suffix('.pdf')
    soffice = shutil.which('soffice') or shutil.which('libreoffice')
    if soffice:
        subprocess.run([soffice, '--headless', '--convert-to', 'pdf', '--outdir', str(docx_path.parent), str(docx_path)],
                       check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return pdf
    if os.name == 'nt' and shutil.which('powershell'):
        script = (
            "$ErrorActionPreference='Stop'; $w = New-Object -ComObject Word.Application; $w.Visible = $false; "
            f"$d = $w.Documents.Open('{docx_path}', $false, $true); "
            f"$d.ExportAsFixedFormat('{pdf}', 17); $d.Close($false); $w.Quit()"
        )
        subprocess.run(['powershell', '-NoProfile', '-Command', script], check=True)
        return pdf
    print('No hay LibreOffice ni Microsoft Word: se omite el PDF.')
    return None


def pages_from_pdf(pdf):
    """Página en que empieza cada sección, tabla y figura (para la tabla de contenido y las listas)."""
    import pymupdf
    doc = pymupdf.open(str(pdf))
    texts = [[ln.strip() for ln in page.get_text().splitlines()] for page in doc]
    doc.close()
    found = {}
    start = 2  # omite portada y tabla de contenido
    for title in ('Lista de tablas', 'Lista de figuras'):
        for i, lines in enumerate(texts[1:], start=2):
            if title in lines:
                found[title] = str(i)
                break
    body_start = max(int(found.get('Lista de figuras', start)), start)
    for num, title in TOC:
        if title in found:
            continue
        needle = f'{num}. {title}' if num else title
        for i, lines in enumerate(texts[body_start:], start=body_start + 1):
            if any(ln == needle or ln.startswith(needle) for ln in lines):
                found[title] = str(i)
                break

    def captions(prefix, titles):
        out = []
        for n, t in enumerate(titles, start=1):
            pg = '00'
            for i, lines in enumerate(texts[body_start:], start=body_start + 1):
                if f'{prefix} {n}' in lines:
                    pg = str(i)
                    break
            out.append((t, pg))
        return out

    found['__tablas__'] = captions('Tabla', list(TABLAS))
    found['__figuras__'] = captions('Figura', list(FIGURAS))
    return found


def main():
    with tempfile.TemporaryDirectory() as tmp:
        img = prepare_images(tmp)
        build(img).save(DOCX)
        pdf = to_pdf(DOCX)
        if pdf:
            # Primera pasada con listas provisionales; segunda y tercera con las listas completas (estabiliza páginas)
            pages = pages_from_pdf(pdf)
            for _ in range(2):
                build(img, pages).save(DOCX)
                to_pdf(DOCX)
                pages = pages_from_pdf(pdf)
            build(img, pages).save(DOCX)
            to_pdf(DOCX)
            missing = [t for _, t in TOC if t not in pages]
            print('Secciones sin ubicar:', missing, '| tablas:', len(TABLAS), '| figuras:', len(FIGURAS))
    print('Generado:', DOCX, DOCX.with_suffix('.pdf'))


if __name__ == '__main__':
    main()
