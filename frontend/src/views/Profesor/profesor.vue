<template>
  <section class="teacher-dashboard">
    <aside class="teacher-sidebar">
      <div class="teacher-sidebar__brand">
        <q-icon name="school" size="30px" color="white" />
        <div>
          <p>Dashboard docente</p>
          <strong>Profesor</strong>
        </div>
      </div>

      <q-list bordered class="teacher-nav">
        <q-item
          v-for="item in navItems"
          :key="item.key"
          clickable
          :active="activeSection === item.key"
          active-class="teacher-nav__item--active"
          @click="activeSection = item.key"
        >
          <q-item-section avatar>
            <q-icon :name="item.icon" color="primary" />
          </q-item-section>
          <q-item-section>{{ item.label }}</q-item-section>
        </q-item>
      </q-list>
    </aside>

    <div class="teacher-main">
      <q-card flat bordered class="teacher-hero">
        <q-card-section class="row items-start justify-between q-col-gutter-lg">
          <div class="col-12 col-md-7">
            <p class="teacher-kicker">{{ currentSectionMeta.kicker }}</p>
            <h2>{{ currentSectionMeta.title }}</h2>
            <p class="teacher-copy">
              {{ currentSectionMeta.description }}
            </p>
          </div>

          <div class="col-12 col-md-auto teacher-hero__actions">
            <q-btn-dropdown color="primary" icon="filter_alt" :label="selectedCourseLabel">
              <q-list>
                <q-item clickable @click="seleccionarOferta('todos')">
                  <q-item-section>Todos los cursos</q-item-section>
                </q-item>
                <q-item v-for="option in courseOptions" :key="option.value" clickable @click="seleccionarOferta(option.value)">
                  <q-item-section>{{ option.label }}</q-item-section>
                </q-item>
              </q-list>
            </q-btn-dropdown>
            <q-btn v-if="activeSection === 'tareas'" color="primary" icon="assignment_add" label="Crear tarea" @click="taskDialogOpen = true" />
            <q-btn v-if="activeSection === 'evaluaciones'" outline color="primary" icon="quiz" label="Crear evaluación" @click="evaluationDialogOpen = true" />
          </div>
        </q-card-section>
      </q-card>

      <section v-if="activeSection === 'dashboard'" class="teacher-stats">
        <q-card v-for="card in resumenCards" :key="card.label" flat bordered class="teacher-stat-card">
          <q-card-section class="row items-center no-wrap justify-between">
            <div>
              <span>{{ card.label }}</span>
              <strong>{{ card.value }}</strong>
              <small>{{ card.help }}</small>
            </div>
            <q-icon :name="card.icon" size="28px" color="primary" />
          </q-card-section>
        </q-card>
      </section>

      <q-card v-if="activeSection === 'dashboard' || activeSection === 'cursos'" flat bordered class="teacher-section">
        <q-card-section class="row items-center justify-between q-col-gutter-md">
          <div>
            <p class="teacher-section__kicker">Curso y turno</p>
            <h3>{{ activeSection === 'cursos' ? 'Cursos y clases' : 'Ofertas activas' }}</h3>
          </div>
          <q-btn flat color="primary" icon="tune" label="Filtrar" @click="activeSection = 'cursos'" />
        </q-card-section>

        <q-card-section class="teacher-course-grid">
          <q-card v-for="course in visibleCourses" :key="course.key" flat bordered class="teacher-course-card">
            <q-card-section class="row items-center justify-between">
              <strong>{{ course.course }}</strong>
              <q-icon name="calendar_month" color="primary" />
            </q-card-section>
            <q-separator />
            <q-card-section class="teacher-course-card__body">
              <span>{{ course.shift }} · {{ course.start }}-{{ course.end }}</span>
              <span>{{ course.classes.length }} clases incluidas</span>
              <span>{{ course.enrolled }}/{{ course.capacity }} alumnos</span>
              <q-linear-progress :value="course.enrolled / course.capacity" color="primary" track-color="grey-3" size="8px" />
              <q-btn size="sm" color="primary" label="Ver clases" @click="openCourseResults(course.id)" />
              <div v-if="activeSection === 'cursos'" class="teacher-class-list">
                <div v-for="clase in course.classes" :key="clase.name" class="teacher-class-list__item">
                  <strong>{{ clase.name }}</strong>
                  <span>{{ clase.subject }} · {{ clase.mode === 'semanal' ? clase.schedule : 'Por entregas' }}</span>
                </div>
              </div>
            </q-card-section>
          </q-card>
        </q-card-section>
      </q-card>

      <section v-if="activeSection === 'dashboard'" class="teacher-grid teacher-grid--bottom">
        <q-card flat bordered class="teacher-section">
          <q-card-section class="row items-center justify-between q-col-gutter-md">
            <div>
              <p class="teacher-section__kicker">Alumnos</p>
              <h3>Vista rápida por curso</h3>
            </div>
            <q-input dense outlined placeholder="Buscar alumno" class="teacher-search">
              <template #prepend>
                <q-icon name="search" />
              </template>
            </q-input>
          </q-card-section>

          <q-card-section>
            <q-table flat :rows="visibleStudentRows" :columns="studentColumns" row-key="usuario" hide-bottom dense />
          </q-card-section>
        </q-card>

        <q-card flat bordered class="teacher-section">
          <q-card-section class="row items-center justify-between q-col-gutter-md">
            <div>
              <p class="teacher-section__kicker">Resultados</p>
              <h3>Resumen de publicación</h3>
            </div>
            <q-btn flat color="primary" icon="analytics" label="Ver métricas" @click="activeSection = 'resultados'" />
          </q-card-section>

          <q-card-section class="teacher-results-stack">
            <div v-for="item in publicationStatus" :key="item.label" class="teacher-result-item">
              <div>
                <strong>{{ item.label }}</strong>
                <p>{{ item.value }}</p>
              </div>
              <q-badge :color="item.color">{{ item.badge }}</q-badge>
            </div>
          </q-card-section>
        </q-card>
      </section>

      <section v-if="activeSection === 'tareas'" class="teacher-grid teacher-grid--top">
        <q-card flat bordered class="teacher-section">
          <q-card-section class="row items-center justify-between q-col-gutter-md">
            <div>
              <p class="teacher-section__kicker">Tareas</p>
              <h3>Centro de tareas</h3>
            </div>
            <q-chip color="orange-1" text-color="deep-orange-8" icon="pending_actions">
              {{ selectedCourseLabel }}
            </q-chip>
          </q-card-section>

          <q-card-section class="teacher-summary-grid">
            <div class="teacher-summary-item">
              <span>Borrador activo</span>
              <strong>{{ tareaForm.titulo || 'Sin título' }}</strong>
            </div>
            <div class="teacher-summary-item">
              <span>Clase</span>
              <strong>{{ classOptions.find((option) => option.value === tareaForm.clase)?.label || 'Sin clase' }}</strong>
            </div>
            <div class="teacher-summary-item">
              <span>Vencimiento</span>
              <strong>{{ tareaForm.fechaVencimiento || 'Sin fecha' }}</strong>
            </div>
          </q-card-section>

          <q-card-actions align="right">
            <q-btn flat color="primary" label="Limpiar borrador" @click="resetTaskDraft" />
            <q-btn color="primary" icon="open_in_new" label="Abrir editor" @click="taskDialogOpen = true" />
          </q-card-actions>
        </q-card>

        <q-card flat bordered class="teacher-section">
          <q-card-section class="row items-center justify-between q-col-gutter-md">
            <div>
              <p class="teacher-section__kicker">Seguimiento</p>
              <h3>Actividad reciente</h3>
            </div>
            <q-btn flat color="primary" icon="history" label="Ver historial" />
          </q-card-section>

          <q-card-section>
            <q-table flat :rows="visibleTrackingRows" :columns="trackingColumns" row-key="curso" hide-bottom dense />
          </q-card-section>
        </q-card>
      </section>

      <q-card v-if="activeSection === 'evaluaciones'" flat bordered class="teacher-section">
        <q-card-section class="row items-center justify-between q-col-gutter-md">
          <div>
            <p class="teacher-section__kicker">Evaluaciones</p>
            <h3>Editor de evaluaciones</h3>
          </div>
          <div class="teacher-actions-inline">
            <q-chip color="blue-1" text-color="primary" icon="help_outline">
              {{ evalForm.preguntas.length }}/10 preguntas
            </q-chip>
            <q-btn outline color="primary" icon="open_in_new" label="Abrir editor" @click="evaluationDialogOpen = true" />
          </div>
        </q-card-section>

        <q-card-section class="teacher-summary-grid">
          <div class="teacher-summary-item teacher-summary-item--wide">
            <span>Título actual</span>
            <strong>{{ evalForm.titulo || 'Sin título' }}</strong>
          </div>
          <div class="teacher-summary-item">
            <span>Clase</span>
            <strong>{{ classOptions.find((option) => option.value === evalForm.clase)?.label || 'Sin clase' }}</strong>
          </div>
          <div class="teacher-summary-item">
            <span>Pregunta visible</span>
            <strong>{{ currentQuestionLabel }}</strong>
          </div>
        </q-card-section>
      </q-card>

      <section v-if="activeSection === 'alumnos'" class="teacher-grid teacher-grid--bottom">
        <q-card flat bordered class="teacher-section">
          <q-card-section class="row items-center justify-between q-col-gutter-md">
            <div>
              <p class="teacher-section__kicker">Alumnos</p>
              <h3>Vista rápida por curso</h3>
            </div>
            <q-input dense outlined placeholder="Buscar alumno" class="teacher-search">
              <template #prepend>
                <q-icon name="search" />
              </template>
            </q-input>
          </q-card-section>

          <q-card-section>
            <q-table flat :rows="visibleStudentRows" :columns="studentColumns" row-key="usuario" hide-bottom dense />
          </q-card-section>
        </q-card>

        <q-card flat bordered class="teacher-section">
          <q-card-section>
            <p class="teacher-section__kicker">Curso activo</p>
            <h3>{{ selectedCourseLabel }}</h3>
            <p class="teacher-copy">Usa el selector superior para cambiar todo el contexto visual entre cursos.</p>
          </q-card-section>
        </q-card>
      </section>

      <section v-if="activeSection === 'resultados'" class="teacher-grid teacher-grid--bottom">
        <q-card flat bordered class="teacher-section">
          <q-card-section class="row items-center justify-between q-col-gutter-md">
            <div>
              <p class="teacher-section__kicker">Resultados</p>
              <h3>Resumen de publicación</h3>
            </div>
            <q-btn flat color="primary" icon="analytics" label="Ver métricas" />
          </q-card-section>

          <q-card-section class="teacher-results-stack">
            <div v-for="item in publicationStatus" :key="item.label" class="teacher-result-item">
              <div>
                <strong>{{ item.label }}</strong>
                <p>{{ item.value }}</p>
              </div>
              <q-badge :color="item.color">{{ item.badge }}</q-badge>
            </div>
          </q-card-section>
        </q-card>

        <q-card flat bordered class="teacher-section">
          <q-card-section>
            <q-table flat :rows="visibleTrackingRows" :columns="trackingColumns" row-key="curso" hide-bottom dense />
          </q-card-section>
        </q-card>
      </section>
    </div>

    <q-dialog v-model="taskDialogOpen" maximized persistent transition-show="slide-up" transition-hide="slide-down">
      <q-card class="teacher-dialog">
        <q-card-section class="row items-center justify-between q-pb-none">
          <div>
            <p class="teacher-section__kicker">Tareas</p>
            <h3>Crear tarea en ventana flotante</h3>
          </div>
          <q-btn flat round icon="close" @click="taskDialogOpen = false" />
        </q-card-section>

        <q-card-section class="teacher-form-grid">
          <q-input v-model="tareaForm.titulo" outlined label="Título" />
          <q-select v-model="tareaForm.clase" outlined label="Clase / materia" :options="classOptions" option-label="label" option-value="value" emit-value map-options @update:model-value="actualizarClaseTarea" />
          <q-input v-model="tareaForm.fechaVencimiento" outlined type="date" label="Fecha de vencimiento" />
          <q-input v-model="tareaForm.descripcion" outlined type="textarea" autogrow label="Descripción" class="teacher-form-grid__full" />
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat color="primary" label="Cancelar" @click="taskDialogOpen = false" />
          <q-btn flat color="primary" label="Limpiar" @click="resetTaskDraft" />
          <q-btn color="primary" icon="save" label="Guardar tarea" @click="handleCreateTask" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="evaluationDialogOpen" maximized persistent transition-show="slide-up" transition-hide="slide-down">
      <q-card class="teacher-dialog teacher-dialog--evaluation">
        <q-card-section class="row items-center justify-between q-pb-none">
          <div>
            <p class="teacher-section__kicker">Evaluaciones</p>
            <h3>Crear evaluación en ventana flotante</h3>
          </div>
          <q-btn flat round icon="close" @click="evaluationDialogOpen = false" />
        </q-card-section>

        <q-card-section class="teacher-form-grid">
          <q-input v-model="evalForm.titulo" outlined label="Título" />
          <q-select v-model="evalForm.clase" outlined label="Clase / materia" :options="classOptions" option-label="label" option-value="value" emit-value map-options @update:model-value="actualizarClaseEvaluacion" />
        </q-card-section>

        <q-card-section class="teacher-stepper-head">
          <div>
            <p class="teacher-section__kicker">Pregunta actual</p>
            <h4>{{ currentQuestionLabel }}</h4>
          </div>
          <q-chip color="blue-1" text-color="primary">{{ evalForm.preguntas.length }} creadas</q-chip>
        </q-card-section>

        <q-card-section v-if="currentQuestion" class="teacher-wizard-body">
          <q-stepper v-model="currentQuestionStep" flat animated color="primary" alternative-labels>
            <q-step :name="1" title="Enunciado" icon="short_text" :done="isCurrentQuestionTextReady">
              <q-input v-model="currentQuestion.enunciado" outlined type="textarea" autogrow label="Enunciado" />
              <div class="teacher-wizard-actions">
                <q-space />
                <q-btn color="primary" label="Siguiente" :disable="!isCurrentQuestionTextReady" @click="currentQuestionStep = 2" />
              </div>
            </q-step>

            <q-step :name="2" title="Opciones" icon="list" :done="isCurrentQuestionOptionsReady">
              <div class="teacher-options-grid">
                <q-input
                  v-for="(opcion, optionIndex) in currentQuestion.opciones"
                  :key="optionIndex"
                  v-model="currentQuestion.opciones[optionIndex]"
                  outlined
                  :label="`Opción ${optionIndex + 1}`"
                />
              </div>
              <div class="teacher-wizard-actions">
                <q-btn flat color="primary" label="Volver" @click="currentQuestionStep = 1" />
                <q-btn color="primary" label="Siguiente" :disable="!isCurrentQuestionOptionsReady" @click="currentQuestionStep = 3" />
              </div>
            </q-step>

            <q-step :name="3" title="Respuesta y puntos" icon="check_circle" :done="isCurrentQuestionReady">
              <div class="teacher-form-grid">
                <q-input v-model="currentQuestion.respuestaCorrecta" outlined label="Respuesta correcta" />
                <q-input v-model.number="currentQuestion.puntos" outlined type="number" min="1" max="10" label="Puntos" />
              </div>
              <div class="teacher-wizard-actions">
                <q-btn flat color="primary" label="Volver" @click="currentQuestionStep = 2" />
                <q-btn color="primary" label="Guardar pregunta" :disable="!isCurrentQuestionReady" @click="advanceQuestion" />
              </div>
            </q-step>
          </q-stepper>
        </q-card-section>

        <q-card-section class="teacher-question-pagination">
          <q-btn flat icon="chevron_left" label="Anterior" :disable="currentQuestionIndex === 0" @click="goToPreviousQuestion" />
          <div class="teacher-question-chips">
            <q-chip
              v-for="(pregunta, index) in evalForm.preguntas"
              :key="index"
              clickable
              :color="index === currentQuestionIndex ? 'primary' : 'blue-1'"
              :text-color="index === currentQuestionIndex ? 'white' : 'primary'"
              @click="selectQuestion(index)"
            >
              {{ index + 1 }}
            </q-chip>
          </div>
          <q-btn flat icon-right="chevron_right" label="Siguiente" :disable="currentQuestionIndex >= evalForm.preguntas.length - 1" @click="goToNextExistingQuestion" />
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat color="primary" label="Cancelar" @click="evaluationDialogOpen = false" />
          <q-btn outline color="primary" icon="add" label="Nueva pregunta" :disable="evalForm.preguntas.length >= 10 || !isCurrentQuestionReady" @click="createAndGoToNextQuestion" />
          <q-btn color="primary" icon="save" label="Guardar evaluación" :disable="!canSaveEvaluation" @click="handleCreateEvaluation" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'
