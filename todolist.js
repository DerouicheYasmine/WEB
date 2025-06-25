// DOM Elements
const taskModal = document.getElementById('task-modal');
const taskForm = document.getElementById('task-form');
const taskTitleInput = document.getElementById('task-title');
const taskDescriptionInput = document.getElementById('task-description');
const taskCategorySelect = document.getElementById('task-category');
const taskPrioritySelect = document.getElementById('task-priority');
const taskProgressInput = document.getElementById('task-progress');
const taskDueDateSelect = document.getElementById('task-due-date');
const saveTaskBtn = document.getElementById('save-task-btn');
const cancelTaskBtn = document.getElementById('cancel-task-btn');
const closeModalBtn = document.querySelector('.close-modal');
const addCardBtns = document.querySelectorAll('.add-card-btn');
const assigneeOptions = document.querySelectorAll('.assignee-option');
const exportBtn = document.getElementById('export-btn');
const exportPdfBtn = document.getElementById('export-pdf-btn');

// Column DOM Elements
const todoColumn = document.getElementById('todo-column');
const inWorkColumn = document.getElementById('in-work-column');
const inProgressColumn = document.getElementById('in-progress-column');
const completedColumn = document.getElementById('completed-column');
const columnTaskCounts = document.querySelectorAll('.task-count');

// App State
let tasks = {
    todo: [],
    'in-work': [],
    'in-progress': [],
    completed: []
};
let currentEditingTask = null;
let selectedAssignees = [];
let targetColumn = null;

// Sample data for initial project board (used if API is unavailable or no tasks exist)
const sampleTasks = {
    todo: [
        {
            id: '1',
            title: 'High priority mobile app design health',
            description: 'High priority work will be done on health',
            category: 'design',
            priority: 'high',
            progress: 2,
            dueDate: 'nov',
            assignees: [1, 2],
            createdAt: new Date().toISOString()
        },
        // ... autres tâches de la section todo ...
    ],
    'in-work': [
        // ... tâches in-work ...
    ],
    'in-progress': [
        // ... tâches in-progress ...
    ],
    completed: [
        // ... tâches completed ...
    ]
};

// Charger les tâches depuis l'API
async function loadTasksFromAPI() {
    try {
        const response = await fetch('todolist.php');
        if (!response.ok) throw new Error('Erreur réseau');
        const allTasks = await response.json();
        
        // Réinitialiser les tâches
        tasks = {
            todo: [],
            'in-work': [],
            'in-progress': [],
            completed: []
        };

        allTasks.forEach(task => {
            const column = task.status;
            if (tasks[column]) {
                let assignees = [];
                try {
                    assignees = JSON.parse(task.assignees);
                } catch {
                    assignees = task.assignees ? task.assignees.split(',').map(Number) : [];
                }
                tasks[column].push({
                    ...task,
                    progress: parseInt(task.progress) || 0,
                    assignees,
                    dueDate: task.due_date,
                    createdAt: task.created_at
                });
            }
        });
        saveTasksToStorage(); // Sauvegarder en local comme backup
    } catch (e) {
        console.error('Erreur lors du chargement des tâches:', e);
        // Charger les données locales ou sampleTasks si l'API échoue
        loadTasksFromStorage();
    }
}

// Sauvegarder une tâche via l'API
async function saveTaskToAPI(taskData, isEdit = false) {
    try {
        const url = isEdit ? `todolist.php?id=${taskData.id}` : 'todolist.php';
        const method = isEdit ? 'PUT' : 'POST';
        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...taskData, assignees: JSON.stringify(taskData.assignees) })
        });
        if (!response.ok) throw new Error('Erreur lors de la sauvegarde');
        return await response.json();
    } catch (e) {
        console.error('Erreur lors de la sauvegarde:', e);
        throw e;
    }
}

