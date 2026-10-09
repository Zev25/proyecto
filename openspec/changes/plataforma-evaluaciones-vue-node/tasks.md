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

- [ ] 3.1 Implementar gestion de banco de preguntas con limite de 50 por evaluacion y verificar rechazo al superar el limite.
- [ ] 3.2 Implementar generacion de intento con 20 preguntas aleatorias y verificar que cada intento persiste su seleccion exacta.
- [ ] 3.3 Implementar validacion de banco insuficiente y verificar bloqueo de inicio cuando hay menos de 20 preguntas.

## 4. Resultados y trazabilidad

- [ ] 4.1 Implementar persistencia de respuestas por intento y verificar asociacion correcta alumno-intento-evaluacion.
- [ ] 4.2 Implementar consulta de resultados para alumno y verificar que solo ve sus propios resultados.
- [ ] 4.3 Implementar consulta docente de resultados por evaluacion y verificar listado de intentos y calificaciones.

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
- [ ] 8.4 Iniciar el desarrollo visual del panel de administrador siguiendo la nueva linea visual del panel de profesor.

## 9. Interfaz del alumno e integracion de actividades

- [x] 9.1 Eliminar el aviso de bienvenida del panel del alumno y dejar la navegacion principal anclada en la parte superior.
- [x] 9.2 Crear una vista visual de perfil con datos de cuenta, preferencias de notificaciones, cambio de contrasena deshabilitado y cierre de sesion funcional.
- [x] 9.3 Crear la vista visual de cursos con selector de materias y listas separadas de actividades activas y proximas.
- [x] 9.4 Permitir abrir el detalle visual de tareas y evaluaciones de ejemplo, mostrando enunciado, fecha y estado; incluir campos de respuesta/archivo sin simular persistencia.
- [ ] 9.5 Conectar el selector y las listas del alumno con cursos inscritos, tareas y evaluaciones reales, y clasificar las actividades segun su estado y fechas.
- [ ] 9.6 Completar el flujo de evaluaciones reales del alumno: mostrar preguntas sin exponer respuestas correctas, enviar respuestas y reflejar intentos y resultados.
- [ ] 9.7 Implementar y persistir el cambio de contrasena y las preferencias de notificaciones en el backend.
- [ ] 9.8 Agregar pruebas de integracion del recorrido alumno y verificar responsive, estados vacios, errores de servidor y permisos.

> La carga y persistencia de archivos, junto con la consulta docente de entregas, se mantiene en las tareas 5.1-5.3.