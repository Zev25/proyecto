# Decision Log

## 2026-08-20

- Se activa modo de exploracion para definir alcance y arquitectura sin implementar codigo.
- Se confirma orientacion del proyecto a herramienta educativa para evaluaciones academicas.
- Se evalua opcion ASP.NET de forma conceptual, luego se descarta por preferencia de stack.
- Se confirma stack: Vue (frontend), Node.js + Express (backend), MySQL (`mysql2`) y configuracion con `dotenv`.
- Se acuerda que IA y revision automatica de tareas en archivos quedan para la etapa final del plan.
- Se solicita documentacion continua de lo realizado y de decisiones tomadas en conversacion.

## 2026-09-14

- Se corrige integracion de modulos para mantener backend en formato ESM de forma consistente.
- Se valida conectividad MySQL desde backend con usuario de aplicacion y base `educacion_db`.
- Se agrega y configura CORS para permitir llamadas desde frontend Vite en `http://localhost:5173`.
- Se conecta la ruta `POST /registro` a insercion real en tabla `Usuario` mediante controlador.
- Se confirma creacion de usuarios desde frontend hacia backend y persistencia en base de datos.
- Se implementa el flujo de `POST /login` con validacion de usuario y contrasena contra la tabla `Usuario`.
- Se define la regla de negocio de un usuario `admin` como responsable de asignar el rol `profesor`.
- Se crean rutas de administracion para buscar usuarios por identificador unico y asignar rol docente desde una cuenta administrativa.
- Se implementa un flujo simplificado de frontend por perfiles: login, sesion local y panel distinto segun `tipo` (`alumno`, `profesor`, `admin`).
- Se decide postergar JWT para una etapa posterior para evitar complejidad innecesaria con permisos en desarrollo inicial.
- Se valida que la aplicacion frontend compila correctamente con `npm run build` luego del rediseño por perfiles.

## 2026-09-23

- Se incorpora separacion funcional del frontend por perfil dentro de `views/Profesor`, `views/Alumno` y `views/Admin`, dejando `App.vue` como orquestador principal.
- Se rehace desde cero el visual del panel de profesor usando Quasar para mejorar compactacion, legibilidad y escalabilidad del dashboard.
- Se agrega navegacion lateral funcional en el panel docente para dividir dashboard, cursos, alumnos, tareas, evaluaciones y resultados.
- Se introduce selector global de curso en el panel de profesor para cambiar el contexto visual completo segun la materia elegida.
- Se trasladan los flujos de creacion de tareas y evaluaciones a ventanas flotantes (`q-dialog`) para reducir ruido visual en el dashboard principal.
- Se cambia la carga de preguntas de evaluacion a un flujo guiado de una pregunta visible por vez, evitando apilar nuevas preguntas debajo de la anterior.
- Queda pendiente verificar visualmente el panel de profesor en ejecucion real y comenzar el desarrollo visual del panel de administrador.

## 2026-10-15

- Se detecta que el numero configurado para sorteo podia superar las preguntas existentes en el banco, creando evaluaciones imposibles de iniciar.
- Se valida `preguntasPorIntento <= preguntas.length` en backend al crear y editar, y se devuelve un error 400 con el tamano actual del banco.
- El editor docente muestra el conteo de preguntas del banco, marca el campo cuando el sorteo lo supera y bloquea el guardado hasta corregirlo.
- Se mantiene pendiente la verificacion manual del punto 3.4 en una base de pruebas; esta correccion no la sustituye.

## 2026-10-16

- Se agrega una categoria explicita para separar evaluaciones regulares de examenes finales, con migracion predeterminada de registros existentes a evaluacion regular y reclasificacion docente independiente del historial.
- El alumno puede realizar ambas categorias desde vistas separadas; cada intento enviado se normaliza sobre 10 y cuenta por separado en el promedio de su categoria. Los intentos sin enviar no se incluyen.
- Se habilita la interfaz para crear invitaciones de cursos desde administración y canjearlas desde Cursos del alumno, manteniendo validación transaccional de vigencia, cupo y duplicados.
- Se registra el parcial del 22 de octubre de 2026: se presentarán partes del proyecto; queda pendiente decidir qué mostrar y luego pulir esas partes.

## 2026-10-19

