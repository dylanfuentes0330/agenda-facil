# Evidencia: la prueba de concurrencia detecta reservas duplicadas

Fecha de ejecución: 2026-11-27 (entorno local de desarrollo, MySQL 8.0.46).

Objetivo: comprobar que la prueba "bajo concurrencia, solo una de 10 reservas simultáneas
al mismo horario tiene éxito" (`backend/tests/api/reservations.test.js`) realmente detecta
el problema de doble reserva y no pasa "por casualidad".

Procedimiento:
1. Se comentó temporalmente la línea `SELECT id FROM businesses WHERE id = ? FOR UPDATE`
   en `backend/src/services/reservations.js` (bloqueo pesimista por negocio).
2. Se ejecutó 3 veces: `npx vitest run tests/api/reservations.test.js -t "concurrencia"`.
3. Se restauró el archivo original y se volvió a ejecutar toda la suite.

Resultado SIN bloqueo (3 de 3 ejecuciones fallaron):

```
→ expected [ 201, 201, 201, 201, 201, 201, …(3) ] to have a length of 1 but got 9
```

Es decir, 9 de 10 peticiones simultáneas crearon una reserva en el mismo horario.

Resultado CON bloqueo (código final): 1 petición responde 201 y 9 responden 409 `SLOT_TAKEN`.
La suite completa pasa (ver `resultados-pruebas-backend.txt`).
