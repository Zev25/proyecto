const courseOfferings = [
  {
    id: 'redes-software-tarde',
    course: 'Redes y Software',
    shift: 'Tarde',
    start: '13:00',
    end: '19:00',
    enrolled: 18,
    capacity: 25,
    classes: [
      { subject: 'Redes', name: '1A Redes', mode: 'semanal', schedule: 'Lunes 13:00-15:00', legacyCourse: 'redes' },
      { subject: 'Frontend', name: '1A Frontend', mode: 'semanal', schedule: 'Martes 15:00-17:00', legacyCourse: 'frontend' },
      { subject: 'Programación', name: '1A Programación', mode: 'semanal', schedule: 'Miércoles 13:00-16:00', legacyCourse: 'software' },
      { subject: 'Software', name: '1A Software', mode: 'entregas', schedule: 'Por entregas', legacyCourse: 'software' }
    ]
  },
  {
    id: 'redes-software-manana',
    course: 'Redes y Software',
    shift: 'Mañana',
    start: '07:00',
    end: '13:00',
    enrolled: 25,
    capacity: 25,
    classes: [
      { subject: 'Redes', name: '1B Redes', mode: 'semanal', schedule: 'Lunes 07:00-09:00', legacyCourse: 'redes' },
      { subject: 'Frontend', name: '1B Frontend', mode: 'semanal', schedule: 'Martes 09:00-11:00', legacyCourse: 'frontend' },
      { subject: 'Programación', name: '1B Programación', mode: 'semanal', schedule: 'Miércoles 07:00-10:00', legacyCourse: 'software' },
      { subject: 'Software', name: '1B Software', mode: 'entregas', schedule: 'Por entregas', legacyCourse: 'software' }
    ]
  }
];

export { courseOfferings };
