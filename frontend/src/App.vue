<script setup>
import { reactive, ref } from 'vue';
import AlumnoDashboard from './views/Alumno/alumno.vue';
import ProfesorPanel from './views/Profesor/profesor.vue';
import AdminDashboard from './views/Admin/AdminDashboard.vue';

// Auth state
const loginForm = reactive({
  usuario: '',
  contrasena: ''

  
});

const registroForm = reactive({
  nombre: '',
  apellido: '',
  email: '',
  usuario: '',
  contrasena: '',
  tipo: 'alumno'
});

const session = reactive({
  logged: false,
  user: null
});

const adminPreview = import.meta.env.DEV && new URLSearchParams(window.location.search).get('preview') === 'admin';
const teacherPreview = import.meta.env.DEV && new URLSearchParams(window.location.search).get('preview') === 'teacher';
const fechaHeaderDocente = new Intl.DateTimeFormat('es', {
  day: 'numeric',
  month: 'long',
  year: 'numeric'
}).format(new Date());

const authView = ref('login');
const cargandoLogin = ref(false);
const cargandoRegistro = ref(false);
const error = ref('');
const okMessage = ref('');

const limpiarMensajes = () => {
  error.value = '';
  okMessage.value = '';
};

// Session helpers
const cerrarSesion = () => {
  session.logged = false;
  session.user = null;
  loginForm.usuario = '';
  loginForm.contrasena = '';
  limpiarMensajes();
};

const login = async () => {
  limpiarMensajes();
  cargandoLogin.value = true;

  try {
    const response = await fetch('http://localhost:3000/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loginForm)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || data.error || 'Error al iniciar sesión');
    }

    session.logged = true;
    session.user = data.user;
    loginForm.usuario = '';
    loginForm.contrasena = '';
  } catch (e) {
    error.value = e.message;
  } finally {
    cargandoLogin.value = false;
  }
};

const actualizarCursosAlumno = (cursos) => {
  if (session.user?.tipo !== 'alumno') return;
  session.user = {
    ...session.user,
    curso: cursos[0] || null,
    cursos
  };
};

const registrar = async () => {
  limpiarMensajes();
  cargandoRegistro.value = true;

  try {
    const response = await fetch('http://localhost:3000/registro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(registroForm)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || data.error || 'Error al registrar usuario');
    }

    okMessage.value = 'Usuario registrado correctamente';
    loginForm.usuario = registroForm.usuario;
    loginForm.contrasena = '';
    authView.value = 'login';
    registroForm.nombre = '';
    registroForm.apellido = '';
    registroForm.email = '';
    registroForm.usuario = '';
    registroForm.contrasena = '';
    registroForm.tipo = 'alumno';
  } catch (e) {
    error.value = e.message;
  } finally {
    cargandoRegistro.value = false;
  }
};

// Teacher and evaluation state
const evalForm = reactive({
  titulo: '',
  categoria: 'evaluacion',
  curso: '',
  clase: '',
  preguntasPorIntento: 20,
  fechaFin: '',
  preguntas: [
    {
      enunciado: '',
      opciones: ['', '', '', ''],
      respuestaCorrecta: '',
      puntos: 1
    }
  ]
});
const importandoExcelEvaluacion = ref(false);
const importacionesExcelCompletadas = ref(0);
const mensajeImportacionExcel = ref('');
const estadoImportacionExcel = ref('info');
const evaluacionesProfesor = ref([]);
const cargandoEvaluacionesProfesor = ref(false);
const ofertasProfesor = ref([]);
const cargandoOfertasProfesor = ref(false);
const evaluacionEnEdicionId = ref(null);
const guardandoEvaluacion = ref(false);
const evaluacionesGuardadas = ref(0);

// Teacher task form
const tareaForm = reactive({
  titulo: '',
  descripcion: '',
  curso: '',
  clase: '',
  fechaVencimiento: ''
});

// Teacher evaluation helpers
const agregarPregunta = () => {
  if (evalForm.preguntas.length >= 50) return;
  evalForm.preguntas.push({
    enunciado: '',
    opciones: ['', '', '', ''],
    respuestaCorrecta: '',
    puntos: 1
  });
};

