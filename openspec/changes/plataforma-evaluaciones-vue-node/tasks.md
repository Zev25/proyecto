## 1. Fundacion del proyecto

- [x] 1.1 Inicializar estructura base de frontend Vue y backend Node.js + Express, y verificar que ambos servicios inician sin errores en entorno local.
- [x] 1.2 Configurar variables de entorno con `dotenv` para conexion y secretos, y verificar carga correcta de variables en arranque.
- [x] 1.3 Configurar conexion MySQL con `mysql2` y verificar una consulta de salud de base de datos exitosa.

## 2. Acceso y roles educativos

- [x] 2.1 Implementar autenticacion de usuarios y verificar inicio de sesion exitoso para rol profesor y rol alumno.
- [ ] 2.2 Implementar autorizacion por rol en rutas y operaciones, y verificar que un alumno no puede acceder a funciones docentes.
- [x] 2.3 Implementar vistas iniciales por rol en frontend Vue, y verificar redireccion y contenido correcto segun perfil autenticado.
- [x] 2.4 Definir el rol administrador como encargado de asignar profesores desde una cuenta especial `admin`.
- [x] 2.5 Implementar busqueda de usuarios por identificador unico (`usuario`) y asignacion de rol `profesor` desde la API de administracion.
- [x] 2.6 Dejar una version funcional de frontend por perfiles, sin JWT, usando sesion local para controlar la vista activa por tipo de usuario.

## 3. Evaluaciones aleatorias

- [x] 3.1 Implementar gestion de banco de preguntas con limite de 50 por evaluacion y verificar rechazo al superar el limite.
- [x] 3.2 Implementar la cantidad de preguntas por intento elegida por el profesor, validar que no supere el banco y persistir la seleccion aleatoria exacta con su orden.
- [x] 3.3 Bloquear el inicio del intento cuando el banco tiene menos preguntas que la cantidad configurada.
- [ ] 3.4 Verificar manualmente banco de 50/51, cantidades configuradas distintas (por ejemplo 5 y 20), persistencia del orden y rechazo cuando el banco no alcanza la cantidad elegida en una base de pruebas.
- [x] 3.5 Importar bancos desde archivo Excel `.xlsx` con enunciado, tipo, opciones, respuesta correcta y puntos.

## 4. Resultados y trazabilidad

- [x] 4.1 Persistir intento/respuestas en una transaccion, enlazar intento con alumno/evaluacion y validar respuestas contra la seleccion guardada.
- [x] 4.2 Filtrar listado y detalle de intentos por `alumno_id`.
- [x] 4.3 Filtrar resultados y detalle docente por evaluacion creada por ese profesor.
- [ ] 4.4 Verificar manualmente propiedad alumno/docente, nota y trazabilidad en una base aislada.
- [ ] 4.5 Sustituir identidad por headers por autenticacion verificada antes de considerar seguros los controles de propiedad para produccion.

## 5. Entregas de tareas por archivo (pre-IA)

- [ ] 5.1 Implementar carga de archivos permitidos (.cs, .java, .py, .cpp, .html, .js, .zip) y verificar rechazo de extensiones no permitidas.
- [ ] 5.2 Implementar registro de metadatos de entrega (alumno, tarea, archivo, fecha, estado) y verificar consulta de detalle completa.
- [ ] 5.3 Implementar vista docente de entregas agrupadas por tarea y alumno, y verificar orden y navegacion esperada.

## 6. Correccion asistida por IA (fase final)

- [ ] 6.1 Definir y registrar la rubrica estructurada por criterios y pesos para revision de respuestas y archivos, y verificar que cada tarea tenga rubrica valida.
- [ ] 6.2 Integrar servicio IA para sugerencia de clasificacion de respuestas (correcta/parcial/incorrecta) y verificar respuesta con explicacion breve.
- [ ] 6.3 Integrar evaluacion IA de archivos contra rubrica y verificar salida por criterio (cumple/parcial/no cumple).
- [ ] 6.4 Implementar control docente de aceptacion/edicion de sugerencias IA y verificar publicacion de nota final aprobada por profesor.
- [ ] 6.5 Implementar trazabilidad de sugerencia IA y decision final docente, y verificar consulta historica auditable.

