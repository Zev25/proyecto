# Especificacion de pruebas backend (admin/alumno)

Fecha: 2026-09-28

## Temas a probar

### 1. Login y estado de usuario
- [ ] Login exitoso con usuario activo.
- [ ] Rechazo de login con usuario bloqueado (403).
- [ ] Rechazo de login con usuario inactivo (403).
- [ ] Rechazo por credenciales invalidas (401).
- [ ] El registro requiere email con formato valido y rechaza emails duplicados.

### 2. Gestion de roles por admin
- [ ] Cambiar rol de alumno a profesor.
- [ ] Cambiar rol de profesor a admin.
- [ ] Rechazar rol no permitido.
- [ ] Proteger degradacion del ultimo admin activo.

### 3. Gestion de curso por admin
- [ ] Asignar multiples cursos validos a un alumno.
- [ ] Rechazar cambio de curso en usuario que no sea alumno.
- [ ] Rechazar curso fuera del catalogo permitido.
- [ ] Permitir limpiar cursos del alumno enviando lista vacia.

### 3.1 Consumo alumno con multiples cursos
- [ ] Obtener resumen de alumno agregando tareas/evaluaciones de todos sus cursos.
- [ ] Listar tareas del alumno para todos sus cursos cuando no se envia filtro.
- [ ] Listar evaluaciones del alumno para todos sus cursos cuando no se envia filtro.
- [ ] Mantener filtro por curso cuando se envia curso explicito.

### 4. Gestion de estado por admin
- [ ] Cambiar estado activo -> inactivo.
- [ ] Cambiar estado activo -> bloqueado.
- [ ] Cambiar estado bloqueado/inactivo -> activo.
- [ ] Proteger desactivacion del ultimo admin activo.

### 5. Listados y visibilidad de estado
- [ ] Verificar que GET /admin/usuarios devuelva estado.
- [ ] Verificar que la busqueda de usuario admin devuelva estado.
- [ ] Verificar consistencia de estado en respuesta de login.

### 6. Seguridad basica de rutas
- [ ] Rechazo en rutas admin sin rol admin.
- [ ] Rechazo en rutas alumno sin rol alumno.
- [ ] Confirmar que rutas profesor sigan operativas tras cambios.

## Registro de lo avanzado

### Backend completado
- [x] Endpoint PATCH /admin/usuarios/:usuario/rol con rol dinamico (alumno, profesor, admin).
- [x] Regla de proteccion para impedir modificar al ultimo admin activo.
- [x] Endpoint PATCH /admin/usuarios/:usuario/curso con validacion de curso.
- [x] Endpoint PATCH /admin/usuarios/:usuario/curso actualizado para asignar multiples cursos (campo cursos).
- [x] Endpoint PATCH /admin/usuarios/:usuario/estado con estados activo/inactivo/bloqueado.
- [x] Login actualizado para negar acceso a usuarios no activos.
- [x] Usuario incluye estado en respuestas principales (listado y detalle base de usuarios).
- [x] Migracion idempotente en arranque para asegurar columna Usuario.estado.
- [x] Migracion idempotente en arranque para crear tabla UsuarioCurso y backfill desde Usuario.curso.
- [x] Endpoints de alumno adaptados para resolver y usar varios cursos por usuario.
- [x] Registro y login adaptados para guardar/devolver cursos del alumno.
- [x] Campo email obligatorio agregado al registro y persistido en Usuario.
- [x] Email normalizado a minusculas y validado por formato y longitud; duplicados responden HTTP 409.
- [x] Email incluido en login y listados de usuarios.
- [x] Migracion compatible e idempotente para Usuario.email e indice unico; aplicada y verificada en MySQL local.
- [x] Endpoint POST /admin/invitaciones/cursos para generar codigo numerico de invitacion.
- [x] Endpoint POST /alumno/invitaciones/canjear para autoinscripcion de alumno por codigo.
- [x] Migracion idempotente para tablas InvitacionCurso e InvitacionCursoCanje.

### Validacion tecnica realizada
- [x] Verificacion de sintaxis en controladores y router principal.
- [x] Verificacion de diagnosticos sin errores en archivos modificados.
- [x] Build de produccion del frontend correcto tras cambios de autenticacion.
- [x] Verificacion visual en navegador de las vistas de login y registro.

### Validacion funcional realizada
- [x] Flujo de invitacion numerica operativo (crear codigo y canjear desde alumno).
- [x] Validado limite de cupo de invitacion: con cupoMaximo=2 permiten 2 canjes y el tercero falla por cupo.
- [x] Corregido bug de desactivacion temprana de invitacion tras el primer canje.

