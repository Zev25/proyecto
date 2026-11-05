## Purpose

Establecer reglas verificables para crear examenes con bancos de preguntas y generar intentos aleatorios por alumno, reduciendo la repeticion de examenes identicos.

## ADDED Requirements

### Requirement: Banco de preguntas por evaluacion
El sistema MUST permitir al profesor registrar y mantener un banco de hasta 50 preguntas por evaluacion.

#### Scenario: Registro dentro del limite permitido
- **WHEN** un profesor agrega preguntas y el total queda en 50 o menos
- **THEN** el sistema guarda el banco de preguntas de la evaluacion

#### Scenario: Exceso del limite permitido
- **WHEN** un profesor intenta agregar una pregunta que supera 50 en el banco
- **THEN** el sistema rechaza la operacion e informa el limite maximo

### Requirement: Seleccion aleatoria de preguntas por intento
El sistema MUST permitir al profesor configurar entre 1 y 50 preguntas por intento, con un valor por defecto de 20, y generar cada intento con esa cantidad seleccionada de forma aleatoria desde el banco definido.

#### Scenario: Generacion de intento con banco suficiente
- **WHEN** un alumno inicia un examen cuyo banco tiene al menos la cantidad configurada por el profesor
- **THEN** el sistema crea un intento con exactamente esa cantidad de preguntas aleatorias

#### Scenario: Banco insuficiente para iniciar examen
- **WHEN** un alumno intenta iniciar un examen con menos preguntas que la cantidad configurada
- **THEN** el sistema bloquea el inicio e informa que el examen no esta habilitado

#### Scenario: Cantidad de preguntas por intento invalida
- **WHEN** un profesor configura menos de 1 o mas de 50 preguntas por intento
- **THEN** el sistema rechaza la configuracion

#### Scenario: Cantidad por intento mayor que el banco
- **WHEN** un profesor configura mas preguntas por intento que preguntas registradas en el banco
- **THEN** el sistema rechaza el guardado e informa el tamano actual del banco

### Requirement: Importacion de bancos desde Excel
El sistema MUST permitir al profesor importar bancos `.xlsx` con las columnas `Enunciado`, `Tipo`, `Opciones`, `Respuesta correcta` y `Puntos`.

#### Scenario: Importacion de un banco valido
- **WHEN** un profesor importa un archivo XLSX con entre 1 y 50 filas de preguntas validas
- **THEN** el sistema carga todas las preguntas en el editor docente para revision, sin crear aun la evaluacion

#### Scenario: Guardado de un banco revisado
- **WHEN** el profesor confirma el formulario con las preguntas importadas y revisadas
- **THEN** el sistema crea la evaluacion y sus preguntas en una transaccion

#### Scenario: Importacion de un banco invalido
- **WHEN** el archivo no es XLSX valido, faltan encabezados, hay una fila invalida o contiene mas de 50 preguntas
- **THEN** el sistema rechaza el archivo completo y no crea una evaluacion parcial

#### Scenario: Opciones de respuesta en Excel
- **WHEN** una pregunta tiene opciones
- **THEN** el profesor puede separarlas con `|` o escribirlas como un arreglo JSON de textos, y la respuesta correcta debe coincidir con una opcion

### Requirement: Lista docente de evaluaciones
El sistema MUST permitir al profesor consultar unicamente sus propias evaluaciones con fecha de creacion, fecha de fin opcional, tipo y cantidad de intentos.

#### Scenario: Consulta de evaluaciones creadas
- **WHEN** un profesor abre la seccion de evaluaciones
- **THEN** el sistema muestra sus evaluaciones en filas y columnas, incluyendo fechas y una accion de edicion

### Requirement: Clasificacion de evaluaciones
El sistema MUST permitir clasificar cada evaluacion como evaluacion regular o examen final, sin alterar sus preguntas ni los intentos ya registrados.

