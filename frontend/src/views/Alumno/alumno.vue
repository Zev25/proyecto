<script setup>
import { computed, onMounted, reactive, ref } from 'vue';

const props = defineProps({
  user: { type: Object, required: true }
});

const emit = defineEmits(['logout', 'cursos-actualizados']);

const studentNavItems = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'cursos', label: 'Cursos' },
  { key: 'grupos', label: 'Grupos' },
  { key: 'evaluaciones', label: 'Evaluaciones' },
  { key: 'examenes', label: 'Exámenes finales' },
  { key: 'material', label: 'Material del curso' },
  { key: 'horarios', label: 'Horarios' }
];

const ofertasAlumno = ref([]);
const cargandoOfertas = ref(false);

const selectedStudentSection = ref('dashboard');
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
const codigoInvitacion = ref('');
const canjeandoInvitacion = ref(false);
const mensajeInvitacion = ref('');
const errorInvitacion = ref('');
const categoriaAlumno = computed(() => selectedStudentSection.value === 'examenes' ? 'examen_final' : 'evaluacion');
const evaluacionesPorCategoria = computed(() => evaluacionesReales.value.filter((evaluacion) => evaluacion.categoria === categoriaAlumno.value));
const intentosPorCategoria = computed(() => intentosReales.value.filter((intento) => intento.categoria === categoriaAlumno.value));
const intentosCompletados = computed(() => intentosReales.value.filter((intento) => intento.completado && intento.nota_sobre_10 !== null));
const promedioCategoria = computed(() => {
  const notas = intentosPorCategoria.value
    .filter((intento) => intento.completado && intento.nota_sobre_10 !== null)
    .map((intento) => Number(intento.nota_sobre_10));
  return notas.length ? notas.reduce((total, nota) => total + nota, 0) / notas.length : null;
});
const promedioGeneral = computed(() => {
  const notas = intentosCompletados.value.map((intento) => Number(intento.nota_sobre_10));
  return notas.length ? notas.reduce((total, nota) => total + nota, 0) / notas.length : null;
});
const studentStats = computed(() => [
  { label: 'Promedio', value: promedioGeneral.value === null ? '—' : promedioGeneral.value.toFixed(1), help: 'Todos los intentos · sobre 10', tone: 'green' },
  { label: 'Asistencia', value: '—', help: 'Sin datos registrados', tone: 'blue' },
  { label: 'Tareas', value: '—', help: 'Sin datos registrados', tone: 'amber' },
  { label: 'Ofertas', value: String(ofertasAlumno.value.length), help: 'Matriculadas', tone: 'rose' }
]);

const limpiarMensajes = () => {
  error.value = '';
  okMessage.value = '';
};

const cargarOfertasAlumno = async () => {
  cargandoOfertas.value = true;

  try {
    const response = await fetch(`http://localhost:3000/alumno/ofertas?usuario=${encodeURIComponent(props.user.usuario)}`, {
      headers: { 'x-user-role': 'alumno', 'x-user-name': props.user.usuario }
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'No se pudieron cargar tus cursos');
    ofertasAlumno.value = data.data || [];
  } catch (requestError) {
    error.value = requestError.message;
  } finally {
    cargandoOfertas.value = false;
  }
};

const canjearInvitacion = async () => {
  canjeandoInvitacion.value = true;
  mensajeInvitacion.value = '';
  errorInvitacion.value = '';

  try {
    const response = await fetch('http://localhost:3000/alumno/invitaciones/canjear', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': 'alumno',
        'x-user-name': props.user.usuario
      },
      body: JSON.stringify({ codigo: codigoInvitacion.value, usuario: props.user.usuario })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'No se pudo canjear la invitación');

    const cursos = result.data.cursosTotales || [];
    emit('cursos-actualizados', cursos);
    mensajeInvitacion.value = 'Matrícula actualizada.';
    codigoInvitacion.value = '';
    await cargarOfertasAlumno();
  } catch (requestError) {
    errorInvitacion.value = requestError.message;
  } finally {
    canjeandoInvitacion.value = false;
  }
};

const seleccionarSeccionAlumno = async (seccion) => {
  selectedStudentSection.value = seccion;

  if (seccion === 'cursos') await cargarOfertasAlumno();
  if (seccion === 'evaluaciones' || seccion === 'examenes') {
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
      nota: data.notaSobreDiez,
      intentoId: data.intentoId
    };
    intentoActivo.value = null;
    evaluacionIntentoActivo.value = null;
    okMessage.value = `Evaluación enviada. Nota obtenida: ${Number(data.notaSobreDiez).toFixed(2)} / 10`;
    await cargarIntentosReales();
  } catch (requestError) {
    error.value = requestError.message;
  } finally {
    enviandoIntento.value = false;
  }
};

