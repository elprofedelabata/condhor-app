document.addEventListener('DOMContentLoaded', () => {

  // Estado de orden actual: columna y sentido
  let currentSort = { column: 'nombre', order: 'asc' };
  // Para almacenar el filtrado activo
  let currentFiltered = null;

  const fs   = require('fs');
  const path = require('path');

  // determinar curso y rutas
  const params    = new URLSearchParams(window.location.search);
  const curso     = params.get('curso') || 'desconocido';
  const baseDir   = path.join(process.cwd(), 'cursos', curso);
  const AULAS_FILE = path.join(baseDir, 'aulas.json');

  // refs al DOM
  const tbody         = document.querySelector('.data-table tbody');
  const totalSpan     = document.getElementById('total');
  const mostradosSpan = document.getElementById('mostrados');
  const searchInput   = document.getElementById('searchAula');
  const clearBtn      = document.getElementById('clearSearch');

  let allAulas = [];

  // 1) Carga de datos
  try {
    allAulas = JSON.parse(fs.readFileSync(AULAS_FILE, 'utf-8'));
  } catch (err) {
    console.error('Error cargando aulas:', err);
    alert('No se pudieron cargar los datos de aulas.');
    return;
  }

  function sortAulas(list) {
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
        case 'ubicacion':
          A = a.ubicacion.toLowerCase();
          B = b.ubicacion.toLowerCase();
          break;
      }
      if (A < B) return currentSort.order === 'asc' ? -1 : 1;
      if (A > B) return currentSort.order === 'asc' ?  1 : -1;
      return 0;
    });
  }

  function updateArrows() {
    // borro todas
    document.querySelectorAll('.thead-button .arrow')
      .forEach(el => el.textContent = '');
    // pongo la correcta
    const span = document.querySelector(
      `.thead-button[data-col="${currentSort.column}"] .arrow`
    );
    if (span) {
      span.textContent = currentSort.order === 'asc' ? '▲' : '▼';
    }
  }


  // 2) Renderizado de la tabla
  function renderTable(list) {
    tbody.innerHTML = '';

    if (list.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="
            text-align:center;
            font-style:italic;
            color:#666;
            padding:1rem 0;">
            No se encontraron aulas
          </td>
        </tr>`;
    } else {

      const ordered = sortAulas(list);

      ordered.forEach(aula => {
        const idStr = String(aula.id).padStart(4, '0');
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td style="text-align:center">
            <span style="font-size:0.8rem; color:#666">${idStr}</span>
          </td>
          <td style="text-align:center">${aula.referencia}</td>
          <td style="text-align:center">${aula.nombre}</td>
          <td style="text-align:center">${aula.ubicacion}</td>
          <td style="color:#666; font-style:italic; text-align:center">
            ...libre
          </td>
          <td style="text-align:right">
            <button class="btn-acciones edit-btn" data-id="${aula.id}" title="Editar">
                <svg style="vertical-align:middle" xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor"><path d="M200-200h57l391-391-57-57-391 391v57Zm-80 80v-170l528-527q12-11 26.5-17t30.5-6q16 0 31 6t26 18l55 56q12 11 17.5 26t5.5 30q0 16-5.5 30.5T817-647L290-120H120Zm640-584-56-56 56 56Zm-141 85-28-29 57 57-29-28Z"/></svg>
                <span>Editar</span>
            </button>
            <button class="btn-acciones del-btn" data-id="${aula.id}" title="Borrar">
                <svg style="vertical-align:middle" xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor"><path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/></svg>
                <span>Borrar</span>
            </button>
          </td>`;
        tbody.appendChild(tr);
      });
    }

    totalSpan.textContent     = allAulas.length;
    mostradosSpan.textContent = list.length;

    updateArrows();
  }

  // inicial
  renderTable(allAulas);

  // 3) Búsqueda en tiempo real
  searchInput.addEventListener('input', () => {
    const term = searchInput.value.trim().toLowerCase();
    clearBtn.style.display = term ? 'block' : 'none';

    const filtered = allAulas.filter(aula =>
      [aula.referencia, aula.nombre, aula.ubicacion]
        .join(' ')
        .toLowerCase()
        .includes(term)
    );

    // guardo el filtrado activo
    currentFiltered = filtered;
    renderTable(filtered);
  });

  clearBtn.addEventListener('click', () => {
    searchInput.value = '';
    clearBtn.style.display = 'none';
    // limpio filtro
    currentFiltered = null;
    renderTable(allAulas);
    searchInput.focus();
  });


  // 4) Delegación de clicks para futuras acciones
  document.querySelector('.data-table-container')
    .addEventListener('click', e => {
      const btn = e.target.closest('button');
      if (!btn) return;
      const id = Number(btn.dataset.id);

      if (btn.classList.contains('edit-btn')) {
        // aquí abrirás tu openEditModalAula(id);
        openEditModal(id);
      }
      if (btn.classList.contains('del-btn')) {
        // aquí abrirás tu openDeleteModalAula(id);
        openDeleteModal(id);
      }
    });


  // — refs Añadir aula —
  const btnAdd            = document.getElementById('btnAgregar');
  const addOverlay        = document.getElementById('add-overlay');
  const addModal          = document.getElementById('add-modal');
  const closeAddModalBtn  = document.getElementById('closeAddModal');
  const cancelAddBtn      = document.getElementById('cancelAdd');
  const addForm           = document.getElementById('addAulaForm');
  const addIdInput        = document.getElementById('addAulaId');
  const addRefInput       = document.getElementById('addAulaRef');
  const addNameInput      = document.getElementById('addAulaName');
  const addLocationInput  = document.getElementById('addAulaLocation');

  function showAddModal(e) {
    e.preventDefault();
    addForm.reset();
    // calcular siguiente ID
    const maxId = allAulas.reduce((m,a) => Math.max(m,a.id), 0);
    addIdInput.value = String(maxId + 1).padStart(4, '0');
    addOverlay.style.display = 'block';
    addModal.style.display   = 'flex';
  }

  function hideAddModal() {
    addOverlay.style.display = addModal.style.display = 'none';
  }

  btnAdd           .addEventListener('click', showAddModal);
  closeAddModalBtn .addEventListener('click', hideAddModal);
  cancelAddBtn     .addEventListener('click', hideAddModal);
  addOverlay       .addEventListener('click', hideAddModal);

  addForm.addEventListener('submit', e => {
    e.preventDefault();
    // leer campos
    const id        = Number(addIdInput.value);
    const ref       = addRefInput.value.trim();
    const name      = addNameInput.value.trim();
    const location  = addLocationInput.value.trim();

    // construir y guardar
    const nueva = { id, referencia: ref, nombre: name, ubicacion: location };
    allAulas.push(nueva);
    fs.writeFileSync(
      AULAS_FILE,
      JSON.stringify(allAulas, null, 2),
      'utf-8'
    );

    // refrescar tabla
    renderTable(allAulas);

    // decidir si cerrar o seguir
    if (e.submitter.id === 'submitAddContinue') {
      const nextId = allAulas.reduce((m,a)=>Math.max(m,a.id),0) + 1;
      addForm.reset();
      addIdInput.value = String(nextId).padStart(4,'0');
      addRefInput.focus();
    } else {
      hideAddModal();
    }
  });


  // — refs Editar aula —
  const editOverlay       = document.getElementById('edit-overlay');
  const editModal         = document.getElementById('edit-modal');
  const closeEditModalBtn = document.getElementById('closeEditModal');
  const cancelEditBtn     = document.getElementById('cancelEdit');
  const editForm          = document.getElementById('editAulaForm');
  const editIdInput       = document.getElementById('editAulaId');
  const editRefInput      = document.getElementById('editAulaRef');
  const editNameInput     = document.getElementById('editAulaName');
  const editLocationInput = document.getElementById('editAulaLocation');


  function openEditModal(aulaId) {
    const aula = allAulas.find(a => a.id === aulaId);
    if (!aula) return;
    // 1) reset y rellenar
    editForm.reset();
    editIdInput.value       = String(aula.id).padStart(4,'0');
    editRefInput.value      = aula.referencia;
    editNameInput.value     = aula.nombre;
    editLocationInput.value = aula.ubicacion || '';
    // 2) mostrar modal
    editOverlay.style.display = 'block';
    editModal.style.display   = 'flex';
  }


  function hideEditModal() {
    editOverlay.style.display = editModal.style.display = 'none';
  }

  closeEditModalBtn.addEventListener('click', hideEditModal);
  cancelEditBtn    .addEventListener('click', hideEditModal);
  editOverlay      .addEventListener('click', hideEditModal);

  editForm.addEventListener('submit', e => {
    e.preventDefault();
    // leer valores
    const id   = Number(editIdInput.value);
    const ref  = editRefInput.value.trim();
    const name = editNameInput.value.trim();
    const loc  = editLocationInput.value.trim();
    // actualizar en memoria
    const aula = allAulas.find(a => a.id === id);
    aula.referencia = ref;
    aula.nombre     = name;
    aula.ubicacion  = loc;
    // persistir
    fs.writeFileSync(
      AULAS_FILE,
      JSON.stringify(allAulas, null, 2),
      'utf-8'
    );
    // refrescar vista y cerrar modal
    renderTable(allAulas);
    hideEditModal();
  });