import { courseOfferings } from '../../data/courseOfferings.js'

const props = defineProps({
  evalForm: { type: Object, required: true },
  tareaForm: { type: Object, required: true }
})

const emit = defineEmits(['agregar-pregunta', 'crear-evaluacion', 'crear-tarea'])

const taskDialogOpen = ref(false)
const evaluationDialogOpen = ref(false)
const currentQuestionIndex = ref(0)
const currentQuestionStep = ref(1)
const activeSection = ref('dashboard')
const selectedCourse = ref('todos')

const navItems = [
  { key: 'dashboard', label: 'Dashboard principal', icon: 'dashboard' },
  { key: 'cursos', label: 'Cursos y clases', icon: 'view_kanban' },
  { key: 'alumnos', label: 'Alumnos', icon: 'groups' },
  { key: 'tareas', label: 'Tareas', icon: 'assignment' },
  { key: 'evaluaciones', label: 'Evaluaciones', icon: 'quiz' },
  { key: 'resultados', label: 'Resultados', icon: 'insights' }
]

const courseOptions = [
  ...courseOfferings.map((offering) => ({
    label: `${offering.course} · ${offering.shift} (${offering.start}-${offering.end})`,
    value: offering.id
  }))
]

const classOptions = computed(() => courseOfferings
  .filter((offering) => selectedCourse.value === 'todos' || offering.id === selectedCourse.value)
  .flatMap((offering) => offering.classes.map((clase) => ({
    label: `${clase.name} · ${clase.subject} · ${offering.course} / ${offering.shift}`,
    value: `${offering.id}:${clase.name}`,
    legacyCourse: clase.legacyCourse,
    offeringId: offering.id,
    className: clase.name,
    subject: clase.subject,
    schedule: clase.schedule
  }))))