onMounted(() => {
  Promise.all([cargarOfertasAlumno(), cargarEvaluacionesReales(), cargarIntentosReales()]);
});
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
            @click="selectedStudentSection = 'perfil'"
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

        <section v-if="selectedStudentSection === 'perfil'" class="student-panel student-profile">
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
                <li><strong>Ofertas:</strong> {{ ofertasAlumno.length }}</li>
                <li><strong>Rol:</strong> {{ props.user.tipo }}</li>
              </ul>
            </article>

            <article class="card student-card">
              <p class="student-card__kicker">Curso</p>
              <h3>Ofertas matriculadas</h3>
              <ul v-if="ofertasAlumno.length" class="student-list">
                <li v-for="oferta in ofertasAlumno" :key="oferta.id">
                  <strong>{{ oferta.course }} · {{ oferta.turno }}</strong>
                  <span>{{ oferta.classes.map((clase) => `${clase.subject} (${clase.name})`).join(', ') }}</span>
                  <small>{{ oferta.start }}–{{ oferta.end }}</small>
                </li>
              </ul>
              <p v-else class="student-empty-state">No tienes ofertas matriculadas.</p>
            </article>
          </section>
        </section>

        <section v-else-if="selectedStudentSection === 'cursos'" class="student-panel">
          <header class="student-offers-heading">
            <div><p class="eyebrow">Matrícula</p><h2>Cursos y clases</h2></div>
            <button type="button" class="student-profile__action" :disabled="cargandoOfertas" @click="cargarOfertasAlumno">{{ cargandoOfertas ? 'Actualizando...' : 'Actualizar' }}</button>
          </header>

          <section class="student-offer-grid" aria-label="Ofertas matriculadas">
            <div v-if="cargandoOfertas" class="card student-empty-state">Cargando tus ofertas...</div>
            <div v-else-if="ofertasAlumno.length" class="student-offer-grid__items">
              <article v-for="oferta in ofertasAlumno" :key="oferta.id" class="card student-offer-card">
                <header>
                  <div><p class="student-card__kicker">{{ oferta.course }}</p><h3>{{ oferta.turno }}</h3></div>
                  <span>{{ oferta.enrolled }}/{{ oferta.capacity }} alumnos</span>
                </header>
                <p class="student-offer-card__schedule">{{ oferta.start }}–{{ oferta.end }}</p>
                <ul class="student-list">
                  <li v-for="clase in oferta.classes" :key="clase.id || clase.name">
                    <strong>{{ clase.subject }} · {{ clase.name }}</strong>
                    <small>{{ clase.mode === 'semanal' ? clase.schedule : 'Modalidad por entregas' }}</small>
                  </li>
                </ul>
              </article>
            </div>
            <div v-else class="card student-empty-state">No tienes ofertas matriculadas. Puedes canjear una invitación para inscribirte.</div>
          </section>

          <div class="student-course-main">
              <article class="card student-enrollment">
                <div>
                  <p class="student-card__kicker">Matrícula</p>
                  <h3>Agregar curso con invitación</h3>
                  <small>Matrícula actual: {{ props.user.cursos?.join(', ') || props.user.curso || 'Sin cursos' }}</small>
                </div>
                <form class="student-enrollment__form" @submit.prevent="canjearInvitacion">
                  <label for="course-invitation-code">Código de invitación
                    <input id="course-invitation-code" v-model="codigoInvitacion" type="text" inputmode="numeric" autocomplete="off" maxlength="8" pattern="[0-9]{8}" placeholder="8 dígitos" required />
                  </label>
                  <button type="submit" class="student-profile__action" :disabled="canjeandoInvitacion || codigoInvitacion.trim().length !== 8">
                    {{ canjeandoInvitacion ? 'Validando...' : 'Canjear código' }}
                  </button>
                </form>
                <p v-if="mensajeInvitacion" class="student-enrollment__message" role="status">{{ mensajeInvitacion }}</p>
                <p v-if="errorInvitacion" class="student-enrollment__message student-enrollment__message--error" role="alert">{{ errorInvitacion }}</p>
              </article>
          </div>
        </section>

        <section v-else-if="selectedStudentSection === 'grupos'" class="student-grid">
          <article class="card student-card student-card--wide">
            <p class="student-card__kicker">Grupos</p>
            <h3>Sección visual en construcción</h3>
            <p class="empty-state">Aquí se mostrará la gestión de equipos y la creación de grupos más adelante.</p>
          </article>
        </section>

        <section v-else-if="['evaluaciones', 'examenes'].includes(selectedStudentSection)" class="student-panel student-exams">
          <header class="student-exams__heading">
            <div><p class="eyebrow">{{ selectedStudentSection === 'examenes' ? 'Exámenes finales de tus cursos' : 'Evaluaciones de tus cursos' }}</p><h2>{{ selectedStudentSection === 'examenes' ? 'Exámenes finales' : 'Evaluaciones' }}</h2></div>
            <button type="button" class="student-profile__action" :disabled="cargandoEvaluaciones || cargandoIntentos" @click="actualizarDatosExamenesAlumno">Actualizar</button>
          </header>

          <article class="card student-exam-result student-exam-average">
            <div><p class="student-card__kicker">Promedio · {{ selectedStudentSection === 'examenes' ? 'Exámenes finales' : 'Evaluaciones' }}</p><small>Se consideran todos los intentos enviados</small></div>
            <strong>{{ promedioCategoria === null ? 'Sin calificaciones' : `${promedioCategoria.toFixed(2)} / 10` }}</strong>
          </article>

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
            <div v-else-if="evaluacionesPorCategoria.length" class="student-exam-list__grid">
              <article v-for="evaluacion in evaluacionesPorCategoria" :key="evaluacion.id" class="card student-exam-card">
                <div><p class="student-card__kicker">{{ evaluacion.curso || 'Evaluación general' }}</p><h3>{{ evaluacion.titulo }}</h3><small>Creada por {{ evaluacion.creado_por }}</small></div>
                <footer><span>Banco: {{ evaluacion.max_preguntas }} · se sortearán {{ evaluacion.preguntas_por_intento }} preguntas</span><button type="button" class="student-profile__action" :disabled="evaluacionIniciandoId !== null" @click="iniciarIntentoAlumno(evaluacion)">{{ evaluacionIniciandoId === evaluacion.id ? 'Preparando…' : 'Iniciar intento' }}</button></footer>
              </article>
            </div>
            <div v-else class="card student-empty-state">No hay {{ selectedStudentSection === 'examenes' ? 'exámenes finales' : 'evaluaciones' }} disponibles para tus cursos.</div>
          </section>

          <section class="card student-exam-history">
            <header><div><p class="student-card__kicker">Resultados</p><h3>Mis intentos</h3></div><span v-if="cargandoIntentos">Actualizando…</span></header>
            <div v-if="intentosPorCategoria.length" class="student-exam-history__list">
              <article v-for="intento in intentosPorCategoria" :key="intento.id"><div><strong>{{ intento.titulo }}</strong><small>{{ intento.curso || 'Evaluación general' }} · {{ new Date(intento.created_at).toLocaleString() }}</small></div><span>{{ intento.completado ? `${Number(intento.nota_sobre_10).toFixed(2)} / 10` : 'Sin enviar' }}</span></article>
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

.student-course-main {
  display: grid;
  gap: 1.25rem;
  min-width: 0;
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

.student-hero h2,
.student-card h3,
.student-card h4 {
  color: #263630;
}
.student-enrollment { display: grid; gap: 0.85rem; margin-bottom: 1rem; padding: 1rem; }
.student-enrollment h3 { margin: 0 0 0.25rem; font-size: 1rem; }
.student-enrollment small { color: #748078; }
.student-enrollment__form { display: flex; align-items: end; gap: 0.75rem; }
.student-enrollment__form label { display: grid; width: min(100%, 260px); gap: 0.35rem; color: #617068; font-size: 0.78rem; }
.student-enrollment__form input { width: 100%; min-height: 40px; padding: 0.55rem 0.65rem; border: 1px solid #d8dfda; border-radius: 6px; background: #fff; color: #23332e; }
.student-enrollment__message { margin: 0; color: #326a4c; font-size: 0.82rem; }
.student-enrollment__message--error { color: #a23c35; }
@media (max-width: 600px) {
  .student-enrollment__form { align-items: stretch; flex-direction: column; }
  .student-enrollment__form label { width: 100%; }
  .student-enrollment__form .student-profile__action { align-self: flex-start; }
}
</style>
