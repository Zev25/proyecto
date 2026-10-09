<section v-if="session.user.tipo === 'alumno'" class="card">
  <h2>Panel alumno: responder evaluación</h2>
  <button @click="cargarEvaluacionesAlumno">Cargar evaluaciones</button>

  <div v-for="ev in evaluacionesAlumno" :key="ev.id" class="card" style="margin-top:12px;">
    <h3>{{ ev.titulo }}</h3>

    <div v-for="preg in ev.preguntas" :key="preg.id" style="margin-bottom:10px;">
      <p><strong>{{ preg.enunciado }}</strong> ({{ preg.puntos }} pts)</p>
      <input v-model="respuestasAlumno[preg.id]" type="text" placeholder="Tu respuesta" />
    </div>

    <button @click="responderEvaluacion(ev)">Enviar examen</button>
  </div>

  <p v-if="notaAlumno !== null">Tu nota automática: {{ notaAlumno }}</p>
</section>