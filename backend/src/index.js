import { router } from './config.js';
import { autorizarRoles } from './middleware/autorizarRoles.js';
import { asegurarEstadoUsuario } from './migraciones/asegurarEstadoUsuario.js';

import {
  raizControlador,
  dbHealthControlador,
  panelAlumnoControlador,
  panelProfesorControlador,
  panelAdminControlador
} from './controladores/sistema/controlador.js';
import { registroControlador, loginControlador } from './controladores/auth/controlador.js';
import {
  listarUsuariosControlador,
  obtenerUsuarioControlador,
  eliminarUsuarioControlador
} from './controladores/usuarios/controlador.js';
import {
  buscarUsuarioControlador,
  resumenAdminControlador,
  resumenCursosAdminControlador,
  listarUsuariosAdminControlador,
  tareasProfesorAdminControlador,
  evaluacionesProfesorAdminControlador,
  cambiarRolControlador,
  cambiarCursoControlador,
  cambiarEstadoControlador
} from './controladores/admin/controlador.js';
import {
  listarOfertasAdminControlador,
  asignarProfesorClaseControlador,
  listarOfertasProfesorControlador,
  crearOfertaControlador,
  listarOfertasAlumnoControlador
} from './controladores/ofertas/controlador.js';
import {
  crearInvitacionControlador,
  canjearInvitacionControlador
} from './controladores/invitaciones/controlador.js';
import {
  crearEvaluacionControlador,
  listarEvaluacionesProfesorControlador,
  publicarEvaluacionControlador,
  eliminarEvaluacionControlador,
  categoriaEvaluacionControlador,
  obtenerEvaluacionControlador,
  actualizarEvaluacionControlador,
  importarExcelControlador,
  intentosEvaluacionControlador,
  detalleIntentoProfesorControlador
} from './controladores/evaluaciones/controlador.js';
import {
  evaluacionesAlumnoControlador,
  resumenAlumnoControlador,
  tareasAlumnoControlador,
  intentosAlumnoControlador,
  detalleIntentoAlumnoControlador
} from './controladores/alumno/controlador.js';
import {
  iniciarIntentoControlador,
  cancelarIntentoControlador,
  responderEvaluacionControlador
} from './controladores/intentos/controlador.js';
import {
  crearTareaControlador,
  listarTareasProfesorControlador,
  publicarTareaControlador,
  eliminarTareaControlador,
  tareasPorCursoControlador
} from './controladores/tareas/controlador.js';

await asegurarEstadoUsuario();

router.get('/', raizControlador);
router.get('/db-health', dbHealthControlador);
router.get('/panel-alumno', panelAlumnoControlador);
router.get('/panel-profesor', autorizarRoles('profesor'), panelProfesorControlador);
router.get('/panel-admin', autorizarRoles('admin'), panelAdminControlador);

router.post('/registro', registroControlador);
router.post('/login', loginControlador);

router.get('/usuarios', listarUsuariosControlador);
router.get('/usuarios/:id', obtenerUsuarioControlador);
router.delete('/usuarios/:id', eliminarUsuarioControlador);

router.get('/admin/ofertas', autorizarRoles('admin'), listarOfertasAdminControlador);
router.patch('/admin/clases/:claseId/profesor', autorizarRoles('admin'), asignarProfesorClaseControlador);
router.get('/profesor/ofertas', autorizarRoles('profesor'), listarOfertasProfesorControlador);
router.post('/admin/ofertas', autorizarRoles('admin'), crearOfertaControlador);

router.get('/admin/buscar-usuario', buscarUsuarioControlador);
router.get('/admin/resumen', autorizarRoles('admin'), resumenAdminControlador);
router.get('/admin/cursos/resumen', autorizarRoles('admin'), resumenCursosAdminControlador);
router.get('/admin/usuarios', autorizarRoles('admin'), listarUsuariosAdminControlador);
router.get('/admin/profesores/:usuario/tareas', autorizarRoles('admin'), tareasProfesorAdminControlador);
router.get('/admin/profesores/:usuario/evaluaciones', autorizarRoles('admin'), evaluacionesProfesorAdminControlador);
router.patch('/admin/usuarios/:usuario/rol', autorizarRoles('admin'), cambiarRolControlador);
router.patch('/admin/usuarios/:usuario/curso', autorizarRoles('admin'), cambiarCursoControlador);
router.patch('/admin/usuarios/:usuario/estado', autorizarRoles('admin'), cambiarEstadoControlador);
router.post('/admin/invitaciones/cursos', autorizarRoles('admin'), crearInvitacionControlador);

router.post('/profesor/evaluaciones', autorizarRoles('profesor'), crearEvaluacionControlador);
router.get('/profesor/evaluaciones', autorizarRoles('profesor'), listarEvaluacionesProfesorControlador);
router.patch('/profesor/evaluaciones/:id/publicacion', autorizarRoles('profesor'), publicarEvaluacionControlador);
router.delete('/profesor/evaluaciones/:id', autorizarRoles('profesor'), eliminarEvaluacionControlador);
router.patch('/profesor/evaluaciones/:id/categoria', autorizarRoles('profesor'), categoriaEvaluacionControlador);
router.get('/profesor/evaluaciones/:id', autorizarRoles('profesor'), obtenerEvaluacionControlador);
router.put('/profesor/evaluaciones/:id', autorizarRoles('profesor'), actualizarEvaluacionControlador);
router.post('/profesor/evaluaciones/importar-excel', autorizarRoles('profesor'), importarExcelControlador);

router.get('/alumno/evaluaciones', autorizarRoles('alumno'), evaluacionesAlumnoControlador);
router.get('/alumno/ofertas', autorizarRoles('alumno'), listarOfertasAlumnoControlador);
router.post('/alumno/evaluaciones/:id/intentos', autorizarRoles('alumno'), iniciarIntentoControlador);
router.get('/alumno/resumen', autorizarRoles('alumno'), resumenAlumnoControlador);
router.get('/alumno/tareas', autorizarRoles('alumno'), tareasAlumnoControlador);
router.get('/alumno/intentos', autorizarRoles('alumno'), intentosAlumnoControlador);
router.get('/alumno/intentos/:intentoId', autorizarRoles('alumno'), detalleIntentoAlumnoControlador);
router.post('/alumno/intentos/:intentoId/cancelar', autorizarRoles('alumno'), cancelarIntentoControlador);
router.post('/alumno/evaluaciones/:id/responder', autorizarRoles('alumno'), responderEvaluacionControlador);
router.post('/alumno/invitaciones/canjear', autorizarRoles('alumno'), canjearInvitacionControlador);

router.post('/profesor/tareas', autorizarRoles('profesor'), crearTareaControlador);
router.get('/profesor/tareas', autorizarRoles('profesor'), listarTareasProfesorControlador);
router.patch('/profesor/tareas/:id/publicacion', autorizarRoles('profesor'), publicarTareaControlador);
router.delete('/profesor/tareas/:id', autorizarRoles('profesor'), eliminarTareaControlador);
router.get('/tareas/:curso', tareasPorCursoControlador);

router.get('/profesor/evaluaciones/:id/intentos', autorizarRoles('profesor'), intentosEvaluacionControlador);
router.get('/profesor/intentos/:intentoId', autorizarRoles('profesor'), detalleIntentoProfesorControlador);
