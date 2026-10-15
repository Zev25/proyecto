## Why

Se necesita una herramienta educativa digital unificada que reduzca la fragmentacion actual entre evaluaciones, entregas y resultados, mejorando el control docente y la experiencia del alumno. Este cambio se prioriza ahora para establecer una base modular en JavaScript (Vue + Node.js) y habilitar una evolucion por etapas con menor riesgo.

## What Changes

- Crear una plataforma con autenticacion y espacios diferenciados para profesor y alumno.
- Incorporar gestion de examenes con bancos de hasta 50 preguntas, importables desde Excel, y una cantidad aleatoria por intento configurable por el profesor entre 1 y 50 (20 por defecto).
- Habilitar una estructura inicial para evaluaciones y resultados, con trazabilidad por intento y por alumno.
- Definir un plan de trabajo por fases donde IA y revision de tareas por archivo se implementan al final.
- Establecer documentacion continua del cambio (alcance, decisiones, riesgos y tareas) dentro de OpenSpec.

## Capabilities

### New Capabilities
- `acceso-y-roles-educativos`: inicio de sesion diferenciado y autorizacion por rol (profesor/alumno) para acceso a funciones y vistas.
- `evaluaciones-aleatorias`: gestion de examenes, importacion de bancos XLSX y generacion de intentos con una cantidad configurable de preguntas (1-50, 20 por defecto) desde un banco de hasta 50.
- `resultados-y-trazabilidad`: registro de respuestas, intentos y resultados consultables por alumno y por docente.
- `entregas-de-tareas-por-archivo`: carga y organizacion de entregas de archivos por tarea y alumno, con consulta ordenada para el docente.
- `correccion-asistida-por-ia`: asistencia de IA para sugerir correccion de respuestas y cumplimiento de rubrica en archivos entregados.

### Modified Capabilities
- Ninguna.

## Impact

- Afecta el backend en Node.js + Express con `mysql2` y `dotenv`.
- Afecta el frontend en Vue para flujos de autenticacion, evaluacion, entrega y resultados.
- Introduce modelos de datos para usuarios, cursos, examenes, preguntas, intentos, respuestas, entregas y calificaciones.
- Requiere definicion de una rubrica estructurada para la fase final de IA.
- Requiere disciplina de documentacion incremental en artefactos OpenSpec durante todo el ciclo.