<script setup>
import { computed, onMounted, reactive, ref } from 'vue';

const props = defineProps({
  user: { type: Object, required: true }
});

const emit = defineEmits(['logout']);

const activeSection = ref('overview');
const summary = ref(null);
const users = ref([]);
const ofertas = ref([]);
const cargandoOfertas = ref(false);
const searchText = ref('');
const roleFilter = ref('alumno');
const loading = ref(false);
const loadError = ref('');
const creandoInvitacion = ref(false);
const invitacionCreada = ref(null);
const codigoCopiado = ref(false);
const offeringDialogOpen = ref(false);
const guardandoOferta = ref(false);
const invitationForm = reactive({
  ofertaIds: [],
  expiraEnHoras: 24,
  cupoMaximo: 1
});
const nuevaOferta = reactive({
  curso: '',
  turno: '',
  horaInicio: '',
  horaFin: '',
  cupoMaximo: ''
});
const nuevasClases = ref([
  { materia: '', nombre: '', modalidad: 'semanal', horario: '', codigoLegacy: '' }
]);
const navItems = [
  { key: 'overview', label: 'Resumen', icon: 'dashboard' },
  { key: 'users', label: 'Alumnos', icon: 'people_alt' },
  { key: 'groups', label: 'Cursos y turnos', icon: 'calendar_month' },
  { key: 'teachers', label: 'Docentes', icon: 'co_present' },
  { key: 'invitations', label: 'Invitaciones', icon: 'confirmation_number' }
];

const sectionTitle = computed(() => navItems.find((item) => item.key === activeSection.value)?.label || 'Resumen');

const abrirFormularioOferta = () => {
  offeringDialogOpen.value = true;
};

const agregarClaseOferta = () => {
  nuevasClases.value.push({ materia: '', nombre: '', modalidad: 'semanal', horario: '', codigoLegacy: '' });
};

const quitarClaseOferta = (index) => {
  if (nuevasClases.value.length > 1) nuevasClases.value.splice(index, 1);
};

const adminHeaders = computed(() => ({
  'x-user-role': 'admin',
  'x-user-name': props.user.usuario || ''
}));

const requestJson = async (url) => {
  const response = await fetch(url, { headers: adminHeaders.value });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || result.error || 'No se pudieron cargar los datos');
  }
  return result;
};

const cargarDatos = async () => {
  loading.value = true;
  loadError.value = '';

  try {
    const [resumenResult, usuariosResult, ofertasResult] = await Promise.all([
      requestJson('http://localhost:3000/admin/resumen'),
      requestJson('http://localhost:3000/admin/usuarios?tipo=alumno'),
      requestJson('http://localhost:3000/admin/ofertas')
    ]);

    summary.value = resumenResult.data;
    users.value = usuariosResult.data || [];
    ofertas.value = ofertasResult.data || [];
  } catch (error) {
    loadError.value = error.message;
  } finally {
    loading.value = false;
  }
};

const crearOferta = async () => {
  guardandoOferta.value = true;
  loadError.value = '';

  try {
    const response = await fetch('http://localhost:3000/admin/ofertas', {
      method: 'POST',
      headers: {
        ...adminHeaders.value,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...nuevaOferta,
        clases: nuevasClases.value
      })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'No se pudo crear la oferta');

    nuevaOferta.curso = '';
    nuevaOferta.turno = '';
    nuevaOferta.horaInicio = '';
    nuevaOferta.horaFin = '';
    nuevaOferta.cupoMaximo = '';
    nuevasClases.value = [{ materia: '', nombre: '', modalidad: 'semanal', horario: '', codigoLegacy: '' }];
    offeringDialogOpen.value = false;
    await cargarDatos();
  } catch (error) {
    loadError.value = error.message;
  } finally {
    guardandoOferta.value = false;
  }
};

const buscarUsuarios = async () => {
  loading.value = true;
  loadError.value = '';

  const params = new URLSearchParams();
  if (searchText.value.trim()) params.set('texto', searchText.value.trim());
  if (roleFilter.value) params.set('tipo', roleFilter.value);

  try {
    const result = await requestJson(`http://localhost:3000/admin/usuarios?${params.toString()}`);
    users.value = result.data || [];
  } catch (error) {
    loadError.value = error.message;
  } finally {
    loading.value = false;
  }
};

const crearInvitacion = async () => {
  creandoInvitacion.value = true;
  loadError.value = '';
  invitacionCreada.value = null;

  try {
    const response = await fetch('http://localhost:3000/admin/invitaciones/cursos', {
      method: 'POST',
      headers: {
        ...adminHeaders.value,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ofertaIds: invitationForm.ofertaIds,
        expiraEnHoras: invitationForm.expiraEnHoras,
        cupoMaximo: invitationForm.cupoMaximo,
        adminUsuario: props.user.usuario
      })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'No se pudo crear la invitación');

    invitacionCreada.value = {
      codigo: result.codigo,
      ...result.data
    };
    codigoCopiado.value = false;
    await cargarDatos();
  } catch (error) {
    loadError.value = error.message;
  } finally {
    creandoInvitacion.value = false;
  }
};

const copiarCodigoInvitacion = async () => {
  if (!invitacionCreada.value?.codigo) return;

  try {
    await navigator.clipboard.writeText(invitacionCreada.value.codigo);
    codigoCopiado.value = true;
  } catch (error) {
    loadError.value = `No se pudo copiar el código: ${error.message}`;
  }
};

const metricItems = computed(() => [
  { label: 'Alumnos registrados', value: summary.value?.alumnos ?? '—', icon: 'school', tone: 'blue', current: true },
  { label: 'Ofertas de curso', value: ofertas.value.length, icon: 'library_books', tone: 'green', current: true },
  { label: 'Cupos disponibles', value: ofertas.value.reduce((total, item) => total + Math.max(item.capacity - item.enrolled, 0), 0), icon: 'event_seat', tone: 'amber', current: true },
  { label: 'Turnos completos', value: ofertas.value.filter((item) => item.enrolled >= item.capacity).length, icon: 'block', tone: 'coral', current: true }
]);

