<script setup>
import { computed, reactive, ref } from 'vue';

const props = defineProps({
  user: { type: Object, required: true }
});

const emit = defineEmits(['logout']);

const studentNavItems = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'cursos', label: 'Cursos' },
  { key: 'grupos', label: 'Grupos' },
  { key: 'examenes', label: 'Exámenes finales' },
  { key: 'material', label: 'Material del curso' },
  { key: 'horarios', label: 'Horarios' }
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
const selectedCourse = computed(() => studentCourses.find((course) => course.id === selectedCourseId.value) || studentCourses[0]);
const selectedCourseActivities = computed(() => courseActivities.find((course) => course.courseId === selectedCourseId.value) || courseActivities[0]);

const selectedStudentSection = ref('dashboard');
const selectedStudentActivity = ref(null);
const selectedActivityFileName = ref('');
const evaluacionesReales = ref([]);
const intentosReales = ref([]);
const intentoActivo = ref(null);
const respuestasIntento = reactive({});
const evaluacionIntentoActivo = ref(null);
const evaluacionIniciandoId = ref(null);
const cargandoEvaluaciones = ref(false);
const cargandoIntentos = ref(false);
const enviandoIntento = ref(false);
const resultadoIntento = ref(null);
const error = ref('');
const okMessage = ref('');

const limpiarMensajes = () => {
  error.value = '';
  okMessage.value = '';
};

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

const seleccionarSeccionAlumno = async (seccion) => {
  selectedStudentActivity.value = null;
  selectedStudentSection.value = seccion;

  if (seccion === 'examenes') {
    await Promise.all([cargarEvaluacionesReales(), cargarIntentosReales()]);
  }
};

const actualizarDatosExamenesAlumno = async () => {
  await Promise.all([cargarEvaluacionesReales(), cargarIntentosReales()]);
};

const cargarEvaluacionesReales = async () => {
  cargandoEvaluaciones.value = true;

  try {
    const response = await fetch(
      `http://localhost:3000/alumno/evaluaciones?usuario=${encodeURIComponent(props.user.usuario)}`,
      { headers: { 'x-user-role': 'alumno', 'x-user-name': props.user.usuario } }
    );
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'No se pudieron cargar las evaluaciones');
    evaluacionesReales.value = data.data || [];
  } catch (requestError) {
    error.value = requestError.message;
  } finally {
    cargandoEvaluaciones.value = false;
  }
};

