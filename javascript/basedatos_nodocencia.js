document.addEventListener('DOMContentLoaded', () => {

    // Para almacenar el filtrado activo
    let currentFiltered = null;

    const fs = require('fs');
    const path = require('path');

    // Determinar curso y rutas
    const params = new URLSearchParams(window.location.search);
    const curso = params.get('curso') || 'desconocido';
    const baseDir = path.join(process.cwd(), 'cursos', curso);
    const NODOCENCIA_FILE = path.join(baseDir, 'nodocencia.json');

    // Referencias al DOM
    const container = document.querySelector('.data-table-container');
    const totalSpan = document.getElementById('total');
    const mostradosSpan = document.getElementById('mostrados');
    const searchInput = document.getElementById('searchNoDocencia');
    const clearBtn = document.getElementById('clearSearch');

    let allActividades = [];

    // 1) Carga de datos
    try {
        allActividades = JSON.parse(fs.readFileSync(NODOCENCIA_FILE, 'utf-8'));
    } catch (err) {
        console.error('Error cargando actividades de no docencia:', err);
        alert('No se pudieron cargar los datos de actividades de no docencia.');
        return;
    }

    // 2) Renderizado por categorías
    function renderTable(list) {
        container.innerHTML = '';

        if (list.length === 0) {
            container.innerHTML = `
                <p style="text-align:center; font-style:italic; color:#666; padding:1rem 0;">
                    No se encontraron actividades de no docencia
                </p>`;
        } else {
            const grupos = list.reduce((acc, actividad) => {
                const categoria = actividad.categoria || '(sin categoría)';
                if (!acc[categoria]) {
                    acc[categoria] = [];
                }
                acc[categoria].push(actividad);
                return acc;
            }, {});

            Object.keys(grupos).sort().forEach(categoria => {
                const actividadesDelGrupo = grupos[categoria];
                const details = document.createElement('details');
                details.open = true;

                const summary = document.createElement('summary');
                summary.className = 'categoria-summary';
                summary.innerHTML = `${categoria} <span style="color:#666">[${actividadesDelGrupo.length}]</span>`;
                details.appendChild(summary);

                const table = document.createElement('table');
                table.className = 'data-table';
                table.style.margin = "1rem 0";
                table.innerHTML = `
                    <colgroup>
                        <col style="width:60px">
                        <col style="width:150px">
                        <col style="width:500px">
                        <col>
                    </colgroup>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Referencia</th>
                            <th>Nombre</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody></tbody>
                `;

                const tbody = table.querySelector('tbody');
                
                actividadesDelGrupo.forEach(actividad => {
                    const idStr = String(actividad.id).padStart(4, '0');
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td style="text-align:center">
                            <span style="font-size:0.8rem; color:#666">${idStr}</span>
                        </td>
                        <td style="text-align:center">${actividad.referencia}</td>
                        <td style="text-align:center">${actividad.nombre}</td>
                        <td style="text-align:right">
                            <button class="btn-acciones edit-btn" data-id="${actividad.id}" title="Editar">
                                <svg style="vertical-align:middle" xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor"><path d="M200-200h57l391-391-57-57-391 391v57Zm-80 80v-170l528-527q12-11 26.5-17t30.5-6q16 0 31 6t26 18l55 56q12 11 17.5 26t5.5 30q0 16-5.5 30.5T817-647L290-120H120Zm640-584-56-56 56 56Zm-141 85-28-29 57 57-29-28Z"/></svg>
                                <span>Editar</span>
                            </button>
                            <button class="btn-acciones del-btn" data-id="${actividad.id}" title="Borrar">
                                <svg style="vertical-align:middle" xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor"><path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/></svg>
                                <span>Borrar</span>
                            </button>
                        </td>`;
                    tbody.appendChild(tr);
                });

                details.appendChild(table);
                container.appendChild(details);
            });
        }

        totalSpan.textContent = allActividades.length;
        mostradosSpan.textContent = list.length;
    }

    renderTable(allActividades);

    // 3) Búsqueda en tiempo real
    searchInput.addEventListener('input', () => {
        const term = searchInput.value.trim().toLowerCase();
        clearBtn.style.display = term ? 'block' : 'none';

        const filtered = allActividades.filter(actividad =>
            [actividad.referencia, actividad.nombre, actividad.categoria] // Incluimos categoría en la búsqueda
                .join(' ')
                .toLowerCase()
                .includes(term)
        );

        currentFiltered = filtered;
        renderTable(filtered);
    });

    clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        clearBtn.style.display = 'none';
        currentFiltered = null;
        renderTable(allActividades);
        searchInput.focus();
    });

    // 4) Delegación de clicks para acciones
    container.addEventListener('click', e => {
        const btn = e.target.closest('button');
        if (!btn) return;
        
        const id = Number(btn.dataset.id);
        if (btn.classList.contains('edit-btn')) {
            openEditModal(id);
        }
        if (btn.classList.contains('del-btn')) {
            openDeleteModal(id);
        }
    });

    // --- Lógica para Añadir Actividad ---
    const btnAdd = document.getElementById('btnAgregar');
    const addOverlay = document.getElementById('add-overlay');
    const addModal = document.getElementById('add-modal');
    const closeAddModalBtn = document.getElementById('closeAddModal');
    const cancelAddBtn = document.getElementById('cancelAdd');
    const addForm = document.getElementById('addNoDocenciaForm');
    const addIdInput = document.getElementById('addNoDocenciaId');
    const addRefInput = document.getElementById('addNoDocenciaRef');
    const addNameInput = document.getElementById('addNoDocenciaName');
    // CORREGIDO: Referencia al nuevo campo de categoría
    const addCategoryInput = document.getElementById('addNoDocenciaCategory');

    function showAddModal(e) {
        e.preventDefault();
        addForm.reset();
        const maxId = allActividades.reduce((m, a) => Math.max(m, a.id), 0);
        addIdInput.value = String(maxId + 1).padStart(4, '0');
        addOverlay.style.display = 'block';
        addModal.style.display = 'flex';
    }

    function hideAddModal() {
        addOverlay.style.display = addModal.style.display = 'none';
    }

    btnAdd.addEventListener('click', showAddModal);
    closeAddModalBtn.addEventListener('click', hideAddModal);
    cancelAddBtn.addEventListener('click', hideAddModal);
    addOverlay.addEventListener('click', hideAddModal);

    addForm.addEventListener('submit', e => {
        e.preventDefault();

        // CORREGIDO: Incluir el campo 'categoria'
        const nueva = {
            id: Number(addIdInput.value),
            referencia: addRefInput.value.trim(),
            nombre: addNameInput.value.trim(),
            categoria: addCategoryInput.value.trim()
        };

        allActividades.push(nueva);
        fs.writeFileSync(NODOCENCIA_FILE, JSON.stringify(allActividades, null, 2), 'utf-8');
        
        // Si hay un filtro activo, lo mantenemos. Si no, mostramos todo.
        const listToRender = currentFiltered || allActividades;
        renderTable(listToRender);

        if (e.submitter.id === 'submitAddContinue') {
            const nextId = allActividades.reduce((m, a) => Math.max(m, a.id), 0) + 1;
            addForm.reset();
            addIdInput.value = String(nextId).padStart(4, '0');
            addRefInput.focus();
        } else {
            hideAddModal();
        }
    });

    // --- Lógica para Editar Actividad ---
    const editOverlay = document.getElementById('edit-overlay');
    const editModal = document.getElementById('edit-modal');
    const closeEditModalBtn = document.getElementById('closeEditModal');
    const cancelEditBtn = document.getElementById('cancelEdit');
    const editForm = document.getElementById('editNoDocenciaForm');
    const editIdInput = document.getElementById('editNoDocenciaId');
    const editRefInput = document.getElementById('editNoDocenciaRef');
    const editNameInput = document.getElementById('editNoDocenciaName');
    // CORREGIDO: Referencia al nuevo campo de categoría
    const editCategoryInput = document.getElementById('editNoDocenciaCategory');

    function openEditModal(actividadId) {
        const actividad = allActividades.find(a => a.id === actividadId);
        if (!actividad) return;
        editForm.reset();
        editIdInput.value = String(actividad.id).padStart(4, '0');
        editRefInput.value = actividad.referencia;
        editNameInput.value = actividad.nombre;
        // CORREGIDO: Rellenar el campo de categoría
        editCategoryInput.value = actividad.categoria || '';
        editOverlay.style.display = 'block';
        editModal.style.display = 'flex';
    }

    function hideEditModal() {
        editOverlay.style.display = editModal.style.display = 'none';
    }

    closeEditModalBtn.addEventListener('click', hideEditModal);
    cancelEditBtn.addEventListener('click', hideEditModal);
    editOverlay.addEventListener('click', hideEditModal);

    editForm.addEventListener('submit', e => {
        e.preventDefault();
        const id = Number(editIdInput.value);
        const actividad = allActividades.find(a => a.id === id);
        actividad.referencia = editRefInput.value.trim();
        actividad.nombre = editNameInput.value.trim();
        // CORREGIDO: Guardar el nuevo valor de categoría
        actividad.categoria = editCategoryInput.value.trim();

        fs.writeFileSync(NODOCENCIA_FILE, JSON.stringify(allActividades, null, 2), 'utf-8');
        
        const listToRender = currentFiltered || allActividades;
        renderTable(listToRender);
        hideEditModal();
    });

    // --- Lógica para Borrar Actividad ---
    const deleteOverlay = document.getElementById('delete-overlay');
    const deleteModal = document.getElementById('delete-modal');
    const closeDeleteBtn = document.getElementById('closeDeleteModal');
    const cancelDeleteBtn = document.getElementById('cancelDelete');
    const confirmDeleteBtn = document.getElementById('confirmDelete');
    const delIdSpan = document.getElementById('delNoDocenciaId');
    const delTextoSpan = document.getElementById('delNoDocenciaTexto');

    function openDeleteModal(actividadId) {
        const actividad = allActividades.find(a => a.id === actividadId);
        if (!actividad) return;
        delIdSpan.textContent = String(actividad.id).padStart(4, '0');
        delTextoSpan.textContent = `${actividad.referencia} | ${actividad.nombre}`;
        deleteOverlay.style.display = 'block';
        deleteModal.style.display = 'flex';
    }

    function hideDeleteModal() {
        deleteOverlay.style.display = deleteModal.style.display = 'none';
    }

    closeDeleteBtn.addEventListener('click', hideDeleteModal);
    cancelDeleteBtn.addEventListener('click', hideDeleteModal);
    deleteOverlay.addEventListener('click', hideDeleteModal);

    confirmDeleteBtn.addEventListener('click', () => {
        const id = Number(delIdSpan.textContent);
        const idx = allActividades.findIndex(a => a.id === id);
        if (idx !== -1) {
            allActividades.splice(idx, 1);
            fs.writeFileSync(NODOCENCIA_FILE, JSON.stringify(allActividades, null, 2), 'utf-8');
            
            // Actualizar la vista con el filtro actual si existe
            if (currentFiltered) {
                const currentIdx = currentFiltered.findIndex(a => a.id === id);
                if (currentIdx !== -1) currentFiltered.splice(currentIdx, 1);
            }
            const listToRender = currentFiltered || allActividades;
            renderTable(listToRender);
        }
        hideDeleteModal();
    });
});