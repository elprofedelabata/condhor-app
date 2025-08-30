// departamentos.js
document.addEventListener('DOMContentLoaded', () => {

  // columna activa y sentido de orden
  let currentSort = { column: 'nombre', order: 'asc' };
  // para recordar el filtrado actual
  let currentFiltered = null;

  const fs     = require('fs');
  const path   = require('path');
  const params = new URLSearchParams(window.location.search);
  const curso  = params.get('curso') || 'desconocido';
  const cursoDir        = path.join(process.cwd(), 'cursos', curso);
  const DEPTS_FILE      = path.join(cursoDir, 'departamentos.json');
  const PROFESSORS_FILE = path.join(cursoDir, 'profesores.json');

  // — refs al DOM —
  const tbody          = document.querySelector('.data-table tbody');
  const totalSpan      = document.getElementById('totalDept');
  const mostradosSpan  = document.getElementById('mostradosDept');
  const searchInput    = document.getElementById('searchDept');
  const clearBtn       = document.getElementById('clearSearchDept');
  const btnAddDept     = document.getElementById('btnAgregarDept');
  const btnImportDept  = document.getElementById('btnImportarDept');

  // — para el modal “Añadir departamento” —
  const addOverlay     = document.getElementById('add-overlay');
  const addModal       = document.getElementById('add-modal');
  const closeAddModal  = document.getElementById('closeAddModal');
  const addForm        = document.getElementById('addDepForm');
  const inputAddId     = document.getElementById('addDepId');
  const inputAddNombre = document.getElementById('addDepNombre');
  const inputAddColor  = document.getElementById('addDepColor');

  let allDepts   = [];
  let allProfs   = [];
  let countByDept = new Map();

  // — 1) Carga de JSONs —
  try {
    allDepts = JSON.parse(fs.readFileSync(DEPTS_FILE, 'utf-8'));
  } catch (err) {
    console.error('Error cargando departamentos.json:', err);
    allDepts = [];
  }
  try {
    allProfs = JSON.parse(fs.readFileSync(PROFESSORS_FILE, 'utf-8'));
  } catch (err) {
    console.error('Error cargando profesores.json:', err);
    allProfs = [];
  }

  // — 2) Función para recount y render —
  function loadAndRender() {
    // recalcula conteos
    countByDept.clear();
    allProfs.forEach(p => {
      const d = p.id_departamento;
      countByDept.set(d, (countByDept.get(d) || 0) + 1);
    });
    // actualiza spans y tabla
    totalSpan.textContent     = allDepts.length;
    renderTable(allDepts);
  }

  function sortDepts(list) {
    return [...list].sort((a, b) => {
      let A, B;
      switch (currentSort.column) {
        case 'id':
          A = a.id; B = b.id;
          break;
        case 'nombre':
          A = a.nombre.toLowerCase();
          B = b.nombre.toLowerCase();
          break;
        case 'miembros':
          A = (countByDept.get(a.id) || 0);
          B = (countByDept.get(b.id) || 0);
          break;
        default:
          return 0;
      }
      if (A < B) return currentSort.order === 'asc' ? -1 : 1;
      if (A > B) return currentSort.order === 'asc' ?  1 : -1;
      return 0;
    });
  }

  function updateArrows() {
    document.querySelectorAll('.thead-button .arrow')
      .forEach(el => el.textContent = '');
    const span = document.querySelector(
      `.thead-button[data-col="${currentSort.column}"] .arrow`
    );
    if (span) span.textContent = currentSort.order === 'asc' ? '▲' : '▼';
  }


  // — 3) Render de la tabla —
  function renderTable(list) {
    tbody.innerHTML = '';
    if (list.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="
            text-align:center;
            font-style:italic;
            color:#666;
            padding:1rem 0;
          ">
            No se encontraron departamentos
          </td>
        </tr>`;
      mostradosSpan.textContent = 0;
      return;
    }

    const ordered = sortDepts(list);

    ordered.forEach(dep => {
      const idStr   = String(dep.id).padStart(4, '0');
      const profCnt = countByDept.get(dep.id) || 0;
      let profText;
      if (profCnt === 0) {
        profText = `<span style="color:#666;font-style:italic">(sin profesores)</span>`;
      } else if (profCnt === 1) {
        profText = `1 profesor`;
      } else {
        profText = `${profCnt} profesores`;
      }

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="text-align:center">
          <span style="font-size:0.8rem;color:#666">${idStr}</span>
        </td>
        <td style="padding-left:1rem">${dep.nombre}</td>
        <td style="text-align:center">
          <div style="
            width:3rem; height:1rem;
            background:${dep.color};
            border:1px solid #aaa;
            border-radius:3px;
            margin:0 auto;
          "></div>
        </td>
        <td style="text-align:center">${profText}</td>
        <td style="text-align:right">
            <button class="btn-acciones edit-btn" data-id="${dep.id}" title="Editar">
                <svg style="vertical-align:middle" xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor"><path d="M200-200h57l391-391-57-57-391 391v57Zm-80 80v-170l528-527q12-11 26.5-17t30.5-6q16 0 31 6t26 18l55 56q12 11 17.5 26t5.5 30q0 16-5.5 30.5T817-647L290-120H120Zm640-584-56-56 56 56Zm-141 85-28-29 57 57-29-28Z"/></svg>
                <span>Editar</span>
            </button>
            <button class="btn-acciones del-btn" data-id="${dep.id}" title="Borrar">
                <svg style="vertical-align:middle" xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor"><path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/></svg>
                <span>Borrar</span>
            </button>
          </td>`;
      tbody.appendChild(tr);
    });

    mostradosSpan.textContent = list.length;

    updateArrows();
  }

  // — 4) Filtrado en tiempo real —
  searchInput.addEventListener('input', () => {
    clearBtn.style.display = searchInput.value ? 'block' : 'none';
    const term = searchInput.value.trim().toLowerCase();
    if (!term) return renderTable(allDepts);
    const filtered = allDepts.filter(d =>
      d.nombre.toLowerCase().includes(term) ||
      String(d.id).padStart(4,'0').includes(term)
    );
    currentFiltered = filtered;
    renderTable(filtered);
  });
  clearBtn.addEventListener('click', () => {
    searchInput.value = '';
    clearBtn.style.display = 'none';
    currentFiltered = null;
    renderTable(allDepts);
    searchInput.focus();
  });

  // — 5) Delegación de Edit / Delete —
  tbody.addEventListener('click', e => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const id = Number(btn.dataset.id);
    if (btn.classList.contains('edit-btn')) {
      showEditDeptModal(id);
    } else if (btn.classList.contains('del-btn')) {
      showDeleteDeptModal(id);
    }
  });

  
    // — 6) “Añadir departamento” —
    const cancelAdd     = document.getElementById('cancelAdd'); // <–– nuevo

    function showAddDeptModal() {
    addForm.reset();
    const maxId = allDepts.reduce((m,d) => Math.max(m,d.id), 0);
    inputAddId.value = String(maxId+1).padStart(4,'0');
    addOverlay.style.display = 'block';
    addModal.style.display   = 'flex';
    }
    function hideAddDeptModal() {
    addOverlay.style.display = 'none';
    addModal.style.display   = 'none';
    }

    btnAddDept.addEventListener('click', e => { e.preventDefault(); showAddDeptModal(); });
    closeAddModal.addEventListener('click', hideAddDeptModal);
    cancelAdd.addEventListener('click', hideAddDeptModal);  // <–– ahora funciona
    addOverlay.addEventListener('click', hideAddDeptModal);

    // submit listener (gestiona los dos botones)
    addForm.addEventListener('submit', e => {
    e.preventDefault();
    const btnId = e.submitter.id;      // 'submitAdd' o 'submitAddContinue'
    const id     = Number(inputAddId.value);
    const nombre = inputAddNombre.value.trim();
    const color  = inputAddColor.value;
    if (!nombre || !color) return;     // validación mínima

    // 1) Añade y guarda
    allDepts.push({ id, nombre, color });
    fs.writeFileSync(DEPTS_FILE, JSON.stringify(allDepts, null, 2), 'utf-8');

    // 2) Recarga conteos y tabla
    loadAndRender();

    if (btnId === 'submitAddContinue') {
        // — Añadir y seguir: resetea para un nuevo alta —
        addForm.reset();
        const nextId = allDepts.reduce((m,d) => Math.max(m,d.id), 0) + 1;
        inputAddId.value     = String(nextId).padStart(4,'0');
        inputAddNombre.focus();
        // (inputAddColor se queda con su valor por defecto de color)
    } else {
        // — Añadir: cierra el modal —
        hideAddDeptModal();
    }
    });

  // — 7) “Importar departamento” (stub) —
  btnImportDept.addEventListener('click', e => {
    e.preventDefault();
    showImportDeptModal();
  });
  function showImportDeptModal() {
    // … tu código …
  }