### Frontend de acceso completado
- [x] Login configurado como pagina inicial.
- [x] Registro accesible desde un boton discreto en la pantalla de login.
- [x] Diseno de autenticacion formal, adaptable y con iluminacion sutil.
- [x] Registro solicita email; perfil alumno queda por defecto y no se asigna curso automaticamente.

## Notas
- Catalogo actual de cursos permitido: diseno, redes, software, programacion-linux, frontend, administracion.
- Proximo paso recomendado: ejecutar bateria de pruebas manuales (Postman/Insomnia) y registrar evidencias por caso.
- Bateria de pruebas API creada: ver archivo bateria-pruebas-api-admin-alumno.md en esta misma carpeta.

## Diseno de dominio admin (en validacion)
- Curso: conjunto de materias con un nombre de programa, por ejemplo Redes y Software.
- Turno/oferta: una instancia del curso con turno (manana, tarde o noche), horario general y cupo maximo.
- Materia: asignatura incluida en el curso, por ejemplo Redes, Frontend, Programacion, Matematica o Ciencia.
- Clase: seccion de una materia, por ejemplo 1A Frontend; cada clase define horario semanal o modalidad por entregas.
- La inscripcion del alumno se realiza en una oferta de curso/turno y debe incorporarlo a todas las materias/clases incluidas.
- La inscripcion debe ser atomica: si el turno no tiene cupo, no se agrega al alumno a ninguna materia y se informa que el turno esta completo.
- Capacidad inicial de referencia: 25 alumnos por oferta, configurable por el admin.
- Los docentes se asignan por separado a cada clase; no forman parte del formulario de creacion de la oferta.
- El dashboard admin prioriza cursos, turnos, cupos e inscripciones; tareas y evaluaciones no son foco de este perfil.
- Prototipo visual del dashboard creado con turnos y cupos ilustrativos; aun no persiste cursos, clases ni matrículas.
- Pendiente de revisar con el usuario: campos y flujo de creacion/edicion/eliminacion antes de implementar backend.

## Estado del diseno visual
- El nuevo estilo del dashboard admin queda bajo revision; su vista usa ofertas y cupos ilustrativos.
- El panel de profesor se adapto al mismo estilo y presenta ofertas curso/turno y sus clases con horarios o modalidad por entregas.
- Admin y profesor consumen las mismas ofertas de ejemplo para mantener consistencia visual.
- Los selectores docentes distinguen clase y oferta, pero tareas/evaluaciones aun se guardan en backend con el campo legado `curso` (codigo de materia); la asociacion persistente por clase queda pendiente de migrar a `claseId`.

## Estado del diseno visual
- El nuevo estilo del dashboard admin queda bajo revision del usuario; los datos de turnos/cupos siguen siendo ilustrativos.
- El dashboard de profesor se adapto visualmente al mismo lenguaje sobrio de admin y presenta ofertas, clases, horarios y cupos.
- La pantalla docente ofrece seleccion de clase para tareas/evaluaciones, pero el backend actual aun persiste estos recursos por materia (`curso` de texto), no por `claseId`.
- Pendiente: definir/migrar la relacion persistente curso-oferta-materia-clase-matricula y asociar tareas, evaluaciones y docentes por clase antes de considerar completa la integracion.

## Backlog funcional (pendiente)
- Implementar gestion admin de cursos/ofertas, materias, clases e inscripciones con validacion de cupos.
- Implementar asignacion independiente de docentes por clase.
- Extender el flujo de invitaciones a formato QR (sobre la base del codigo numerico ya implementado).
- Objetivo del feature: que el alumno se auto-agregue a uno o varios cursos usando QR ademas del codigo.
- Pendientes de diseno para ese feature:
	- Duracion del codigo (expiracion y reuso).
	- Restricciones por curso/cupos.
	- Nivel de seguridad (token firmado, one-time, trazabilidad).

## Pendiente especifico QR
- Implementacion QR pendiente: reutilizar flujo de canje actual basado en codigo numerico.
- Pendiente de pruebas QR: agregar casos de scanner, link deep-link y manejo de expiracion/cupos via QR.

## Mensajes al registrarse (futuro)
- Enviar un mensaje al email del usuario despues del registro.
- Definir si sera correo de bienvenida o verificacion de direccion antes de activar la cuenta.
- Elegir proveedor de correo, plantilla, tratamiento de errores de entrega y opcion de reenvio.
- Pendiente: implementar y probar entrega, fallos del proveedor y reenvio del mensaje.