- Se anota como idea futura evaluar una base de datos online despues de la presentacion; no se selecciona proveedor ni se inicia una migracion.
- Se fija el header docente dentro de la columna principal para mantener la navegacion de rail de borde superior a inferior; el scroll queda en el contenido del main.
- Se agrega acceso a perfil docente desde el avatar, con retorno a la seccion previa; el header no duplica el cierre de sesion que permanece en el perfil/rail.
- Se realiza escaneo estatico: se eliminan helpers sin referencias (`asignarRolProfesor`, `actualizarUsuario`), CSS alumno sin selectores en el template y definiciones duplicadas de `IntentoPregunta` en el arranque y schema snapshot.
- Se actualiza la revision de seguridad: hay filtros SQL de propiedad para intentos, pero no son confiables mientras los usuarios/roles provengan de headers falsificables; se documentan rutas publicas, errores SQL, migraciones, rate limits pendientes y fixtures activos.
- Se registra que las URLs de API estan fijadas a `localhost:3000` y CORS solo permite origins locales; la configuracion de despliegue queda fuera del trabajo inmediato.
- Se identifican `start1`, `nodemon` y el directorio vacio `frontend/src/components/` como candidatos de limpieza no bloqueantes; no se eliminan por si forman parte de comandos/estructura que el equipo use.
- Se decide sustituir `courseOfferings.js` por persistencia normalizada de curso/oferta/clase/matricula. No se precargan sus horarios, cupos ni inscriptos ficticios; nuevas invitaciones usaran IDs de ofertas y los codigos de invitacion existentes por `cursos_json` conservaran compatibilidad.
- Se implementa el catalogo persistente en `Curso`, `OfertaCurso`, `Clase` y `MatriculaOferta`; admin crea ofertas, profesor consume el mismo catalogo, alumno ve solo sus ofertas matriculadas y las invitaciones nuevas matriculan ofertas de forma atomica. La base local responde con catalogo vacio y no se sembraron datos de ejemplo.
- Se valida por GET que admin/profesor reciban `total: 0` cuando no hay ofertas y que una cuenta de alumno inexistente sea rechazada. La prueba manual de alta real, cupo e invitacion queda pendiente en la tarea 13.6.

## 2026-10-20

- Se decide cancelar y no reanudar el intento si el alumno cambia de seccion, oculta la pestana o abandona la pagina. El estado queda persistido como `cancelado`; solo un envio exitoso lo marca `completado`, y los estados no completados no cuentan para el promedio.
- Se implementan la migracion de estado, el endpoint de cancelacion con comprobacion de propiedad, el bloqueo de reenvio y la actualizacion del historial/interfaz. La verificacion manual en base de pruebas y navegador queda pendiente en la tarea 14.4.

## 2026-10-22

- Se corrige la presentacion de los avisos de cancelacion y error para que permanezcan visibles aunque el alumno este desplazado en la pagina.
- Se elimina la tarjeta independiente del ultimo intento para evitar duplicar el resultado del historial. La lista permanente inferior se reemplaza por el boton flotante `Mis intentos`, que abre un dialogo con los intentos de la categoria actual.
- La revision del navegador no pudo completar la comprobacion: la vista se restablecio al Dashboard y se observo un `404` de API. La verificacion visual y del flujo real sigue pendiente en la tarea 14.4.

## 2026-10-23

- Se unifican Evaluaciones regulares y Examenes finales en una entrada de navegacion con selector interno, conservando listados, promedios e intentos de cada categoria.
- Material del curso y Horarios pasan a subsecciones dentro de Cursos. Se agrega Tareas como seccion principal conectada a `GET /alumno/tareas` para listar tareas publicadas de cursos inscritos.
- El build de frontend pasa; la comprobacion manual de navegacion y responsividad queda pendiente en la tarea 15.4.

## 2026-10-29

- Se registra como deuda tecnica que `index.js` mezcla el registro de rutas con una migracion de esquema extensa y sentencias DDL que se solapan con `backend/db/schema.sql`.
- A futuro se reemplazara la migracion inline por migraciones versionadas, se conciliara el esquema snapshot para evitar duplicados y se ordenara el arranque para que la API escuche solo despues de migraciones exitosas. Las tareas 16.1 y 16.2 quedan pendientes; no se cambia ahora el comportamiento del backend.

## Regla de mantenimiento

- Registrar nuevas decisiones por fecha, indicando contexto breve y efecto en alcance, diseno o tareas.
- Si una decision reemplaza otra, anotar explicitamente la sustitucion para evitar ambiguedad.