const sectionMeta = {
  dashboard: {
    kicker: 'Panel principal',
    title: 'Centro de control del profesor',
    description: 'Revisa las ofertas de curso, turnos, clases y cupos bajo tu seguimiento.'
  },
  cursos: {
    kicker: 'Curso y turno',
    title: 'Cursos y clases',
    description: 'Consulta las materias, secciones y horarios de cada curso y turno.'
  },
  alumnos: {
    kicker: 'Alumnos',
    title: 'Seguimiento por alumno',
    description: 'Consulta rápidamente el rendimiento de los alumnos filtrado por curso.'
  },
  tareas: {
    kicker: 'Tareas',
    title: 'Centro de tareas',
    description: 'Administra borradores y actividad reciente para la clase seleccionada.'
  },
  evaluaciones: {
    kicker: 'Evaluaciones',
    title: 'Editor de evaluaciones',
    description: 'Mantén el borrador actual y abre el editor flotante cuando quieras crear o ajustar preguntas.'
  },
  resultados: {
    kicker: 'Resultados',
    title: 'Resultados y métricas',
    description: 'Observa el estado de publicación y la actividad resumida del curso elegido.'
  }
}

const selectedCourseLabel = computed(() => selectedCourse.value === 'todos'
  ? 'Todos los cursos'
  : courseOptions.find((option) => option.value === selectedCourse.value)?.label || 'Todos los cursos')

