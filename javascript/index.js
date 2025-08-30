document.addEventListener('DOMContentLoaded', () => {
    const fs = require('fs');
    const path = require('path');
    const win = nw.Window.get();
    win.maximize();

    const appRoot = process.cwd();
    const cursosDir = path.join(appRoot, 'cursos');
    const table = document.querySelector('.courses-table');
    const tbody = table.querySelector('tbody');

    let courseFolders = [];

    // --- REFERENCIAS A MODALES Y ESTADO ---
    const addOverlay = document.getElementById('add-overlay');
    const addModal = document.getElementById('addCurso-modal');
    const btnCrear = document.getElementById('btnCrear');
    const btnCloseAddCurso = document.getElementById('closeAddCursoModal');
    const btnCancelAddCurso = document.getElementById('cancelAddCurso');
    const addCursoForm = document.getElementById('addCursoForm');

    const deleteOverlay = document.getElementById('delete-overlay');
    const deleteModal = document.getElementById('deleteCurso-modal');
    const btnCloseDeleteCurso = document.getElementById('closeDeleteCursoModal');
    const btnCancelDeleteCurso = document.getElementById('cancelDeleteCurso');
    const deleteCursoForm = document.getElementById('deleteCursoForm');

    let cursoParaBorrar = null;
    let deleteCountdownInterval = null;

    /**
     * Función que lee los directorios de cursos y los muestra en la tabla.
     */
    function renderCursos() {
        fs.readdir(cursosDir, { withFileTypes: true }, (err, entries) => {
            if (err) {
                if (err.code === 'ENOENT') {
                    try {
                        fs.mkdirSync(cursosDir);
                        console.log("Directorio 'cursos' creado.");
                    } catch (mkdirErr) {
                        console.error("No se pudo crear el directorio 'cursos':", mkdirErr);
                    }
                } else {
                    console.error('Error leyendo la carpeta de cursos:', err);
                }
                tbody.innerHTML = '';
                return;
            }

            const carpetas = entries.filter(e => e.isDirectory()).map(e => e.name);
            courseFolders = carpetas;
            tbody.innerHTML = '';

            carpetas.forEach(nombreCurso => {
                const cursoPath = path.join(cursosDir, nombreCurso);

                let profTexto;
                try {
                    const profs = JSON.parse(fs.readFileSync(path.join(cursoPath, 'profesores.json'), 'utf8'));
                    profTexto = `${profs.length} profesores`;
                } catch { profTexto = '(sin datos)'; }

                let uniTexto;
                try {
                    const unidades = JSON.parse(fs.readFileSync(path.join(cursoPath, 'unidades.json'), 'utf8'));
                    uniTexto = `${unidades.length} unidades`;
                } catch { uniTexto = '(sin datos)'; }

                let horTexto, horIcon;
                if (fs.existsSync(path.join(cursoPath, 'horarios.json'))) {
                    horTexto = 'Horarios generados';
                    horIcon = `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="m424-296 282-282-56-56-226 226-114-114-56 56 170 170Zm56 216q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z"/></svg>`;
                } else {
                    horTexto = 'Horarios no generados';
                    horIcon = `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="m336-280 144-144 144 144 56-56-144-144 144-144-56-56-144 144-144-144-56 56 144 144-144 144 56 56ZM480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z"/></svg>`;
                }

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>
                        <svg class="icon" xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor"><path d="M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h240l80 80h320q33 0 56.5 23.5T880-640v400q0 33-23.5 56.5T800-160H160Z"/></svg>
                        ${nombreCurso}
                    </td>
                    <td style="width:210px">
                        <svg class="icon" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M360-390q-21 0-35.5-14.5T310-440q0-21 14.5-35.5T360-490q21 0 35.5 14.5T410-440q0 21-14.5 35.5T360-390Zm240 0q-21 0-35.5-14.5T550-440q0-21 14.5-35.5T600-490q21 0 35.5 14.5T650-440q0 21-14.5 35.5T600-390ZM480-160q134 0 227-93t93-227q0-24-3-46.5T786-570q-21 5-42 7.5t-44 2.5q-91 0-172-39T390-708q-32 78-91.5 135.5T160-486v6q0 134 93 227t227 93Zm0 80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Z"/></svg>
                        ${profTexto}
                    </td>
                    <td style="width:210px">
                        <svg class="icon" xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor"><path d="M40-160v-112q0-34 17.5-62.5T104-378q62-31 126-46.5T360-440q66 0 130 15.5T616-378q29 15 46.5 43.5T680-272v112H40Zm720 0v-120q0-44-24.5-84.5T666-434q51 6 96 20.5t84 35.5q36 20 55 44.5t19 53.5v120H760ZM360-480q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47Zm400-160q0 66-47 113t-113 47q-11 0-28-2.5t-28-5.5q27-32 41.5-71t14.5-81q0-42-14.5-81T544-792q14-5 28-6.5t28-1.5q66 0 113 47t47 113Z"/></svg>
                        ${uniTexto}
                    </td>
                    <td style="width:210px">
                        ${horIcon}
                        ${horTexto}
                    </td>`;

                const tdAcc = document.createElement('td');
                tdAcc.style.cssText = 'width:120px; text-align:right; padding-right:1rem;';

                const btnBorrar = document.createElement('button');
                btnBorrar.className = 'actions-btn';
                btnBorrar.title = 'Borrar curso';
                btnBorrar.innerHTML = '<svg class="icon" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/></svg>';

                const btnAcceder = document.createElement('button');
                btnAcceder.className = 'actions-btn';
                btnAcceder.title = 'Acceder al curso';
                btnAcceder.innerHTML = '<svg class="icon" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M480-120v-80h280v-560H480v-80h280q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H480Zm-80-160-55-58 102-102H120v-80h327L345-622l55-58 200 200-200 200Z"/></svg>';

                btnBorrar.addEventListener('click', () => {
                    cursoParaBorrar = nombreCurso;
                    showDeleteModal();
                });

                btnAcceder.addEventListener('click', () => {
                    const cursoPath = path.join(cursosDir, nombreCurso);
                    const requiredFiles = [ 'profesores.json', 'unidades.json', 'materias.json', 'aulas.json', 'tramos01.json', 'departamentos.json', 'curso.json', 'niveles.json' ];
                    requiredFiles.forEach(fileName => {
                        const filePath = path.join(cursoPath, fileName);
                        if (!fs.existsSync(filePath)) {
                            try {
                                let contenidoInicial;
                                if (fileName === 'curso.json') {
                                    contenidoInicial = '{}';
                                } else if (fileName === 'tramos01.json') {
                                    contenidoInicial = JSON.stringify(tramosDefaultContent, null, 2);
                                } else {
                                    contenidoInicial = '[]';
                                }
                                fs.writeFileSync(filePath, contenidoInicial, 'utf8');
                            } catch (e) { console.error(`No pude crear ${fileName}:`, e); }
                        }
                    });
                    window.location.href = `basedatos_curso.html?curso=${encodeURIComponent(nombreCurso)}`;
                });

                tdAcc.appendChild(btnBorrar);
                tdAcc.appendChild(btnAcceder);
                tr.appendChild(tdAcc);
                tbody.appendChild(tr);
            });
        });
    }

    renderCursos();

    // --- LÓGICA DEL MODAL DE ELIMINACIÓN ---
    function showDeleteModal() {
        deleteOverlay.style.display = 'block';
        deleteModal.style.display = 'flex';

        const submitBtn = document.getElementById('submitDeleteCurso');
        submitBtn.disabled = true;
        let countdown = 5;
        submitBtn.textContent = `Eliminar (${countdown})`;

        clearInterval(deleteCountdownInterval);

        deleteCountdownInterval = setInterval(() => {
            countdown--;
            if (countdown > 0) {
                submitBtn.textContent = `Eliminar (${countdown})`;
            } else {
                clearInterval(deleteCountdownInterval);
                deleteCountdownInterval = null;
                submitBtn.disabled = false;
                submitBtn.textContent = 'Eliminar';
            }
        }, 1000);
    }

    function hideDeleteModal() {
        if (deleteCountdownInterval) {
            clearInterval(deleteCountdownInterval);
            deleteCountdownInterval = null;
        }
        deleteOverlay.style.display = 'none';
        deleteModal.style.display = 'none';
        cursoParaBorrar = null;
        const submitBtn = document.getElementById('submitDeleteCurso');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Eliminar';
    }

    deleteCursoForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (cursoParaBorrar) {
            const cursoPath = path.join(cursosDir, cursoParaBorrar);
            try {
                fs.rmSync(cursoPath, { recursive: true, force: true });
                renderCursos();
            } catch (err) {
                console.error(`Error al eliminar:`, err);
            }
        }
        hideDeleteModal();
    });

    btnCloseDeleteCurso.addEventListener('click', hideDeleteModal);
    btnCancelDeleteCurso.addEventListener('click', hideDeleteModal);
    deleteOverlay.addEventListener('click', hideDeleteModal);

    // --- LÓGICA DEL MODAL DE AÑADIR CURSO ---
    function showAddCursoModal(e) {
        e.preventDefault();
        addCursoForm.reset();
        folderValid = false;
        datesValid = false;
        updateFolderValidationDisplay();
        updateDatesValidationDisplay();
        updateSubmitState();
        addOverlay.style.display = 'block';
        addModal.style.display = 'flex';
    }

    function hideAddCursoModal() {
        addOverlay.style.display = 'none';
        addModal.style.display = 'none';
    }

    btnCrear.addEventListener('click', showAddCursoModal);
    btnCloseAddCurso.addEventListener('click', hideAddCursoModal);
    btnCancelAddCurso.addEventListener('click', hideAddCursoModal);
    addOverlay.addEventListener('click', hideAddCursoModal);

    const carpetaInput = document.getElementById('addCursoCarpeta');
    const denominacionInput = document.getElementById('addCursoDenominacion');
    const centroInput = document.getElementById('addCursoCentro');
    const inicioInput = document.getElementById('addCursoInicio');
    const finInput = document.getElementById('addCursoFin');
    const submitBtn = document.getElementById('submitAddCurso');
    const folderStatusContainer = document.querySelector('.folder-status');
    const folderIconText = folderStatusContainer.querySelector('.icon-text');
    const folderTooltip = folderStatusContainer.querySelector('.tooltip-text');
    const dateStatusContainer = document.querySelector('.date-status');
    const dateIconText = dateStatusContainer.querySelector('.icon-text');
    const dateTooltip = dateStatusContainer.querySelector('.tooltip-text');
    submitBtn.disabled = true;
    let folderValid = false;
    let datesValid = false;

    const tramosDefaultContent = {
        perfil: {
            nombre: "Perfil 1",
            hora_inicio: "08:00",
            inicios_diferentes: false,
            sincronizar_dias: true,
            inicios_diferentes_retrasos: [0, 0, 0, 0, 0, 0, 0]
        },
        tramos: []
    };

    function updateSubmitState() {
        submitBtn.disabled = !(folderValid && datesValid);
    }

    function getFolderErrorMessage(val) {
        if (!val) return 'La denominación de la carpeta es obligatoria.';
        if (courseFolders.some(name => name.toLowerCase() === val.toLowerCase())) {
            return 'Ya existe un curso con esa carpeta.';
        }
        if (/[<>:"/\\|?*]/.test(val)) {
            return 'La carpeta no puede contener caracteres: < > : " / \\ | ? *';
        }
        if (/[. ]$/.test(val)) {
            return 'La carpeta no puede terminar en espacio o punto.';
        }
        return '';
    }

    function getDateErrorMessage() {
        const start = inicioInput.value;
        const end = finInput.value;
        if (!start || !end) {
            return 'Ambas fechas (inicio y fin) son obligatorias.';
        }
        if (end <= start) {
            return 'La fecha de fin debe ser posterior a la de inicio.';
        }
        return '';
    }

    function updateFolderValidationDisplay() {
        const val = carpetaInput.value.trim();
        const errorMessage = getFolderErrorMessage(val);
        if (val === '') {
            folderIconText.textContent = '';
            folderTooltip.innerHTML = '';
            folderStatusContainer.style.display = 'none';
            folderValid = false;
        } else if (errorMessage) {
            folderIconText.textContent = '❌';
            folderTooltip.innerHTML = `<div>${errorMessage}</div>`;
            folderStatusContainer.style.display = 'inline-block';
            folderValid = false;
        } else {
            folderIconText.textContent = '✔️';
            folderTooltip.innerHTML = '<div>Nombre de carpeta válido.</div>';
            folderStatusContainer.style.display = 'inline-block';
            folderValid = true;
        }
        updateSubmitState();
    }

    function updateDatesValidationDisplay() {
        const start = inicioInput.value;
        const end = finInput.value;
        const errorMessage = getDateErrorMessage();
        if (start === '' || end === '') {
            dateIconText.textContent = '';
            dateTooltip.innerHTML = '';
            dateStatusContainer.style.display = 'none';
            datesValid = false;
        } else if (errorMessage) {
            dateIconText.textContent = '❌';
            dateTooltip.innerHTML = `<div>${errorMessage}</div>`;
            dateStatusContainer.style.display = 'inline-block';
            datesValid = false;
        } else {
            dateIconText.textContent = '✔️';
            dateTooltip.innerHTML = '<div>Fechas válidas.</div>';
            dateStatusContainer.style.display = 'inline-block';
            datesValid = true;
        }
        updateSubmitState();
    }

    carpetaInput.addEventListener('input', updateFolderValidationDisplay);
    inicioInput.addEventListener('change', updateDatesValidationDisplay);
    finInput.addEventListener('change', updateDatesValidationDisplay);
    updateFolderValidationDisplay();
    updateDatesValidationDisplay();

    addCursoForm.addEventListener('submit', e => {
        e.preventDefault();
        updateFolderValidationDisplay();
        updateDatesValidationDisplay();
        if (!folderValid || !datesValid) {
            console.error('El formulario no es válido.');
            return;
        }
        const carpeta = carpetaInput.value.trim();
        const denominacion = denominacionInput.value.trim();
        const centro = centroInput.value.trim();
        const inicio = inicioInput.value;
        const fin = finInput.value;
        const cursoPath = path.join(cursosDir, carpeta);
        if (!fs.existsSync(cursoPath)) {
            fs.mkdirSync(cursoPath);
        }
        const cursoJson = {
            datos: {
                archivado: false, denominacion, carpeta,
                centro_educativo: centro
            },
            fechas: {
                curso_inicio: inicio, curso_fin: fin,
                periodos_vacacionales: [], dias_festivos: []
            }
        };
        fs.writeFileSync(path.join(cursoPath, 'curso.json'), JSON.stringify(cursoJson, null, 2), 'utf-8');
        const otros = [ 'profesores.json', 'unidades.json', 'materias.json', 'aulas.json', 'tramos01.json', 'departamentos.json', 'niveleseducativos.json' ];
        otros.forEach(fname => {
            const p = path.join(cursoPath, fname);
            if (!fs.existsSync(p)) {
                let content;
                if (fname === 'tramos01.json') {
                    content = JSON.stringify(tramosDefaultContent, null, 2);
                } else {
                    content = '[]';
                }
                fs.writeFileSync(p, content, 'utf-8');
            }
        });
        window.location.href = `basedatos_curso.html?curso=${encodeURIComponent(carpeta)}`;
    });
});