#!/usr/bin/env python3
"""Genera agenda-facil.yaml incrustando ../ec2/bootstrap-ec2.sh como UserData de la instancia EC2.
Así existe una única fuente del script de arranque (también usable manualmente desde la consola).
Uso: python3 infra/aws/cloudformation/build-template.py
"""
from pathlib import Path

here = Path(__file__).resolve().parent
src = (here / 'agenda-facil.src.yaml').read_text(encoding='utf-8')
script = (here.parent / 'ec2' / 'bootstrap-ec2.sh').read_text(encoding='utf-8').rstrip('\n')
indent = ' ' * 10
block = '\n'.join((indent + line) if line else '' for line in script.split('\n')).lstrip()
out = src.replace('__BOOTSTRAP__', block)
header = '# ARCHIVO GENERADO por build-template.py a partir de agenda-facil.src.yaml y ../ec2/bootstrap-ec2.sh. No editar a mano.\n'
(here / 'agenda-facil.yaml').write_text(header + out, encoding='utf-8', newline='\n')  # LF también en Windows
print('agenda-facil.yaml generado')