const currentSectionMeta = computed(() => sectionMeta[activeSection.value])

const actualizarClaseTarea = (claseKey) => {
  const clase = classOptions.value.find((option) => option.value === claseKey)
  if (clase) props.tareaForm.curso = clase.legacyCourse
}

const actualizarClaseEvaluacion = (claseKey) => {
  const clase = classOptions.value.find((option) => option.value === claseKey)
  if (clase) props.evalForm.curso = clase.legacyCourse
}

const seleccionarOferta = (offeringId) => {
  selectedCourse.value = offeringId
  if (offeringId === 'todos') return

  const offering = courseOfferings.find((item) => item.id === offeringId)
  const clase = offering?.classes[0]
  if (!clase) return

  const classKey = `${offering.id}:${clase.name}`
  props.tareaForm.clase = classKey
  props.tareaForm.curso = clase.legacyCourse
  props.evalForm.clase = classKey
  props.evalForm.curso = clase.legacyCourse
}

const visibleCourses = computed(() => {
  if (selectedCourse.value === 'todos') return courseOfferings
  return courseOfferings.filter((offering) => offering.id === selectedCourse.value)
})

const resumenCards = computed(() => [
  {
    label: 'Oferta activa',
    value: selectedCourse.value === 'todos' ? 'Todas' : selectedCourseLabel.value,
    help: 'Curso y turno seleccionados.',
    icon: 'schedule'
  },
  {
    label: 'Clases del turno',
    value: visibleCourses.value.reduce((total, offering) => total + offering.classes.length, 0),
    help: 'Materias con clase asignada.',
    icon: 'class'
  },
  {
    label: 'Alumnos',
    value: visibleCourses.value.reduce((total, offering) => total + offering.enrolled, 0),
    help: 'Inscritos en los turnos visibles.',
    icon: 'groups'
  },
  {
    label: 'Cupos disponibles',
    value: visibleCourses.value.reduce((total, offering) => total + offering.capacity - offering.enrolled, 0),
    help: 'Capacidad libre en los turnos visibles.',
    icon: 'event_seat'
  }
])

