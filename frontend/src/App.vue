<script setup>
import { computed, reactive, ref } from 'vue';
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
    if (data.user.tipo !== 'alumno') {
      okMessage.value = `Bienvenido ${data.user.nombre}`;
    }
    loginForm.usuario = '';
    loginForm.contrasena = '';
  } catch (e) {
    error.value = e.message;
  } finally {
    cargandoLogin.value = false;
  }
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
  curso: 'frontend',
  clase: 'redes-software-tarde:1A Frontend',
  preguntas: [
    {
      enunciado: '',
      opciones: ['', '', '', ''],
      respuestaCorrecta: '',
      puntos: 1
    }
  ]
});

const studentNavItems = [
  { key: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { key: 'cursos', label: 'Cursos', icon: 'school' },
  { key: 'grupos', label: 'Grupos', icon: 'groups' },
  { key: 'examenes', label: 'Exámenes finales', icon: 'quiz' },
  { key: 'material', label: 'Material del curso', icon: 'menu_book' },
  { key: 'horarios', label: 'Horarios', icon: 'calendar_month' }
];

const studentStats = [
  { label: 'Promedio', value: '8.7', help: 'Últimas evaluaciones', tone: 'green' },
  { label: 'Asistencia', value: '92%', help: 'Este bimestre', tone: 'blue' },
  { label: 'Tareas', value: '04', help: 'Pendientes', tone: 'amber' },
  { label: 'Grupos', value: '02', help: 'Activos', tone: 'rose' }
];

const studentCourses = [
  {
    id: 'frontend',
    name: 'Frontend',
    className: 'redes-software-tarde:1A Frontend',
    teacher: 'Juan Pérez',
    room: 'Aula 3 · Campus Norte',
    schedule: 'Lunes y miércoles · 18:00 a 21:00'
  },
  {
    id: 'bases',
    name: 'Bases de datos',
    className: 'datos-practica:2A',
    teacher: 'María López',
    room: 'Laboratorio 2 · Campus Norte',
    schedule: 'Martes y jueves · 18:00 a 21:00'
  },
  {
    id: 'diseno',
    name: 'Diseño UX',
    className: 'ux-creative:3A',
    teacher: 'Ana García',
    room: 'Sala 5 · Campus Sur',
    schedule: 'Miércoles y viernes · 16:00 a 18:00'
  }
];

const courseActivities = [
  {
    courseId: 'frontend',
    active: [
      { type: 'Tarea', title: 'Landing page responsive', due: 'Hoy · 18:00', tag: 'UI' },
      { type: 'Evaluación', title: 'Quiz de HTML semántico', due: 'Mañana · 16:00', tag: 'Quiz' },
      { type: 'Tarea', title: 'Componente de carrito', due: 'Jue · 20:00', tag: 'JavaScript' }
    ],
    upcoming: [
      { type: 'Evaluación', title: 'Parcial de componentes', due: '22 oct · 19:00', tag: 'Parcial' },
      { type: 'Tarea', title: 'Entrega final del proyecto', due: '25 oct · 23:59', tag: 'Proyecto' }
    ]
  },
  {
    courseId: 'bases',
    active: [
      { type: 'Evaluación', title: 'Normalización de tablas', due: 'Hoy · 21:00', tag: 'SQL' },
      { type: 'Tarea', title: 'Modelo relacional', due: 'Mañana · 18:30', tag: 'Modelo' }
    ],
    upcoming: [
      { type: 'Tarea', title: 'Script de consultas', due: '24 oct · 20:00', tag: 'Consultas' },
      { type: 'Evaluación', title: 'Prueba práctica de joins', due: '29 oct · 18:00', tag: 'Práctica' }
    ]
  },
  {
    courseId: 'diseno',
    active: [
      { type: 'Tarea', title: 'Wireframe del flujo de compra', due: 'Hoy · 17:30', tag: 'UX' },
      { type: 'Evaluación', title: 'Análisis de accesibilidad', due: 'Mañana · 15:00', tag: 'A11y' }
    ],
    upcoming: [
      { type: 'Tarea', title: 'Prototipo del dashboard', due: '23 oct · 18:30', tag: 'Prototipo' },
      { type: 'Evaluación', title: 'Diagnóstico de usabilidad', due: '28 oct · 19:00', tag: 'Usabilidad' }
    ]
  }
];

const selectedCourseId = ref(studentCourses[0].id);

const selectedCourse = computed(() => {
  return studentCourses.find((course) => course.id === selectedCourseId.value) || studentCourses[0];
});

const selectedCourseActivities = computed(() => {
  return courseActivities.find((course) => course.courseId === selectedCourseId.value) || courseActivities[0];
});

const selectedStudentSection = ref('dashboard');
const selectedStudentActivity = ref(null);
const selectedActivityFileName = ref('');

const abrirDetalleActividad = (activity, phase) => {
  selectedStudentActivity.value = {
    ...activity,
    phase,
    courseName: selectedCourse.value.name
  };
  selectedActivityFileName.value = '';
};

const volverACursos = () => {
  selectedStudentActivity.value = null;
  selectedStudentSection.value = 'cursos';
};

const seleccionarArchivoActividad = (event) => {
  selectedActivityFileName.value = event.target.files?.[0]?.name || '';
};

const detalleActividad = (activity) => {
  if (activity.type === 'Tarea') {
    return `Desarrolla y entrega “${activity.title}” aplicando los contenidos de ${activity.tag}. Incluye una explicación breve de las decisiones tomadas y verifica que el trabajo funcione correctamente.`;
  }

  return `Resuelve la evaluación “${activity.title}”. Lee cada consigna con atención y responde usando los conceptos trabajados en ${activity.tag}.`;
};

// Student state
const evaluacionesAlumno = ref([]);
const tareasAlumno = ref([]);
const respuestasAlumno = reactive({});
const notaAlumno = ref(null);

// Teacher task form
const tareaForm = reactive({
  titulo: '',
  descripcion: '',
  curso: 'frontend',
  clase: 'redes-software-tarde:1A Frontend',
  fechaVencimiento: ''
});

// Teacher evaluation helpers
const agregarPregunta = () => {
  if (evalForm.preguntas.length >= 10) return;
  evalForm.preguntas.push({
    enunciado: '',
    opciones: ['', '', '', ''],
    respuestaCorrecta: '',
    puntos: 1
  });
};

const crearEvaluacionProfesor = async () => {
  limpiarMensajes();

  try {
    const response = await fetch('http://localhost:3000/profesor/evaluaciones', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': 'profesor'
      },
      body: JSON.stringify({
        tipo: 'profesor',
        usuario: session.user?.usuario,
        titulo: evalForm.titulo,
        curso: evalForm.curso,
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

    okMessage.value = 'Evaluación creada correctamente';
    evalForm.titulo = '';
    evalForm.curso = 'frontend';
    evalForm.clase = 'redes-software-tarde:1A Frontend';
    evalForm.preguntas = [{
      enunciado: '',
      opciones: ['', '', '', ''],
      respuestaCorrecta: '',
      puntos: 1
    }];
  } catch (e) {
    error.value = e.message;
  }
};

// Student data loaders and answer submitters
const cargarEvaluacionesAlumno = async () => {
  limpiarMensajes();

  try {
    const response = await fetch(`http://localhost:3000/alumno/evaluaciones?curso=${encodeURIComponent(session.user?.curso || '')}`, {
      headers: {
        'x-user-role': 'alumno',
        'x-user-curso': session.user?.curso || ''
      }
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || data.error || 'No se pudieron cargar evaluaciones');
    }
    evaluacionesAlumno.value = data.data || [];
  } catch (e) {
    error.value = e.message;
  }
};

const responderEvaluacion = async (evaluacion) => {
  limpiarMensajes();

  try {
    const respuestas = (evaluacion.preguntas || []).map((p) => ({
      preguntaId: p.id,
      respuesta: respuestasAlumno[p.id] || ''
    }));

    const response = await fetch('http://localhost:3000/alumno/evaluaciones/' + evaluacion.id + '/responder', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': 'alumno'
      },
      body: JSON.stringify({
        tipo: 'alumno',
        usuario: session.user?.usuario,
        respuestas
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || data.error || 'No se pudo responder evaluación');
    }

    notaAlumno.value = data.notaTotal;
    okMessage.value = 'Examen enviado. Nota automática: ' + data.notaTotal;
  } catch (e) {
    error.value = e.message;
  }
};

const cargarTareasAlumno = async () => {
  if (!session.user?.curso) return;

  try {
    const response = await fetch(`http://localhost:3000/tareas/${encodeURIComponent(session.user.curso)}`);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || data.error || 'No se pudieron cargar las tareas');
    }
    tareasAlumno.value = data.data || [];
  } catch (e) {
    error.value = e.message;
  }
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
  <main :class="adminPreview || (session.logged && session.user?.tipo === 'admin') ? 'admin-shell' : teacherPreview || (session.logged && session.user?.tipo === 'profesor') ? 'teacher-shell' : session.logged && session.user?.tipo === 'alumno' ? 'student-shell' : session.logged ? 'app-shell' : 'auth-shell'">
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
      <header v-if="teacherPreview || (!adminPreview && session.user?.tipo === 'profesor')" class="topbar">
        <div>
          <p class="eyebrow">{{ teacherPreview || session.user?.tipo === 'profesor' ? 'Espacio docente' : 'Plataforma educativa' }}</p>
          <h1>{{ teacherPreview || session.user?.tipo === 'profesor' ? 'Panel docente' : 'Panel por perfiles' }}</h1>
        </div>

        <button class="secondary" @click="cerrarSesion">
          Cerrar sesión
        </button>
      </header>

      <section v-if="error && !adminPreview && !teacherPreview && session.user.tipo !== 'admin'" class="alert error">
        {{ error }}
      </section>

      <section v-if="okMessage && !adminPreview && !teacherPreview && session.user.tipo !== 'admin'" class="alert success">
        {{ okMessage }}
      </section>

      <AdminDashboard
        v-if="adminPreview || session.user?.tipo === 'admin'"
        :user="adminPreview ? { nombre: 'Vista previa', usuario: 'ADMIN', tipo: 'admin' } : session.user"
        @logout="cerrarSesion"
      />

      <div v-else-if="teacherPreview || session.user" class="dashboard">
      <!-- Alumno dashboard -->
      <section v-if="!teacherPreview && session.user.tipo === 'alumno'" class="student-dashboard">
        <header class="student-topbar">
          <div class="student-topbar__left">
            <button
              type="button"
              class="student-topbar__brand"
              aria-label="Abrir perfil"
              title="Perfil"
              :class="{ 'student-topbar__brand--active': selectedStudentSection === 'perfil' }"
              @click="selectedStudentActivity = null; selectedStudentSection = 'perfil'"
            >A</button>
            <div>
              <small>Dashboard</small>
              <strong>{{ session.user.nombre }}</strong>
            </div>
          </div>

          <nav class="student-topbar__nav" aria-label="Secciones del alumno">
            <button
              v-for="item in studentNavItems"
              :key="item.key"
              type="button"
              class="student-topbar__item"
              :class="{ 'student-topbar__item--active': selectedStudentSection === item.key }"
              @click="selectedStudentActivity = null; selectedStudentSection = item.key"
            >
              {{ item.label }}
            </button>
          </nav>
        </header>

        <main class="student-main">
          <section v-if="selectedStudentActivity" class="student-panel student-activity-detail">
            <button type="button" class="student-activity-detail__back" @click="volverACursos">
              ← Volver a cursos
            </button>

            <header class="student-activity-detail__header card">
              <div>
                <p class="student-card__kicker">{{ selectedStudentActivity.type }} · {{ selectedStudentActivity.courseName }}</p>
                <h2>{{ selectedStudentActivity.title }}</h2>
                <p>{{ selectedStudentActivity.due }}</p>
              </div>
              <span class="student-activity-detail__status" :class="{ 'student-activity-detail__status--upcoming': selectedStudentActivity.phase === 'upcoming' }">
                {{ selectedStudentActivity.phase === 'upcoming' ? 'Próximamente' : 'Activa' }}
              </span>
            </header>

            <article class="card student-activity-detail__statement">
              <p class="student-card__kicker">Enunciado</p>
              <p>{{ detalleActividad(selectedStudentActivity) }}</p>
              <p class="student-activity-detail__instruction">
                {{ selectedStudentActivity.type === 'Tarea' ? 'Revisa los requisitos y adjunta tu archivo en la sección de entrega.' : 'Completa tu respuesta en el espacio indicado.' }}
              </p>
            </article>

            <article v-if="selectedStudentActivity.phase === 'upcoming'" class="card student-activity-detail__submission">
              <p class="student-card__kicker">Disponible próximamente</p>
              <p>Esta actividad todavía no está habilitada. Podrás ver las opciones de respuesta cuando se active.</p>
            </article>

            <article v-else-if="selectedStudentActivity.type === 'Tarea'" class="card student-activity-detail__submission">
              <p class="student-card__kicker">Entrega</p>
              <h3>Adjuntar archivo</h3>
              <label class="student-activity-detail__file-picker">
                <span>{{ selectedActivityFileName || 'Seleccionar archivo' }}</span>
                <input type="file" @change="seleccionarArchivoActividad" />
              </label>
              <label class="student-activity-detail__response-label" for="submission-comment">Comentario para el docente</label>
              <textarea id="submission-comment" rows="4" placeholder="Escribe un comentario sobre tu entrega..."></textarea>
              <button type="button" class="student-profile__action" disabled>Enviar entrega</button>
              <small class="student-profile__note">El archivo se puede seleccionar, pero el envío todavía no está conectado al servidor.</small>
            </article>

            <article v-else class="card student-activity-detail__submission">
              <p class="student-card__kicker">Respuesta</p>
              <h3>Tu respuesta</h3>
              <textarea rows="7" placeholder="Escribe aquí tu respuesta..."></textarea>
              <button type="button" class="student-profile__action" disabled>Enviar evaluación</button>
              <small class="student-profile__note">El envío de esta evaluación todavía no está conectado a esta actividad.</small>
            </article>
          </section>

          <section v-else-if="selectedStudentSection === 'perfil'" class="student-panel student-profile">
            <header class="student-profile__heading">
              <p class="eyebrow">Cuenta</p>
              <h2>Perfil y configuración</h2>
            </header>

            <section class="student-profile__grid">
              <article class="card student-profile__identity">
                <div class="student-profile__avatar" aria-hidden="true">
                  {{ session.user.nombre?.charAt(0) }}{{ session.user.apellido?.charAt(0) }}
                </div>
                <div>
                  <p class="student-card__kicker">Perfil del alumno</p>
                  <h3>{{ session.user.nombre }} {{ session.user.apellido }}</h3>
                  <p>{{ session.user.usuario }} · {{ session.user.email || 'Sin correo registrado' }}</p>
                </div>
              </article>

              <article class="card student-profile__section">
                <p class="student-card__kicker">Seguridad</p>
                <h3>Cambiar contraseña</h3>
                <form class="student-profile__password-form" @submit.prevent>
                  <label>Contraseña actual<input type="password" autocomplete="current-password" /></label>
                  <label>Nueva contraseña<input type="password" autocomplete="new-password" /></label>
                  <label>Confirmar contraseña<input type="password" autocomplete="new-password" /></label>
                  <button type="button" class="student-profile__action" disabled>Cambiar contraseña</button>
                  <small class="student-profile__note">El cambio de contraseña todavía no está disponible.</small>
                </form>
              </article>

              <article class="card student-profile__section">
                <p class="student-card__kicker">Preferencias</p>
                <h3>Notificaciones</h3>
                <label class="student-profile__toggle">
                  <span><strong>Actividades y evaluaciones</strong><small>Avisos de entregas y fechas próximas</small></span>
                  <input type="checkbox" checked />
                </label>
                <label class="student-profile__toggle">
                  <span><strong>Novedades de los cursos</strong><small>Material nuevo y anuncios</small></span>
                  <input type="checkbox" checked />
                </label>
              </article>

              <article class="card student-profile__section student-profile__logout">
                <div>
                  <p class="student-card__kicker">Sesión</p>
                  <h3>Cerrar sesión</h3>
                  <p>Sal de tu cuenta en este dispositivo.</p>
                </div>
                <button type="button" class="student-profile__logout-button" @click="cerrarSesion">Cerrar sesión</button>
              </article>
            </section>
          </section>

          <section v-else-if="selectedStudentSection === 'dashboard'" class="student-panel">
            <div class="student-hero card">
              <div>
                <p class="eyebrow">Resumen</p>
                <h2>Resumen académico</h2>
              </div>
            </div>

            <section class="student-stats" aria-label="Resumen académico del alumno">
              <article v-for="item in studentStats" :key="item.label" class="student-stat-card" :class="`student-stat-card--${item.tone}`">
                <span>{{ item.label }}</span>
                <strong>{{ item.value }}</strong>
                <small>{{ item.help }}</small>
              </article>
            </section>

            <section class="student-info-grid">
              <article class="card student-card">
                <p class="student-card__kicker">Información</p>
                <h3>Datos del alumno</h3>
                <ul class="student-list">
                  <li><strong>Nombre:</strong> {{ session.user.nombre }} {{ session.user.apellido }}</li>
                  <li><strong>Usuario:</strong> {{ session.user.usuario }}</li>
                  <li><strong>Curso:</strong> {{ session.user.curso || 'Sin curso asignado' }}</li>
                  <li><strong>Rol:</strong> {{ session.user.tipo }}</li>
                </ul>
              </article>

              <article class="card student-card">
                <p class="student-card__kicker">Curso</p>
                <h3>Materias y clase</h3>
                <ul class="student-list">
                  <li><strong>Materia:</strong> {{ session.user.curso || 'Sin curso asignado' }}</li>
                  <li><strong>Horario:</strong> Lunes y miércoles · 18:00 a 21:00</li>
                  <li><strong>Sala:</strong> Aula 3 · Campus Norte</li>
                  <li><strong>Profesor:</strong> Juan Pérez</li>
                </ul>
              </article>
            </section>
          </section>

          <section v-else-if="selectedStudentSection === 'cursos'" class="student-panel">
            <div class="student-course-layout">
              <aside class="card student-course-sidebar">
                <div class="student-course-activity-group">
                  <h4>Activas</h4>
                  <ul class="student-course-list">
                    <li v-for="item in selectedCourseActivities.active" :key="`${item.type}-${item.title}`">
                      <button type="button" class="student-course-list__activity" @click="abrirDetalleActividad(item, 'active')">
                        <span class="student-course-list__type">{{ item.type }}</span>
                        <strong>{{ item.title }}</strong>
                        <small>{{ item.due }}</small>
                      </button>
                    </li>
                  </ul>
                </div>

                <div class="student-course-divider" aria-hidden="true"></div>

                <div class="student-course-activity-group">
                  <h4>Próximas</h4>
                  <ul class="student-course-list student-course-list--muted">
                    <li v-for="item in selectedCourseActivities.upcoming" :key="`${item.type}-${item.title}`">
                      <button type="button" class="student-course-list__activity" @click="abrirDetalleActividad(item, 'upcoming')">
                        <span class="student-course-list__type">{{ item.type }}</span>
                        <strong>{{ item.title }}</strong>
                        <small>{{ item.due }}</small>
                      </button>
                    </li>
                  </ul>
                </div>
              </aside>

              <div class="student-course-main">
                <div v-if="studentCourses.length > 1" class="student-course-selector card">
                  <p class="student-card__kicker">Materias</p>
                  <div class="student-course-selector__options">
                    <button
                      v-for="course in studentCourses"
                      :key="course.id"
                      type="button"
                      class="student-course-selector__item"
                      :class="{ 'student-course-selector__item--active': selectedCourseId === course.id }"
                      @click="selectedCourseId = course.id"
                    >
                      {{ course.name }}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section v-else-if="selectedStudentSection === 'grupos'" class="student-grid">
            <article class="card student-card student-card--wide">
              <p class="student-card__kicker">Grupos</p>
              <h3>Sección visual en construcción</h3>
              <p class="empty-state">Aquí se mostrará la gestión de equipos y la creación de grupos más adelante.</p>
            </article>
          </section>

          <section v-else-if="selectedStudentSection === 'examenes'" class="student-grid">
            <article class="card student-card student-card--wide">
              <p class="student-card__kicker">Exámenes finales</p>
              <h3>Sección visual</h3>
              <p class="empty-state">Vista solo de diseño para exámenes finales.</p>
            </article>
          </section>

          <section v-else-if="selectedStudentSection === 'material'" class="student-grid">
            <article class="card student-card student-card--wide">
              <p class="student-card__kicker">Material del curso</p>
              <h3>Sección visual</h3>
              <p class="empty-state">Aquí se mostrará el temario, documentos y recursos del curso.</p>
            </article>
          </section>

          <section v-else-if="selectedStudentSection === 'horarios'" class="student-grid">
            <article class="card student-card student-card--wide">
              <p class="student-card__kicker">Horarios</p>
              <h3>Sección visual</h3>
              <p class="empty-state">Aquí se mostrará el calendario y los horarios del alumno.</p>
            </article>
          </section>
        </main>
      </section>

      <!-- Profesor dashboard -->
      <ProfesorPanel
        v-else-if="teacherPreview || session.user.tipo === 'profesor'"
        :eval-form="evalForm"
        :tarea-form="tareaForm"
        @agregar-pregunta="agregarPregunta"
        @crear-evaluacion="crearEvaluacionProfesor"
        @crear-tarea="crearTareaProfesor"
      />

      </div>
    </template>
  </main>
</template>