const resetearEvaluacionForm = () => {
  evalForm.titulo = '';
  evalForm.categoria = 'evaluacion';
  evalForm.curso = 'frontend';
  evalForm.clase = 'redes-software-tarde:1A Frontend';
  evalForm.preguntasPorIntento = 20;
  evalForm.fechaFin = '';
  evalForm.preguntas = [{
    enunciado: '',
    opciones: ['', '', '', ''],
    respuestaCorrecta: '',
    puntos: 1
  }];
};

const cargarEvaluacionesProfesor = async () => {
  cargandoEvaluacionesProfesor.value = true;

  try {
    const response = await fetch('http://localhost:3000/profesor/evaluaciones', {
      headers: {
        'x-user-role': 'profesor',
        'x-user-name': session.user?.usuario || 'profesor-demo'
      }
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'No se pudieron cargar las evaluaciones');
    evaluacionesProfesor.value = data.data || [];
  } catch (e) {
    error.value = e.message;
  } finally {
    cargandoEvaluacionesProfesor.value = false;
  }
};

const cargarOfertasProfesor = async () => {
  cargandoOfertasProfesor.value = true;

  try {
    const response = await fetch('http://localhost:3000/profesor/ofertas', {
      headers: {
        'x-user-role': 'profesor',
        'x-user-name': session.user?.usuario || 'profesor-demo'
      }
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'No se pudieron cargar las ofertas');
    ofertasProfesor.value = data.data || [];
  } catch (e) {
    error.value = e.message;
  } finally {
    cargandoOfertasProfesor.value = false;
  }
};

const actualizarCategoriaEvaluacion = async ({ evaluacionId, categoria }) => {
  try {
    const response = await fetch(`http://localhost:3000/profesor/evaluaciones/${evaluacionId}/categoria`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': 'profesor',
        'x-user-name': session.user?.usuario || 'profesor-demo'
      },
      body: JSON.stringify({ categoria })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'No se pudo cambiar la categoría');
    okMessage.value = 'Categoría actualizada';
    await cargarEvaluacionesProfesor();
  } catch (e) {
    error.value = e.message;
  }
};

const editarEvaluacionProfesor = async (evaluacionId) => {
  limpiarMensajes();

  try {
    const response = await fetch(`http://localhost:3000/profesor/evaluaciones/${evaluacionId}`, {
      headers: {
        'x-user-role': 'profesor',
        'x-user-name': session.user?.usuario || 'profesor-demo'
      }
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'No se pudo abrir la evaluación');

    evalForm.titulo = data.data.titulo;
    evalForm.categoria = data.data.categoria || 'evaluacion';
    evalForm.curso = data.data.curso || '';
    const claseGuardada = ofertasProfesor.value
      .flatMap((oferta) => oferta.classes.map((clase) => ({
        value: `${oferta.id}:${clase.name}`,
        legacyCourse: clase.legacyCourse
      })))
      .find((clase) => clase.legacyCourse === data.data.curso);
    evalForm.clase = claseGuardada?.value || '';
    evalForm.preguntasPorIntento = Number(data.data.preguntas_por_intento);
    evalForm.fechaFin = data.data.fecha_fin || '';
    evalForm.preguntas = data.data.preguntas.map((pregunta) => ({
      ...pregunta,
      opciones: Array.isArray(pregunta.opciones) ? pregunta.opciones : ['', '', '', ''],
      puntos: Number(pregunta.puntos)
    }));
    evaluacionEnEdicionId.value = evaluacionId;
    limpiarEstadoImportacionExcel();
    okMessage.value = 'Evaluación cargada para edición';
  } catch (e) {
    error.value = e.message;
  }
};

const crearEvaluacionProfesor = async () => {
  limpiarMensajes();
  guardandoEvaluacion.value = true;

  try {
    const editando = evaluacionEnEdicionId.value !== null;
    const endpoint = editando
      ? `http://localhost:3000/profesor/evaluaciones/${evaluacionEnEdicionId.value}`
      : 'http://localhost:3000/profesor/evaluaciones';
    const response = await fetch(endpoint, {
      method: editando ? 'PUT' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': 'profesor',
        'x-user-name': session.user?.usuario || 'profesor-demo'
      },
      body: JSON.stringify({
        tipo: 'profesor',
        usuario: session.user?.usuario,
        titulo: evalForm.titulo,
        categoria: evalForm.categoria,
        curso: evalForm.curso,
        preguntasPorIntento: evalForm.preguntasPorIntento,
        fechaFin: evalForm.fechaFin || null,
        preguntas: evalForm.preguntas.map((p) => ({
          ...p,
          opciones: p.opciones.filter((o) => o && o.trim() !== '')
        }))
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || data.error || 'No se pudo crear evaluación');
    }

    okMessage.value = editando ? 'Evaluación actualizada correctamente' : 'Evaluación creada correctamente';
    evaluacionEnEdicionId.value = null;
    resetearEvaluacionForm();
    evaluacionesGuardadas.value += 1;
    await cargarEvaluacionesProfesor();
  } catch (e) {
    error.value = e.message;
  } finally {
    guardandoEvaluacion.value = false;
  }
};

const cancelarEdicionEvaluacion = () => {
  evaluacionEnEdicionId.value = null;
};

const importarEvaluacionExcelProfesor = async (archivo) => {
  limpiarMensajes();
  mensajeImportacionExcel.value = 'Subiendo y validando el archivo Excel...';
  estadoImportacionExcel.value = 'info';
  importandoExcelEvaluacion.value = true;

  try {
    const formData = new FormData();
    formData.append('archivo', archivo);

    const response = await fetch('http://localhost:3000/profesor/evaluaciones/importar-excel', {
      method: 'POST',
      headers: { 'x-user-role': 'profesor' },
      body: formData
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || data.message || 'No se pudo importar el archivo Excel');

    evalForm.preguntas = data.preguntas.map((pregunta) => ({
      ...pregunta,
      opciones: Array.isArray(pregunta.opciones) ? pregunta.opciones : [],
      puntos: Number(pregunta.puntos)
    }));
    mensajeImportacionExcel.value = `Se cargaron ${data.totalPreguntas} preguntas. Revísalas y luego pulsa "Guardar evaluación" para crearlas.`;
    estadoImportacionExcel.value = 'success';
    importacionesExcelCompletadas.value += 1;
  } catch (e) {
    mensajeImportacionExcel.value = `${e.message || 'No se pudo importar el archivo Excel'} El banco actual del formulario se mantuvo sin cambios.`;
    estadoImportacionExcel.value = 'error';
  } finally {
    importandoExcelEvaluacion.value = false;
  }
};

const limpiarEstadoImportacionExcel = () => {
  mensajeImportacionExcel.value = '';
  estadoImportacionExcel.value = 'info';
};

const crearTareaProfesor = async () => {
  limpiarMensajes();

  try {
    const response = await fetch('http://localhost:3000/profesor/tareas', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': 'profesor'
      },
      body: JSON.stringify({
        titulo: tareaForm.titulo,
        descripcion: tareaForm.descripcion,
        curso: tareaForm.curso,
        profesorUsuario: session.user?.usuario,
        fechaVencimiento: tareaForm.fechaVencimiento || null
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || data.error || 'No se pudo crear la tarea');
    }

    okMessage.value = 'Tarea creada correctamente';
    tareaForm.titulo = '';
    tareaForm.descripcion = '';
    tareaForm.fechaVencimiento = '';
  } catch (e) {
    error.value = e.message;
  }
};
</script>

<template>
  <main :class="adminPreview || (session.logged && session.user?.tipo === 'admin') ? 'admin-shell' : teacherPreview || (session.logged && session.user?.tipo === 'profesor') ? 'teacher-shell' : session.logged && session.user?.tipo === 'alumno' ? '' : session.logged ? 'app-shell' : 'auth-shell'">
    <template v-if="!session.logged && !adminPreview && !teacherPreview">
      <div class="auth-layout">
        <header class="auth-brand">
          <span class="auth-brand__mark" aria-hidden="true">A</span>
          <div>
            <p class="auth-brand__name">Aula</p>
            <p class="auth-brand__caption">Plataforma educativa</p>
          </div>
        </header>

        <section class="auth-panel" aria-labelledby="auth-title">
          <div class="auth-panel__rule" aria-hidden="true"></div>
          <p class="auth-kicker">Acceso seguro</p>
          <h1 id="auth-title">{{ authView === 'login' ? 'Iniciar sesión' : 'Crear una cuenta' }}</h1>
          <p class="auth-description">
            {{ authView === 'login' ? 'Ingresa tus datos para continuar.' : 'Completa tus datos para registrarte.' }}
          </p>

          <section v-if="error" class="auth-alert auth-alert--error" role="alert">
            {{ error }}
          </section>

          <section v-if="okMessage" class="auth-alert auth-alert--success" role="status">
            {{ okMessage }}
          </section>

          <form v-if="authView === 'login'" class="auth-form" @submit.prevent="login">
            <label>
              Usuario
              <input
                v-model="loginForm.usuario"
                type="text"
                autocomplete="username"
                placeholder="Tu usuario"
                required
              />
            </label>

            <label>
              Contraseña
              <input
                v-model="loginForm.contrasena"
                type="password"
                autocomplete="current-password"
                placeholder="Tu contraseña"
                required
              />
            </label>

            <button class="auth-submit" type="submit" :disabled="cargandoLogin">
              {{ cargandoLogin ? 'Ingresando...' : 'Ingresar' }}
            </button>
          </form>

          <form v-else class="auth-form auth-form--register" @submit.prevent="registrar">
            <div class="auth-form__row">
              <label>
                Nombre
                <input v-model="registroForm.nombre" type="text" autocomplete="given-name" required />
              </label>
              <label>
                Apellido
                <input v-model="registroForm.apellido" type="text" autocomplete="family-name" required />
              </label>
            </div>

            <label>
              Correo electrónico
              <input v-model="registroForm.email" type="email" autocomplete="email" required />
            </label>

            <label>
              Usuario
              <input v-model="registroForm.usuario" type="text" autocomplete="username" required />
            </label>

            <label>
              Contraseña
              <input v-model="registroForm.contrasena" type="password" autocomplete="new-password" required />
            </label>

            <button class="auth-submit" type="submit" :disabled="cargandoRegistro">
              {{ cargandoRegistro ? 'Registrando...' : 'Crear cuenta' }}
            </button>
          </form>

          <div class="auth-switch">
            <span>{{ authView === 'login' ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?' }}</span>
            <button
              class="auth-switch__button"
              type="button"
              @click="authView = authView === 'login' ? 'register' : 'login'; limpiarMensajes()"
            >
              {{ authView === 'login' ? 'Crear cuenta' : 'Iniciar sesión' }}
            </button>
          </div>
        </section>

        <footer class="auth-footer">Acceso para alumnos y docentes</footer>
      </div>
    </template>

    <template v-else>
      <AdminDashboard
        v-if="adminPreview || session.user?.tipo === 'admin'"
        :user="adminPreview ? { nombre: 'Vista previa', usuario: 'ADMIN', tipo: 'admin' } : session.user"
        @logout="cerrarSesion"
      />

      <AlumnoDashboard
        v-else-if="session.user?.tipo === 'alumno'"
        :user="session.user"
        @cursos-actualizados="actualizarCursosAlumno"
        @logout="cerrarSesion"
      />

      <div v-else-if="teacherPreview || session.user?.tipo === 'profesor'" class="dashboard">
        <ProfesorPanel
          :user="teacherPreview ? { nombre: 'Vista previa', usuario: 'profesor-demo' } : session.user"
          :ofertas="ofertasProfesor"
          :cargando-ofertas="cargandoOfertasProfesor"
          :header-date="fechaHeaderDocente"
          :error-message="error"
          :success-message="okMessage"
          :eval-form="evalForm"
          :tarea-form="tareaForm"
          :importando-excel="importandoExcelEvaluacion"
          :importaciones-excel-completadas="importacionesExcelCompletadas"
          :mensaje-importacion-excel="mensajeImportacionExcel"
          :estado-importacion-excel="estadoImportacionExcel"
          :evaluaciones-profesor="evaluacionesProfesor"
          :cargando-evaluaciones-profesor="cargandoEvaluacionesProfesor"
          :evaluacion-en-edicion-id="evaluacionEnEdicionId"
          :guardando-evaluacion="guardandoEvaluacion"
          :evaluaciones-guardadas="evaluacionesGuardadas"
          @agregar-pregunta="agregarPregunta"
          @crear-evaluacion="crearEvaluacionProfesor"
          @importar-evaluacion-excel="importarEvaluacionExcelProfesor"
          @limpiar-importacion-excel="limpiarEstadoImportacionExcel"
          @cargar-evaluaciones="cargarEvaluacionesProfesor"
          @cargar-ofertas="cargarOfertasProfesor"
          @editar-evaluacion="editarEvaluacionProfesor"
                    @actualizar-categoria-evaluacion="actualizarCategoriaEvaluacion"
          @cancelar-edicion-evaluacion="cancelarEdicionEvaluacion"
          @crear-tarea="crearTareaProfesor"
                    @logout="cerrarSesion"
        />
      </div>
    </template>
  </main>
</template>