const trackingColumns = [
  { name: 'clase', label: 'Clase', field: 'clase', align: 'left' },
  { name: 'tipo', label: 'Tipo', field: 'tipo', align: 'left' },
  { name: 'estado', label: 'Estado', field: 'estado', align: 'left' }
]

const trackingRows = computed(() => [
  {
    clase: props.tareaForm.clase || '',
    claseLabel: classOptions.value.find((option) => option.value === props.tareaForm.clase)?.label || 'Sin clase seleccionada',
    tipo: 'Tarea',
    estado: props.tareaForm.titulo ? 'Lista para publicar' : 'Sin borrador'
  },
  {
    clase: props.evalForm.clase || '',
    claseLabel: classOptions.value.find((option) => option.value === props.evalForm.clase)?.label || 'Sin clase seleccionada',
    tipo: 'Evaluación',
    estado: props.evalForm.titulo ? 'En preparación' : 'Pendiente de título'
  },
  {
    clase: 'general',
    claseLabel: 'General',
    tipo: 'Revisión',
    estado: 'Seguimiento del rendimiento'
  }
])

const studentColumns = [
  { name: 'usuario', label: 'Alumno', field: 'usuario', align: 'left' },
  { name: 'clase', label: 'Clase', field: 'clase', align: 'left' },
  { name: 'promedio', label: 'Promedio', field: 'promedio', align: 'left' },
  { name: 'entregas', label: 'Entregas', field: 'entregas', align: 'left' }
]