## 7. Documentacion y cierre incremental

- [x] 7.1 Actualizar proposal, specs y design ante cualquier cambio de alcance y verificar coherencia entre artefactos OpenSpec.
- [x] 7.2 Mantener `decision-log.md` con decisiones de conversacion por fecha y verificar que cada cambio relevante tenga su registro.
- [ ] 7.3 Ejecutar validacion final de planeacion OpenSpec y verificar que el cambio quede listo para fase de implementacion.

## 8. Interfaz docente y continuidad visual

- [x] 8.1 Separar el panel de profesor en una vista dedicada y reorganizar `App.vue` para reducir acoplamiento visual por perfil.
- [x] 8.2 Redisenar el panel de profesor con Quasar, incluyendo selector global de curso, secciones por navegacion y formularios flotantes para tareas y evaluaciones.
- [ ] 8.3 Verificar manualmente el comportamiento visual del panel de profesor en ejecucion real y ajustar responsividad o usabilidad segun hallazgos.
- [x] 8.4 Iniciar el desarrollo visual del panel de administrador siguiendo la nueva linea visual del panel de profesor; prototipo creado y estilo bajo revision.
- [x] 8.5 Listar evaluaciones del profesor con fecha de creación y fin, e incorporar edición segura antes de que existan intentos.
- [x] 8.6 Mantener rail docente a altura completa, trasladar el header a la columna principal y habilitar scroll solo para el contenido.
- [x] 8.7 Añadir acceso al perfil docente desde el avatar y alinear el header con el estilo del administrador.

## 9. Interfaz del alumno e integracion de actividades

- [x] 9.1 Eliminar el aviso de bienvenida del panel del alumno y dejar la navegacion principal anclada en la parte superior.
- [x] 9.2 Crear una vista visual de perfil con datos de cuenta, preferencias de notificaciones, cambio de contrasena deshabilitado y cierre de sesion funcional.
- [x] 9.3 Crear la vista visual de cursos con selector de materias y listas separadas de actividades activas y proximas.
- [x] 9.4 Permitir abrir el detalle visual de tareas y evaluaciones de ejemplo, mostrando enunciado, fecha y estado; incluir campos de respuesta/archivo sin simular persistencia.
- [ ] 9.5 Conectar el selector y las listas del alumno con cursos inscritos, tareas y evaluaciones reales, y clasificar las actividades segun su estado y fechas.
- [x] 9.6 Conectar interfaz alumno con evaluaciones creadas por el profesor: iniciar intento, mostrar preguntas sin claves, enviar respuestas y mostrar nota/historial.
- [ ] 9.7 Implementar y persistir el cambio de contrasena y las preferencias de notificaciones en el backend.
- [ ] 9.8 Agregar pruebas de integracion del recorrido alumno y verificar responsive, estados vacios, errores de servidor y permisos.
- [ ] 9.9 Verificar manualmente el flujo alumno-evaluacion y cerrar la autenticacion antes de validar el aislamiento de resultados.

## 10. Categorias de evaluacion y promedios del alumno

- [x] 10.1 Agregar el tipo `evaluacion` / `examen_final` al modelo, migrar registros existentes como evaluaciones regulares y validar el tipo al crear o actualizar.
- [x] 10.2 Permitir al profesor consultar y cambiar unicamente la categoria de evaluaciones propias, incluso si ya tienen intentos, sin modificar su historial.
- [x] 10.3 Diferenciar Evaluaciones regulares y Examenes finales mediante subsecciones dentro de una sola entrada Evaluaciones, manteniendo el flujo de iniciar, responder y enviar.
- [x] 10.4 Calcular la nota de cada intento enviado sobre 10 segun el puntaje maximo seleccionado y mostrar el promedio de todos los intentos completados por categoria; excluir intentos sin enviar.
- [ ] 10.5 Verificar migracion, aislamiento por rol/propiedad, clasificacion, flujo por categoria, promedios y estados vacios con pruebas disponibles.

