const fechaIsoValida = (fecha) => {
  if (fecha === null || fecha === undefined || fecha === '') return true;
  if (typeof fecha !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;
  const [anio, mes, dia] = fecha.split('-').map(Number);
  const fechaUtc = new Date(Date.UTC(anio, mes - 1, dia));
  return fechaUtc.getUTCFullYear() === anio
    && fechaUtc.getUTCMonth() === mes - 1
    && fechaUtc.getUTCDate() === dia;
};

export { fechaIsoValida };
