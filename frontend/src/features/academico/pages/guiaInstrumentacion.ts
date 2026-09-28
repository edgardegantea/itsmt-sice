/**
 * Indicaciones oficiales para desarrollar la instrumentación didáctica, tomadas textualmente
 * del formato del SGC "Instrumentación Didáctica para la formación y desarrollo de competencias
 * profesionales-Ingreso Agosto 2015 del SGI del G4". Se muestran como guía de ayuda en el
 * editor; el texto no se edita para no apartarse del documento controlado.
 */

export type BloqueGuia = { tipo: 'p' | 'li' | 'num' | 'sub'; texto: string }
export type SeccionGuia = { id: string; titulo: string; bloques: BloqueGuia[] }

export const GUIA_INSTRUMENTACION: SeccionGuia[] = [
  {
    id: "1",
    titulo: "Caracterización de la asignatura",
    bloques: [
      {
        tipo: "p",
        texto: "Determinar los atributos de la asignatura, de modo que claramente se distinga de las demás y, al mismo tiempo, se vea las relaciones con las demás y con el perfil profesional:"
      },
      {
        tipo: "li",
        texto: "Explicar la aportación de la asignatura al perfil profesional."
      },
      {
        tipo: "li",
        texto: "Explicar la importancia de la asignatura."
      },
      {
        tipo: "li",
        texto: "Explicar en qué consiste la asignatura."
      },
      {
        tipo: "li",
        texto: "Explicar con qué otras asignaturas se relaciona, en qué temas, con que competencias específicas"
      }
    ]
  },
  {
    id: "2",
    titulo: "Intención didáctica",
    bloques: [
      {
        tipo: "p",
        texto: "Explicar claramente la forma de tratar la asignatura de tal manera que oriente las actividades de enseñanza y aprendizaje:"
      },
      {
        tipo: "li",
        texto: "La manera de abordar los contenidos."
      },
      {
        tipo: "li",
        texto: "El enfoque con que deben ser tratados."
      },
      {
        tipo: "li",
        texto: "La extensión y la profundidad de los mismos."
      },
      {
        tipo: "li",
        texto: "Que actividades del estudiante se deben resaltar para el desarrollo de competencias genéricas."
      },
      {
        tipo: "li",
        texto: "Que competencias genéricas se están desarrollando con el tratamiento de los contenidos de la asignatura."
      },
      {
        tipo: "li",
        texto: "De manera general explicar el papel que debe desempeñar el (la) profesor(a) para el desarrollo de la asignatura."
      }
    ]
  },
  {
    id: "3",
    titulo: "Competencia de la asignatura",
    bloques: [
      {
        tipo: "p",
        texto: "Se enuncia de manera clara y descriptiva la competencia(s) específica(s) que se pretende que el estudiante desarrolle de manera adecuada respondiendo a lapregunta ¿Qué debe saber y saber hacer el estudiante? como resultado de su proceso formativo en el desarrollo de la asignatura."
      }
    ]
  },
  {
    id: "4",
    titulo: "Análisis por competencia específica",
    bloques: [
      {
        tipo: "p",
        texto: "Los puntos que se describen a continuación se repiten, de acuerdo al número de competencias específicas de los temas de asignatura."
      }
    ]
  },
  {
    id: "4.1",
    titulo: "Competencia No.",
    bloques: [
      {
        tipo: "p",
        texto: "Se escribe el número de competencia, acorde a la cantidad de temas establecidos en la asignatura."
      }
    ]
  },
  {
    id: "4.2",
    titulo: "Descripción",
    bloques: [
      {
        tipo: "p",
        texto: "Se enuncia de manera clara y descriptiva la competencia específica que se pretende que el estudiante desarrolle de manera adecuada respondiendo a la pregunta ¿Qué debe saber y saber hacer el estudiante? como resultado de su proceso formativo en el desarrollo del tema."
      }
    ]
  },
  {
    id: "4.3",
    titulo: "Temas y subtemas para desarrollar la competencia específica",
    bloques: [
      {
        tipo: "p",
        texto: "Se presenta el temario de una manera concreta, clara, organizada y secuenciada, evitando una presentación exagerada y enciclopédica."
      }
    ]
  },
  {
    id: "4.4",
    titulo: "Actividades de aprendizaje",
    bloques: [
      {
        tipo: "p",
        texto: "El desarrollo de competencias profesionales lleva a pensar en un conjunto de las actividades que el estudiante desarrollará y que el (la) profesor(a) indicará, organizará, coordinará y pondrá en juego para propiciar el desarrollo de tales competencias profesionales. Estas actividades no solo son importantes para la adquisición de las competencias específicas; sino que también se constituyen en aprendizajes importantes para la adquisición y desarrollo de competencias genéricas en el estudiante, competencias fundamentales en su formación pero sobre todo en su futuro desempeño profesional. Actividades tales como las siguientes:"
      },
      {
        tipo: "li",
        texto: "Llevar a cabo actividades intelectuales de inducción-deducción y análisis-síntesis, las cuales lo encaminan hacia la investigación, la aplicación de conocimientos y la solución de problemas."
      },
      {
        tipo: "li",
        texto: "Buscar, seleccionar y analizar información en distintas fuentes."
      },
      {
        tipo: "li",
        texto: "Uso de las nuevas tecnologías en el desarrollo de los contenidos de la asignatura."
      },
      {
        tipo: "li",
        texto: "Participar en actividades grupales que propicien la comunicación, el intercambio argumentado de ideas, la reflexión, la integración y la colaboración."
      },
      {
        tipo: "li",
        texto: "Desarrollar prácticas para que promueva el desarrollo de habilidades para la experimentación, tales como: observación, identificación manejo y control de variables y datos relevantes, planteamiento de hipótesis, de trabajo en equipo."
      },
      {
        tipo: "li",
        texto: "Aplicar conceptos, modelos y metodologías que se va aprendiendo en el desarrollo de la asignatura."
      },
      {
        tipo: "li",
        texto: "Usar adecuadamente conceptos, y terminología científico-tecnológica."
      },
      {
        tipo: "li",
        texto: "Enfrentar problemas que permitan la integración de contenidos de la asignatura y entre distintas asignaturas, para su análisis y solución."
      },
      {
        tipo: "li",
        texto: "Relacionar los contenidos de la asignatura con el cuidado del medio ambiente"
      },
      {
        tipo: "li",
        texto: "Observar y analizar fenómenos y problemáticas propias del campo ocupacional."
      },
      {
        tipo: "li",
        texto: "Relacionar los contenidos de la asignatura con las demás del plan de estudios para desarrollar una visión interdisciplinaria."
      },
      {
        tipo: "li",
        texto: "Leer, escuchar, observar, descubrir, cuestionar, preguntar, indagar, obtener información."
      },
      {
        tipo: "li",
        texto: "Hablar, redactar, crear ideas, relacionar ideas, expresarlas con claridad, orden y rigor oralmente y por escrito."
      },
      {
        tipo: "li",
        texto: "Dialogar, argumentar, replicar, discutir, explicar, sostener un punto de vista."
      },
      {
        tipo: "li",
        texto: "Participar en actividades colectivas, colaborar con otros en trabajos diversos, trabajar en equipo, intercambiar información."
      },
      {
        tipo: "li",
        texto: "Producir textos originales, elaborar proyectos de distinta índole, diseñar y desarrollar prácticas."
      }
    ]
  },
  {
    id: "4.5",
    titulo: "Actividades de enseñanza",
    bloques: [
      {
        tipo: "p",
        texto: "Las actividades que el (la) profesor(a) llevará a cabo para que el estudiante desarrolle, con éxito, la o las competencias genéricas y específicas establecidas para el tema:"
      },
      {
        tipo: "li",
        texto: "Propiciar, en el estudiante, el desarrollo de actividades intelectuales de inducción-deducción y análisis-síntesis, las cuales lo encaminan hacia la investigación, la aplicación de conocimientos y la solución de problemas."
      },
      {
        tipo: "li",
        texto: "Propiciar actividades de búsqueda, selección y análisis de información en distintas fuentes."
      },
      {
        tipo: "li",
        texto: "Propiciar el uso de las nuevas tecnologías en el desarrollo de los contenidos de la asignatura."
      },
      {
        tipo: "li",
        texto: "Fomentar actividades grupales que propicien la comunicación, el intercambio argumentado de ideas, la reflexión, la integración y la colaboración de y entre los estudiantes."
      },
      {
        tipo: "li",
        texto: "Llevar a cabo actividades prácticas que promuevan el desarrollo de habilidades para la experimentación, tales como: observación, identificación manejo y control de variables y datos relevantes, planteamiento de hipótesis, de trabajo en equipo."
      },
      {
        tipo: "li",
        texto: "Desarrollar actividades de aprendizaje que propicien la aplicación de los conceptos, modelos y metodologías que se van aprendiendo en el desarrollo de la asignatura."
      },
      {
        tipo: "li",
        texto: "Propiciar el uso adecuado de conceptos, y de terminología científico-tecnológica."
      },
      {
        tipo: "li",
        texto: "Proponer problemas que permitan al estudiante la integración de contenidos de la asignatura y entre distintas asignaturas, para su análisis y solución."
      },
      {
        tipo: "li",
        texto: "Relacionar los contenidos de la asignatura con el cuidado del medio ambiente; así como con las prácticas de una ingeniería con enfoque sustentable."
      },
      {
        tipo: "li",
        texto: "Observar y analizar fenómenos y problemáticas propias del campo ocupacional."
      },
      {
        tipo: "li",
        texto: "Relacionar los contenidos de esta asignatura con las demás del plan de estudios para desarrollar una visión interdisciplinaria en el estudiante."
      }
    ]
  },
  {
    id: "4.6",
    titulo: "Desarrollo de competencias genéricas",
    bloques: [
      {
        tipo: "p",
        texto: "Con base en las actividades de aprendizaje establecidas en los temas, analizarlas en su conjunto y establecer que competencias genéricas se están desarrollando con dichas actividades. Este punto es el último en desarrollarse en la elaboración de la instrumentación didáctica para la formación y desarrollo de competencias profesionales. A continuación se presentan su definición y características:"
      },
      {
        tipo: "sub",
        texto: "Competencias genéricas"
      },
      {
        tipo: "p",
        texto: "Competencias instrumentales: competencias relacionadas con la comprensión y manipulación de ideas, metodologías, equipo y destrezas como las lingüísticas, de investigación, de análisis de información. Entre ellas se incluyen:"
      },
      {
        tipo: "li",
        texto: "Capacidades cognitivas, la capacidad de comprender y manipular ideas y pensamientos."
      },
      {
        tipo: "li",
        texto: "Capacidades metodológicas para manipular el ambiente: ser capaz de organizar el tiempo y las estrategias para el aprendizaje, tomar decisiones o resolver problemas."
      },
      {
        tipo: "li",
        texto: "Destrezas tecnológicas relacionadas con el uso de maquinaria, destrezas de computación; así como, de búsqueda y manejo de información."
      },
      {
        tipo: "li",
        texto: "Destrezas lingüísticas tales como la comunicación oral y escrita o conocimientos de una segunda lengua."
      },
      {
        tipo: "sub",
        texto: "Listado de competencias instrumentales:"
      },
      {
        tipo: "num",
        texto: "1) Capacidad de análisis y síntesis"
      },
      {
        tipo: "num",
        texto: "2) Capacidad de organizar y planificar"
      },
      {
        tipo: "num",
        texto: "3) Conocimientos generales básicos"
      },
      {
        tipo: "num",
        texto: "4) Conocimientos básicos de la carrera"
      },
      {
        tipo: "num",
        texto: "5) Comunicación oral y escrita en su propia lengua"
      },
      {
        tipo: "num",
        texto: "6) Conocimiento de una segunda lengua"
      },
      {
        tipo: "num",
        texto: "7) Habilidades básicas de manejo de la computadora"
      },
      {
        tipo: "num",
        texto: "8) Habilidades de gestión de información (habilidad para buscar y analizar información proveniente de fuentes diversas"
      },
      {
        tipo: "num",
        texto: "9) Solución de problemas"
      },
      {
        tipo: "num",
        texto: "10) Toma de decisiones."
      },
      {
        tipo: "p",
        texto: "Competencias interpersonales: capacidades individuales relativas a la capacidad de expresar los propios sentimientos, habilidades críticas y de autocrítica. Estas competencias tienden a facilitar los procesos de interacción social y cooperación."
      },
      {
        tipo: "p",
        texto: "Destrezas sociales relacionadas con las habilidades interpersonales."
      },
      {
        tipo: "li",
        texto: "Capacidad de trabajar en equipo o la expresión de compromiso social o ético."
      },
      {
        tipo: "sub",
        texto: "Listado de competencias interpersonales:"
      },
      {
        tipo: "num",
        texto: "1) Capacidad crítica y autocrítica"
      },
      {
        tipo: "num",
        texto: "2) Trabajo en equipo"
      },
      {
        tipo: "num",
        texto: "3) Habilidades interpersonales"
      },
      {
        tipo: "num",
        texto: "4) Capacidad de trabajar en equipo interdisciplinario"
      },
      {
        tipo: "num",
        texto: "5) Capacidad de comunicarse con profesionales de otras áreas"
      },
      {
        tipo: "num",
        texto: "6) Apreciación de la diversidad y multiculturalidad"
      },
      {
        tipo: "num",
        texto: "7) Habilidad para trabajar en un ambiente laboral"
      },
      {
        tipo: "num",
        texto: "8) Compromiso ético"
      },
      {
        tipo: "p",
        texto: "Competencias sistémicas: son las destrezas y habilidades que conciernen a los sistemas como totalidad. Suponen una combinación de la comprensión, la sensibilidad y el conocimiento que permiten al individuo ver como las partes de un todo se relacionan y se estructuran y se agrupan. Estas capacidades incluyen la habilidad de planificar como un todo y diseñar nuevos sistemas. Las competencias sistémicas o integradoras requieren como base la adquisición previa de competencias instrumentales e interpersonales."
      },
      {
        tipo: "sub",
        texto: "Listado de competencias sistémicas:"
      },
      {
        tipo: "num",
        texto: "1) Capacidad de aplicar los conocimientos en la práctica"
      },
      {
        tipo: "num",
        texto: "2) Habilidades de investigación"
      },
      {
        tipo: "num",
        texto: "3) Capacidad de aprender"
      },
      {
        tipo: "num",
        texto: "4) Capacidad de adaptarse a nuevas situaciones"
      },
      {
        tipo: "num",
        texto: "5) Capacidad de generar nuevas ideas (creatividad)"
      },
      {
        tipo: "num",
        texto: "6) Liderazgo"
      },
      {
        tipo: "num",
        texto: "7) Conocimiento de culturas y costumbres de otros países"
      },
      {
        tipo: "num",
        texto: "8) Habilidad para trabajar en forma autónoma"
      },
      {
        tipo: "num",
        texto: "9) Capacidad para diseñar y gestionar proyectos"
      },
      {
        tipo: "num",
        texto: "10) Iniciativa y espíritu emprendedor"
      },
      {
        tipo: "num",
        texto: "11) Preocupación por la calidad"
      },
      {
        tipo: "num",
        texto: "12) Búsqueda del logro"
      }
    ]
  },
  {
    id: "4.7",
    titulo: "Horas teórico-prácticas",
    bloques: [
      {
        tipo: "p",
        texto: "Con base en las actividades de aprendizaje y enseñanza, establecer las horas teórico-prácticas necesarias, para que el estudiante adecuadamente la competencia específica."
      }
    ]
  },
  {
    id: "4.8",
    titulo: "Indicadores de alcance",
    bloques: [
      {
        tipo: "p",
        texto: "Indica los criterios de valoración por excelencia al definir con claridad y precisión los conocimientos y habilidades que integran la competencia."
      }
    ]
  },
  {
    id: "4.9",
    titulo: "Valor del indicador",
    bloques: [
      {
        tipo: "p",
        texto: "Indica la ponderación de los criterios de valoración definidos en el punto anterior."
      }
    ]
  },
  {
    id: "4.10",
    titulo: "Niveles de desempeño",
    bloques: [
      {
        tipo: "p",
        texto: "Establece el modo escalonado y jerárquico los diferentes niveles de logro en la competencia, estos se encuentran definidos en la tabla del presente lineamiento."
      }
    ]
  },
  {
    id: "4.11",
    titulo: "Matriz de evaluación",
    bloques: [
      {
        tipo: "p",
        texto: "Criterios de evaluación del tema. Algunos aspectos centrales que deben tomar en cuenta para establecer los criterios de evaluación son:"
      },
      {
        tipo: "li",
        texto: "Determinar, desde el inicio del semestre, las actividades y los productos que se esperan de dichas actividades; así como, los criterios con que serán evaluados los estudiantes. A manera de ejemplo la elaboración de una rúbrica o una lista de cotejo."
      },
      {
        tipo: "li",
        texto: "Comunicar a los estudiantes, desde el inicio del semestre, las actividades y los productos que se esperan de dichas actividades así como los criterios con que serán evaluados."
      },
      {
        tipo: "li",
        texto: "Propiciar y asegurar que el estudiante vaya recopilando las evidencias que muestran las actividades y los productos que se esperan de dichas actividades; dichas evidencias deben de tomar en cuenta los criterios con que serán evaluados. A manera de ejemplo el portafolio de evidencias."
      },
      {
        tipo: "li",
        texto: "Establecer una comunicación continua para poder validar las evidencias que el estudiante va obteniendo para retroalimentar el proceso de aprendizaje de los estudiantes."
      },
      {
        tipo: "li",
        texto: "Propiciar procesos de autoevaluación y coevaluación que completen y enriquezcan el proceso de evaluación y retroalimentación del profesor."
      }
    ]
  },
  {
    id: "5",
    titulo: "Fuentes de información y apoyos didácticos",
    bloques: [
      {
        tipo: "p",
        texto: "Se consideran todos los recursos didácticos de apoyo para la formación y desarrollo de las competencias."
      }
    ]
  },
  {
    id: "5.1",
    titulo: "Fuentes de información",
    bloques: [
      {
        tipo: "p",
        texto: "Se considera a todos los recursos que contienen datos formales, informales, escritos, audio, imágenes, multimedia, que contribuyen al desarrollo de la asignatura. Es importante que los recursos sean vigentes y actuales (de años recientes) y que se indiquen según la Norma APA (American Psychological Association) vigente. Ejemplo de algunos de ellos: Referencias de libros, revistas, artículos, tesis, páginas web, conferencia, fotografías, videos, entre otros)."
      }
    ]
  },
  {
    id: "5.2",
    titulo: "Apoyo didáctico",
    bloques: [
      {
        tipo: "p",
        texto: "Se considera cualquier material que se ha elaborado para el estudiante con la finalidad de guiar los aprendizajes, proporcionar información, ejercitar sus habilidades, motivar e impulsar el interés, y proporcionar un entorno de expresión."
      }
    ]
  },
  {
    id: "6",
    titulo: "Calendarización de evaluación",
    bloques: [
      {
        tipo: "p",
        texto: "En este apartado el (la) profesor(a) registrará los diversos momentos de las evaluaciones diagnóstica, formativa y sumativa."
      }
    ]
  }
]