// — 8) “Editar departamento” —

// Refs del modal de edición
const editOverlay    = document.getElementById('edit-overlay');
const editModal      = document.getElementById('edit-modal');
const closeEditModal = document.getElementById('closeEditModal');
const cancelEdit     = document.getElementById('cancelEdit');
const editForm       = document.getElementById('editDepForm');

const inputEditId    = document.getElementById('editDepId');
const inputEditNombre= document.getElementById('editDepNombre');
const inputEditColor = document.getElementById('editDepColor');

// Abre el modal y rellena los campos
function showEditDeptModal(id) {
  const dep = allDepts.find(d => d.id === id);
  if (!dep) return;

  inputEditId.value     = String(dep.id).padStart(4, '0');
  inputEditNombre.value = dep.nombre;
  inputEditColor.value  = dep.color;

  editOverlay.style.display = 'block';
  editModal.style.display   = 'flex';
}

// Oculta el modal
function hideEditDeptModal() {
  editOverlay.style.display = 'none';
  editModal.style.display   = 'none';
}

// Listeners para abrir/cerrar
tbody.addEventListener('click', e => {
  const btn = e.target.closest('button');
  if (!btn) return;
  const id = Number(btn.dataset.id);
  if (btn.classList.contains('edit-btn')) {
    showEditDeptModal(id);
  }
});