const fechaActual = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());

onMounted(cargarDatos);
</script>

<template>
  <main class="admin-app">
    <aside class="admin-rail">
      <a class="admin-brand" href="#resumen" @click.prevent="activeSection = 'overview'">
        <span class="admin-brand__mark">A</span>
        <span>
          <strong>Aula</strong>
          <small>Administración</small>
        </span>
      </a>

          <p class="admin-rail__label">Espacio de trabajo</p>
      <nav class="admin-nav" aria-label="Navegación de administración">
        <button
          v-for="item in navItems"
          :key="item.key"
          type="button"
          :class="['admin-nav__item', { 'is-active': activeSection === item.key }]"
          @click="activeSection = item.key"
        >
          <span class="material-icons" aria-hidden="true">{{ item.icon }}</span>
          <span>{{ item.label }}</span>
          <span v-if="item.key === 'groups' || item.key === 'teachers'" class="admin-nav__soon">Diseño</span>
        </button>
      </nav>

      <div class="admin-rail__bottom">
        <div class="admin-account">
          <span class="admin-account__avatar">{{ (user.nombre || user.usuario || 'A').slice(0, 1).toUpperCase() }}</span>
          <span class="admin-account__text">
            <strong>{{ user.nombre || user.usuario }}</strong>
            <small>Administrador</small>
          </span>
        </div>
        <button class="admin-logout" type="button" @click="emit('logout')">
          <span class="material-icons" aria-hidden="true">logout</span>
          Cerrar sesión
        </button>
      </div>
    </aside>

    <section class="admin-main">
      <header class="admin-topbar">
        <div class="admin-breadcrumb"><span>Administración</span><span>/</span><strong>{{ sectionTitle }}</strong></div>
        <div class="admin-topbar__date">{{ fechaActual }}</div>
      </header>

      <div class="admin-content">
        <div v-if="loadError" class="admin-alert" role="alert">
          <span>{{ loadError }}</span>
          <button type="button" @click="cargarDatos">Reintentar</button>
        </div>

        <div v-if="activeSection === 'overview'" class="admin-view">
          <div class="admin-view__heading">
            <div>
              <p class="admin-eyebrow">Vista general</p>
              <h1>Panel de control</h1>
              <p class="admin-lead">Hola, {{ user.nombre || user.usuario }}. Gestiona cursos, turnos y matrículas.</p>
            </div>
            <button class="admin-icon-button" type="button" aria-label="Actualizar datos" title="Actualizar datos" :disabled="loading" @click="cargarDatos">
              <span class="material-icons" aria-hidden="true">refresh</span>
            </button>
          </div>

          <div class="admin-metrics" aria-label="Resumen de matrículas y cupos">
            <article v-for="metric in metricItems" :key="metric.label" :class="['admin-metric', `tone-${metric.tone}`]">
              <div class="admin-metric__top">
                <span>{{ metric.label }}</span>
                <span class="material-icons" aria-hidden="true">{{ metric.icon }}</span>
              </div>
              <strong>{{ metric.value }}</strong>
              <small>Dato actual</small>
            </article>
          </div>

          <div class="admin-overview-grid">
            <section class="admin-section admin-courses-section">
              <div class="admin-section__heading">
                <div>
                  <h2>Cursos y turnos</h2>
                  <p>Materias incluidas y capacidad de cada oferta</p>
                </div>
                <button class="admin-text-button" type="button" @click="activeSection = 'groups'">Gestionar ofertas <span aria-hidden="true">→</span></button>
              </div>

              <div class="admin-table-wrap">
                <table class="admin-table">
                  <thead>
                    <tr><th>Curso / turno</th><th>Materias y clases</th><th>Horario</th><th>Alumnos</th><th>Estado</th></tr>
                  </thead>
                  <tbody>
                    <tr v-for="offering in ofertas" :key="offering.id">
                      <td><strong>{{ offering.course }}</strong><small class="table-subtext">{{ offering.shift }}</small></td>
                      <td class="subjects-cell">{{ offering.classes.map((item) => `${item.subject} (${item.name})`).join(', ') }}</td>
                      <td>{{ offering.start }}-{{ offering.end }}</td>
                      <td>{{ offering.enrolled }}/{{ offering.capacity }}</td>
                      <td><span :class="['offering-status', { 'is-full': offering.enrolled >= offering.capacity }]">{{ offering.enrolled >= offering.capacity ? 'Completo' : 'Disponible' }}</span></td>
                    </tr>
                    <tr v-if="!ofertas.length"><td colspan="5" class="admin-empty">{{ loading ? 'Cargando ofertas...' : 'Todavía no hay cursos u ofertas creadas.' }}</td></tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section class="admin-section admin-activity-section">
              <div class="admin-section__heading">
                <div>
                  <h2>Inscripción automática</h2>
                  <p>Regla de capacidad por turno</p>
                </div>
                <span class="material-icons admin-section__icon" aria-hidden="true">event_available</span>
              </div>
              <div class="enrollment-rule__capacity"><strong>Por oferta</strong><span>cupo configurado<br />por administración</span></div>
              <p class="enrollment-rule__copy">Al inscribir a un alumno en un turno, queda asignado automáticamente a todas las materias de ese curso.</p>
              <div class="admin-section__footnote">Si el turno no tiene cupos, se informa que está completo y no se crea una inscripción parcial.</div>
            </section>
          </div>

          <section class="admin-section admin-users-preview">
            <div class="admin-section__heading">
              <div>
                <h2>Alumnos recientes</h2>
                <p>Cuentas disponibles para asignación</p>
              </div>
              <button class="admin-text-button" type="button" @click="activeSection = 'users'">Gestionar alumnos <span aria-hidden="true">→</span></button>
            </div>
            <div v-if="users.some((person) => person.tipo === 'alumno')" class="admin-recent-list">
              <div v-for="person in users.filter((item) => item.tipo === 'alumno').slice(0, 4)" :key="person.id" class="admin-recent-row">
                <span class="admin-person-avatar">{{ (person.nombre || person.usuario || '?').slice(0, 1).toUpperCase() }}</span>
                <div class="admin-person-info"><strong>{{ person.nombre }} {{ person.apellido }}</strong><small>{{ person.email || person.usuario }}</small></div>
                <span :class="['status-dot', { 'is-inactive': person.estado !== 'activo' }]">{{ person.estado || 'activo' }}</span>
              </div>
            </div>
            <div v-else class="admin-empty">{{ loading ? 'Cargando alumnos...' : 'No hay alumnos para mostrar.' }}</div>
          </section>
        </div>

        <div v-else-if="activeSection === 'users'" class="admin-view">
          <div class="admin-view__heading">
            <div>
              <p class="admin-eyebrow">Directorio</p>
              <h1>Alumnos</h1>
              <p class="admin-lead">Busca alumnos y revisa sus cursos y estado de inscripción.</p>
            </div>
          </div>

          <section class="admin-section">
            <form class="admin-user-filters" @submit.prevent="buscarUsuarios">
              <label class="admin-search-field">
                <span class="material-icons" aria-hidden="true">search</span>
                <input v-model="searchText" type="search" placeholder="Buscar alumno por nombre o usuario" />
              </label>
              <select v-model="roleFilter" aria-label="Filtrar por perfil">
                <option value="">Todos los perfiles</option>
                <option value="alumno">Alumnos</option>
                <option value="profesor">Profesores</option>
                <option value="admin">Administradores</option>
              </select>
              <button class="admin-primary-button" type="submit" :disabled="loading">Buscar</button>
            </form>

            <div class="admin-table-wrap">
              <table class="admin-table admin-table--users">
                <thead><tr><th>Usuario</th><th>Correo</th><th>Perfil</th><th>Curso(s)</th><th>Estado</th></tr></thead>
                <tbody>
                  <tr v-for="person in users" :key="person.id">
                    <td><strong>{{ person.nombre }} {{ person.apellido }}</strong><small class="table-subtext">{{ person.usuario }}</small></td>
                    <td>{{ person.email || 'Sin correo' }}</td>
                    <td><span :class="['role-label', `role-${person.tipo}`]">{{ person.tipo }}</span></td>
                    <td>{{ (person.cursos || (person.curso ? [person.curso] : [])).join(', ') || '—' }}</td>
                    <td><span :class="['status-dot', { 'is-inactive': person.estado !== 'activo' }]">{{ person.estado || 'activo' }}</span></td>
                  </tr>
                  <tr v-if="!users.length"><td colspan="5" class="admin-empty">{{ loading ? 'Cargando...' : 'No hay usuarios que coincidan.' }}</td></tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div v-else-if="activeSection === 'groups'" class="admin-view">
          <div class="admin-view__heading">
            <div>
              <p class="admin-eyebrow">Organización académica</p>
              <h1>Cursos y turnos</h1>
              <p class="admin-lead">Cada oferta combina un curso, un turno y las clases que lo componen.</p>
            </div>
            <span class="admin-design-tag">Prototipo</span>
          </div>

          <section class="admin-section">
            <div class="admin-section__heading">
              <div><h2>Ofertas por turno</h2><p>La matrícula en una oferta incluirá automáticamente todas sus materias.</p></div>
              <button class="admin-primary-button" type="button" @click="abrirFormularioOferta">Crear curso / turno</button>
            </div>
            <div class="admin-table-wrap">
              <table class="admin-table">
                <thead><tr><th>Curso</th><th>Turno y horario</th><th>Materias / clases incluidas</th><th>Cupos</th><th>Estado</th><th>Acciones</th></tr></thead>
                <tbody>
                  <tr v-for="offering in ofertas" :key="offering.id">
                    <td><strong>{{ offering.course }}</strong></td>
                    <td>{{ offering.shift }}<small class="table-subtext">{{ offering.start }}-{{ offering.end }}</small></td>
                    <td class="subjects-cell">{{ offering.classes.map((item) => `${item.subject} (${item.name})`).join(', ') }}</td>
                    <td>{{ offering.enrolled }}/{{ offering.capacity }}</td>
                    <td><span :class="['offering-status', { 'is-full': offering.enrolled >= offering.capacity }]">{{ offering.enrolled >= offering.capacity ? 'Completo' : 'Disponible' }}</span></td>
                    <td><button class="admin-row-action" type="button" disabled>Editar</button><button class="admin-row-action is-danger" type="button" disabled>Eliminar</button></td>
                  </tr>
                  <tr v-if="!ofertas.length"><td colspan="6" class="admin-empty">{{ cargandoOfertas ? 'Cargando ofertas...' : 'No hay ofertas. Crea la primera para habilitar inscripciones.' }}</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          <div class="admin-design-note"><span class="material-icons" aria-hidden="true">event_seat</span><p>La inscripción será atómica: se valida el cupo del turno y se agregan todas sus materias/clases. Si está completo, no se asigna ninguna y se informa que ese turno está lleno. Cada clase podrá manejar horario semanal o modalidad por entregas.</p></div>

          <div v-if="offeringDialogOpen" class="admin-dialog-backdrop" @click.self="offeringDialogOpen = false">
            <form class="admin-dialog" @submit.prevent="crearOferta">
              <header class="admin-dialog__header">
                <div><p class="admin-eyebrow">Nueva oferta académica</p><h2>Crear curso y turno</h2></div>
                <button class="admin-icon-button" type="button" aria-label="Cerrar formulario" @click="offeringDialogOpen = false"><span class="material-icons" aria-hidden="true">close</span></button>
              </header>

              <section class="admin-dialog__section">
                <h3>Curso y turno</h3>
                <div class="admin-offering-fields">
                  <label class="admin-dialog__field admin-offering-fields__course">Nombre del curso
                    <input v-model="nuevaOferta.curso" type="text" placeholder="Ej. Redes y Software" required />
                  </label>
                  <label class="admin-dialog__field">Turno
                    <select v-model="nuevaOferta.turno" required><option disabled value="">Seleccionar</option><option>Mañana</option><option>Tarde</option><option>Noche</option></select>
                  </label>
                  <label class="admin-dialog__field">Desde<input v-model="nuevaOferta.horaInicio" type="time" required /></label>
                  <label class="admin-dialog__field">Hasta<input v-model="nuevaOferta.horaFin" type="time" required /></label>
                  <label class="admin-dialog__field">Cupo máximo<input v-model.number="nuevaOferta.cupoMaximo" type="number" min="1" required /></label>
                </div>
              </section>

              <section class="admin-dialog__section">
                <div class="admin-dialog__section-heading"><div><h3>Materias y clases</h3><p>Cada materia debe tener horario semanal o modalidad por entregas.</p></div><button class="admin-text-button" type="button" @click="agregarClaseOferta">+ Añadir materia</button></div>
                <div v-for="(clase, index) in nuevasClases" :key="index" class="admin-class-row">
                  <label class="admin-dialog__field">Materia
                    <input v-model="clase.materia" type="text" placeholder="Ej. Frontend" required />
                  </label>
                  <label class="admin-dialog__field">Nombre de clase<input v-model="clase.nombre" type="text" placeholder="Ej. 1A Frontend" required /></label>
                  <label class="admin-dialog__field">Modalidad<select v-model="clase.modalidad"><option value="semanal">Horario semanal</option><option value="entregas">Por entregas</option></select></label>
                  <label v-if="clase.modalidad === 'semanal'" class="admin-dialog__field admin-class-row__schedule">Horario de clase<input v-model="clase.horario" type="text" placeholder="Ej. Martes 15:00–17:00" required /></label>
                  <div v-else class="admin-class-row__async">Sin horario fijo · organizado por entregas</div>
                  <label class="admin-dialog__field">Código legacy (opcional)<input v-model="clase.codigoLegacy" type="text" maxlength="100" placeholder="Ej. frontend" /></label>
                  <button class="admin-row-action is-danger" type="button" :disabled="nuevasClases.length === 1" aria-label="Quitar materia" @click="quitarClaseOferta(index)">Quitar</button>
                </div>
              </section>

              <div class="admin-dialog__notice"><span class="material-icons" aria-hidden="true">school</span>Los docentes se asignan por separado desde la sección Docentes.</div>
              <footer class="admin-dialog__actions"><button class="admin-secondary-button" type="button" :disabled="guardandoOferta" @click="offeringDialogOpen = false">Cancelar</button><button class="admin-primary-button" type="submit" :disabled="guardandoOferta">{{ guardandoOferta ? 'Guardando...' : 'Guardar oferta' }}</button></footer>
            </form>
          </div>
        </div>

        <div v-else-if="activeSection === 'teachers'" class="admin-view">
          <div class="admin-view__heading">
            <div><p class="admin-eyebrow">Asignación académica</p><h1>Docentes</h1><p class="admin-lead">Asigna profesores a cada clase independientemente de la creación del curso.</p></div>
            <span class="admin-design-tag">Prototipo</span>
          </div>
          <section class="admin-section">
            <div class="admin-section__heading"><div><h2>Clases por asignar</h2><p>La asignación docente se administra después de definir materias, clases y horarios.</p></div></div>
            <div class="admin-table-wrap">
              <table class="admin-table">
                <thead><tr><th>Curso / turno</th><th>Materia / clase</th><th>Horario</th><th>Docente</th><th>Acción</th></tr></thead>
                <tbody>
                  <template v-for="offering in ofertas" :key="offering.id">
                    <tr v-for="item in offering.classes" :key="item.name">
                      <td>{{ offering.course }}<small class="table-subtext">{{ offering.shift }}</small></td>
                      <td><strong>{{ item.subject }}</strong><small class="table-subtext">{{ item.name }}</small></td>
                      <td>{{ item.schedule }}</td>
                      <td><span class="unassigned-label">Sin asignar</span></td>
                      <td><button class="admin-row-action" type="button" disabled>Asignar</button></td>
                    </tr>
                  </template>
                  <tr v-if="!ofertas.length"><td colspan="5" class="admin-empty">No hay ofertas con clases.</td></tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div v-else class="admin-view">
          <div class="admin-view__heading">
            <div>
              <p class="admin-eyebrow">Acceso a cursos</p>
              <h1>Invitaciones</h1>
              <p class="admin-lead">Invitaciones para matricular alumnos en una o varias ofertas disponibles.</p>
            </div>
          </div>

          <section class="admin-section">
            <div class="admin-section__heading">
              <div><h2>Códigos de invitación</h2><p>Genera accesos limitados para matricular alumnos en ofertas activas.</p></div>
            </div>
            <form class="invitation-form" @submit.prevent="crearInvitacion">
              <fieldset class="invitation-course-fieldset">
                <legend>Ofertas incluidas</legend>
                <div class="invitation-course-options">
                  <label v-for="offer in ofertas" :key="offer.id" class="invitation-course-option" :class="{ 'is-disabled': offer.enrolled >= offer.capacity }">
                    <input
                      v-model="invitationForm.ofertaIds"
                      type="checkbox"
                      :value="offer.id"
                      :disabled="offer.enrolled >= offer.capacity"
                    />
                    <span>{{ offer.course }} · {{ offer.shift }} · {{ offer.enrolled }}/{{ offer.capacity }} inscritos</span>
                  </label>
                  <p v-if="!ofertas.length" class="admin-empty">{{ cargandoOfertas ? 'Cargando ofertas...' : 'No hay ofertas activas para invitar. Crea primero una oferta.' }}</p>
                </div>
              </fieldset>

              <div class="invitation-fields">
                <label>Vigencia (horas)
                  <input v-model.number="invitationForm.expiraEnHoras" type="number" min="1" max="8760" required />
                </label>
                <label>Usos máximos
                  <input v-model.number="invitationForm.cupoMaximo" type="number" min="1" max="1000" required />
                </label>
              </div>

              <button class="admin-primary-button" type="submit" :disabled="creandoInvitacion || invitationForm.ofertaIds.length === 0">
                <span class="material-icons" aria-hidden="true">add_link</span>
                {{ creandoInvitacion ? 'Creando...' : 'Crear invitación' }}
              </button>
            </form>

            <article v-if="invitacionCreada" class="invitation-created" role="status">
              <div class="invitation-created__copy">
                <div><p class="admin-eyebrow">Código listo para compartir</p><strong class="invitation-created__code">{{ invitacionCreada.codigo }}</strong></div>
                <button class="admin-secondary-button invitation-copy-button" type="button" :aria-label="codigoCopiado ? 'Código copiado' : 'Copiar código'" :title="codigoCopiado ? 'Código copiado' : 'Copiar código'" @click="copiarCodigoInvitacion">
                  <span class="material-icons" aria-hidden="true">{{ codigoCopiado ? 'check' : 'content_copy' }}</span>
                  {{ codigoCopiado ? 'Copiado' : 'Copiar' }}
                </button>
              </div>
              <p>{{ invitacionCreada.ofertas?.length ? invitacionCreada.ofertas.map((offer) => `${offer.curso} · ${offer.turno}`).join(', ') : invitacionCreada.cursos?.join(', ') }}</p>
              <small>Vence {{ new Date(invitacionCreada.expiraEn).toLocaleString('es') }} · {{ invitacionCreada.cupoMaximo }} usos</small>
            </article>
          </section>
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>
.admin-app {
  --ink: #23332e;
  --muted: #78847e;
  --line: #e3e8e4;
  --paper: #fff;
  --canvas: #f4f6f3;
  height: 100vh;
  height: 100dvh;
  min-height: 0;
  display: grid;
  grid-template-columns: 238px minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr);
  overflow: hidden;
  background: var(--canvas);
  color: var(--ink);
  font-family: 'Aptos', 'Segoe UI', sans-serif;
}