#### Scenario: Clasificacion al crear una evaluacion
- **WHEN** el profesor crea una evaluacion
- **THEN** el sistema guarda la categoria seleccionada entre evaluacion regular y examen final

#### Scenario: Reclasificacion de una evaluacion con intentos
- **WHEN** el profesor cambia unicamente la categoria de una evaluacion propia que ya tiene intentos
- **THEN** el sistema actualiza la categoria y conserva sin cambios el banco, las respuestas y las notas historicas

### Requirement: Realizacion de evaluaciones por categoria
El sistema MUST presentar al alumno las evaluaciones regulares y los examenes finales en vistas diferenciadas, y permitir realizar intentos en cualquiera de las dos categorias.

#### Scenario: Alumno abre evaluaciones regulares
- **WHEN** el alumno selecciona la categoria Evaluaciones regulares dentro de Evaluaciones
- **THEN** el sistema lista unicamente evaluaciones regulares de sus cursos y permite iniciar y enviar un intento

#### Scenario: Alumno abre examenes finales
- **WHEN** el alumno selecciona la categoria Examenes finales dentro de Evaluaciones
- **THEN** el sistema lista unicamente examenes finales de sus cursos y permite iniciar y enviar un intento

### Requirement: Edicion segura de evaluaciones
El sistema MUST permitir editar titulo, curso, fecha de fin, configuracion y preguntas de una evaluacion propia que aun no tenga intentos.

#### Scenario: Editar una evaluacion sin intentos
- **WHEN** el profesor edita una evaluacion propia que no registra intentos
- **THEN** el sistema guarda los cambios de la evaluacion y su banco en una transaccion

#### Scenario: Proteger una evaluacion con intentos
- **WHEN** el profesor intenta editar una evaluacion que ya tiene intentos
- **THEN** el sistema rechaza la edicion y conserva la seleccion historica de preguntas

### Requirement: Trazabilidad de seleccion por alumno
El sistema MUST persistir el conjunto exacto de preguntas seleccionadas para cada intento de alumno.

#### Scenario: Consulta posterior de intento
- **WHEN** un profesor consulta el detalle de un intento ya generado
- **THEN** el sistema muestra las preguntas exactas asignadas en ese intento y conserva su orden

### Requirement: Ciclo de vida y cancelacion de intentos
El sistema MUST persistir cada intento como `en_progreso`, `completado` o `cancelado`; un intento activo se cancela cuando el alumno cambia de seccion, oculta la pestana o abandona la pagina, y un intento cancelado no puede recibir respuestas ni generar calificacion.

#### Scenario: Alumno abandona un intento activo
- **WHEN** el alumno cambia a otra seccion, cambia de pestana o minimiza/cierra la pagina durante un intento
- **THEN** el sistema marca el intento como cancelado y no permite reanudarlo ni enviarlo

#### Scenario: Envio exitoso de respuestas
- **WHEN** el alumno envia las respuestas de un intento activo correctamente
- **THEN** el sistema guarda la calificacion y cambia el estado del intento a completado

#### Scenario: Intento cancelado o completado
- **WHEN** el alumno intenta cancelar un intento que ya no esta en progreso o enviar respuestas de un intento cancelado/completado
- **THEN** el sistema rechaza la operacion y conserva el estado y resultado existentes

#### Scenario: Consulta del historial
- **WHEN** el alumno consulta su historial
- **THEN** el sistema distingue intentos en progreso, cancelados y completados, y excluye los no completados del promedio

#### Scenario: Abrir historial desde evaluaciones
- **WHEN** el alumno selecciona el boton flotante de intentos
- **THEN** el sistema muestra el historial de la categoria actual en un dialogo, sin mantener una lista permanente al final de la pagina

#### Scenario: Confirmacion visible al cancelar
- **WHEN** la cancelacion de un intento termina correctamente al cambiar de seccion
- **THEN** el sistema muestra una confirmacion visible sin depender de que el alumno vuelva al inicio de la pagina