const cargarIntentosReales = async () => {
  cargandoIntentos.value = true;

  try {
    const response = await fetch('http://localhost:3000/alumno/intentos', {
      headers: { 'x-user-role': 'alumno', 'x-user-name': props.user.usuario }
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'No se pudo cargar el historial');
    intentosReales.value = data.data || [];
  } catch (requestError) {
    error.value = requestError.message;
  } finally {
    cargandoIntentos.value = false;
  }
};

const iniciarIntentoAlumno = async (evaluacion) => {
  limpiarMensajes();
  evaluacionIniciandoId.value = evaluacion.id;

  try {
    const response = await fetch(`http://localhost:3000/alumno/evaluaciones/${evaluacion.id}/intentos`, {
      method: 'POST',
      headers: { 'x-user-role': 'alumno', 'x-user-name': props.user.usuario }
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'No se pudo iniciar el intento');

    intentoActivo.value = data.data;
    evaluacionIntentoActivo.value = evaluacion;
    resultadoIntento.value = null;
    for (const key of Object.keys(respuestasIntento)) delete respuestasIntento[key];
    for (const pregunta of data.data.preguntas) respuestasIntento[pregunta.id] = '';
  } catch (requestError) {
    error.value = requestError.message;
  } finally {
    evaluacionIniciandoId.value = null;
  }
};

const enviarIntentoAlumno = async () => {
  if (!intentoActivo.value || !evaluacionIntentoActivo.value) return;
  limpiarMensajes();
  enviandoIntento.value = true;

  try {
    const evaluacionId = evaluacionIntentoActivo.value.id;
    const respuestas = intentoActivo.value.preguntas.map((pregunta) => ({
      preguntaId: pregunta.id,
      respuesta: respuestasIntento[pregunta.id] || ''
    }));
    const response = await fetch(`http://localhost:3000/alumno/evaluaciones/${evaluacionId}/responder`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': 'alumno',
        'x-user-name': props.user.usuario
      },
      body: JSON.stringify({ intentoId: intentoActivo.value.intentoId, respuestas })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'No se pudo enviar el intento');

    resultadoIntento.value = {
      evaluacion: evaluacionIntentoActivo.value.titulo,
      nota: data.notaTotal,
      intentoId: data.intentoId
    };
    intentoActivo.value = null;
    evaluacionIntentoActivo.value = null;
    okMessage.value = `Evaluación enviada. Nota obtenida: ${data.notaTotal}`;
    await cargarIntentosReales();
  } catch (requestError) {
    error.value = requestError.message;
  } finally {
    enviandoIntento.value = false;
  }
};
</script>

<template>
  <div class="student-shell">
    <section class="student-dashboard">
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
            <strong>{{ props.user.nombre }}</strong>
          </div>
        </div>

        <nav class="student-topbar__nav" aria-label="Secciones del alumno">
          <button
            v-for="item in studentNavItems"
            :key="item.key"
            type="button"
            class="student-topbar__item"
            :class="{ 'student-topbar__item--active': selectedStudentSection === item.key }"
            @click="seleccionarSeccionAlumno(item.key)"
          >
            {{ item.label }}
          </button>
        </nav>
      </header>

      <main class="student-main">
        <section v-if="error" class="alert error" role="alert">{{ error }}</section>
        <section v-if="okMessage" class="alert success" role="status">{{ okMessage }}</section>

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
                {{ props.user.nombre?.charAt(0) }}{{ props.user.apellido?.charAt(0) }}
              </div>
              <div>
                <p class="student-card__kicker">Perfil del alumno</p>
                <h3>{{ props.user.nombre }} {{ props.user.apellido }}</h3>
                <p>{{ props.user.usuario }} · {{ props.user.email || 'Sin correo registrado' }}</p>
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
              <button type="button" class="student-profile__logout-button" @click="emit('logout')">Cerrar sesión</button>
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
                <li><strong>Nombre:</strong> {{ props.user.nombre }} {{ props.user.apellido }}</li>
                <li><strong>Usuario:</strong> {{ props.user.usuario }}</li>
                <li><strong>Curso:</strong> {{ props.user.curso || 'Sin curso asignado' }}</li>
                <li><strong>Rol:</strong> {{ props.user.tipo }}</li>
              </ul>
            </article>

            <article class="card student-card">
              <p class="student-card__kicker">Curso</p>
              <h3>Materias y clase</h3>
              <ul class="student-list">
                <li><strong>Materia:</strong> {{ props.user.curso || 'Sin curso asignado' }}</li>
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

        <section v-else-if="selectedStudentSection === 'examenes'" class="student-panel student-exams">
          <header class="student-exams__heading">
            <div><p class="eyebrow">Evaluaciones de tus cursos</p><h2>Exámenes</h2></div>
            <button type="button" class="student-profile__action" :disabled="cargandoEvaluaciones || cargandoIntentos" @click="actualizarDatosExamenesAlumno">Actualizar</button>
          </header>

          <article v-if="resultadoIntento" class="card student-exam-result" role="status">
            <div><p class="student-card__kicker">Intento registrado</p><h3>{{ resultadoIntento.evaluacion }}</h3><small>Intento #{{ resultadoIntento.intentoId }}</small></div>
            <strong>{{ resultadoIntento.nota }} puntos</strong>
          </article>

          <form v-if="intentoActivo" class="student-active-attempt" @submit.prevent="enviarIntentoAlumno">
            <header class="card student-active-attempt__heading">
              <div><p class="student-card__kicker">Intento aleatorio · {{ intentoActivo.totalPreguntas }} preguntas</p><h3>{{ evaluacionIntentoActivo?.titulo }}</h3><small>{{ evaluacionIntentoActivo?.curso }} · Intento #{{ intentoActivo.intentoId }}</small></div>
            </header>

            <article v-for="(pregunta, index) in intentoActivo.preguntas" :key="pregunta.id" class="card student-exam-question">
              <div class="student-exam-question__heading"><strong>{{ index + 1 }}. {{ pregunta.enunciado }}</strong><small>{{ pregunta.puntos }} pts</small></div>
              <div v-if="pregunta.opciones?.length" class="student-exam-options">
                <label v-for="(opcion, optionIndex) in pregunta.opciones" :key="optionIndex" class="student-exam-option">
                  <input v-model="respuestasIntento[pregunta.id]" type="radio" :name="`intento-${intentoActivo.intentoId}-pregunta-${pregunta.id}`" :value="opcion" />
                  <span>{{ opcion }}</span>
                </label>
              </div>
              <label v-else class="student-exam-text-answer">Tu respuesta<textarea v-model="respuestasIntento[pregunta.id]" rows="3" /></label>
            </article>

            <footer class="student-active-attempt__actions"><span>La calificación se calcula al enviar.</span><button type="submit" class="student-profile__action" :disabled="enviandoIntento">{{ enviandoIntento ? 'Enviando...' : 'Enviar evaluación' }}</button></footer>
          </form>

          <section v-else class="student-exam-list">
            <div v-if="cargandoEvaluaciones" class="card student-empty-state">Cargando evaluaciones…</div>
            <div v-else-if="evaluacionesReales.length" class="student-exam-list__grid">
              <article v-for="evaluacion in evaluacionesReales" :key="evaluacion.id" class="card student-exam-card">
                <div><p class="student-card__kicker">{{ evaluacion.curso || 'Evaluación general' }}</p><h3>{{ evaluacion.titulo }}</h3><small>Creada por {{ evaluacion.creado_por }}</small></div>
                <footer><span>Banco: {{ evaluacion.max_preguntas }} · se sortearán {{ evaluacion.preguntas_por_intento }} preguntas</span><button type="button" class="student-profile__action" :disabled="evaluacionIniciandoId !== null" @click="iniciarIntentoAlumno(evaluacion)">{{ evaluacionIniciandoId === evaluacion.id ? 'Preparando…' : 'Iniciar intento' }}</button></footer>
              </article>
            </div>
            <div v-else class="card student-empty-state">No hay evaluaciones disponibles para tus cursos.</div>
          </section>

          <section class="card student-exam-history">
            <header><div><p class="student-card__kicker">Resultados</p><h3>Mis intentos</h3></div><span v-if="cargandoIntentos">Actualizando…</span></header>
            <div v-if="intentosReales.length" class="student-exam-history__list">
              <article v-for="intento in intentosReales" :key="intento.id"><div><strong>{{ intento.titulo }}</strong><small>{{ intento.curso || 'Evaluación general' }} · {{ new Date(intento.created_at).toLocaleString() }}</small></div><span>{{ intento.nota_total }} puntos</span></article>
            </div>
            <p v-else class="student-empty-state">Aún no tienes intentos registrados.</p>
          </section>
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
  </div>
</template>
<style scoped>
.student-shell {
  width: 100%;
  max-width: none;
  margin: 0;
  padding: 0 clamp(1rem, 3vw, 2.5rem) 2.5rem;
  background: #f4f6f3;
}

.student-dashboard {
  --teacher-ink: #23332e;
  --teacher-muted: #78847e;
  --teacher-line: #e3e8e4;
  --teacher-paper: #fff;
  --teacher-canvas: #f4f6f3;
  grid-column: 1 / -1;
  display: grid;
  gap: 0;
  align-items: start;
  background: var(--teacher-canvas);
  color: var(--teacher-ink);
}

.student-topbar {
  position: sticky;
  top: 0;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  background: #eef3ef;
  border: 1px solid #dfe7e1;
  padding: 0.8rem 1rem;
  border-radius: 3px;
  box-shadow: 0 5px 14px rgba(35, 53, 46, 0.06);
}

.student-topbar__left {
  display: flex;
  align-items: center;
  gap: 0.8rem;
}

.student-topbar__brand {
  width: 36px;
  height: 36px;
  padding: 0;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 10px;
  background: #315d50;
  color: white;
  font-weight: 700;
  cursor: pointer;
}

.student-topbar__brand:hover,
.student-topbar__brand--active {
  background: #24493e;
  box-shadow: 0 0 0 3px rgba(49, 93, 80, 0.16);
}

.student-topbar__left small {
  display: block;
  font-size: 0.68rem;
  color: #607d70;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.student-topbar__left strong {
  display: block;
  font-size: 1rem;
  color: #263630;
}

.student-topbar__nav {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.student-topbar__item {
  border: 1px solid #dfe7e1;
  border-radius: 999px;
  background: #f7faf8;
  color: #263630;
  padding: 0.5rem 0.9rem;
  font-weight: 600;
}

.student-topbar__item--active {
  background: #315d50;
  color: white;
  border-color: #315d50;
}

.student-profile__heading h2,
.student-profile__section h3,
.student-profile__identity h3 {
  margin: 0;
  color: #263630;
}

.student-profile__heading h2 {
  font: 500 1.85rem/1.2 Georgia, 'Times New Roman', serif;
}

.student-profile__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.25rem;
}

.student-profile__identity,
.student-profile__section {
  border: 1px solid var(--teacher-line) !important;
  border-radius: 3px;
  background: var(--teacher-paper);
  padding: 1.25rem;
}

.student-profile__identity {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.student-profile__avatar {
  width: 60px;
  aspect-ratio: 1;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  border-radius: 50%;
  background: #e6eee9;
  color: #315d50;
  font: 600 1.2rem Georgia, 'Times New Roman', serif;
}

.student-profile__identity p:last-child,
.student-profile__logout p:last-child {
  margin: 0.35rem 0 0;
  color: var(--teacher-muted);
}

.student-profile__password-form {
  display: grid;
  gap: 0.75rem;
  margin-top: 1rem;
}

.student-profile__password-form label {
  display: grid;
  gap: 0.35rem;
  color: #53615a;
  font-size: 0.85rem;
  font-weight: 600;
}

.student-profile__password-form input {
  width: 100%;
  border: 1px solid #dfe7e1;
  border-radius: 3px;
  background: #fff;
  padding: 0.65rem 0.75rem;
  color: #263630;
}

.student-profile__action,
.student-profile__logout-button {
  width: fit-content;
  border: 1px solid #315d50;
  border-radius: 3px;
  background: #315d50;
  color: #fff;
  padding: 0.65rem 0.9rem;
  font-weight: 600;
}

.student-profile__action:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.student-profile__note {
  color: var(--teacher-muted);
}

.student-profile__toggle {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 1rem 0;
  border-bottom: 1px solid #e7ece8;
}

.student-profile__toggle:first-of-type {
  margin-top: 0.75rem;
}

.student-profile__toggle:last-child {
  border-bottom: 0;
  padding-bottom: 0;
}

.student-profile__toggle span,
.student-profile__toggle small {
  display: block;
}

.student-profile__toggle strong {
  color: #263630;
  font-size: 0.9rem;
}

.student-profile__toggle small {
  margin-top: 0.2rem;
  color: var(--teacher-muted);
}

.student-profile__toggle input {
  width: 18px;
  height: 18px;
  accent-color: #315d50;
  flex: 0 0 auto;
}

.student-profile__logout {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  grid-column: 1 / -1;
}

.student-profile__logout-button {
  border-color: #a44f47;
  background: #a44f47;
}

.student-sidebar {
  position: sticky;
  top: 1rem;
  min-height: 760px;
  padding: 1.4rem 0.9rem 1rem;
  background: #223a33;
  color: #eef3ef;
}

.student-sidebar__brand {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.5rem 0.25rem 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}

.student-sidebar__mark {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  background: rgba(99, 102, 241, 0.22);
  color: #e0e7ff;
  font-weight: 700;
}

.student-sidebar__eyebrow {
  margin: 0;
  color: #cbd5e1;
  font-size: 0.7rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.student-sidebar__brand strong {
  display: block;
  margin-top: 0.15rem;
  font-size: 1rem;
}

.student-nav {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 1.25rem;
}

.student-nav__item {
  width: 100%;
  border: 1px solid transparent;
  border-radius: 3px;
  background: transparent;
  color: #d1ddd7;
  text-align: left;
  padding: 0.9rem 1rem;
  font-weight: 600;
}

.student-nav__item--active {
  border-color: rgba(197, 217, 208, 0.13);
  background: #315348;
  color: #fff;
}

.student-main {
  display: grid;
  gap: 1.25rem;
  min-width: 0;
}

.student-panel {
  display: grid;
  gap: 1.25rem;
}

.student-hero {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  border: 1px solid var(--teacher-line) !important;
  border-radius: 3px;
  background: var(--teacher-paper);
  min-height: 120px;
}

.student-hero .eyebrow {
  color: #607d70;
}

.student-hero h2 {
  margin: 0;
  color: #263630;
  font: 500 1.85rem/1.2 Georgia, 'Times New Roman', serif;
}

.student-hero__copy {
  margin-bottom: 0;
  color: var(--teacher-muted);
}

.student-course-layout {
  display: grid;
  grid-template-columns: minmax(260px, 300px) minmax(0, 1fr);
  gap: 1.25rem;
  align-items: start;
}

.student-course-sidebar {
  display: grid;
  gap: 1rem;
  align-self: stretch;
  min-height: 100%;
}

.student-course-sidebar__header h3 {
  margin: 0;
  color: #263630;
}

.student-course-activity-group h4 {
  margin: 0 0 0.7rem;
  font-size: 0.7rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #607d70;
}

.student-course-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.7rem;
}

.student-course-list li {
  padding: 0;
  border: 1px solid #e7ece8;
  background: #f8faf9;
  border-radius: 8px;
}

.student-course-list__activity {
  width: 100%;
  display: grid;
  gap: 0.25rem;
  padding: 0.75rem 0.7rem;
  border: 0;
  border-radius: inherit;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.student-course-list__activity:hover,
.student-course-list__activity:focus-visible {
  background: #edf4ef;
  outline: none;
}

.student-course-list__type {
  font-size: 0.62rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-weight: 700;
  color: #607d70;
}

.student-course-list strong {
  color: #1f2f2a;
  font-size: 0.96rem;
}

.student-course-list small {
  color: #66756f;
}

.student-activity-detail {
  max-width: 980px;
  width: 100%;
  margin: 0 auto;
}

.student-activity-detail__back {
  width: fit-content;
  border: 0;
  background: transparent;
  color: #315d50;
  padding: 0.35rem 0;
  font-weight: 700;
  cursor: pointer;
}

.student-activity-detail__header,
.student-activity-detail__statement,
.student-activity-detail__submission {
  border: 1px solid var(--teacher-line) !important;
  border-radius: 3px;
  background: var(--teacher-paper);
  padding: 1.4rem;
}

.student-activity-detail__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.student-activity-detail__header h2 {
  margin: 0 0 0.5rem;
  color: #263630;
  font: 500 1.85rem/1.2 Georgia, 'Times New Roman', serif;
}

.student-activity-detail__header p:last-child,
.student-activity-detail__statement > p:not(.student-card__kicker) {
  margin: 0;
  color: #596760;
}

.student-activity-detail__status {
  flex: 0 0 auto;
  border-radius: 999px;
  background: #e5f1e9;
  color: #315d50;
  padding: 0.4rem 0.7rem;
  font-size: 0.75rem;
  font-weight: 700;
}

.student-activity-detail__status--upcoming {
  background: #f4eee1;
  color: #806b3d;
}

.student-activity-detail__statement > p:not(.student-card__kicker) {
  line-height: 1.65;
}

.student-activity-detail__instruction {
  margin-top: 1rem !important;
}

.student-activity-detail__submission {
  display: grid;
  gap: 0.85rem;
}

.student-activity-detail__submission h3 {
  margin: -0.5rem 0 0;
  color: #263630;
}

.student-activity-detail__file-picker {
  min-height: 54px;
  display: flex;
  align-items: center;
  border: 1px dashed #aebdb3;
  border-radius: 3px;
  background: #f8faf9;
  color: #315d50;
  padding: 0.8rem 1rem;
  font-weight: 600;
  cursor: pointer;
}

.student-activity-detail__file-picker input {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
}

.student-activity-detail__response-label {
  color: #53615a;
  font-size: 0.85rem;
  font-weight: 600;
}

.student-activity-detail__submission textarea {
  width: 100%;
  resize: vertical;
  border: 1px solid #dfe7e1;
  border-radius: 3px;
  background: #fff;
  padding: 0.75rem;
  color: #263630;
  font: inherit;
}

.student-course-divider {
  height: 1px;
  background: linear-gradient(90deg, rgba(82, 110, 99, 0.25), rgba(82, 110, 99, 0.8), rgba(82, 110, 99, 0.25));
}

.student-course-main {
  display: grid;
  gap: 1.25rem;
  min-width: 0;
}

.student-course-selector {
  min-height: 0;
}

.student-course-selector__options {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.student-course-selector__item {
  border: 1px solid #dfe7e1;
  border-radius: 999px;
  background: #f7faf8;
  color: #263630;
  padding: 0.55rem 0.9rem;
  font-weight: 600;
}

.student-course-selector__item--active {
  background: #315d50;
  border-color: #315d50;
  color: #fff;
}

.student-exams {
  display: grid;
  gap: 1rem;
}

.student-exams__heading,
.student-exam-history > header,
.student-active-attempt__heading,
.student-exam-question__heading,
.student-exam-card footer,
.student-active-attempt__actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.student-exams__heading h2,
.student-exam-history h3,
.student-exam-card h3,
.student-active-attempt h3 {
  margin: 0;
  color: #263630;
}

.student-exam-list__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.85rem;
}

.student-exam-card,
.student-exam-result,
.student-active-attempt__heading,
.student-exam-question,
.student-exam-history {
  border: 1px solid var(--teacher-line) !important;
  border-radius: 3px;
  background: var(--teacher-paper);
  padding: 1rem;
}

.student-exam-card {
  display: grid;
  align-content: space-between;
  gap: 1.2rem;
}

.student-exam-card small,
.student-exam-card footer span,
.student-exam-history small,
.student-active-attempt__actions > span {
  color: var(--teacher-muted);
  font-size: 0.72rem;
}

.student-exam-card footer {
  align-items: flex-end;
  flex-wrap: wrap;
  padding-top: 0.8rem;
  border-top: 1px solid var(--teacher-line);
}

.student-exam-result {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  border-left: 3px solid #547a69 !important;
}

.student-exam-result > strong {
  color: #315d50;
  font-size: 1.2rem;
  white-space: nowrap;
}

.student-active-attempt {
  display: grid;
  gap: 0.75rem;
}

.student-active-attempt__heading small {
  color: var(--teacher-muted);
}

.student-exam-question__heading {
  align-items: flex-start;
  color: #35443c;
  font-size: 0.88rem;
}

.student-exam-question__heading small {
  color: var(--teacher-muted);
  white-space: nowrap;
}

.student-exam-options {
  display: grid;
  gap: 0.4rem;
  margin-top: 0.8rem;
}

.student-exam-option {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.55rem 0.65rem;
  border: 1px solid #e5eae6;
  border-radius: 3px;
  background: #fafbf9;
  color: #4d5c54;
  font-size: 0.8rem;
}

.student-exam-option input {
  width: auto;
  margin: 0;
  accent-color: #315d50;
}

.student-exam-text-answer {
  display: grid;
  gap: 0.4rem;
  margin-top: 0.8rem;
  color: #53615a;
  font-size: 0.76rem;
  font-weight: 650;
}

.student-exam-text-answer textarea {
  width: 100%;
  resize: vertical;
  border: 1px solid #dfe7e1;
  border-radius: 3px;
  padding: 0.65rem;
  color: #263630;
  font: inherit;
}

.student-active-attempt__actions {
  justify-content: flex-end;
  flex-wrap: wrap;
}

.student-exam-history > header {
  padding: 0 0 0.75rem;
  border: 0 !important;
  border-bottom: 1px solid var(--teacher-line) !important;
}

.student-exam-history__list {
  display: grid;
}

.student-exam-history__list article {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.8rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid #edf0ed;
  color: #43534a;
  font-size: 0.8rem;
}

.student-exam-history__list article:last-child {
  border-bottom: 0;
}

.student-exam-history__list small {
  display: block;
  margin-top: 0.2rem;
}

.student-empty-state {
  padding: 1rem;
  color: var(--teacher-muted);
  text-align: center;
  font-size: 0.8rem;
}

@media (max-width: 900px) {
.student-course-layout {
    grid-template-columns: 1fr;
  }

.student-profile__grid {
    grid-template-columns: 1fr;
  }
}

.student-hero__actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.student-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.85rem;
}

.student-stat-card {
  border: 1px solid var(--teacher-line) !important;
  border-top: 3px solid #547a69 !important;
  border-radius: 3px;
  background: var(--teacher-paper);
  padding: 1rem 1.1rem;
}

.student-stat-card--blue { border-top-color: #637e92 !important; }

.student-stat-card--amber { border-top-color: #aa8955 !important; }

.student-stat-card--rose { border-top-color: #a66f61 !important; }

.student-stat-card span,
.student-stat-card small {
  display: block;
}

.student-stat-card span {
  color: var(--teacher-muted);
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.student-stat-card strong {
  display: block;
  font-size: 26px;
  color: #293a33;
  margin: 6px 0 4px;
}

.student-stat-card small {
  color: #68776f;
}

.student-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1.25rem;
}

.student-info-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.25rem;
}

.student-card {
  min-height: 220px;
  border: 1px solid var(--teacher-line) !important;
  border-radius: 3px;
  background: var(--teacher-paper);
  padding: 1.2rem 1.1rem;
}

.student-card--wide {
  grid-column: 1 / -1;
}

.student-card__kicker {
  margin: 0 0 0.5rem;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #607d70;
  font-weight: 700;
}

.student-list {
  padding-left: 1.1rem;
  margin: 0;
  color: #374151;
  display: grid;
  gap: 0.55rem;
}

.student-list--compact {
  gap: 0.35rem;
}

.student-group {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 1rem;
  margin-top: 1rem;
}

.student-group__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.7rem;
}

.student-badge {
  background: #e0e7ff;
  color: #3730a3;
  border-radius: 999px;
  padding: 0.3rem 0.6rem;
  font-size: 0.72rem;
  font-weight: 700;
}

.student-highlight {
  background: linear-gradient(90deg, #eef2ff, #f8fafc);
  border: 1px solid #dfe3f9;
  border-radius: 12px;
  padding: 0.9rem 1rem;
  margin-bottom: 1rem;
  color: #1f2937;
}

.student-hero h2,
.student-card h3,
.student-card h4 {
  color: #263630;
}
</style>
