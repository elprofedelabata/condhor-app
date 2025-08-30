document.addEventListener('DOMContentLoaded', () => {

  // Estado de orden actual: columna y sentido
  let currentSort = { column: 'nombre', order: 'asc' };

  // Para almacenar el filtrado activo (si hay)
  let currentFiltered = null;

  const fs   = require('fs');
  const path = require('path');
  const params   = new URLSearchParams(window.location.search);
  const curso    = params.get('curso') || 'desconocido';
  const baseDir  = path.join(process.cwd(), 'cursos', curso);

  const MATERIAS_FILE  = path.join(baseDir, 'materias.json');
  const UNIDADES_FILE  = path.join(baseDir, 'unidades.json');

  // DOM refs
  const tbody         = document.querySelector('.data-table tbody');
  const totalSpan     = document.getElementById('total');
  const mostradosSpan = document.getElementById('mostrados');
  const searchInput   = document.getElementById('searchMateria');
  const clearBtn      = document.getElementById('clearSearch');

    let allMaterias = [];
    let unidades    = [];
    let sortedUnidades    = [];
    let unidadMap   = new Map();

  // 1) Cargar datos
  try {
    allMaterias = JSON.parse(fs.readFileSync(MATERIAS_FILE, 'utf-8'));
    unidades    = JSON.parse(fs.readFileSync(UNIDADES_FILE,   'utf-8'));
    unidadMap = new Map(unidades.map(u => [u.id, u.referencia]));

    sortedUnidades = unidades.slice().sort((a, b) => {
        if (a.id_nivel_educativo !== b.id_nivel_educativo) {
            return a.id_nivel_educativo - b.id_nivel_educativo;
        }
        return a.referencia.localeCompare(b.referencia, undefined, { sensitivity: 'base' });
    });

  } catch (err) {
    console.error('Error cargando materias/unidades:', err);
    alert('No se pudieron cargar los datos de materias.');
    return;
  }

  function sortMaterias(list) {
    return [...list].sort((a, b) => {
      let A, B;
      switch (currentSort.column) {
        case 'id':
          A = a.id; B = b.id;
          break;
        case 'referencia':
          A = a.referencia.toLowerCase();
          B = b.referencia.toLowerCase();
          break;
        case 'nombre':
          A = a.nombre.toLowerCase();
          B = b.nombre.toLowerCase();
          break;
        case 'tramos_por_semana':
          A = a.tramos_por_semana;
          B = b.tramos_por_semana;
          break;
      }
      if (A < B) return currentSort.order === 'asc' ? -1 : 1;
      if (A > B) return currentSort.order === 'asc' ?  1 : -1;
      return 0;
    });
  }

  function updateArrows() {
    // primero limpio todas
    document.querySelectorAll('.thead-button .arrow')
      .forEach(el => el.textContent = '');
    // luego pongo la adecuada
    const span = document.querySelector(
      `.thead-button[data-col="${currentSort.column}"] .arrow`
    );
    if (span) {
      span.textContent = currentSort.order === 'asc' ? '▲' : '▼';
    }
  }



  // 2) Función para pintar la tabla
  function renderTable(list) {
    tbody.innerHTML = '';

    if (list.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align:center; font-style:italic; color:#666; padding:1rem 0">
            No se encontraron materias
          </td>
        </tr>`;
      totalSpan.textContent     = allMaterias.length;
      mostradosSpan.textContent = 0;
      return;
    }

    // aplicamos la ordenación antes de pintar
    const ordered = sortMaterias(list);

    ordered.forEach(mat => {
      const idStr = String(mat.id).padStart(4, '0');
      const unidadesBadges = (mat.ids_unidades||[])
        .map(id => {
            const ref = unidadMap.get(id) || '—';
            return `<div class="unidad-badge">${ref}</div>`;
        })
        .join('');

      const tr = document.createElement('tr');
    tr.innerHTML = `
    <td style="text-align:center">
        <span style="font-size:0.8rem; color:#666">${idStr}</span>
    </td>
    <td style="text-align:center">${mat.referencia}</td>
    <td>${mat.nombre}</td>
    <td style="text-align:center">${mat.tramos_por_semana}</td>
    <td>${unidadesBadges}</td>
    <td style="text-align:right">
            <button class="btn-acciones edit-btn" data-id="${mat.id}" title="Editar">
                <svg style="vertical-align:middle" xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor"><path d="M200-200h57l391-391-57-57-391 391v57Zm-80 80v-170l528-527q12-11 26.5-17t30.5-6q16 0 31 6t26 18l55 56q12 11 17.5 26t5.5 30q0 16-5.5 30.5T817-647L290-120H120Zm640-584-56-56 56 56Zm-141 85-28-29 57 57-29-28Z"/></svg>
                <span>Editar</span>
            </button>
            <button class="btn-acciones del-btn" data-id="${mat.id}" title="Borrar">
                <svg style="vertical-align:middle" xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor"><path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/></svg>
                <span>Borrar</span>
            </button>
          </td>
    `;
      tbody.appendChild(tr);
    });

    totalSpan.textContent     = allMaterias.length;
    mostradosSpan.textContent = list.length;

    // actualizo flechita en cabecera
    updateArrows();
  }

  // 3) Inicializar vista
  renderTable(allMaterias);

  // 4) Filtrado en tiempo real
  searchInput.addEventListener('input', () => {
    const term = searchInput.value.trim().toLowerCase();
    clearBtn.style.display = term ? 'block' : 'none';

    const filtered = allMaterias.filter(mat => {
      const hay = [
        mat.referencia,
        mat.nombre,
        mat.tramos_por_semana,
        ...(mat.ids_unidades||[]).map(id => unidadMap.get(id) || '')
      ].join(' ').toLowerCase();
      return hay.includes(term);
    });

    // guardo el filtrado para poder reordenarlo
    currentFiltered = filtered;
    renderTable(filtered);
  });
  clearBtn.addEventListener('click', () => {
    searchInput.value = '';
    clearBtn.style.display = 'none';
    currentFiltered = null;
    renderTable(allMaterias);
    searchInput.focus();
  });

  // 5) Delegación de clicks para Editar/Borrar
  document.querySelector('.data-table-container')
    .addEventListener('click', e => {
      const btn = e.target.closest('button');
      if (!btn) return;

      const id = Number(btn.dataset.id);
      if (btn.classList.contains('edit-btn')) {
        // abrir modal EditarMateria(id);
        openEditModal(id);
      }
      if (btn.classList.contains('del-btn')) {
        // abrir modal BorrarMateria(id);
        openDeleteModal(id);
      }
    });


    // — refs Añadir materia —
    const btnAdd           = document.getElementById('btnAgregar');
    const addOverlay       = document.getElementById('add-overlay');
    const addModal         = document.getElementById('add-modal');
    const closeAddModal    = document.getElementById('closeAddModal');
    const cancelAdd        = document.getElementById('cancelAdd');
    const addForm          = document.getElementById('addMateriaForm');
    const addIdInput       = document.getElementById('addMatId');
    const addRefInput      = document.getElementById('addMatRef');
    const addNameInput     = document.getElementById('addMatName');
    const addTramosInput   = document.getElementById('addMatTramos');
    const addUnidadesSelect= document.getElementById('addMatUnidades');
    const unidadesCount     = document.getElementById('addMatUnidadesCount');

    // Actualiza el contador al cambiar selección
    addUnidadesSelect.addEventListener('change', () => {
        const n = addUnidadesSelect.selectedOptions.length;
        unidadesCount.textContent = `${n} unidad${n !== 1 ? 'es' : ''} seleccionada${n !== 1 ? 's' : ''}`;
    });

        
    function showAddModal(e) {
        e.preventDefault();
        addForm.reset();

        // 1) Próximo ID
        const maxId = allMaterias.reduce((m,u) => Math.max(m, u.id), 0);
        addIdInput.value = String(maxId + 1).padStart(4, '0');

        // 3) Poblamos el multi-select con el array ya ordenado
        addUnidadesSelect.innerHTML = sortedUnidades
            .map(u =>
            `<option value="${u.id}">
                ${u.referencia} | ${u.nombre}
            </option>`
            )
            .join('');

        // Inicializa contador a 0
        unidadesCount.textContent = '0 unidades seleccionadas';

        // 4) Mostramos modal
        addOverlay.style.display = 'block';
        addModal.style.display   = 'flex';
    }


    function hideAddModal() {
    addOverlay.style.display = addModal.style.display = 'none';
    }


    btnAdd         .addEventListener('click', showAddModal);
    closeAddModal  .addEventListener('click', hideAddModal);
    cancelAdd      .addEventListener('click', hideAddModal);
    addOverlay     .addEventListener('click', hideAddModal);

    addForm.addEventListener('submit', e => {
    e.preventDefault();

    // 1) Lee campos
    const id         = Number(addIdInput.value);
    const referencia = addRefInput.value.trim();
    const nombre     = addNameInput.value.trim();
    const tramos     = Number(addTramosInput.value);
    const idsUni     = Array.from(addUnidadesSelect.selectedOptions)
                            .map(opt => Number(opt.value));

    // 2) Monta objeto y guarda
    const nueva = {
        id,
        referencia,
        nombre,
        tramos_por_semana: tramos,
        ids_unidades: idsUni
    };
    allMaterias.push(nueva);
    fs.writeFileSync(MATERIAS_FILE,
        JSON.stringify(allMaterias, null, 2),
        'utf-8'
    );

    // 3) Refresca tabla
    renderTable(allMaterias);

    // 4) Decide cerrar o seguir añadiendo
    if (e.submitter.id === 'submitAddContinue') {
        // prepara siguiente ID
        const nextId = allMaterias.reduce((m,u) => Math.max(m,u.id),0) + 1;
        addForm.reset();
        addIdInput.value = String(nextId).padStart(4,'0');
        addNameInput.focus();
    } else {
        hideAddModal();
    }
    });


// — refs Editar materia —
const editOverlay        = document.getElementById('edit-overlay');
const editModal          = document.getElementById('edit-modal');
const closeEditModalBtn  = document.getElementById('closeEditModal');
const cancelEditBtn      = document.getElementById('cancelEdit');
const editForm           = document.getElementById('editMateriaForm');
const editIdInput        = document.getElementById('editMatId');
const editRefInput       = document.getElementById('editMatRef');
const editNameInput      = document.getElementById('editMatName');
const editTramosInput    = document.getElementById('editMatTramos');
const editUnidadesSelect = document.getElementById('editMatUnidades');
const editCountSpan      = document.getElementById('editMatUnidadesCount');

// 1) Población de <select> de unidades (reusa sortedUnidades)
function populateEditUnidades() {
  editUnidadesSelect.innerHTML = sortedUnidades
    .map(u =>
      `<option value="${u.id}">${String(u.id).padStart(4,'0')} – ${u.referencia}</option>`
    ).join('');
}

// 2) Abrir modal y rellenar campos
function openEditModal(matId) {
  const mat = allMaterias.find(m => m.id === matId);
  if (!mat) return;

  // 2.a) reset y repoblar select
  editForm.reset();
  populateEditUnidades();

  // 2.b) rellenar valores
  editIdInput.value     = String(mat.id).padStart(4,'0');
  editRefInput.value    = mat.referencia;
  editNameInput.value   = mat.nombre;
  editTramosInput.value = mat.tramos_por_semana;

  // 2.c) marcar unidades seleccionadas
  Array.from(editUnidadesSelect.options).forEach(opt => {
    opt.selected = mat.ids_unidades.includes(Number(opt.value));
  });
  // 2.d) actualizar contador
  const n = editUnidadesSelect.selectedOptions.length;
  editCountSpan.textContent = 
    `${n} unidad${n!==1?'es':''} seleccionada${n!==1?'s':''}`;

  // 2.e) mostrar modal
  editOverlay.style.display = 'block';
  editModal.style.display   = 'flex';
}

// 3) Ocultar modal
function hideEditModal() {
  editOverlay.style.display = editModal.style.display = 'none';
}

// 4) listener para actualizar contador en edición
editUnidadesSelect.addEventListener('change', () => {
  const n = editUnidadesSelect.selectedOptions.length;
  editCountSpan.textContent = 
    `${n} unidad${n!==1?'es':''} seleccionada${n!==1?'s':''}`;
});

// 5) listeners cerrar modal
closeEditModalBtn.addEventListener('click', hideEditModal);
cancelEditBtn     .addEventListener('click', hideEditModal);
editOverlay       .addEventListener('click', hideEditModal);

// 6) Delegación de click ya existente:
//    dentro de tu handler de '.data-table-container' añade:
//      if (btn.classList.contains('edit-btn')) openEditModal(id);

// 7) Guardar cambios
editForm.addEventListener('submit', e => {
  e.preventDefault();
  const id     = Number(editIdInput.value);
  const ref    = editRefInput.value.trim();
  const name   = editNameInput.value.trim();
  const tramos = Number(editTramosInput.value);
  const idsU   = Array.from(editUnidadesSelect.selectedOptions)
                      .map(o => Number(o.value));

  // actualizar en memoria
  const mat = allMaterias.find(m => m.id === id);
  mat.referencia         = ref;
  mat.nombre             = name;
  mat.tramos_por_semana  = tramos;
  mat.ids_unidades       = idsU;

  // persistir
  fs.writeFileSync(
    MATERIAS_FILE,
    JSON.stringify(allMaterias, null, 2),
    'utf-8'
  );

  // refrescar y cerrar
  renderTable(allMaterias);
  hideEditModal();
});


// — refs Borrar materia —
const deleteOverlay      = document.getElementById('delete-overlay');
const deleteModal        = document.getElementById('delete-modal');
const closeDeleteModal   = document.getElementById('closeDeleteModal');
const cancelDeleteBtn    = document.getElementById('cancelDelete');
const confirmDeleteBtn   = document.getElementById('confirmDelete');
const delMatIdSpan       = document.getElementById('delMatId');
const delMatRefNameSpan  = document.getElementById('delMatRefName');

// guardamos la id que queremos borrar
let materiaToDeleteId = null;

function openDeleteModal(id) {
  materiaToDeleteId = id;
  const mat = allMaterias.find(m => m.id === id);
  if (!mat) return;

  delMatIdSpan.textContent      = String(mat.id).padStart(4,'0');
  delMatRefNameSpan.textContent = `${mat.referencia} | ${mat.nombre}`;

  deleteOverlay.style.display = 'block';
  deleteModal.style.display   = 'flex';
}

function hideDeleteModal() {
  deleteOverlay.style.display = deleteModal.style.display = 'none';
  materiaToDeleteId = null;
}

cancelDeleteBtn   .addEventListener('click', hideDeleteModal);
closeDeleteModal  .addEventListener('click', hideDeleteModal);
deleteOverlay     .addEventListener('click', hideDeleteModal);

// confirmar borrado:
confirmDeleteBtn.addEventListener('click', () => {
  if (materiaToDeleteId == null) return;
  // eliminamos del array
  allMaterias = allMaterias.filter(m => m.id !== materiaToDeleteId);
  // guardamos en disco
  fs.writeFileSync(
    MATERIAS_FILE,
    JSON.stringify(allMaterias, null, 2),
    'utf-8'
  );
  // refrescamos y cerramos modal
  renderTable(allMaterias);
  hideDeleteModal();
});


// click en cada botón de cabecera para cambiar columna/orden
document.querySelectorAll('.thead-button').forEach(btn => {
  btn.addEventListener('click', () => {
    const col = btn.dataset.col;
    if (currentSort.column === col) {
      // ya estaba en esa columna → invierto asc/desc
      currentSort.order = currentSort.order === 'asc' ? 'desc' : 'asc';
    } else {
      // nueva columna → arranco en asc
      currentSort.column = col;
      currentSort.order  = 'asc';
    }
    // pinto la tabla (filtrada si hay filtro activo)
    renderTable(currentFiltered || allMaterias);
  });
});








});
