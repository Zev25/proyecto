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

## Regla de mantenimiento

- Registrar nuevas decisiones por fecha, indicando contexto breve y efecto en alcance, diseno o tareas.
- Si una decision reemplaza otra, anotar explicitamente la sustitucion para evitar ambiguedad.