closeEditModal.addEventListener('click', hideEditDeptModal);
cancelEdit    .addEventListener('click', hideEditDeptModal);
editOverlay   .addEventListener('click', hideEditDeptModal);

// Guardar cambios
editForm.addEventListener('submit', e => {
  e.preventDefault();
  const id     = Number(inputEditId.value);
  const nombre = inputEditNombre.value.trim();
  const color  = inputEditColor.value;
  if (!nombre || !color) return;  // validación mínima

  // Actualiza en memoria
  const dep = allDepts.find(d => d.id === id);
  dep.nombre = nombre;
  dep.color  = color;

  // Escribe en disco
  fs.writeFileSync(DEPTS_FILE, JSON.stringify(allDepts, null, 2), 'utf-8');

  // Recarga conteos y tabla
  loadAndRender();

  // Cierra modal
  hideEditDeptModal();
});




  
// — 9) “Borrar departamento” —

// Refs al modal de borrado
const deleteOverlay    = document.getElementById('delete-overlay');
const deleteModal      = document.getElementById('delete-modal');
const closeDeleteModal = document.getElementById('closeDeleteModal');
const cancelDelete     = document.getElementById('cancelDelete');
const confirmDelete    = document.getElementById('confirmDelete');

// Variable temporal para guardar el id a borrar
let deptIdToDelete = null;

// Función para abrir el modal de borrado
function showDeleteDeptModal(id) {
  deptIdToDelete = id;
  deleteOverlay.style.display = 'block';
  deleteModal.style.display   = 'flex';
}

// Función para cerrar el modal de borrado
function hideDeleteDeptModal() {
  deleteOverlay.style.display = 'none';
  deleteModal.style.display   = 'none';
  deptIdToDelete = null;
}

// Delegación: al pulsar el botón “Borrar” en la tabla
tbody.addEventListener('click', e => {
  const btn = e.target.closest('button');
  if (!btn) return;
  const id = Number(btn.dataset.id);
  if (btn.classList.contains('del-btn')) {
    showDeleteDeptModal(id);
  }
});

// Listeners para cerrar sin borrar
closeDeleteModal.addEventListener('click', hideDeleteDeptModal);
cancelDelete    .addEventListener('click', hideDeleteDeptModal);
deleteOverlay   .addEventListener('click', hideDeleteDeptModal);

// Confirmar borrado
confirmDelete.addEventListener('click', () => {
  if (deptIdToDelete === null) return;

  // 1) Filtra el array
  allDepts = allDepts.filter(d => d.id !== deptIdToDelete);

  // 2) Guarda en disco
  fs.writeFileSync(DEPTS_FILE,
    JSON.stringify(allDepts, null, 2),
    'utf-8'
  );

  // 3) Recarga conteos y tabla
  loadAndRender();

  // 4) Cierra el modal
  hideDeleteDeptModal();
});

  // — Inicializa por primera vez —
  loadAndRender();


document.querySelectorAll('.thead-button').forEach(btn => {
  btn.addEventListener('click', () => {
    const col = btn.dataset.col;
    if (currentSort.column === col) {
      currentSort.order = currentSort.order === 'asc' ? 'desc' : 'asc';
    } else {
      currentSort.column = col;
      currentSort.order  = 'asc';
    }
    renderTable(currentFiltered || allDepts);
  });
});







  
});