## 11. Invitaciones y matriculacion de alumnos

- [x] 11.1 Conectar la pantalla de Invitaciones del administrador con la API para elegir cursos, expiracion y usos, y mostrar/copiar el codigo generado.
- [x] 11.2 Agregar canje de codigo en Cursos del alumno, mostrar errores del backend y actualizar los cursos de la sesion al confirmar la matricula.
- [x] 11.3 Documentar el parcial del 22 de octubre de 2026, dejando pendientes la seleccion de partes a presentar y el pulido de esas partes.
- [ ] 11.4 Verificar creacion/canje, codigos invalidos o vencidos, limite de usos, duplicados y persistencia en una base de pruebas.

## 12. Revision tecnica y despliegue de base de datos

- [x] 12.1 Escanear codigo fuente, retirar helpers/estilos/migracion duplicados verificados como obsoletos y documentar fixtures de demostracion restantes.
- [x] 12.2 Dejar anotada para despues de la presentacion la idea de evaluar una base de datos online, sin seleccionar proveedor ni migrar datos.
- [ ] 12.3 Resolver hallazgos P0/P1 de autenticacion, autorizacion, hashing de contrasenas y rutas publicas descritos en `openspec/specs/backend-seguridad.md` antes de exponer la API.

## 13. Catalogo academico persistente

- [x] 13.1 Crear tablas `Curso`, `OfertaCurso`, `Clase` y `MatriculaOferta`, con migraciones idempotentes y sin sembrar los conteos ficticios actuales.
- [x] 13.2 Implementar consulta/creacion de ofertas y clases para admin, validar horarios/cupos y calcular inscritos desde matriculas reales.
- [x] 13.3 Sustituir `courseOfferings.js` en vistas admin/docente por catalogo obtenido desde API y mostrar estado vacio cuando no haya ofertas.
- [x] 13.4 Conectar invitaciones nuevas a ofertas; canjearlas de forma atomica, respetar duplicados/cupo y conservar soporte para invitaciones existentes por `cursos_json`.
- [x] 13.5 Registrar `codigo_legacy` por clase para mantener compatibilidad temporal con tareas/evaluaciones y `UsuarioCurso`.
- [ ] 13.6 Verificar manualmente alta, listado, carga de clases, canje, cupo y conteo de matriculas en una base de pruebas MySQL.

## 14. Ciclo de vida y cancelacion de intentos

- [x] 14.1 Persistir los estados `en_progreso`, `completado` y `cancelado`, y migrar intentos existentes segun sus respuestas guardadas.
- [x] 14.2 Crear la ruta de cancelacion con validacion de propiedad/estado y rechazar envios de intentos cancelados o completados.
- [x] 14.3 Cancelar al cambiar de seccion, ocultar la pestana o abandonar la pagina; mantener visibles los avisos y abrir el historial por un boton flotante.
- [ ] 14.4 Verificar manualmente cancelacion, bloqueo de envio, historial y promedio en una base de pruebas y navegador.

## 15. Navegacion del alumno

- [x] 15.1 Reunir Evaluaciones regulares y Examenes finales bajo una sola entrada con selector interno de categoria.
- [x] 15.2 Mover Material del curso y Horarios a subsecciones dentro de Cursos.
- [x] 15.3 Agregar la seccion Tareas y conectarla con las tareas publicadas de los cursos inscritos.
- [ ] 15.4 Verificar manualmente navegacion, carga de tareas y adaptacion responsive en navegador.

## 16. Migraciones de esquema y arranque backend