const studentRows = [
  { usuario: 'nombre/usuario', offeringId: 'redes-software-tarde', clase: '1A Frontend', promedio: '8.5', entregas: 24 },
  { usuario: 'prof.garcia', offeringId: 'redes-software-tarde', clase: '1A Redes', promedio: '8.5', entregas: 13 },
  { usuario: 'prof.garcia', offeringId: 'redes-software-manana', clase: '1B Software', promedio: '9.1', entregas: 18 }
]

const visibleTrackingRows = computed(() => {
  return trackingRows.value
    .filter((row) => selectedCourse.value === 'todos' || classOptions.value.find((option) => option.value === row.clase)?.offeringId === selectedCourse.value || row.clase === 'general')
    .map((row) => ({ ...row, clase: row.claseLabel }))
})

const visibleStudentRows = computed(() => {
  return studentRows
    .filter((row) => selectedCourse.value === 'todos' || row.offeringId === selectedCourse.value)
})

const publicationStatus = computed(() => [
  {
    label: 'Borrador de tarea',
    value: props.tareaForm.titulo || 'Sin título todavía',
    badge: props.tareaForm.titulo ? 'Activo' : 'Vacío',
    color: props.tareaForm.titulo ? 'positive' : 'grey-6'
  },
  {
    label: 'Evaluación en edición',
    value: props.evalForm.titulo || 'Sin título todavía',
    badge: props.evalForm.titulo ? 'Lista' : 'Pendiente',
    color: props.evalForm.titulo ? 'primary' : 'warning'
  },
  {
    label: 'Turno activo',
    value: selectedCourseLabel.value,
    badge: 'Turno',
    color: 'secondary'
  }
])

const currentQuestion = computed(() => props.evalForm.preguntas[currentQuestionIndex.value] || null)

const currentQuestionLabel = computed(() => {
  if (!currentQuestion.value) return 'Sin preguntas'
  return `Pregunta ${currentQuestionIndex.value + 1}`
})

const isCurrentQuestionTextReady = computed(() => Boolean(currentQuestion.value?.enunciado?.trim()))

const isCurrentQuestionOptionsReady = computed(() => {
  if (!currentQuestion.value) return false
  return currentQuestion.value.opciones.every((opcion) => opcion && opcion.trim())
})

const isCurrentQuestionReady = computed(() => {
  if (!currentQuestion.value) return false
  return isCurrentQuestionTextReady.value
    && isCurrentQuestionOptionsReady.value
    && Boolean(currentQuestion.value.respuestaCorrecta?.trim())
    && Number(currentQuestion.value.puntos || 0) > 0
})

const canSaveEvaluation = computed(() => {
  return Boolean(props.evalForm.titulo?.trim())
    && Boolean(props.evalForm.curso)
    && props.evalForm.preguntas.length > 0
    && props.evalForm.preguntas.every((pregunta) => {
      return pregunta.enunciado?.trim()
        && pregunta.opciones.every((opcion) => opcion && opcion.trim())
        && pregunta.respuestaCorrecta?.trim()
        && Number(pregunta.puntos || 0) > 0
    })
})

const resetTaskDraft = () => {
  props.tareaForm.titulo = ''
  props.tareaForm.descripcion = ''
  props.tareaForm.fechaVencimiento = ''
}

const openCourseResults = (courseKey) => {
  selectedCourse.value = courseKey
  activeSection.value = 'cursos'
}

