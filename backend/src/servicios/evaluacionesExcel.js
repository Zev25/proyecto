import ExcelJS from 'exceljs';

const normalizarClave = (valor) => String(valor ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]/g, '');
const normalizarRespuesta = (valor) => String(valor ?? '').trim().toLowerCase();

const textoCelda = (celda) => {
  const valor = celda.value;
  if (valor === null || valor === undefined) return '';
  if (typeof valor === 'object') {
    if ('text' in valor) return String(valor.text ?? '').trim();
    if ('result' in valor) return String(valor.result ?? '').trim();
    return String(celda.text ?? '').trim();
  }
  return String(valor).trim();
};

const errorExcel = (mensaje) => {
  const error = new Error(mensaje);
  error.code = 'ARCHIVO_EXCEL_INVALIDO';
  return error;
};

const parsearOpciones = (valor, numeroFila) => {
  if (!valor) return [];

  if (valor.startsWith('[')) {
    let opciones;
    try {
      opciones = JSON.parse(valor);
    } catch {
      throw errorExcel(`Fila ${numeroFila}: la columna Opciones no contiene un arreglo JSON válido.`);
    }

    if (!Array.isArray(opciones) || opciones.some((opcion) => typeof opcion !== 'string')) {
      throw errorExcel(`Fila ${numeroFila}: Opciones debe ser un arreglo JSON de textos.`);
    }
    return opciones.map((opcion) => opcion.trim()).filter(Boolean);
  }

  return valor.split('|').map((opcion) => opcion.trim()).filter(Boolean);
};

const parsearPreguntasExcel = async (buffer) => {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer);
  } catch {
    throw errorExcel('El archivo no es un libro .xlsx válido.');
  }

  const worksheet = workbook.worksheets[0];
  if (!worksheet) throw errorExcel('El archivo no contiene hojas de cálculo.');

  const encabezados = new Map();
  const encabezado = worksheet.getRow(1);
  for (let columna = 1; columna <= encabezado.cellCount; columna += 1) {
    const clave = normalizarClave(textoCelda(encabezado.getCell(columna)));
    if (!clave) continue;
    if (encabezados.has(clave)) throw errorExcel(`El encabezado "${clave}" está duplicado.`);
    encabezados.set(clave, columna);
  }

  const columnasRequeridas = ['enunciado', 'tipo', 'opciones', 'respuestacorrecta', 'puntos'];
  const faltantes = columnasRequeridas.filter((columna) => !encabezados.has(columna));
  if (faltantes.length > 0) {
    throw errorExcel(`Faltan columnas requeridas: ${faltantes.join(', ')}.`);
  }

  const preguntas = [];
  for (let numeroFila = 2; numeroFila <= worksheet.actualRowCount; numeroFila += 1) {
    const fila = worksheet.getRow(numeroFila);
    const valores = Object.fromEntries(columnasRequeridas.map((columna) => (
      [columna, textoCelda(fila.getCell(encabezados.get(columna)))]
    )));

    if (Object.values(valores).every((valor) => !valor)) continue;

    const { enunciado, tipo, opciones: opcionesRaw, respuestacorrecta, puntos: puntosRaw } = valores;
    if (!enunciado) throw errorExcel(`Fila ${numeroFila}: falta el enunciado.`);
    if (!tipo || tipo.length > 30) throw errorExcel(`Fila ${numeroFila}: Tipo debe tener entre 1 y 30 caracteres.`);
    if (!respuestacorrecta) throw errorExcel(`Fila ${numeroFila}: falta la respuesta correcta.`);

    const opciones = parsearOpciones(opcionesRaw, numeroFila);
    const tipoNormalizado = normalizarClave(tipo);
    const esOpcionMultiple = ['multiplechoice', 'opcionmultiple', 'seleccionmultiple'].includes(tipoNormalizado);
    if (esOpcionMultiple && opciones.length < 2) {
      throw errorExcel(`Fila ${numeroFila}: una pregunta de opción múltiple requiere al menos dos opciones.`);
    }
    if (opciones.length > 0 && !opciones.some((opcion) => normalizarRespuesta(opcion) === normalizarRespuesta(respuestacorrecta))) {
      throw errorExcel(`Fila ${numeroFila}: la respuesta correcta no coincide con ninguna opción.`);
    }

    const puntos = Number(puntosRaw.replace(',', '.'));
    if (!Number.isFinite(puntos) || puntos <= 0 || puntos > 999.99) {
      throw errorExcel(`Fila ${numeroFila}: Puntos debe ser un número mayor que 0 y menor o igual a 999.99.`);
    }

    preguntas.push({
      enunciado,
      tipo,
      opciones,
      respuestaCorrecta: respuestacorrecta,
      puntos
    });

    if (preguntas.length > 50) throw errorExcel('El banco admite como máximo 50 preguntas.');
  }

  if (preguntas.length === 0) throw errorExcel('El archivo no contiene preguntas para importar.');
  return preguntas;
};

export { parsearPreguntasExcel };