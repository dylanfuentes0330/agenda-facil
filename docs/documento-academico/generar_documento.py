#!/usr/bin/env python3
"""Genera el documento académico de Agenda Fácil en formato APA 7 (DOCX) y su versión PDF.

Uso (desde la raíz del repositorio):
    python3 docs/documento-academico/generar_documento.py
Requisitos: python-docx, Pillow y LibreOffice (soffice) para el PDF.

Los datos del equipo (integrantes, docente, curso, institución, fecha) se completan en el
diccionario PORTADA. Mientras contengan corchetes, aparecen resaltados como pendientes.
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
    'integrantes': '[Nombre completo del integrante 1], [Nombre completo del integrante 2], [Nombre completo del integrante 3] y [Nombre completo del integrante 4]',
    'institucion': '[Facultad / Programa], [Nombre de la institución]',
    'curso': '[Código y nombre del curso]',
    'docente': '[Nombre del docente]',
    'fecha': '[Fecha de entrega]',
}

FONT = 'Times New Roman'
_fig = 0
_tab = 0


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
        elif part.startswith('[') and part != '[Documento no publicado]':
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
        dst = Path(tmp) / (src.stem + '.jpg')
        im.save(dst, quality=88)
        return dst

    for name, ratio, width in [
        ('01-landing-escritorio', 0.75, 1800), ('02-registro-validaciones', 0.9, 1800), ('04-servicios', 0.66, 1800),
        ('05-horarios', 0.66, 1800), ('06-reserva-disponibilidad', 0.75, 1800), ('09-agenda-negocio', 0.66, 1800),
        ('10-nueva-cita-modal', 0.66, 1800), ('11-mis-reservas', 0.66, 1800), ('12-ficha-cliente-historial', 0.66, 1800),
        ('13-dashboard-escritorio', 0.66, 1800), ('16-agenda-tablet', 1.2, 1400), ('14-dashboard-movil', 2.0, 780),
        ('08-reserva-movil-horarios-ocupados', 2.0, 780), ('15-menu-movil', 2.0, 780)]:
        out[name] = crop(cap / f'{name}.png', ratio, width)
    for d in ['01-arquitectura-aws', '02-componentes', '03-flujo-reservas', '04-modelo-entidad-relacion', '05-pipeline-cicd', '06-flujo-git']:
        out[d] = crop(dia / f'{d}.png', 10, 2400)
    return out


# ----------------------------------------------------------------------------- contenido
TOC = [
    ('1', 'Introducción'), ('2', 'Planteamiento del problema'), ('3', 'Justificación'), ('4', 'Objetivos'),
    ('5', 'Alcance del proyecto'), ('6', 'Requisitos funcionales y no funcionales'), ('7', 'Arquitectura tecnológica'),
    ('8', 'Arquitectura AWS actualizada'), ('9', 'Diagramas'), ('10', 'Modelo de base de datos'),
    ('11', 'Descripción del frontend React'), ('12', 'Descripción del backend'), ('13', 'Seguridad'),
    ('14', 'Implementación de CI/CD'), ('15', 'Estrategia Git/GitHub'), ('16', 'Proceso de despliegue'),
    ('17', 'Pruebas y resultados'), ('18', 'Análisis de costos'), ('19', 'Limitaciones de AWS Academy'),
    ('20', 'Estado del proyecto: diseñado, desarrollado, probado, desplegado y pendiente'), ('21', 'Conclusiones'), ('', 'Referencias'),
]


def build(img, toc_pages=None):
    global _fig, _tab
    _fig = _tab = 0
    doc = Document()
    setup(doc)

    # ---------------- Portada (APA 7, trabajo de estudiantes)
    for _ in range(3):
        doc.add_paragraph()
    p = doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.add_run('Agenda Fácil: Implementación de una Plataforma SaaS de Gestión de Citas y Reservas en Amazon Web Services').bold = True
    doc.add_paragraph()
    for key in ('integrantes', 'institucion', 'curso', 'docente', 'fecha'):
        p = doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        runs(p, PORTADA[key])
    page_break(doc)

    # ---------------- Tabla de contenido (estática, con páginas calculadas)
    h1(doc, 'Tabla de contenido')
    for num, title in TOC:
        p = doc.add_paragraph()
        p.paragraph_format.tab_stops.add_tab_stop(Inches(6.5), alignment=2, leader=1)  # derecha, puntos
        label = f'{num}. {title}' if num else title
        pg = (toc_pages or {}).get(title, '00')
        p.add_run(f'{label}\t{pg}')

    # ---------------- Título en la primera página del texto (salto de página antes, sin página en blanco)
    p = doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.page_break_before = True
    p.add_run('Agenda Fácil: Implementación de una Plataforma SaaS de Gestión de Citas y Reservas en Amazon Web Services').bold = True

    # 1
    h1(doc, '1. Introducción')
    para(doc, 'Los pequeños y medianos negocios que trabajan con citas —barberías, peluquerías, salones de belleza, consultorios, estudios de tatuajes y centros de estética— suelen administrar su agenda mediante mensajes de WhatsApp, llamadas telefónicas o un cuaderno. Este documento actualiza la *Propuesta de Proyecto SaaS – Agenda Fácil* (Equipo Agenda Fácil, 2026) y describe la solución desarrollada a partir de ella: una plataforma de software como servicio (SaaS) que permite a cada negocio publicar sus servicios y horarios, y a sus clientes reservar en línea sin conflictos de horario.')
    para(doc, 'El informe presenta el problema, los objetivos y el alcance; los requisitos; la arquitectura tecnológica y su correspondencia con los servicios de Amazon Web Services (AWS) definidos en la propuesta original (Amazon EC2, Amazon RDS, Amazon S3, Amazon CloudFront, Amazon Route 53 y AWS IAM); el diseño de la base de datos, el frontend en React y el backend en Node.js; la seguridad; la integración y entrega continuas (CI/CD); la estrategia de trabajo con Git y GitHub; el proceso de despliegue en AWS Academy Learner Lab; las pruebas ejecutadas con sus resultados reales; el análisis de costos y las limitaciones encontradas. A lo largo del texto se distingue explícitamente lo **diseñado**, lo **desarrollado**, lo **probado**, lo **desplegado** y lo **pendiente**.')

    # 2
    h1(doc, '2. Planteamiento del problema')
    para(doc, 'La gestión manual de reservas presenta tres fallas recurrentes. Primero, la **doble reserva**: cuando dos clientes piden el mismo horario por canales distintos, nada impide asignar ambos. Segundo, la **saturación de mensajes**: el personal dedica parte de su jornada a responder consultas de disponibilidad, confirmar y reprogramar citas. Tercero, la **pérdida de información**: los datos de los clientes y su historial quedan dispersos en conversaciones y no pueden consultarse con facilidad.')
    para(doc, 'Estas fallas se traducen en citas olvidadas, clientes insatisfechos y pérdida de ingresos. La pregunta que orienta el proyecto es: ¿cómo ofrecer a negocios pequeños una herramienta sencilla y de bajo costo que centralice su agenda, impida reservas incompatibles y permita a sus clientes reservar por sí mismos, garantizando que la información de cada negocio permanezca aislada y protegida?')

    # 3
    h1(doc, '3. Justificación')
    para(doc, 'Un modelo SaaS permite que muchos negocios compartan la misma aplicación sin instalar ni mantener servidores propios, pagando por niveles de servicio (Plan Básico y Plan Profesional) tras un periodo de prueba gratuito. La nube de AWS aporta servicios administrados —base de datos gestionada, almacenamiento de objetos y red de distribución de contenido con HTTPS— que reducen la carga operativa y permiten crecer según la demanda (Amazon Web Services [AWS], s.f.-c).')
    para(doc, 'Desde la perspectiva académica, el proyecto integra competencias de desarrollo frontend y backend, modelado de datos, seguridad de aplicaciones, control de versiones colaborativo, automatización CI/CD y arquitectura en la nube, en un producto funcional y demostrable.')

    # 4
    h1(doc, '4. Objetivos')
    h2(doc, 'Objetivo general')
    para(doc, 'Desarrollar e implementar Agenda Fácil, una plataforma SaaS funcional de gestión de citas y reservas para pequeños negocios, con una arquitectura en AWS coherente con la propuesta original, automatización CI/CD y documentación técnica y académica.')
    h2(doc, 'Objetivos específicos')
    bullets(doc, [
        'Implementar las funcionalidades para negocios y clientes descritas en la propuesta original mediante una interfaz web responsive en español.',
        'Construir una API REST segura con autenticación, autorización por roles y aislamiento de datos entre negocios.',
        'Garantizar en el backend que no existan reservas duplicadas ni solapadas, incluso ante peticiones simultáneas.',
        'Diseñar una base de datos relacional MySQL con migraciones versionadas, restricciones e índices.',
        'Automatizar la verificación (lint, pruebas, build) y el despliegue mediante GitHub Actions.',
        'Preparar la infraestructura en AWS (EC2, RDS, S3, CloudFront, Route 53 e IAM) como código, considerando las restricciones de AWS Academy.',
        'Verificar el sistema con pruebas automatizadas unitarias, de API, de componentes y de extremo a extremo.',
    ])

    # 5
    h1(doc, '5. Alcance del proyecto')
    para(doc, '**Incluido en el MVP:** registro e inicio de sesión de negocios y clientes; perfil, logo y preferencias del negocio; gestión de servicios, horarios, clientes y citas; panel del día con estadísticas; portal público de reservas con disponibilidad en tiempo real; consulta y cancelación de reservas por el cliente con margen configurable; planes Básico y Profesional con límites reales y periodo de prueba; infraestructura como código y pipelines de CI/CD.')
    para(doc, '**Fuera del alcance (mejoras futuras, según la propuesta):** pasarela de pagos y cobro real de suscripciones —los planes no simulan cobros—, recordatorios por WhatsApp o correo, múltiples usuarios por negocio en el Plan Profesional, reportes avanzados de ventas y aplicación móvil nativa.')

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
    ], widths=[0.7, 2.6, 3.2], note='Elaboración propia a partir de la propuesta original.')
    table(doc, 'Requisitos no funcionales', ['ID', 'Atributo', 'Criterio y mecanismo'], [
        ['RNF-01', 'Seguridad', 'Contraseñas con bcrypt, JWT, roles, validación, rate limiting, HTTPS, RDS y S3 privados'],
        ['RNF-02', 'Aislamiento multi-tenant', 'Ningún negocio accede a datos de otro (verificado con pruebas)'],
        ['RNF-03', 'Consistencia', 'Transacciones y bloqueo pesimista por negocio'],
        ['RNF-04', 'Usabilidad', 'Interfaz en español, responsive en móvil, tablet y escritorio'],
        ['RNF-05', 'Escalabilidad', 'API sin estado (JWT); estáticos en S3 + CloudFront'],
        ['RNF-06', 'Mantenibilidad', 'Lint, pruebas automatizadas, migraciones versionadas, CI'],
        ['RNF-07', 'Portabilidad', 'Configuración por variables de entorno'],
        ['RNF-08', 'Costo', 'Instancias de capa micro y Single-AZ; eliminación del stack tras su uso'],
    ], widths=[0.8, 1.6, 4.1])

    # 7
    h1(doc, '7. Arquitectura tecnológica')
    para(doc, 'La solución se organiza en tres capas. El **frontend** es una aplicación de página única (SPA) construida con React 19 y Vite (Meta Open Source, s.f.; Vite, s.f.), compilada a archivos estáticos. El **backend** es una API REST en Node.js 22 con Express (OpenJS Foundation, s.f.-a), que concentra las reglas de negocio. La **capa de datos** usa MySQL 8 a través del ORM Prisma, que genera consultas parametrizadas y administra migraciones versionadas (Prisma Data, s.f.).')
    table(doc, 'Tecnologías seleccionadas y justificación', ['Componente', 'Tecnología', 'Justificación'], [
        ['Frontend', 'React 19, Vite 6, React Router 7', 'Componentes reutilizables; build estático apto para S3 + CloudFront'],
        ['Backend', 'Node.js 22, Express 4', 'Despliegue sencillo en EC2; ecosistema maduro'],
        ['Validación', 'Zod', 'Esquemas declarativos con mensajes en español'],
        ['Datos', 'MySQL 8, Prisma 6', 'Compatible con Amazon RDS; migraciones y consultas seguras'],
        ['Autenticación', 'JWT, bcrypt', 'Sesión sin estado; hash adaptativo de contraseñas'],
        ['Pruebas', 'Vitest, Supertest, Testing Library, Playwright, Newman', 'Cobertura de unidades, API, interfaz y flujo completo'],
        ['Infraestructura', 'AWS CloudFormation, Nginx, systemd', 'Infraestructura reproducible; proceso administrado en EC2'],
        ['CI/CD', 'GitHub Actions', 'Integrado con el repositorio y los Pull Requests'],
    ], widths=[1.2, 2.2, 3.1])
    para(doc, 'Entre las decisiones relevantes se cuentan: servir frontend y API bajo el mismo dominio mediante CloudFront —el comportamiento `/api/*` se dirige a EC2—, lo que evita problemas de CORS; almacenar las horas de las reservas como hora local del negocio junto con su zona horaria, para que el cálculo no dependa de la zona del servidor; y usar un bloqueo pesimista sobre la fila del negocio para serializar las reservas concurrentes, dado que MySQL no ofrece índices únicos parciales que resuelvan solapamientos de duración variable (Oracle, s.f.).')

    # 8
    h1(doc, '8. Arquitectura AWS actualizada')
    para(doc, 'La arquitectura conserva los seis servicios de la propuesta original y precisa su configuración (Figura 1). Los usuarios acceden por HTTPS al dominio resuelto por Amazon Route 53 (AWS, s.f.-i), que apunta mediante un registro alias a Amazon CloudFront (AWS, s.f.-f). CloudFront entrega el frontend desde un bucket de Amazon S3 privado, al que solo puede leer gracias a Origin Access Control (AWS, s.f.-d), y reenvía las rutas `/api/*` a la instancia Amazon EC2 (AWS, s.f.-g), donde Nginx actúa como proxy inverso hacia Node.js.')
    para(doc, 'La base de datos Amazon RDS for MySQL (AWS, s.f.-h) reside en subredes privadas sin ruta a Internet y solo acepta conexiones desde el grupo de seguridad de EC2. Los logos de los negocios se guardan en un segundo bucket S3 privado (AWS, s.f.-j) y se entregan mediante URLs prefirmadas temporales. El certificado TLS del dominio se emite con AWS Certificate Manager (AWS, s.f.-k). AWS IAM controla los permisos: la instancia usa un perfil de instancia y se documentan políticas de mínimo privilegio (AWS, s.f.-e). Toda la infraestructura se define en una plantilla de AWS CloudFormation (AWS, s.f.-l).')
    figure(doc, 'Arquitectura de Agenda Fácil en AWS', img['01-arquitectura-aws'], 6.3, 'Elaboración propia. Arquitectura objetivo definida en la plantilla infra/aws/cloudformation/agenda-facil.yaml; al momento de redactar este documento no ha sido desplegada.')
    table(doc, 'Diferencias entre la arquitectura propuesta y la desplegable en AWS Academy', ['Servicio', 'Propuesta original', 'Configuración preparada'], [
        ['EC2', 'Servidor backend y APIs (t3.micro)', 't3.micro, Amazon Linux 2023, Nginx + Node.js, IP elástica'],
        ['RDS', 'MySQL db.t3.micro, 20 GB', 'Igual; subredes privadas, cifrado, sin acceso público'],
        ['S3', 'Archivos e imágenes', 'Bucket del frontend (OAC) y bucket de logos, ambos privados'],
        ['CloudFront', 'CDN', 'CDN + HTTPS + enrutamiento /api/* a EC2'],
        ['Route 53', 'DNS del dominio', 'Registro alias opcional; el dominio se adquiere fuera de AWS Academy'],
        ['IAM', 'Mínimo privilegio', 'LabInstanceProfile (Learner Lab no permite crear roles); políticas objetivo documentadas'],
    ], widths=[1.0, 2.2, 3.3])

    # 9
    h1(doc, '9. Diagramas')
    para(doc, 'Además del diagrama de arquitectura, se elaboraron el diagrama de componentes (Figura 2), el diagrama de secuencia del flujo de reservas (Figura 3), el pipeline de CI/CD (Figura 4) y el flujo de ramas de Git (Figura 5). Las fuentes de todos los diagramas están versionadas en formato Mermaid en la carpeta docs/diagramas del repositorio.')
    figure(doc, 'Diagrama de componentes del frontend y el backend', img['02-componentes'], 6.3, 'Elaboración propia.')
    figure(doc, 'Flujo de una reserva con control de concurrencia', img['03-flujo-reservas'], 6.0, 'Elaboración propia. El candado por negocio obliga a que reservas simultáneas se procesen una a una.')
    figure(doc, 'Pipeline de integración y despliegue continuos', img['05-pipeline-cicd'], 6.3, 'Elaboración propia.')
    figure(doc, 'Flujo de ramas de Git', img['06-flujo-git'], 6.3, 'Elaboración propia. Refleja la estructura de ramas creada en el repositorio.')

    # 10
    h1(doc, '10. Modelo de base de datos')
    para(doc, 'El modelo relacional (Figura 6) consta de siete entidades. **Plans** define los límites de cada plan; **Users** almacena las cuentas con su rol (administrador de negocio o cliente) y el hash de la contraseña; **Businesses** contiene el perfil, la zona horaria, el intervalo de franjas, el margen de cancelación, el plan y la fecha de fin de la prueba; **Services**, **BusinessHours** y **Clients** pertenecen a un negocio; y **Reservations** relaciona negocio, servicio y cliente con hora de inicio, hora de fin, estado y precio al momento de reservar.')
    para(doc, 'Se definieron claves foráneas con reglas de borrado coherentes (por ejemplo, un servicio con reservas no puede borrarse físicamente y se desactiva), restricciones únicas (correo de usuario, *slug* del negocio, nombre de servicio por negocio, un horario por día y negocio, cliente por correo y negocio) e índices compuestos por negocio y fecha para las consultas de agenda. El esquema se versiona con migraciones de Prisma y los planes se cargan con un *seed* idempotente.')
    figure(doc, 'Modelo entidad-relación', img['04-modelo-entidad-relacion'], 6.0, 'Elaboración propia a partir de backend/prisma/schema.prisma.', max_height=7.6)

    # 11
    h1(doc, '11. Descripción del frontend React')
    para(doc, 'El frontend implementa diez áreas: página de inicio con beneficios, funcionalidades y planes; registro de negocios y clientes con validaciones; inicio de sesión con redirección según el rol; panel del negocio con resumen del día; gestión de servicios; horarios; citas con filtros por fecha, estado y texto; clientes con ficha e historial; portal de reservas para clientes; y perfil y configuración. Las rutas privadas se protegen con un componente que verifica la sesión y el rol.')
    para(doc, 'Se construyeron componentes reutilizables —botones, campos con mensajes de error accesibles, modales, diálogos de confirmación, insignias de estado, tarjetas de indicadores y un selector de franjas horarias usado tanto por clientes como por el negocio— y dos contextos de React: sesión (token JWT) y notificaciones. Cada vista muestra estados de carga, error y éxito, y todos los botones visibles ejecutan una acción real. El diseño es responsive: en móvil la barra lateral se convierte en menú desplegable y las tablas se transforman en tarjetas (Figuras 7 a 12).')
    figure(doc, 'Página de inicio (escritorio)', img['01-landing-escritorio'], 6.0, 'Captura generada por la prueba E2E automatizada en entorno local (27 de noviembre de 2026).')
    figure(doc, 'Panel del negocio: resumen del día', img['13-dashboard-escritorio'], 6.0, 'Captura de entorno local con datos creados por la prueba E2E.')
    figure(doc, 'Portal de reservas: selección de servicio, fecha y hora', img['06-reserva-disponibilidad'], 6.0, 'Captura de entorno local.')
    figure(doc, 'Agenda del negocio con filtros y acciones', img['09-agenda-negocio'], 6.0, 'Captura de entorno local.')
    figure(doc, 'Ficha del cliente con historial de reservas', img['12-ficha-cliente-historial'], 6.0, 'Captura de entorno local.')
    figure(doc, 'Vistas móviles: panel del negocio y horarios ocupados', img['14-dashboard-movil'], 2.6, 'Captura de entorno local en un viewport de 390 × 844 píxeles. La vista de horarios ocupados se encuentra en docs/capturas.', max_height=5.2)

    # 12
    h1(doc, '12. Descripción del backend')
    para(doc, 'La API REST expone rutas públicas (salud, planes, directorio, detalle y disponibilidad de un negocio), de autenticación (registro, inicio de sesión, perfil y cambio de contraseña), de cliente (crear, consultar y cancelar reservas) y de negocio (perfil, configuración, plan, logo, horarios, servicios, clientes, reservas, disponibilidad y panel). Las respuestas de error siguen un formato uniforme con código, mensaje y detalle por campo.')
    para(doc, 'La regla crítica se implementa en el servicio de reservas: dentro de una transacción con aislamiento READ COMMITTED se ejecuta `SELECT … FOR UPDATE` sobre la fila del negocio, se validan las reglas (servicio activo, día abierto, dentro del horario, no en el pasado, como máximo 90 días adelante y, para clientes, coincidencia con la grilla de franjas) y se comprueba que no exista otra reserva activa que se solape; solo entonces se inserta. Si dos clientes reservan a la vez, la segunda transacción espera y recibe un error 409 de horario no disponible. Esta técnica de lecturas con bloqueo está documentada en el manual de MySQL (Oracle, s.f.).')
    para(doc, 'El aislamiento multi-tenant se garantiza porque el identificador del negocio nunca se recibe del cliente: se obtiene del usuario autenticado en cada petición y todas las consultas se filtran por él; un recurso de otro negocio responde 404. Las variables de entorno se validan al iniciar y el servidor se ejecuta como servicio de systemd con un usuario sin privilegios.')

    # 13
    h1(doc, '13. Seguridad')
    para(doc, 'Los controles se seleccionaron a partir de los riesgos más frecuentes en aplicaciones web (OWASP Foundation, 2021) y de las recomendaciones de seguridad de Express (OpenJS Foundation, s.f.-b) y de IAM (AWS, s.f.-e).')
    table(doc, 'Controles de seguridad implementados', ['Riesgo', 'Control', 'Verificación'], [
        ['Exposición de contraseñas', 'bcrypt con 12 rondas (Provos y Mazières, 1999)', 'Prueba automatizada del hash'],
        ['Suplantación de sesión', 'JWT firmado con emisor, audiencia y expiración de 8 h (Jones et al., 2015)', 'Pruebas 401'],
        ['Escalada de privilegios', 'Autorización por rol en cada grupo de rutas', 'Pruebas 403'],
        ['Acceso entre negocios', 'Filtro por negocio derivado del token', '6 pruebas de aislamiento'],
        ['Inyección SQL', 'Consultas parametrizadas de Prisma', 'Revisión de código'],
        ['Entradas maliciosas', 'Validación Zod, límite de 100 KB, verificación de tipo real de imágenes', 'Pruebas 400'],
        ['Fuerza bruta', 'Rate limiting: 20 intentos / 15 min por IP', 'Prueba 429'],
        ['Cabeceras y CORS', 'helmet; lista blanca de orígenes', 'Prueba de cabeceras'],
        ['Secretos', 'Variables de entorno, GitHub Secrets, parámetro NoEcho', '.gitignore y workflows'],
        ['Red', 'HTTPS en CloudFront; RDS privada; EC2 solo recibe tráfico de CloudFront; IMDSv2', 'Plantilla (pendiente verificar en AWS)'],
    ], widths=[1.5, 3.0, 2.0])
    para(doc, 'Como riesgos residuales se reconocen: el tráfico entre CloudFront y EC2 viaja por HTTP dentro de la red de AWS (mejora: certificado en el origen o un balanceador), el token se guarda en el almacenamiento local del navegador (mitigado con expiración corta y escape automático de React) y, en Learner Lab, el rol disponible tiene permisos más amplios que los diseñados.')

    # 14
    h1(doc, '14. Implementación de CI/CD')
    para(doc, 'Se configuraron dos flujos de trabajo de GitHub Actions (GitHub, s.f.-b). El flujo **CI** se ejecuta en cada Pull Request y en cada *push* a develop y main, con tres trabajos: backend (instalación, lint, build y pruebas contra un contenedor MySQL 8), frontend (instalación, lint, pruebas y build, publicando el resultado como artefacto) y una prueba de extremo a extremo con Playwright (Microsoft, s.f.) que recorre el flujo MVP completo y conserva capturas como artefacto.')
    para(doc, 'El flujo **Deploy** se activa cuando CI finaliza con éxito sobre main o manualmente indicando un commit. Despliega el backend en EC2 por SSH creando una nueva versión en una carpeta de *releases*, instala dependencias, aplica migraciones, cambia un enlace simbólico, reinicia el servicio y verifica el endpoint de salud; si la verificación falla, restaura automáticamente la versión anterior. Luego publica el frontend en S3 e invalida la caché de CloudFront. Las credenciales se leen de GitHub Secrets y el despliegue solo se ejecuta si la variable AWS_DEPLOY_ENABLED vale true. El procedimiento de *rollback* tiene tres niveles: automático, reejecución manual con un commit anterior y un script en el servidor.')
    para(doc, '**Estado:** los comandos de ambos trabajos de CI se ejecutaron con éxito en un clon limpio del repositorio en el entorno de desarrollo; los flujos todavía no se han ejecutado en GitHub porque el repositorio remoto no ha sido creado. No se declara ninguna ejecución exitosa en GitHub Actions.')

    # 15
    h1(doc, '15. Estrategia Git/GitHub')
    para(doc, 'Se adoptó un flujo con una rama de producción (main), una de integración (develop) y ramas de funcionalidad por área: feature/frontend, feature/backend, feature/database, feature/aws-deployment y feature/documentation. Los cambios llegan a develop mediante Pull Requests revisados y con CI en verde, y develop se integra en main al publicar una versión (GitHub, s.f.-a; Chacon y Straub, 2014). Los mensajes de commit siguen la convención *Conventional Commits* (por ejemplo, feat(backend): …).')
    para(doc, 'El repositorio incluye plantillas de Pull Request e *issues*, una guía de contribución, configuración de Dependabot y un script para publicar el repositorio con todas sus ramas, crear etiquetas y aplicar reglas de protección. El historial inicial fue generado con asistencia de inteligencia artificial y así está identificado en el autor de los commits; **no se atribuyó a ningún integrante**. La evidencia de colaboración —commits y Pull Requests de cada integrante desde su cuenta personal— está [pendiente de realizarse por el equipo].')

    # 16
    h1(doc, '16. Proceso de despliegue')
    para(doc, 'El despliegue preparado consta de los siguientes pasos, documentados en la guía de AWS Academy del repositorio:')
    bullets(doc, [
        'Iniciar el Learner Lab, configurar las credenciales temporales y ejecutar el script de verificación de servicios (solo lectura).',
        'Crear la infraestructura con la plantilla de CloudFormation (VPC, subredes, grupos de seguridad, EC2 con IP elástica, RDS, buckets S3, CloudFront y, opcionalmente, registros de Route 53). La instancia se configura automáticamente con Node.js 22, Nginx y un servicio de systemd.',
        'Crear en RDS, desde EC2, un usuario de aplicación con privilegios limitados a la base agenda_facil.',
        'Registrar los secretos y variables en GitHub y activar el despliegue automático.',
        'Desplegar con el flujo Deploy (o con los scripts manuales equivalentes) y verificar la URL de CloudFront y el endpoint /api/health.',
        'Para el dominio personalizado: adquirir el dominio en un registrador externo, emitir el certificado en ACM (us-east-1) con validación DNS y crear el registro alias en Route 53 o un CNAME en el registrador.',
    ])
    para(doc, '**Estado:** la plantilla fue validada con cfn-lint sin errores (una advertencia sobre el uso de referencias dinámicas para la contraseña, aceptada por las restricciones del laboratorio) y los scripts con ShellCheck. **Ningún recurso ha sido creado todavía en AWS** y **no se dispone aún de dominio**; las capturas de la consola de AWS y de la aplicación en producción están [pendientes de incorporarse en esta sección].')

    # 17
    h1(doc, '17. Pruebas y resultados')
    para(doc, 'Las pruebas se ejecutaron el 27 de noviembre de 2026 en el entorno de desarrollo (Node.js 22 y MySQL 8.0.46). Las pruebas de backend crean una base de datos temporal en cada ejecución y la eliminan al terminar. Los resultados se resumen en la Tabla 6 y los registros completos están en docs/evidencias.')
    table(doc, 'Resultados de las pruebas ejecutadas', ['Tipo de prueba', 'Herramienta', 'Alcance', 'Resultado'], [
        ['Unitarias y de API', 'Vitest + Supertest (Vitest, s.f.)', 'Registro, login, roles, servicios, horarios, disponibilidad, reservas, concurrencia, cancelaciones, aislamiento, validación, rate limiting, cabeceras, archivos', '46 de 46 aprobadas'],
        ['Componentes', 'Vitest + Testing Library', 'Validaciones, formato, login, rutas protegidas, selector de franjas', '10 de 10 aprobadas'],
        ['Extremo a extremo', 'Playwright (Chromium)', 'Flujo MVP completo y ausencia de desbordamiento en móvil, tablet y escritorio', '18 de 18 pasos'],
        ['API (colección)', 'Postman / Newman', '42 peticiones en orden de uso real', '55 de 55 aserciones'],
        ['Concurrencia (mutación)', 'Vitest', 'Misma prueba con el bloqueo desactivado', 'Falla: 9 de 10 reservas duplicadas'],
    ], widths=[1.2, 1.4, 2.6, 1.3])
    para(doc, 'La prueba de concurrencia envía diez solicitudes simultáneas para el mismo horario: con el bloqueo, exactamente una se confirma y nueve reciben 409. Para demostrar que la prueba es significativa, se desactivó temporalmente el bloqueo y se repitió tres veces: en todas fallaron por crearse nueve reservas duplicadas. Las pruebas también detectaron y permitieron corregir tres defectos reales: un desbordamiento horizontal en tablet causado por la grilla del panel, mensajes de validación con concordancia de género incorrecta y el uso de mayúsculas iniciales en cada palabra de las fechas. Además, la segunda ejecución consecutiva de la colección Postman fue bloqueada por el limitador de intentos, lo que confirma su funcionamiento.')

    # 18
    h1(doc, '18. Análisis de costos')
    para(doc, 'La propuesta original estimó los costos con AWS Pricing Calculator (AWS, s.f.-b). Se reproducen en la Tabla 7 como **estimación de la propuesta**, no como cotización vigente; los precios de AWS cambian y dependen de la región y del uso, por lo que deben recalcularse antes de usarlos en una decisión.')
    table(doc, 'Estimación mensual de la propuesta original', ['Servicio', 'Configuración principal', 'Costo mensual estimado (USD)'], [
        ['Amazon EC2', 't3.micro, Linux, 730 horas', '7.59'],
        ['Amazon RDS', 'MySQL, db.t3.micro, Single-AZ, 20 GB', '14.71'],
        ['Amazon S3', 'S3 Standard, 20 GB', '9.46'],
        ['Amazon CloudFront', 'Pago por uso (tráfico base)', '11.00'],
        ['Amazon Route 53', '1 zona alojada', '0.50'],
        ['**Total mensual**', 'Infraestructura inicial', '**43.26**'],
        ['**Total anual**', '43.26 × 12', '**519.12**'],
    ], widths=[1.6, 3.0, 1.9], note='Tomado de la propuesta original (Equipo Agenda Fácil, 2026). Cifras no verificadas con precios actuales.')
    para(doc, 'Observaciones: (a) la cifra de S3 parece alta para 20 GB de almacenamiento estándar, por lo que probablemente incluye solicitudes o transferencia de datos; debe revisarse el supuesto en la calculadora; (b) la arquitectura actualizada añade una IP elástica y un segundo bucket, de costo marginal, y CloudFront Functions, cuyo costo depende del número de invocaciones; (c) en AWS Academy el consumo se descuenta de los créditos del laboratorio y no genera facturación al equipo; (d) para controlar el gasto se usan instancias de capa micro y Single-AZ, y se provee un script que elimina toda la infraestructura al terminar. [Acción pendiente: recalcular en AWS Pricing Calculator e incluir el enlace de la estimación.]')

    # 19
    h1(doc, '19. Limitaciones de AWS Academy')
    para(doc, 'AWS Academy Learner Lab (AWS, s.f.-a) ofrece un entorno con restricciones que afectan el diseño. Las siguientes limitaciones se consideraron en la plantilla y deben confirmarse en el laboratorio del curso, pues las condiciones pueden variar:')
    table(doc, 'Limitaciones consideradas y alternativas', ['Limitación', 'Impacto', 'Alternativa'], [
        ['No se pueden crear roles, usuarios ni políticas IAM', 'No se aplica el rol de mínimo privilegio diseñado', 'Uso de LabInstanceProfile; políticas objetivo documentadas'],
        ['Credenciales temporales por sesión', 'Los secretos de CI caducan', 'Actualizarlos antes de desplegar; despliegue condicionado'],
        ['Sesiones de duración limitada', 'La aplicación no está disponible permanentemente', 'IP elástica; iniciar el laboratorio antes de la demostración'],
        ['Créditos limitados', 'Riesgo de agotar el presupuesto', 'Recursos micro y script de eliminación'],
        ['Sin registro de dominios', 'No se compra el dominio en Route 53', 'Registrador externo + Route 53 o CNAME'],
        ['Regiones restringidas', 'Dependencia de la región en red y DNS', 'Plantilla parametrizada por región'],
    ], widths=[2.0, 2.0, 2.5])

    # 20
    h1(doc, '20. Estado del proyecto: diseñado, desarrollado, probado, desplegado y pendiente')
    table(doc, 'Estado de cada componente', ['Componente', 'Diseñado', 'Desarrollado', 'Probado', 'Desplegado'], [
        ['Frontend React', 'Sí', 'Sí', 'Sí (local)', 'No'],
        ['API REST y reglas de negocio', 'Sí', 'Sí', 'Sí (local)', 'No'],
        ['Base de datos y migraciones', 'Sí', 'Sí', 'Sí (MySQL 8 local)', 'No'],
        ['Workflows de CI', 'Sí', 'Sí', 'Comandos en local', 'No ejecutado en GitHub'],
        ['Workflow de despliegue', 'Sí', 'Sí', 'No', 'No'],
        ['Infraestructura AWS (CloudFormation)', 'Sí', 'Sí', 'Validación estática', 'No'],
        ['Dominio personalizado', 'Sí', 'Configuración', 'No', 'No'],
        ['Pagos, notificaciones, multiusuario', 'Mejora futura', 'No', 'No', 'No'],
    ], widths=[2.3, 0.9, 1.1, 1.2, 1.0])
    para(doc, '**Pendiente (requiere al equipo):** crear el repositorio en GitHub e invitar a los integrantes; completar perfiles; realizar commits y Pull Requests propios; ejecutar el despliegue en AWS Academy; adquirir y conectar el dominio; tomar capturas reales; completar la portada y verificar las referencias.')

    # 21
    h1(doc, '21. Conclusiones')
    para(doc, 'Se desarrolló una versión funcional de Agenda Fácil que cubre todas las funcionalidades para negocios y clientes de la propuesta original. La regla más crítica —impedir reservas incompatibles— se resolvió en el backend con transacciones y un bloqueo por negocio, y se comprobó con una prueba de concurrencia cuya validez se demostró desactivando el mecanismo. El aislamiento entre negocios se garantizó por diseño y se verificó con pruebas específicas.')
    para(doc, 'La arquitectura en AWS mantiene los seis servicios propuestos y los concreta en una plantilla de infraestructura como código que respeta las restricciones de AWS Academy, separando con claridad la arquitectura objetivo de lo que el laboratorio permite. La automatización con GitHub Actions y el despliegue por versiones con *rollback* automático reducen el riesgo de cada publicación.')
    para(doc, 'El trabajo restante es principalmente operativo y de evidencia: desplegar en el laboratorio, conectar un dominio y documentar la colaboración real de cada integrante. Como mejoras se proponen recordatorios por WhatsApp o correo, pasarela de pagos para las suscripciones, múltiples usuarios por negocio, un balanceador de carga con escalado automático y cifrado TLS también entre CloudFront y el origen.')

    # Referencias
    page_break(doc)
    h1(doc, 'Referencias')
    refs = [
        'Amazon Web Services. (s.f.-a). *AWS Academy*. https://aws.amazon.com/training/awsacademy/',
        'Amazon Web Services. (s.f.-b). *AWS Pricing Calculator*. https://calculator.aws/',
        'Amazon Web Services. (s.f.-c). *AWS Well-Architected Framework*. https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html',
        'Amazon Web Services. (s.f.-d). *Restricting access to an Amazon S3 origin*. Amazon CloudFront Developer Guide. https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html',
        'Amazon Web Services. (s.f.-e). *Security best practices in IAM*. AWS Identity and Access Management User Guide. https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html',
        'Amazon Web Services. (s.f.-f). *What is Amazon CloudFront?* Amazon CloudFront Developer Guide. https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Introduction.html',
        'Amazon Web Services. (s.f.-g). *What is Amazon EC2?* Amazon EC2 User Guide. https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/concepts.html',
        'Amazon Web Services. (s.f.-h). *What is Amazon Relational Database Service (Amazon RDS)?* Amazon RDS User Guide. https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Welcome.html',
        'Amazon Web Services. (s.f.-i). *What is Amazon Route 53?* Amazon Route 53 Developer Guide. https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/Welcome.html',
        'Amazon Web Services. (s.f.-j). *What is Amazon S3?* Amazon Simple Storage Service User Guide. https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html',
        'Amazon Web Services. (s.f.-k). *What is AWS Certificate Manager?* AWS Certificate Manager User Guide. https://docs.aws.amazon.com/acm/latest/userguide/acm-overview.html',
        'Amazon Web Services. (s.f.-l). *What is AWS CloudFormation?* AWS CloudFormation User Guide. https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/Welcome.html',
        'American Psychological Association. (2020). *Publication manual of the American Psychological Association* (7.ª ed.). https://doi.org/10.1037/0000165-000',
        'Chacon, S., y Straub, B. (2014). *Pro Git* (2.ª ed.). Apress. https://git-scm.com/book/es/v2',
        'Equipo Agenda Fácil. (2026). *Propuesta de proyecto SaaS: Agenda Fácil* [Documento no publicado].',
        'GitHub. (s.f.-a). *Collaborating with pull requests*. GitHub Docs. https://docs.github.com/en/pull-requests/collaborating-with-pull-requests',
        'GitHub. (s.f.-b). *GitHub Actions documentation*. GitHub Docs. https://docs.github.com/en/actions',
        'Jones, M., Bradley, J., y Sakimura, N. (2015). *JSON Web Token (JWT)* (RFC 7519). Internet Engineering Task Force. https://doi.org/10.17487/RFC7519',
        'Meta Open Source. (s.f.). *React documentation*. https://react.dev/learn',
        'Microsoft. (s.f.). *Playwright documentation*. https://playwright.dev/docs/intro',
        'OpenJS Foundation. (s.f.-a). *Node.js v22 documentation*. https://nodejs.org/docs/latest-v22.x/api/',
        'OpenJS Foundation. (s.f.-b). *Production best practices: Security*. Express. https://expressjs.com/en/advanced/best-practice-security.html',
        'Oracle. (s.f.). *Locking reads*. MySQL 8.0 Reference Manual. https://dev.mysql.com/doc/refman/8.0/en/innodb-locking-reads.html',
        'OWASP Foundation. (2021). *OWASP Top 10:2021*. https://owasp.org/Top10/',
        'Prisma Data. (s.f.). *Prisma ORM documentation*. https://www.prisma.io/docs/orm',
        'Provos, N., y Mazières, D. (1999). A future-adaptable password scheme. En *Proceedings of the 1999 USENIX Annual Technical Conference*. USENIX Association. https://www.usenix.org/legacy/events/usenix99/provos/provos.pdf',
        'Vite. (s.f.). *Getting started*. https://vite.dev/guide/',
        'Vitest. (s.f.). *Getting started*. https://vitest.dev/guide/',
    ]
    for r in refs:
        reference(doc, r)

    # Anexo
    page_break(doc)
    h1(doc, 'Anexo A. Capturas adicionales de la aplicación')
    para(doc, 'Capturas generadas por la prueba E2E automatizada en entorno local. No corresponden al despliegue en AWS.', indent=False)
    figure(doc, 'Gestión de servicios', img['04-servicios'], 6.0)
    figure(doc, 'Configuración de horarios de atención', img['05-horarios'], 6.0)
    figure(doc, 'Creación de una cita desde el panel del negocio', img['10-nueva-cita-modal'], 6.0)
    figure(doc, 'Mis reservas del cliente', img['11-mis-reservas'], 6.0)
    figure(doc, 'Validaciones del formulario de registro', img['02-registro-validaciones'], 5.5)
    figure(doc, 'Agenda en tablet', img['16-agenda-tablet'], 4.5)
    figure(doc, 'Horarios ocupados vistos por otro cliente (móvil)', img['08-reserva-movil-horarios-ocupados'], 2.6, max_height=5.2)
    return doc


def to_pdf(docx_path):
    soffice = shutil.which('soffice') or shutil.which('libreoffice')
    if not soffice:
        print('LibreOffice no está instalado: se omite el PDF.')
        return None
    subprocess.run([soffice, '--headless', '--convert-to', 'pdf', '--outdir', str(docx_path.parent), str(docx_path)],
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return docx_path.with_suffix('.pdf')


def toc_pages_from_pdf(pdf):
    """Busca en el PDF la página en que empieza cada sección para completar la tabla de contenido."""
    text = subprocess.run(['pdftotext', '-layout', str(pdf), '-'], capture_output=True, text=True, check=True).stdout
    pages = text.split('\f')
    found = {}
    for num, title in TOC:
        needle = f'{num}. {title}' if num else title
        for i, page in enumerate(pages[2:], start=3):  # omite portada y tabla de contenido
            lines = [ln.strip() for ln in page.splitlines()]
            if any(ln == needle or ln.startswith(needle) for ln in lines):
                found[title] = str(i)
                break
    return found


def main():
    with tempfile.TemporaryDirectory() as tmp:
        img = prepare_images(tmp)
        build(img).save(DOCX)
        pdf = to_pdf(DOCX)
        if pdf and shutil.which('pdftotext'):
            pages = toc_pages_from_pdf(pdf)
            build(img, pages).save(DOCX)
            to_pdf(DOCX)
            missing = [t for _, t in TOC if t not in pages]
            print('Tabla de contenido:', pages, '| sin ubicar:', missing)
    print('Generado:', DOCX, DOCX.with_suffix('.pdf'))


if __name__ == '__main__':
    main()