const selectQuestion = (index) => {
  currentQuestionIndex.value = index
  currentQuestionStep.value = 1
}

const goToPreviousQuestion = () => {
  if (currentQuestionIndex.value === 0) return
  selectQuestion(currentQuestionIndex.value - 1)
}

const goToNextExistingQuestion = () => {
  if (currentQuestionIndex.value >= props.evalForm.preguntas.length - 1) return
  selectQuestion(currentQuestionIndex.value + 1)
}

const createAndGoToNextQuestion = () => {
  if (props.evalForm.preguntas.length >= 10 || !isCurrentQuestionReady.value) return
  emit('agregar-pregunta')
  currentQuestionIndex.value = props.evalForm.preguntas.length - 1
  currentQuestionStep.value = 1
}

const advanceQuestion = () => {
  if (!isCurrentQuestionReady.value) return
  if (currentQuestionIndex.value === props.evalForm.preguntas.length - 1 && props.evalForm.preguntas.length < 10) {
    emit('agregar-pregunta')
    currentQuestionIndex.value = props.evalForm.preguntas.length - 1
    currentQuestionStep.value = 1
    return
  }
  goToNextExistingQuestion()
}

const handleCreateTask = () => {
  emit('crear-tarea')
  taskDialogOpen.value = false
}

const handleCreateEvaluation = () => {
  emit('crear-evaluacion')
  evaluationDialogOpen.value = false
  currentQuestionIndex.value = 0
  currentQuestionStep.value = 1
}
</script>

<style scoped>
.teacher-dashboard {
  --teacher-ink: #23332e;
  --teacher-muted: #78847e;
  --teacher-line: #e3e8e4;
  --teacher-paper: #fff;
  --teacher-canvas: #f4f6f3;
  --q-primary: #315d50;
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: 238px minmax(0, 1fr);
  gap: 0;
  align-items: start;
  overflow: hidden;
  border: 1px solid var(--teacher-line);
  background: var(--teacher-canvas);
  color: var(--teacher-ink);
}

.teacher-sidebar {
  position: sticky;
  top: 1rem;
  min-height: 760px;
  padding: 1.4rem 0.9rem 1rem;
  background: #223a33;
  color: #eef3ef;
}

.teacher-sidebar__brand {
  min-height: 54px;
  padding: 0.25rem 0.7rem 1.8rem;
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.teacher-sidebar__brand p,
.teacher-sidebar__brand strong {
  margin: 0;
}

.teacher-sidebar__brand p {
  color: #a8beb4;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.teacher-nav {
  border: 0 !important;
  border-radius: 0;
  background: transparent;
}

.teacher-nav :deep(.q-item) {
  min-height: 43px;
  margin-bottom: 0.3rem;
  border: 1px solid transparent;
  border-radius: 3px;
  color: #d1ddd7;
  font-size: 0.85rem;
}

.teacher-nav :deep(.q-item .q-icon) {
  color: #a8beb4;
}

.teacher-nav :deep(.teacher-nav__item--active) {
  border-color: rgba(197, 217, 208, 0.13);
  background: #315348;
  color: #fff;
}

.teacher-nav :deep(.teacher-nav__item--active .q-icon) {
  color: #c3d9cf;
}

.teacher-main {
  display: grid;
  align-content: start;
  gap: 1rem;
  min-width: 0;
  padding: 1.5rem clamp(1rem, 2.4vw, 2rem) 2rem;
}

.teacher-hero {
  border: 1px solid var(--teacher-line) !important;
  border-radius: 3px;
  background: var(--teacher-paper);
}

.teacher-kicker {
  margin: 0 0 8px;
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #607d70;
  font-weight: 700;
}

.teacher-hero h2 {
  margin: 0;
  color: #263630;
  font: 500 1.85rem/1.2 Georgia, 'Times New Roman', serif;
}

.teacher-copy {
  margin: 12px 0 0;
  max-width: 720px;
  color: var(--teacher-muted);
}

.teacher-hero__actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.teacher-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.85rem;
}

.teacher-stat-card {
  border: 1px solid var(--teacher-line) !important;
  border-top: 3px solid #547a69 !important;
  border-radius: 3px;
  background: var(--teacher-paper);
}

