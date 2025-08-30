// niveleseducativos.js
document.addEventListener('DOMContentLoaded', () => {
  const fs   = require('fs');
  const path = require('path');
  const params = new URLSearchParams(window.location.search);
  const curso  = params.get('curso') || 'desconocido';

  // Ruta al JSON de niveles educativos
  const filePath = path.join(process.cwd(), 'cursos', curso, 'niveleseducativos.json');
  let niveles;
  try {
    niveles = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (err) {
    console.error('Error leyendo niveleseducativos.json', err);
    return;
  }

  // Referencias al DOM
  const container        = document.getElementById('niveles-container');
  const totalSpan        = document.getElementById('totalDept');
  const mostradosSpan    = document.getElementById('mostradosDept');
  const searchInput      = document.getElementById('searchNivel');
  const clearBtn         = document.getElementById('clearSearchNivel');

  // 1) Sacamos el orden original de categorías según aparición en el array (que ya viene ordenado por id)
  const categoriasOrden = [];
  niveles.forEach(n => {
    if (!categoriasOrden.includes(n.categoria)) {
      categoriasOrden.push(n.categoria);
    }
  });

  // 2) Función que renderiza un listado (filtrado) de niveles agrupado por categoría
  function renderList(list) {
    // limpia
    container.innerHTML = '';

    // agrupa
    const grupos = {};
    list.forEach(n => {
      if (!grupos[n.categoria]) grupos[n.categoria] = [];
      grupos[n.categoria].push(n);
    });

    // para cada categoría en el orden original
    categoriasOrden.forEach(categoria => {
      const items = grupos[categoria];
      if (!items || !items.length) return;

      // crea <details>
      const det = document.createElement('details');
      det.open = true;

      const sum = document.createElement('summary');
      sum.textContent = categoria;
      det.appendChild(sum);

      // construye la tabla
      const table = document.createElement('table');
      table.classList.add('data-table');
      table.style.margin = '1rem 0';
      table.innerHTML = `
        <colgroup>
          <col style="width: 60px;">
          <col style="width: 400px;">
          <col>
        </colgroup>
        <thead>
          <tr>
            <th>ID</th>
            <th style="text-align:left; padding-left:1rem">Nombre</th>
            <th></th>
          </tr>
        </thead>
        <tbody></tbody>
      `;
      const tbody = table.querySelector('tbody');

      // filas, ordenadas por id
      items
        .sort((a, b) => a.id - b.id)
        .forEach(nivel => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td><span style="font-size:0.8rem;color:#666">${String(nivel.id).padStart(4, '0')}</span></td>
            <td>
              <label>
                <input
                  type="checkbox"
                  id="inpNivelEducativo${String(nivel.id).padStart(2, '0')}"
                  ${nivel.activo ? 'checked' : ''}
                >
                ${nivel.nombre}
              </label>
            </td>
        <td style="text-align:right">
            <button class="btn-acciones edit-btn" data-id="${nivel.id}" title="Editar">
                <svg style="vertical-align:middle" xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor"><path d="M200-200h57l391-391-57-57-391 391v57Zm-80 80v-170l528-527q12-11 26.5-17t30.5-6q16 0 31 6t26 18l55 56q12 11 17.5 26t5.5 30q0 16-5.5 30.5T817-647L290-120H120Zm640-584-56-56 56 56Zm-141 85-28-29 57 57-29-28Z"/></svg>
                <span>Editar</span>
            </button>
            <button class="btn-acciones del-btn" data-id="${nivel.id}" title="Borrar">
                <svg style="vertical-align:middle" xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor"><path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/></svg>
                <span>Borrar</span>
            </button>
          </td>
          `;

            // → aquí engancha el listener:
            const chk = tr.querySelector('input[type="checkbox"]');
            chk.addEventListener('change', () => {
            nivel.activo = chk.checked;
            try {
                fs.writeFileSync(
                filePath,
                JSON.stringify(niveles, null, 2),
                'utf-8'
                );
            } catch (err) {
                console.error('Error guardando niveleseducativos.json:', err);
                alert('No se pudo actualizar el estado en disco.');
            }
            });


            const editBtn = tr.querySelector('.edit-btn');
            editBtn.addEventListener('click', () => {
                // 1) guardamos el id
                currentEditId = nivel.id;
                // 2) rellenamos el formulario
                inputEditId.value        = String(nivel.id).padStart(4, '0');
                inputEditNombre.value    = nivel.nombre;
                inputEditActivo.checked  = nivel.activo;
                inputEditCategoria.value = nivel.categoria;
                // 3) mostramos modal
                editOverlay.style.display = 'block';
                editModal.style.display   = 'flex';
            });

            const delBtn = tr.querySelector('.del-btn');
            delBtn.addEventListener('click', () => {
                currentDeleteId = nivel.id;
                // Rellenamos los spans
                spanDelId.textContent   = String(nivel.id).padStart(4, '0');
                spanDelName.textContent = nivel.nombre;
                // Mostramos modal
                deleteOverlay.style.display = 'block';
                deleteModal.style.display   = 'flex';
            });


          tbody.appendChild(tr);
        });

      det.appendChild(table);
      container.appendChild(det);
    });

    // actualiza contadores
    totalSpan.textContent     = niveles.length;
    mostradosSpan.textContent = list.length;
  }

  // 3) Render inicial con TODO el listado
  renderList(niveles);

  // 4) Lógica de búsqueda
  clearBtn.style.display = 'none';
  searchInput.addEventListener('input', () => {
    const term = searchInput.value.trim().toLowerCase();
    clearBtn.style.display = term ? 'block' : 'none';
    const filtrado = niveles.filter(n =>
      n.nombre.toLowerCase().includes(term)
    );
    renderList(filtrado);
  });

  clearBtn.addEventListener('click', () => {
    searchInput.value = '';
    clearBtn.style.display = 'none';
    renderList(niveles);
    searchInput.focus();
  });


  // —————————————————————————————————————————————
  // 5) LÓGICA DE “AÑADIR”
  // —————————————————————————————————————————————

  // Refs al modal de Añadir
  const btnAgregarNivel    = document.getElementById('btnAgregarNivel');
  const addOverlay         = document.getElementById('add-overlay');
  const addModal           = document.getElementById('add-modal');
  const btnCloseAdd        = document.getElementById('closeAddModal');
  const btnCancelAdd       = document.getElementById('cancelAdd');
  const addForm            = document.getElementById('addNivelForm');

  // Inputs del modal
  const inputAddId         = document.getElementById('addNivelId');
  const inputAddNombre     = document.getElementById('addNivelNombre');
  const inputAddActivo     = document.getElementById('addNivelActivo');
  const inputAddCategoria  = document.getElementById('addNivelCategoria');

  // Función para calcular el siguiente ID
  function getNextId() {
    return niveles.reduce((max, n) => Math.max(max, n.id), 0) + 1;
  }

  // Mostrar modal y preparar formulario
  function showAddModal() {
    // Prepara nuevos valores
    const next = getNextId();
    inputAddId.value        = String(next).padStart(4, '0');
    inputAddNombre.value    = '';
    inputAddActivo.checked  = true;
    inputAddCategoria.value = '';

    addOverlay.style.display = 'block';
    addModal.style.display   = 'flex';
  }

  function hideAddModal() {
    addOverlay.style.display = 'none';
    addModal.style.display   = 'none';
  }

  // Listeners para abrir/cerrar
  btnAgregarNivel.addEventListener('click', e => {
    e.preventDefault();
    showAddModal();
  });
  btnCloseAdd .addEventListener('click', hideAddModal);
  btnCancelAdd.addEventListener('click', hideAddModal);
  addOverlay .addEventListener('click', hideAddModal);

  // Handler del formulario
  addForm.addEventListener('submit', e => {
    e.preventDefault();
    const rawId       = Number(inputAddId.value);
    const nombre      = inputAddNombre.value.trim();
    const activo      = inputAddActivo.checked;
    const categoria   = inputAddCategoria.value.trim();
    if (!nombre || !categoria) return; // validación mínima

    // 1) Crear objeto y añadir a array
    const nuevo = { id: rawId, nombre, activo, categoria };
    niveles.push(nuevo);

    // 2) Si es categoría nueva, añadimos al orden original
    if (!categoriasOrden.includes(categoria)) {
      categoriasOrden.push(categoria);
    }

    // 3) Guardar JSON en disco
    fs.writeFileSync(filePath, JSON.stringify(niveles, null, 2), 'utf-8');

    // 4) Volver a renderizar TODO
    renderList(niveles);

    // 5) ¿Seguir añadiendo?
    if (e.submitter.id === 'submitAddContinue') {
      // preparamos siguiente ID, limpiamos campos
      const next = getNextId();
      inputAddId.value        = String(next).padStart(4, '0');
      inputAddNombre.value    = '';
      inputAddActivo.checked  = true;
      inputAddCategoria.value = '';
      inputAddNombre.focus();
    } else {
      hideAddModal();
    }
  });


// —————————————————————————————————————————————
// 6) LÓGICA DE “EDITAR”
// —————————————————————————————————————————————

// Referencias al modal de Editar
const btnCloseEdit       = document.getElementById('closeEditModal');
const btnCancelEdit      = document.getElementById('cancelEdit');
const editOverlay        = document.getElementById('edit-overlay');
const editModal          = document.getElementById('edit-modal');
const editForm           = document.getElementById('editNivelForm');

const inputEditId        = document.getElementById('editNivelId');
const inputEditNombre    = document.getElementById('editNivelNombre');
const inputEditActivo    = document.getElementById('editNivelActivo');
const inputEditCategoria = document.getElementById('editNivelCategoria');

// Para saber qué nivel estamos editando
let currentEditId = null;

// Función para ocultar el modal
function hideEditModal() {
  editOverlay.style.display = 'none';
  editModal.style.display   = 'none';
}

// Atacha los listeners de cierre
btnCloseEdit.addEventListener('click', hideEditModal);
btnCancelEdit.addEventListener('click', hideEditModal);
editOverlay.addEventListener('click', hideEditModal);


// Finalmente, el handler de submit del formulario de editar:
editForm.addEventListener('submit', e => {
  e.preventDefault();
  if (currentEditId === null) return;

  // 1) Leemos valores
  const nombre    = inputEditNombre.value.trim();
  const activo    = inputEditActivo.checked;
  const categoria = inputEditCategoria.value.trim();
  if (!nombre || !categoria) return;

  // 2) Actualizamos el array
  const nivel = niveles.find(n => n.id === currentEditId);
  nivel.nombre    = nombre;
  nivel.activo    = activo;
  nivel.categoria = categoria;

  // 3) Si cambió categoría y es nueva, la añadimos al orden
  if (!categoriasOrden.includes(categoria)) {
    categoriasOrden.push(categoria);
  }

  // 4) Guardamos en disco
  try {
    fs.writeFileSync(filePath, JSON.stringify(niveles, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error guardando niveleseducativos.json:', err);
    alert('No se pudo guardar el nivel educativo en disco.');
  }

  // 5) Volvemos a pintar y cerramos
  renderList(niveles);
  hideEditModal();
});


// —————————————————————————————————————————————
// 7) LÓGICA DE “BORRAR”
// —————————————————————————————————————————————

// Refs al modal de Borrar
const btnCloseDelete   = document.getElementById('closeDeleteModal');
const btnCancelDelete  = document.getElementById('cancelDelete');
const deleteOverlay    = document.getElementById('delete-overlay');
const deleteModal      = document.getElementById('delete-modal');
const confirmDeleteBtn = document.getElementById('confirmDelete');

// Spans donde mostramos los datos a borrar
const spanDelId        = document.getElementById('delNivelId');
const spanDelName      = document.getElementById('delNivelName');

// Para recordar qué id vamos a borrar
let currentDeleteId = null;

// Función para ocultar el modal de borrar
function hideDeleteModal() {
  deleteOverlay.style.display = 'none';
  deleteModal.style.display   = 'none';
  currentDeleteId = null;
}

// Atamos listeners de cierre
btnCloseDelete.addEventListener('click', hideDeleteModal);
btnCancelDelete.addEventListener('click', hideDeleteModal);
deleteOverlay.addEventListener('click', hideDeleteModal);


// Finalmente, atamos el handler del botón “Eliminar” del modal:
confirmDeleteBtn.addEventListener('click', () => {
  if (currentDeleteId === null) return;

  // 1) Filtramos el array
  niveles = niveles.filter(n => n.id !== currentDeleteId);

  // 2) Guardamos en disco
  try {
    fs.writeFileSync(filePath, JSON.stringify(niveles, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error guardando niveleseducativos.json tras borrar:', err);
    alert('No se pudo eliminar el nivel educativo en disco.');
    return;
  }

  // 3) Volvemos a renderizar y cerramos modal
  renderList(niveles);
  hideDeleteModal();
});



});