// Supprimer une tâche via l'API
async function deleteTaskFromAPI(taskId) {
    try {
        const response = await fetch(`todolist.php?id=${taskId}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Erreur lors de la suppression');
    } catch (e) {
        console.error('Erreur lors de la suppression:', e);
        throw e;
    }
}

// Charger les tâches depuis localStorage (backup)
function loadTasksFromStorage() {
    const storedTasks = localStorage.getItem('kanban-tasks');
    if (storedTasks) {
        tasks = JSON.parse(storedTasks);
    } else {
        tasks = sampleTasks;
        saveTasksToStorage();
    }
}

// Sauvegarder les tâches dans localStorage
function saveTasksToStorage() {
    localStorage.setItem('kanban-tasks', JSON.stringify(tasks));
}

// Initialisation de l'application
async function init() {
    await loadTasksFromAPI();
    renderAllTasks();
    setupEventListeners();
}

// Sauvegarder une tâche
async function saveTask() {
    const title = taskTitleInput.value.trim();
    const description = taskDescriptionInput.value.trim();
    if (!title) {
        alert('Le titre de la tâche est requis.');
        return;
    }

    const taskData = {
        id: currentEditingTask ? currentEditingTask.id : Date.now().toString(),
        title,
        description,
        category: taskCategorySelect.value,
        priority: taskPrioritySelect.value,
        progress: parseInt(taskProgressInput.value) || 0,
        dueDate: taskDueDateSelect.value,
        assignees: [...selectedAssignees],
        status: currentEditingTask ? findTaskColumn(currentEditingTask.id) : targetColumn,
        createdAt: currentEditingTask ? currentEditingTask.createdAt : new Date().toISOString()
    };

    try {
        await saveTaskToAPI(taskData, !!currentEditingTask);
        await loadTasksFromAPI();
        renderAllTasks();
        closeTaskModal();
    } catch (e) {
        alert('Erreur lors de la sauvegarde de la tâche. Les modifications ont été enregistrées localement.');
        // Sauvegarde locale en cas d'erreur
        if (currentEditingTask) {
            const columnKey = findTaskColumn(currentEditingTask.id);
            if (columnKey) {
                const taskIndex = tasks[columnKey].findIndex(t => t.id === currentEditingTask.id);
                if (taskIndex !== -1) tasks[columnKey][taskIndex] = taskData;
            }
        } else {
            tasks[targetColumn].push(taskData);
        }
        saveTasksToStorage();
        renderAllTasks();
        closeTaskModal();
    }
}

// Supprimer une tâche
async function deleteTask(taskId) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette tâche ?')) return;

    try {
        await deleteTaskFromAPI(taskId);
        await loadTasksFromAPI();
        renderAllTasks();
    } catch (e) {
        alert('Erreur lors de la suppression. Suppression effectuée localement.');
        const columnKey = findTaskColumn(taskId);
        if (columnKey) {
            tasks[columnKey] = tasks[columnKey].filter(task => task.id !== taskId);
            saveTasksToStorage();
            renderAllTasks();
        }
    }
}

// Configurer les écouteurs d'événements
function setupEventListeners() {
    addCardBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            targetColumn = btn.dataset.column;
            openTaskModal();
        });
    });

    closeModalBtn.addEventListener('click', closeTaskModal);
    cancelTaskBtn.addEventListener('click', closeTaskModal);
    window.addEventListener('click', (e) => {
        if (e.target === taskModal) closeTaskModal();
    });

    if (exportBtn) exportBtn.addEventListener('click', exportTasks);
    if (exportPdfBtn) exportPdfBtn.addEventListener('click', exportTasksAsPdf);

    assigneeOptions.forEach(option => {
        option.addEventListener('click', () => {
            const assigneeId = parseInt(option.dataset.id);
            option.classList.toggle('selected');
            if (option.classList.contains('selected')) {
                if (!selectedAssignees.includes(assigneeId)) selectedAssignees.push(assigneeId);
            } else {
                selectedAssignees = selectedAssignees.filter(id => id !== assigneeId);
            }
        });
    });

    taskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        saveTask();
    });
}

// Ouvrir le modal de tâche
function openTaskModal(taskToEdit = null) {
    resetTaskForm();
    document.getElementById('modal-title').textContent = taskToEdit ? 'Modifier la tâche' : 'Ajouter une tâche';
    if (taskToEdit) {
        fillFormWithTaskData(taskToEdit);
        currentEditingTask = taskToEdit;
    } else {
        currentEditingTask = null;
    }
    taskModal.classList.add('show');
}

// Fermer le modal de tâche
function closeTaskModal() {
    taskModal.classList.remove('show');
    resetTaskForm();
    currentEditingTask = null;
    targetColumn = null;
}

// Remplir le formulaire avec les données de la tâche
function fillFormWithTaskData(task) {
    taskTitleInput.value = task.title;
    taskDescriptionInput.value = task.description;
    taskCategorySelect.value = task.category;
    taskPrioritySelect.value = task.priority;
    taskProgressInput.value = task.progress;
    taskDueDateSelect.value = task.dueDate;
    selectedAssignees = [...task.assignees];
    assigneeOptions.forEach(option => {
        const assigneeId = parseInt(option.dataset.id);
        option.classList.toggle('selected', selectedAssignees.includes(assigneeId));
    });
}

// Réinitialiser le formulaire
function resetTaskForm() {
    taskForm.reset();
    selectedAssignees = [];
    assigneeOptions.forEach(option => option.classList.remove('selected'));
}

// Trouver la colonne d'une tâche
function findTaskColumn(taskId) {
    for (const columnKey in tasks) {
        if (tasks[columnKey].some(task => task.id === taskId)) return columnKey;
    }
    return null;
}

// Déplacer une tâche
function moveTask(taskId, targetColumnKey) {
    const sourceColumnKey = findTaskColumn(taskId);
    if (sourceColumnKey && sourceColumnKey !== targetColumnKey) {
        const taskIndex = tasks[sourceColumnKey].findIndex(t => t.id === taskId);
        if (taskIndex !== -1) {
            const task = tasks[sourceColumnKey][taskIndex];
            tasks[sourceColumnKey].splice(taskIndex, 1);
            tasks[targetColumnKey].push(task);
            saveTasksToStorage();
            renderAllTasks();
        }
    }
}

// Rendre toutes les tâches
function renderAllTasks() {
    [todoColumn, inWorkColumn, inProgressColumn, completedColumn].forEach(col => (col.innerHTML = ''));
    const counts = {
        todo: tasks.todo.length,
        'in-work': tasks['in-work'].length,
        'in-progress': tasks['in-progress'].length,
        completed: tasks.completed.length
    };
    updateColumnCounts(counts);
    renderColumnTasks(tasks.todo, todoColumn);
    renderColumnTasks(tasks['in-work'], inWorkColumn);
    renderColumnTasks(tasks['in-progress'], inProgressColumn);
    renderColumnTasks(tasks.completed, completedColumn);
}

// Mettre à jour les compteurs de colonnes
function updateColumnCounts(counts) {
    columnTaskCounts.forEach((count, index) => {
        count.textContent = counts[['todo', 'in-work', 'in-progress', 'completed'][index]];
    });
}

// Rendre les tâches d'une colonne
function renderColumnTasks(columnTasks, columnElement) {
    columnTasks.forEach(task => columnElement.appendChild(createTaskCard(task)));
}

// Créer une carte de tâche
function createTaskCard(task) {
    const taskCard = document.createElement('div');
    taskCard.className = 'task-card';
    taskCard.dataset.id = task.id;
    const progressPercent = (task.progress / 10) * 100;

    taskCard.innerHTML = `
        <span class="category-badge ${task.category}">${task.category.charAt(0).toUpperCase() + task.category.slice(1)}</span>
        <h3 class="task-card-title">${escapeHtml(task.title)}</h3>
        <p class="task-card-description">${escapeHtml(task.description)}</p>
        <div class="progress-bar-container">
            <div class="progress-bar" style="width: ${progressPercent}%"></div>
        </div>
        <div class="task-info">
            <span class="progress-text">${task.progress}/10</span>
        </div>
        <div class="task-card-footer">
            <div class="task-date">
                <span class="priority-indicator priority-${task.priority}"></span>
                <span>${task.priority}</span>
                <i class="fas fa-calendar-alt" style="margin-left: 8px;"></i>
                <span>${task.dueDate}</span>
            </div>
            <div class="task-card-assignees">
                ${task.assignees.map(id => `
                    <div class="assignee">
                        <img src="https://ui-avatars.com/api/?name=${getInitialsForAssignee(id)}&background=random" alt="Assignee">
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    taskCard.addEventListener('click', (e) => {
        if (!e.target.closest('.task-actions')) {
            const columnKey = findTaskColumn(task.id);
            if (columnKey) openTaskModal(task);
        }
    });

    return taskCard;
}

// Obtenir les initiales des assignés
function getInitialsForAssignee(id) {
    const initialsMap = {
        1: 'J+D',
        2: 'M+S',
        3: 'A+R',
        4: 'T+K'
    };
    return initialsMap[id] || 'U+U';
}

// Échapper le HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Exporter en CSV
function exportTasks() {
    let csvContent = 'Column,ID,Title,Description,Category,Priority,Progress,Due Date,Assignees,Created At\n';
    for (const columnKey in tasks) {
        tasks[columnKey].forEach(task => {
            const assigneeInitials = task.assignees.map(id => getInitialsForAssignee(id)).join(', ');
            csvContent += `"${columnKey}","${task.id}","${task.title.replace(/"/g, '""')}","${task.description.replace(/"/g, '""')}","${task.category}","${task.priority}","${task.progress}","${task.dueDate}","${assigneeInitials}","${task.createdAt}"\n`;
        });
    }
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'todo-list-export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Exporter en PDF
function exportTasksAsPdf() {
    const tempContainer = document.createElement('div');
    tempContainer.className = 'pdf-export-container';
    tempContainer.style.width = '800px';
    tempContainer.style.padding = '20px';
    tempContainer.style.backgroundColor = 'white';
    tempContainer.style.fontFamily = 'Arial, sans-serif';

    const title = document.createElement('h1');
    title.textContent = 'Task Management Board';
    title.style.textAlign = 'center';
    title.style.marginBottom = '20px';
    tempContainer.appendChild(title);

    for (const columnKey in tasks) {
        if (tasks[columnKey].length === 0) continue;
        const columnHeader = document.createElement('h2');
        columnHeader.textContent = columnKey.toUpperCase();
        columnHeader.style.backgroundColor = '#f1f1f1';
        columnHeader.style.padding = '8px';
        columnHeader.style.marginTop = '20px';
        columnHeader.style.marginBottom = '10px';
        tempContainer.appendChild(columnHeader);

        const table = document.createElement('table');
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        table.style.marginBottom = '20px';

        const headerRow = document.createElement('tr');
        ['ID', 'Title', 'Description', 'Category', 'Priority', 'Progress', 'Due Date'].forEach(header => {
            const th = document.createElement('th');
            th.textContent = header;
            th.style.border = '1px solid #ddd';
            th.style.padding = '8px';
            th.style.backgroundColor = '#f8f9fa';
            th.style.textAlign = 'left';
            headerRow.appendChild(th);
        });
        table.appendChild(headerRow);

        tasks[columnKey].forEach(task => {
            const row = document.createElement('tr');
            [
                task.id,
                task.title,
                task.description,
                task.category,
                task.priority,
                `${task.progress}/10`,
                task.dueDate
            ].forEach(value => {
                const td = document.createElement('td');
                td.textContent = value;
                td.style.border = '1px solid #ddd';
                td.style.padding = '8px';
                row.appendChild(td);
            });
            table.appendChild(row);
        });
        tempContainer.appendChild(table);
    }

    document.body.appendChild(tempContainer);
    html2canvas(tempContainer, {
        scale: 1,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
    }).then(canvas => {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'pt', 'a4');
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = 595;
        const pageHeight = 842;
        const imgHeight = canvas.height * imgWidth / canvas.width;
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft >= 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
        }

        pdf.save('task-board-export.pdf');
        document.body.removeChild(tempContainer);
    });
}

// Initialiser l'application
document.addEventListener('DOMContentLoaded', init);