- [ ] 16.1 Extraer las modificaciones de esquema de `index.js` a migraciones versionadas y reconciliarlas con `backend/db/schema.sql` para evitar definiciones duplicadas.
- [ ] 16.2 Ejecutar migraciones antes de abrir el puerto y detener el arranque si alguna migracion falla.

## 17. Reorganizacion del backend por dominios

- [x] 17.1 Organizar `backend/src/controladores/` en subcarpetas por dominio (`admin`, `alumno`, `auth`, `evaluaciones`, `intentos`, `invitaciones`, `ofertas`, `tareas`, `usuarios`, `sistema`) y repartir `adminPanel`, `alumno` y `evaluaciones` en archivos por tema, verificando por hash que cada funcion no cambio.
- [x] 17.2 Crear el controlador de registro (`auth/registro.js`) con validacion, normalizacion y deteccion de duplicados, separado del de login.
- [x] 17.3 Mover los 49 handlers `(req, res)` a un `controlador.js` por dominio, de modo que `index.js` solo declare rutas y middlewares; verificado que cuerpos, metodos, rutas y roles coinciden con la version anterior.
- [x] 17.4 Extraer `fechaIsoValida`, la configuracion de Multer para Excel y la migracion de esquema fuera de `index.js`, sin cambiar su comportamiento; la migracion sigue ejecutandose desde `index.js` antes de las rutas.
- [x] 17.5 Importar `ROLES_VALIDOS` en el cambio de rol de usuarios, que antes fallaba por no estar importado.
- [ ] 17.6 Repartir las rutas en un archivo por dominio (`rutas.js`) y evaluar rutas por recurso en lugar de por rol.
- [x] 17.7 Verificar las rutas con el servidor en ejecucion: 69 comprobaciones de lectura y de rechazo de entradas invalidas (roles, validaciones, Multer, parser de Excel, CORS) contra MySQL local, sin escribir datos.
- [ ] 17.8 Probar con el servidor en ejecucion los flujos que escriben datos (registro exitoso, login con credenciales reales, crear evaluacion, intento completo, canje de invitacion, cambios de rol, curso y estado, importacion de Excel valida), idealmente contra una base de pruebas.

## 18. Seguridad del backend

- [x] 18.1 Preparar JWT sin integrarlo: modulo de firma/verificacion con algoritmo fijado, emisor y audiencia (`seguridad/`), y middleware `autenticar` que establece `req.user` solo desde un token verificado. Variables declaradas en `.env.example`. Verificado con pruebas aisladas (manipulacion, `alg: none`, otro algoritmo, expiracion).
- [ ] 18.2 Reemplazar contrasenas en texto plano por Argon2id o bcrypt, con migracion compatible con cuentas existentes.
- [ ] 18.3 Integrar JWT: emitirlo en el login, aplicar `autenticar` antes de `autorizarRoles` y retirar `x-user-role`, `body.tipo` y `query.tipo` como fuente de autoridad.
- [ ] 18.4 Derivar el usuario de las operaciones desde `req.user` y no aceptar `adminUsuario`, `alumnoUsuario` o `profesorUsuario` enviados por el cliente.
- [ ] 18.5 Proteger con autenticacion y rol las rutas `/usuarios`, `/usuarios/:id`, `DELETE /usuarios/:id`, `/admin/buscar-usuario` y `/tareas/:curso`; restringir `/db-health`.
- [ ] 18.6 Forzar el rol `alumno` en el registro publico.
- [ ] 18.7 Agregar `helmet`, limite de intentos en login y canje de invitaciones, y CORS por entorno.
- [ ] 18.8 Validar entradas con esquemas, limitar el tamano del body y ocultar `error.message` en respuestas 500 mediante un manejador de errores central.
- [ ] 18.9 Escribir pruebas de acceso anonimo, rol incorrecto, recursos ajenos, login, rate limit y expiracion de token.