.teacher-stat-card:nth-child(2) { border-top-color: #637e92 !important; }
.teacher-stat-card:nth-child(3) { border-top-color: #aa8955 !important; }
.teacher-stat-card:nth-child(4) { border-top-color: #a66f61 !important; }

.teacher-stat-card .q-icon {
  color: #668373 !important;
}

.teacher-stat-card span,
.teacher-stat-card small {
  display: block;
}

.teacher-stat-card span {
  color: var(--teacher-muted);
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.teacher-stat-card strong {
  display: block;
  font-size: 26px;
  color: #293a33;
  margin: 6px 0 4px;
}

.teacher-stat-card small {
  color: #68776f;
}

.teacher-section {
  border: 1px solid var(--teacher-line) !important;
  border-radius: 3px;
  background: var(--teacher-paper);
}

.teacher-section__kicker {
  margin: 0 0 4px;
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #607d70;
  font-weight: 700;
}

.teacher-section h3 {
  margin: 0;
  font-size: 1.2rem;
}

.teacher-course-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.teacher-course-card {
  border: 1px solid var(--teacher-line) !important;
  border-radius: 3px;
  background: #fff;
}

.teacher-course-card__body {
  display: grid;
  gap: 10px;
}

.teacher-class-list {
  display: grid;
  gap: 0.35rem;
  margin-top: 0.25rem;
  padding-top: 0.55rem;
  border-top: 1px solid var(--teacher-line);
}

.teacher-class-list__item {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 0.7rem;
  padding: 0.3rem 0;
  color: var(--teacher-ink);
  font-size: 0.72rem;
}

.teacher-class-list__item span {
  color: var(--teacher-muted);
  text-align: right;
}

.teacher-grid {
  display: grid;
  gap: 18px;
}

.teacher-grid--top {
  grid-template-columns: 1.2fr 0.8fr;
}

.teacher-grid--bottom {
  grid-template-columns: 1.1fr 0.9fr;
}

.teacher-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.teacher-summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.teacher-summary-item {
  border: 1px solid var(--teacher-line);
  border-radius: 3px;
  padding: 0.9rem;
  background: #fafbf9;
}

.teacher-summary-item--wide {
  grid-column: span 1;
}

.teacher-summary-item span {
  display: block;
  color: var(--teacher-muted);
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.teacher-summary-item strong {
  display: block;
  margin-top: 6px;
  color: #293a33;
}

.teacher-form-grid__full {
  grid-column: 1 / -1;
}

.teacher-actions-inline {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.teacher-question-list {
  display: grid;
  gap: 14px;
}

.teacher-question-card {
  border-radius: 16px;
  background: #fbfdff;
}

.teacher-dialog {
  background: #f4f6f3;
}

.teacher-dialog--evaluation {
  display: grid;
  grid-template-rows: auto auto auto 1fr auto auto;
}

.teacher-stepper-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.teacher-stepper-head h4 {
  margin: 0;
}

.teacher-wizard-body {
  padding-top: 0;
}

.teacher-options-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.teacher-wizard-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
}

.teacher-question-pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.teacher-question-chips {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.teacher-search {
  min-width: 220px;
}

.teacher-results-stack {
  display: grid;
  gap: 12px;
}

.teacher-result-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  border: 1px solid var(--teacher-line);
  border-radius: 3px;
  padding: 0.9rem;
  background: #fafbf9;
}

.teacher-result-item strong,
.teacher-result-item p {
  margin: 0;
}

.teacher-result-item p {
  color: #697870;
  margin-top: 0.25rem;
}

@media (max-width: 1180px) {
  .teacher-dashboard {
    grid-template-columns: 1fr;
  }

  .teacher-sidebar {
    position: static;
    min-height: 0;
    padding: 0.8rem;
  }

  .teacher-sidebar__brand { padding: 0.2rem 0.25rem 0.75rem; }
  .teacher-nav { display: flex; overflow-x: auto; }
  .teacher-nav :deep(.q-item) { flex: 0 0 auto; min-height: 40px; }

  .teacher-stats,
  .teacher-course-grid,
  .teacher-summary-grid,
  .teacher-grid--top,
  .teacher-grid--bottom {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 760px) {
  .teacher-stats,
  .teacher-course-grid,
  .teacher-summary-grid,
  .teacher-grid--top,
  .teacher-grid--bottom,
  .teacher-form-grid,
  .teacher-options-grid {
    grid-template-columns: 1fr;
  }

  .teacher-hero__actions,
  .teacher-actions-inline {
    width: 100%;
  }

  .teacher-search {
    min-width: 0;
    width: 100%;
  }

  .teacher-class-list__item { align-items: flex-start; flex-direction: column; gap: 0.15rem; }
  .teacher-class-list__item span { text-align: left; }

  .teacher-question-pagination,
  .teacher-stepper-head,
  .teacher-wizard-actions {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>