:global(.admin-shell) {
  width: 100%;
  max-width: none;
  height: 100vh;
  height: 100dvh;
  min-height: 0;
  margin: 0;
  padding: 0;
  overflow: hidden;
}

.admin-rail {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  overflow-y: auto;
  padding: 1.4rem 0.9rem 1rem;
  background: #223a33;
  color: #eef3ef;
}

.admin-brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.25rem 0.7rem 1.8rem;
  color: inherit;
  text-decoration: none;
}

.admin-brand__mark {
  width: 39px;
  height: 39px;
  display: grid;
  place-items: center;
  border: 1px solid #91afa3;
  color: #c5d9d0;
  font: 600 1.35rem Georgia, serif;
}

.admin-brand strong,
.admin-brand small,
.admin-account__text strong,
.admin-account__text small {
  display: block;
}

.admin-brand strong { font-size: 0.95rem; }
.admin-brand small { margin-top: 0.15rem; color: #a8beb4; font-size: 0.72rem; }
.admin-rail__label { margin: 0 0 0.7rem 0.7rem; color: #99ada4; font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.08em; }
.admin-nav { display: grid; gap: 0.3rem; }

.admin-nav__item {
  min-height: 43px;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0 0.7rem;
  border: 1px solid transparent;
  border-radius: 3px;
  background: transparent;
  color: #d1ddd7;
  text-align: left;
  font-size: 0.85rem;
}

.admin-nav__item .material-icons { font-size: 1.1rem; color: #a8beb4; }
.admin-nav__item:hover { background: rgba(255,255,255,0.06); opacity: 1; }
.admin-nav__item.is-active { border-color: rgba(197,217,208,0.13); background: #315348; color: white; }
.admin-nav__item.is-active .material-icons { color: #c3d9cf; }
.admin-nav__soon { margin-left: auto; color: #bbcabf; font-size: 0.62rem; }
.admin-rail__bottom { margin-top: auto; padding: 1rem 0.5rem 0; border-top: 1px solid rgba(255,255,255,0.12); }
.admin-account { display: flex; align-items: center; gap: 0.65rem; padding: 0 0.15rem 0.85rem; }
.admin-account__avatar { width: 32px; height: 32px; display: grid; place-items: center; border-radius: 50%; background: #c4d8ce; color: #29473c; font-size: 0.8rem; font-weight: 700; }
.admin-account__text strong { max-width: 145px; overflow: hidden; color: #f3f6f3; font-size: 0.75rem; text-overflow: ellipsis; white-space: nowrap; }
.admin-account__text small { margin-top: 0.12rem; color: #a8beb4; font-size: 0.68rem; }
.admin-logout { width: 100%; display: flex; align-items: center; gap: 0.65rem; padding: 0.55rem 0.15rem; border-radius: 2px; background: transparent; color: #c3d0c9; text-align: left; font-size: 0.77rem; }
.admin-logout .material-icons { font-size: 1rem; }
.admin-logout:hover { color: white; opacity: 1; }

.admin-main { min-width: 0; min-height: 0; display: flex; flex-direction: column; overflow: hidden; }
.admin-topbar { min-height: 59px; display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 0 2rem; border-bottom: 1px solid var(--line); background: var(--paper); }
.admin-breadcrumb { display: flex; align-items: center; gap: 0.6rem; color: #89938e; font-size: 0.76rem; }
.admin-breadcrumb strong { color: #35443e; font-weight: 600; }
.admin-topbar__date { color: #7d8982; font-size: 0.76rem; }
.admin-content { width: min(100%, 1440px); min-height: 0; flex: 1; margin: 0 auto; padding: 2rem clamp(1.1rem, 3vw, 2.3rem) 3rem; overflow-y: auto; overscroll-behavior: contain; }
.admin-view__heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; margin-bottom: 1.4rem; }
.admin-eyebrow { margin: 0 0 0.35rem; color: #607d70; font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; }
.admin-view h1 { margin: 0; color: #263630; font: 500 1.85rem/1.2 Georgia, 'Times New Roman', serif; }
.admin-lead { margin: 0.45rem 0 0; color: #79847e; font-size: 0.83rem; }
.admin-icon-button { width: 38px; height: 38px; display: grid; place-items: center; border: 1px solid #dce3de; border-radius: 3px; background: white; color: #4b6e60; }
.admin-icon-button .material-icons { font-size: 1.15rem; }
.admin-icon-button:hover { background: #f6f8f6; opacity: 1; }
.admin-metrics { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0.85rem; margin-bottom: 1rem; }
.admin-metric { min-height: 118px; padding: 1rem 1.1rem; border: 1px solid var(--line); border-top: 3px solid #547a69; border-radius: 3px; background: var(--paper); }
.admin-metric.tone-blue { border-top-color: #637e92; }
.admin-metric.tone-amber { border-top-color: #aa8955; }
.admin-metric.tone-coral { border-top-color: #a66f61; }
.admin-metric__top { display: flex; justify-content: space-between; align-items: center; color: #748079; font-size: 0.77rem; }
.admin-metric__top .material-icons { color: #789184; font-size: 1.1rem; }
.tone-blue .admin-metric__top .material-icons { color: #71899a; }
.tone-amber .admin-metric__top .material-icons { color: #aa8955; }
.tone-coral .admin-metric__top .material-icons { color: #a66f61; }
.admin-metric strong { display: block; margin-top: 0.55rem; color: #293a33; font-size: 1.65rem; font-weight: 600; line-height: 1; }
.admin-metric small { display: block; margin-top: 0.45rem; color: #a0aaa4; font-size: 0.68rem; }
.admin-overview-grid { display: grid; grid-template-columns: minmax(0, 1.55fr) minmax(230px, 0.75fr); gap: 1rem; margin-bottom: 1rem; }
.admin-section { min-width: 0; border: 1px solid var(--line); border-radius: 3px; background: var(--paper); }
.admin-section__heading { min-height: 69px; display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 0.85rem 1.1rem; border-bottom: 1px solid #edf0ed; }
.admin-section__heading h2 { margin: 0; color: #34423c; font-size: 0.9rem; font-weight: 650; }
.admin-section__heading p { margin: 0.22rem 0 0; color: #8b9690; font-size: 0.72rem; }
.admin-section__icon { color: #668373; font-size: 1.25rem; }
.admin-text-button { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.4rem 0.1rem; border-radius: 0; background: transparent; color: #456c5b; font-size: 0.73rem; font-weight: 650; white-space: nowrap; }
.admin-text-button:hover { text-decoration: underline; text-underline-offset: 3px; opacity: 1; }
.admin-table-wrap { width: 100%; overflow-x: auto; }
.admin-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 0.76rem; }
.admin-table th { padding: 0.65rem 1rem; background: #f8faf8; color: #7c8981; font-size: 0.66rem; font-weight: 650; white-space: nowrap; }
.admin-table td { padding: 0.72rem 1rem; border-top: 1px solid #edf0ed; color: #48564f; white-space: nowrap; }
.admin-table tbody tr:hover { background: #fafcf9; }
.admin-table td:first-child { color: #34433c; font-weight: 600; text-transform: capitalize; }
.course-dot { width: 7px; height: 7px; display: inline-block; margin-right: 0.55rem; border-radius: 50%; background: #6c9380; }
.admin-activity-section { padding-bottom: 0.7rem; }
.activity-line { display: flex; align-items: center; justify-content: space-between; padding: 0.85rem 1.1rem; border-bottom: 1px solid #edf0ed; color: #718078; font-size: 0.75rem; }
.activity-line strong { color: #35453d; font-size: 0.86rem; }
.admin-section__footnote { padding: 0.8rem 1.1rem 0.2rem; color: #a0aaa4; font-size: 0.66rem; }
.admin-users-preview { overflow: hidden; }
.admin-recent-list { padding: 0.1rem 1.1rem; }
.admin-recent-row { min-height: 54px; display: flex; align-items: center; gap: 0.7rem; border-bottom: 1px solid #edf0ed; }
.admin-recent-row:last-child { border-bottom: 0; }
.admin-person-avatar { width: 30px; height: 30px; flex: 0 0 30px; display: grid; place-items: center; border-radius: 50%; background: #e4ece6; color: #456855; font-size: 0.72rem; font-weight: 700; }
.admin-person-info { min-width: 0; flex: 1; }
.admin-person-info strong, .admin-person-info small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.admin-person-info strong { color: #405047; font-size: 0.74rem; }
.admin-person-info small { margin-top: 0.12rem; color: #96a099; font-size: 0.67rem; }
.role-label { padding: 0.23rem 0.45rem; border-radius: 2px; background: #edf2ef; color: #5a7465; font-size: 0.64rem; text-transform: capitalize; }
.role-alumno { background: #edf3f7; color: #526f82; }
.role-profesor { background: #f5f0e5; color: #887246; }
.role-admin { background: #f4ebe8; color: #8c6559; }
.status-dot { display: inline-flex; align-items: center; gap: 0.35rem; color: #568069; font-size: 0.67rem; text-transform: capitalize; }
.status-dot::before { width: 6px; height: 6px; border-radius: 50%; background: #6a9a79; content: ''; }
.status-dot.is-inactive { color: #a06e60; }
.status-dot.is-inactive::before { background: #b67b6a; }
.admin-user-filters { display: grid; grid-template-columns: minmax(200px, 1fr) 190px auto; gap: 0.65rem; padding: 1rem; border-bottom: 1px solid #edf0ed; }
.admin-search-field { min-height: 39px; display: flex; align-items: center; gap: 0.5rem; padding: 0 0.65rem; border: 1px solid #dfe5e0; border-radius: 3px; background: #fcfdfc; }
.admin-search-field .material-icons { color: #8a9890; font-size: 1.05rem; }
.admin-search-field input { width: 100%; min-width: 0; margin: 0; padding: 0; border: 0; outline: 0; background: transparent; color: #34443b; font-size: 0.76rem; }
.admin-user-filters select { min-height: 39px; margin: 0; padding: 0 0.65rem; border: 1px solid #dfe5e0; border-radius: 3px; background: #fcfdfc; color: #59675f; font-size: 0.76rem; }
.admin-primary-button { min-height: 38px; padding: 0.5rem 0.9rem; border: 1px solid #315d50; border-radius: 3px; background: #315d50; color: white; font-size: 0.75rem; font-weight: 650; white-space: nowrap; }
.admin-primary-button:hover:not(:disabled) { background: #264b40; opacity: 1; }
.admin-primary-button:disabled { border-color: #ccd5cf; background: #e8ece9; color: #8a9690; cursor: not-allowed; }
.table-subtext { display: block; margin-top: 0.15rem; color: #94a098; font-size: 0.68rem; font-weight: 400; }
.admin-empty { padding: 1.25rem !important; color: #8d9991 !important; text-align: center; font-weight: 400 !important; }
.admin-alert { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 1rem; padding: 0.75rem 0.9rem; border: 1px solid #dfc9bc; border-radius: 3px; background: #faf4ee; color: #785a45; font-size: 0.77rem; }
.admin-alert button { padding: 0.35rem 0.5rem; border-radius: 2px; background: transparent; color: #785a45; font-size: 0.74rem; font-weight: 700; }
.admin-alert button:hover { text-decoration: underline; opacity: 1; }
.admin-design-tag { padding: 0.35rem 0.55rem; border: 1px solid #d9dfda; border-radius: 2px; color: #758079; font-size: 0.67rem; text-transform: uppercase; letter-spacing: 0.05em; }
.admin-design-note { display: flex; align-items: flex-start; gap: 0.7rem; margin-top: 1rem; padding: 0.85rem 1rem; border-left: 3px solid #9a8057; background: #f6f2e9; color: #74684f; }
.admin-design-note .material-icons { font-size: 1.1rem; }
.admin-design-note p { margin: 0; font-size: 0.75rem; line-height: 1.5; }
.invitation-empty { min-height: 220px; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 0.6rem; padding: 2rem; color: #77847c; text-align: center; }
.invitation-empty .material-icons { color: #6d8c7b; font-size: 2rem; }
.invitation-empty strong { color: #43534a; font-size: 0.88rem; }
.invitation-empty span:last-child { max-width: 380px; color: #8d9991; font-size: 0.74rem; line-height: 1.5; }
.invitation-form { display: grid; gap: 1.25rem; margin-top: 1.25rem; }
.invitation-course-fieldset { min-width: 0; margin: 0; padding: 0; border: 0; }
.invitation-course-fieldset legend { margin-bottom: 0.65rem; color: #52625a; font-size: 0.82rem; font-weight: 700; }
.invitation-course-options { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 0.5rem; }
.invitation-course-option { display: flex; min-height: 42px; align-items: center; gap: 0.6rem; padding: 0.55rem 0.7rem; border: 1px solid #dce4de; border-radius: 6px; color: #34443b; font-size: 0.82rem; cursor: pointer; }
.invitation-course-option input { width: 16px; height: 16px; accent-color: #356b55; }
.invitation-fields { display: grid; grid-template-columns: repeat(2, minmax(0, 220px)); gap: 0.8rem; }
.invitation-fields label { display: grid; gap: 0.4rem; color: #52625a; font-size: 0.78rem; font-weight: 650; }
.invitation-fields input { width: 100%; min-height: 40px; padding: 0.5rem 0.65rem; border: 1px solid #cfdad2; border-radius: 6px; background: #fff; color: #23332e; }
.invitation-form > .admin-primary-button { display: inline-flex; width: fit-content; align-items: center; gap: 0.45rem; }
.invitation-form > .admin-primary-button .material-icons { font-size: 1.1rem; }
.invitation-created { display: grid; gap: 0.55rem; margin-top: 1.25rem; padding: 1rem; border: 1px solid #bed8c7; border-left: 4px solid #397452; border-radius: 6px; background: #f2f8f3; color: #34443b; }
.invitation-created__copy { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
.invitation-created__copy .admin-eyebrow { margin: 0 0 0.25rem; }
.invitation-created__code { color: #1f5139; font-size: 1.35rem; font-variant-numeric: tabular-nums; }
.invitation-copy-button { display: inline-flex; align-items: center; gap: 0.4rem; }
.invitation-copy-button .material-icons { font-size: 1rem; }
.invitation-created p, .invitation-created small { margin: 0; color: #5f7066; }
@media (max-width: 600px) {
  .invitation-fields { grid-template-columns: 1fr; }
  .invitation-created__copy { align-items: flex-start; flex-direction: column; }
}
.admin-prototype-banner { display: flex; align-items: center; gap: 0.5rem; margin: -0.25rem 0 1rem; color: #79877e; font-size: 0.7rem; }
.admin-prototype-banner .material-icons { color: #9a8057; font-size: 1rem; }
.enrollment-rule__capacity { display: flex; align-items: center; gap: 0.8rem; padding: 1rem 1.1rem 0.45rem; color: #758179; font-size: 0.75rem; line-height: 1.35; }
.enrollment-rule__capacity strong { color: #345f50; font-size: 2.2rem; font-weight: 600; line-height: 1; }
.enrollment-rule__copy { margin: 0; padding: 0.5rem 1.1rem; color: #56655d; font-size: 0.74rem; line-height: 1.55; }
.subjects-cell { min-width: 170px; max-width: 290px; white-space: normal !important; line-height: 1.5; }
.offering-status { display: inline-block; padding: 0.25rem 0.45rem; border: 1px solid #d6e5db; border-radius: 2px; background: #f1f7f3; color: #52745f; font-size: 0.66rem; }
.offering-status.is-full { border-color: #e4d5cc; background: #faf3ef; color: #916653; }
.admin-row-action { margin-right: 0.4rem; padding: 0.3rem 0.4rem; border: 1px solid #dce3de; border-radius: 2px; background: white; color: #718078; font-size: 0.66rem; }
.admin-row-action.is-danger { color: #93685c; }
.admin-row-action:disabled { opacity: 0.55; cursor: not-allowed; }
.admin-dialog-backdrop { position: fixed; inset: 0; z-index: 20; display: grid; place-items: center; padding: 1.25rem; background: rgba(25, 39, 33, 0.42); }
.admin-dialog { width: min(100%, 920px); max-height: min(90vh, 900px); overflow-y: auto; padding: 1.35rem; border: 1px solid #dfe5e0; border-radius: 4px; background: #fff; box-shadow: 0 24px 70px rgba(20, 40, 31, 0.2); }
.admin-dialog__header { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; padding-bottom: 1rem; border-bottom: 1px solid #edf0ed; }
.admin-dialog__header h2 { margin: 0; color: #34423c; font-size: 1.1rem; }
.admin-dialog__section { padding: 1rem 0; border-bottom: 1px solid #edf0ed; }
.admin-dialog__section h3 { margin: 0 0 0.75rem; color: #43534a; font-size: 0.82rem; }
.admin-dialog__section-heading { display: flex; justify-content: space-between; align-items: center; gap: 1rem; margin-bottom: 0.8rem; }
.admin-dialog__section-heading h3 { margin: 0; }
.admin-dialog__section-heading p { margin: 0.2rem 0 0; color: #8b9690; font-size: 0.68rem; }
.admin-offering-fields { display: grid; grid-template-columns: minmax(200px, 2fr) repeat(4, minmax(95px, 1fr)); gap: 0.7rem; }
.admin-dialog__field { min-width: 0; display: block; color: #56655d; font-size: 0.69rem; font-weight: 650; }
.admin-dialog__field input, .admin-dialog__field select { min-height: 38px; margin: 0.35rem 0 0; padding: 0.45rem 0.55rem; border: 1px solid #dfe5e0; border-radius: 3px; background: #fcfdfc; color: #3e4d44; font-size: 0.72rem; }
.admin-class-row { display: grid; grid-template-columns: 1.1fr 1fr 1.05fr 1.3fr auto; align-items: end; gap: 0.55rem; padding: 0.65rem 0; border-top: 1px solid #f0f2f0; }
.admin-class-row__async { align-self: center; color: #77847c; font-size: 0.68rem; }
.admin-class-row > .admin-row-action { margin-bottom: 0.35rem; }
.admin-dialog__notice { display: flex; align-items: center; gap: 0.5rem; padding: 0.85rem 0; color: #738178; font-size: 0.7rem; }
.admin-dialog__notice .material-icons { color: #688572; font-size: 1rem; }
.admin-dialog__actions { display: flex; justify-content: flex-end; gap: 0.55rem; padding-top: 0.75rem; border-top: 1px solid #edf0ed; }
.admin-secondary-button { min-height: 38px; padding: 0.5rem 0.85rem; border: 1px solid #dce3de; border-radius: 3px; background: white; color: #53635a; font-size: 0.75rem; }
.unassigned-label { color: #967451; font-size: 0.69rem; }

@media (max-width: 980px) {
  .admin-app { grid-template-columns: 200px minmax(0, 1fr); }
  .admin-overview-grid { grid-template-columns: minmax(0, 1fr); }
  .admin-metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .admin-topbar { padding: 0 1.25rem; }
}

@media (max-width: 680px) {
  .admin-app { height: 100vh; height: 100dvh; min-height: 0; grid-template-columns: 1fr; grid-template-rows: auto minmax(0, 1fr); overflow: hidden; }
  .admin-rail { min-height: 0; padding: 0.8rem; }
  .admin-brand { padding: 0.2rem 0.25rem 0.75rem; }
  .admin-rail__label, .admin-rail__bottom { display: none; }
  .admin-nav { grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 0.25rem; }
  .admin-nav__item { min-height: 52px; flex-direction: column; justify-content: center; gap: 0.1rem; padding: 0.2rem; font-size: 0.65rem; text-align: center; }
  .admin-nav__item .material-icons { font-size: 1rem; }
  .admin-nav__soon { display: none; }
  .admin-topbar { min-height: 48px; padding: 0 0.9rem; }
  .admin-topbar__date { display: none; }
  .admin-content { padding: 1.25rem 0.8rem 2rem; }
  .admin-view__heading { margin-bottom: 1rem; }
  .admin-view h1 { font-size: 1.55rem; }
  .admin-lead { max-width: 28rem; font-size: 0.77rem; }
  .admin-metrics { gap: 0.55rem; }
  .admin-metric { min-height: 104px; padding: 0.75rem; }
  .admin-metric__top { font-size: 0.68rem; }
  .admin-metric strong { font-size: 1.4rem; }
  .admin-section__heading { padding: 0.75rem; }
  .admin-user-filters { grid-template-columns: 1fr; }
  .admin-recent-row { gap: 0.45rem; }
  .admin-recent-row .role-label { display: none; }
  .admin-dialog { padding: 0.95rem; }
  .admin-offering-fields { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .admin-offering-fields__course { grid-column: 1 / -1; }
  .admin-class-row { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .admin-class-row__schedule, .admin-class-row__async { grid-column: 1 / -1; }
  .admin-class-row > .admin-row-action { justify-self: start; }
}
</style>
