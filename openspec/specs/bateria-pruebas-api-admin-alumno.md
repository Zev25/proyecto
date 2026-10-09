# Bateria de pruebas API (admin/alumno multi-curso)

Fecha: 2026-09-28

## Variables base
- BASE_URL: http://localhost:3000
- ADMIN_ROLE_HEADER: x-user-role: admin
- ALUMNO_ROLE_HEADER: x-user-role: alumno

## 1) Registro de alumno con multiples cursos

### Request
```bash
curl -X POST "$BASE_URL/registro" \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Ana",
    "apellido": "Perez",
    "email": "ana@example.com",
    "usuario": "ana.multi",
    "contrasena": "1234",
    "tipo": "alumno",
    "cursos": ["software", "redes"]
  }'
```

### Esperado
- HTTP 201
- data.cursos contiene ["software", "redes"]
- data.email contiene "ana@example.com"

### Casos adicionales de email
- Enviar email con formato invalido: esperado HTTP 400.
- Repetir registro con email ya utilizado: esperado HTTP 409.
- Enviar email con mayusculas/espacios externos: se guarda normalizado en minusculas y sin espacios.

## 2) Login de alumno y devolucion de cursos

### Request
```bash
curl -X POST "$BASE_URL/login" \
  -H "Content-Type: application/json" \
  -d '{
    "usuario": "ana.multi",
    "contrasena": "1234"
  }'
```

### Esperado
- HTTP 200
- user.curso existe (principal)
- user.cursos existe (array completo)

## 3) Admin asigna multiples cursos al alumno

### Request
```bash
curl -X PATCH "$BASE_URL/admin/usuarios/ana.multi/curso" \
  -H "Content-Type: application/json" \
  -H "x-user-role: admin" \
  -d '{
    "cursos": ["frontend", "software", "redes"]
  }'
```

### Esperado
- HTTP 200
- data.cursosNuevos contiene 3 cursos
- data.cursoPrincipal coincide con el primer curso

## 4) Admin limpia cursos del alumno

### Request
```bash
curl -X PATCH "$BASE_URL/admin/usuarios/ana.multi/curso" \
  -H "Content-Type: application/json" \
  -H "x-user-role: admin" \
  -d '{
    "cursos": []
  }'
```

### Esperado
- HTTP 200
- data.cursosNuevos es []
- data.cursoPrincipal es null

## 5) Admin envia curso invalido

### Request
```bash
curl -X PATCH "$BASE_URL/admin/usuarios/ana.multi/curso" \
  -H "Content-Type: application/json" \
  -H "x-user-role: admin" \
  -d '{
    "cursos": ["curso-invalido"]
  }'
```

### Esperado
- HTTP 400
- error: Curso invalido

## 6) Alumno resumen agregado por multiples cursos

### Request
```bash
curl "$BASE_URL/alumno/resumen?usuario=ana.multi" \
  -H "x-user-role: alumno"
```

### Esperado
- HTTP 200
- data.cursos es array
- tareasDisponibles/evaluacionesDisponibles agregadas por todos los cursos del alumno

## 7) Alumno tareas para todos sus cursos (sin filtro)

### Request
```bash
curl "$BASE_URL/alumno/tareas?usuario=ana.multi" \
  -H "x-user-role: alumno"
```

### Esperado
- HTTP 200
- lista incluye tareas de todos los cursos asignados

## 8) Alumno tareas con filtro puntual

### Request
```bash
curl "$BASE_URL/alumno/tareas?usuario=ana.multi&curso=software" \
  -H "x-user-role: alumno"
```

### Esperado
- HTTP 200
- lista contiene solo tareas de software

## 9) Alumno evaluaciones para todos sus cursos (sin filtro)

### Request
```bash
curl "$BASE_URL/alumno/evaluaciones?usuario=ana.multi" \
  -H "x-user-role: alumno"
```

### Esperado
- HTTP 200
- lista agregada por cursos del alumno

## 10) Alumno evaluaciones con filtro puntual

### Request
```bash
curl "$BASE_URL/alumno/evaluaciones?usuario=ana.multi&curso=software" \
  -H "x-user-role: alumno"
```

### Esperado
- HTTP 200
- lista contiene solo evaluaciones de software

## 11) Seguridad: evaluaciones alumno sin usuario ni curso

### Request
```bash
curl "$BASE_URL/alumno/evaluaciones" \
  -H "x-user-role: alumno"
```

### Esperado
- HTTP 400
- error: Debes enviar usuario o curso

## 12) Seguridad: tareas alumno sin usuario ni curso

### Request
```bash
curl "$BASE_URL/alumno/tareas" \
  -H "x-user-role: alumno"
```

### Esperado
- HTTP 400
- error: Debes enviar usuario o curso

## 13) Estado usuario bloqueado/inactivo en login

### Bloquear usuario
```bash
curl -X PATCH "$BASE_URL/admin/usuarios/ana.multi/estado" \
  -H "Content-Type: application/json" \
  -H "x-user-role: admin" \
  -d '{"estado":"bloqueado"}'
```

### Intentar login
```bash
curl -X POST "$BASE_URL/login" \
  -H "Content-Type: application/json" \
  -d '{
    "usuario": "ana.multi",
    "contrasena": "1234"
  }'
```

### Esperado
- HTTP 403
- error: Usuario inactivo o bloqueado

## Criterio de salida
- Todos los casos pasan con el codigo HTTP esperado.
- No hay errores de sintaxis ni errores nuevos en backend.

## 14) Admin crea codigo numerico de invitacion

### Request
```bash
curl -X POST "$BASE_URL/admin/invitaciones/cursos" \
  -H "Content-Type: application/json" \
  -H "x-user-role: admin" \
  -d '{
    "adminUsuario": "admin.demo",
    "cursos": ["software", "redes"],
    "expiraEnHoras": 24,
    "cupoMaximo": 5
  }'
```

### Esperado
- HTTP 201
- respuesta incluye campo codigo (8 digitos)
- data.cursos contiene los cursos esperados

## 15) Alumno canjea codigo numerico de invitacion

### Request
```bash
curl -X POST "$BASE_URL/alumno/invitaciones/canjear" \
  -H "Content-Type: application/json" \
  -H "x-user-role: alumno" \
  -d '{
    "usuario": "ana.multi",
    "codigo": "12345678"
  }'
```

### Esperado
- HTTP 200
- data.cursosAgregados contiene cursos nuevos asignados
- data.cursosTotales refleja cursos finales del alumno

## 16) Canje de codigo invalido o expirado

### Request (invalido)
```bash
curl -X POST "$BASE_URL/alumno/invitaciones/canjear" \
  -H "Content-Type: application/json" \
  -H "x-user-role: alumno" \
  -d '{
    "usuario": "ana.multi",
    "codigo": "00000000"
  }'
```

### Esperado
- HTTP 404 para codigo inexistente
- HTTP 410 para codigo expirado

## Pendiente de pruebas QR
- Definir casos de prueba para canje por QR (scanner y link de canje).
- Validar equivalencia funcional entre canje por codigo numerico y canje por QR.