// — refs Borrar aula —
const deleteOverlay    = document.getElementById('delete-overlay');
const deleteModal      = document.getElementById('delete-modal');
const closeDeleteBtn   = document.getElementById('closeDeleteModal');
const cancelDeleteBtn  = document.getElementById('cancelDelete');
const confirmDeleteBtn = document.getElementById('confirmDelete');

const delIdSpan   = document.getElementById('delAulaId');
const delAulaTexto  = document.getElementById('delAulaTexto');

// 1) Función para abrir el modal de borrado
function openDeleteModal(aulaId) {
  const aula = allAulas.find(a => a.id === aulaId);
  if (!aula) return;
  // rellenar datos
  delIdSpan.textContent   = String(aula.id).padStart(4,'0');
  delAulaTexto.textContent  = `${aula.referencia} | ${aula.nombre}`;
  // mostrar
  deleteOverlay.style.display = 'block';
  deleteModal.style.display   = 'flex';
}

// 2) Función para ocultar
function hideDeleteModal() {
  deleteOverlay.style.display = deleteModal.style.display = 'none';
}

// 4) Listeners para cerrar el modal sin borrar
closeDeleteBtn .addEventListener('click', hideDeleteModal);
cancelDeleteBtn.addEventListener('click', hideDeleteModal);
deleteOverlay  .addEventListener('click', hideDeleteModal);

// 5) Confirmar borrado
confirmDeleteBtn.addEventListener('click', () => {
  const id = Number(delIdSpan.textContent);
  // eliminar del array
  const idx = allAulas.findIndex(a => a.id === id);
  if (idx !== -1) {
    allAulas.splice(idx, 1);
    // persistir
    fs.writeFileSync(
      AULAS_FILE,
      JSON.stringify(allAulas, null, 2),
      'utf-8'
    );
    // refrescar tabla
    renderTable(allAulas);
  }
  hideDeleteModal();
});


document.querySelectorAll('.thead-button').forEach(btn => {
  btn.addEventListener('click', () => {
    const col = btn.dataset.col;
    if (currentSort.column === col) {
      // mismo campo → invierto orden
      currentSort.order = currentSort.order === 'asc' ? 'desc' : 'asc';
    } else {
      // nuevo campo → empiezo en ascendente
      currentSort.column = col;
      currentSort.order  = 'asc';
    }
    // pinto usando el filtrado actual (si existe) o todos
    renderTable(currentFiltered || allAulas);
  });
});



});
