// Módulos de Node.js necesarios para leer archivos
const fs = require('fs');
const path = require('path');

document.addEventListener('DOMContentLoaded', initUi);

/**
 * Lee los datos del curso actual (obtenido de la URL) y los muestra en la barra superior.
 */
function cargarInfoCursoEnBarraSuperior() {
    const params = new URLSearchParams(window.location.search);
    const cursoNombre = params.get('curso');

    const denominacionEl = document.getElementById('info-curso-denominacion');
    const carpetaEl = document.getElementById('info-curso-carpeta');
    const centroEl = document.getElementById('info-curso-centro');

    if (!cursoNombre || !denominacionEl) {
        if(denominacionEl) denominacionEl.textContent = 'Ningún curso cargado';
        if(carpetaEl) carpetaEl.textContent = '---';
        if(centroEl) centroEl.textContent = '---';
        return;
    }

    const cursoFile = path.join(process.cwd(), 'cursos', cursoNombre, 'curso.json');
    try {
        const data = fs.readFileSync(cursoFile, 'utf-8');
        const cursoData = JSON.parse(data);

        if (cursoData && cursoData.datos) {
            denominacionEl.textContent = cursoData.datos.denominacion || 'Sin nombre';
            carpetaEl.textContent = cursoData.datos.carpeta || '---';
            centroEl.textContent = cursoData.datos.centro_educativo || 'Sin centro';
        }
    } catch (error) {
        console.error("Error al leer el archivo del curso para la barra superior:", error);
        denominacionEl.textContent = 'Error al cargar el curso';
        carpetaEl.textContent = cursoNombre;
        centroEl.textContent = '---';
    }
}


/**
 * Inyecta la barra superior, la puebla con datos y arranca la navegación.
 */
async function initUi() {
  try {
    const htmlSuperior = await fetch('basedatos_barrasuperior.html').then(r => r.text());
    document.getElementById('barra-superior').innerHTML = htmlSuperior;
    cargarInfoCursoEnBarraSuperior();
    initSidebarNavigation();
  } catch (err) {
    console.error('Error cargando la UI general:', err);
  }
}

/**
 * Configura los botones de navegación de la barra superior con transiciones.
 */
/**
 * Configura los botones de navegación de la barra superior con transiciones.
 */
/**
 * Configura los botones de navegación de la barra superior.
 * ¡Ahora usa la API nativa de View Transitions!
 */
function initSidebarNavigation() {
  const params = new URLSearchParams(window.location.search);
  const curso  = params.get('curso') ? `?curso=${params.get('curso')}` : '';

  // --- Función auxiliar para manejar la navegación ---
  // Nota: Ahora es una navegación normal y corriente, sin trucos.
  function navigateTo(url) {
    window.location.href = url;
  }

  // --- Lógica para los botones de navegación principal ---
  const navMap = {
    btnCurso:              'basedatos_curso.html',
    btnProfesores:         'basedatos_profesores.html',
    btnUnidades:           'basedatos_unidades.html',
    btnMaterias:           'basedatos_materias.html',
    btnAulas:              'basedatos_aulas.html',
    btnNoDocencia:         'basedatos_nodocencia.html',
    btnTramos:             'basedatos_tramos.html',
    btnDepartamentos:      'basedatos_departamentos.html',
    btnNivelesEducativos:  'basedatos_niveleseducativos.html'
  };

  const current = window.location.pathname.split('/').pop();

  Object.entries(navMap).forEach(([btnId, page]) => {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.addEventListener('click', e => {
      e.preventDefault();
      // Simplemente navegamos, la API se encarga del resto
      navigateTo(`${page}${curso}`);
    });
    btn.setAttribute('aria-pressed', current === page ? 'true' : 'false');
  });

  // --- Lógica para el dropdown (mostrar/ocultar) - SIN CAMBIOS ---
  const pantallaBtn = document.getElementById('pantallaBtn');
  const pantallaMenu = document.getElementById('pantallaDropdownMenu');
  if (pantallaBtn) {
    pantallaBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      pantallaMenu.classList.toggle('show');
    });
  }
  window.addEventListener('click', (event) => {
    if (pantallaMenu && pantallaMenu.classList.contains('show') && !pantallaBtn.contains(event.target)) {
        pantallaMenu.classList.remove('show');
    }
  });

  // --- Lógica para los enlaces DEL dropdown ---
  const addDropdownListener = (id, url) => {
    const element = document.getElementById(id);
    if(element) {
        element.addEventListener('click', (e) => {
            e.preventDefault();
            const destination = `${url}${id === 'btnVolverInicio' ? '' : curso}`;
            navigateTo(destination);
        });
    }
  };
  
  addDropdownListener('btnVolverInicio', 'index.html');
  addDropdownListener('btnBaseDatos', 'basedatos_curso.html');
  addDropdownListener('btnHorarios', 'horarios_profesores.html'); 
}