import React, { useState, useEffect } from 'react';
import { useTaskContext } from '../context/TaskContext';
import { Task, Project, ChecklistItem } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface TaskFormProps {
  taskToEdit?: Task;
  initialProject?: Project;
  onClose?: () => void;
}

export default function TaskForm({ taskToEdit, initialProject, onClose }: TaskFormProps) {
  const { addTask, updateTask, projects } = useTaskContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [task, setTask] = useState({
    title: '',
    description: '',
    project: initialProject ? initialProject.id : '',
    deadline: new Date().toISOString().split('T')[0],
    deadlineTime: '12:00', // Adicionado campo para horário
    priority: 'medium' as Task['priority'],
  });
  
  // Estado para o checklist inicial
  const [initialChecklist, setInitialChecklist] = useState<ChecklistItem[]>([]);
  const [showChecklistInput, setShowChecklistInput] = useState(false);
  const [checklistItem, setChecklistItem] = useState('');

  useEffect(() => {
    if (taskToEdit) {
      const deadlineDate = new Date(taskToEdit.deadline);
      setIsModalOpen(true);
      
      // Ensure we have a string project ID, not an object
      const projectId = typeof taskToEdit.project === 'object' && taskToEdit.project !== null 
        ? taskToEdit.project.id 
        : taskToEdit.project;
      
      console.log('Setting project ID for edit:', projectId);
      
      setTask({
        title: taskToEdit.title,
        description: taskToEdit.description,
        project: projectId,
        deadline: deadlineDate.toISOString().split('T')[0],
        deadlineTime: `${String(deadlineDate.getHours()).padStart(2, '0')}:${String(deadlineDate.getMinutes()).padStart(2, '0')}`,
        priority: taskToEdit.priority,
      });
      
      // Carregar checklist existente se houver
      if (taskToEdit.checklist && taskToEdit.checklist.length > 0) {
        setInitialChecklist(taskToEdit.checklist);
      }
    }
    
    if (initialProject) {
      setIsModalOpen(true);
    }
  }, [taskToEdit, initialProject]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('📝 TaskForm: Form submitted with values:', task);
    console.log('📝 TaskForm: Checklist items:', initialChecklist);
    
    // Combine the date and time in a proper ISO 8601 format
    const [year, month, day] = task.deadline.split('-').map(Number);
    const [hours, minutes] = task.deadlineTime.split(':').map(Number);
    
    console.log(`🕒 TaskForm: Parsed date components - Year: ${year}, Month: ${month}, Day: ${day}, Hours: ${hours}, Minutes: ${minutes}`);
    
    // Create a Date object with the correct values
    const deadlineDateTime = new Date(year, month - 1, day, hours, minutes);
    console.log('🕒 TaskForm: Created Date object:', deadlineDateTime);
    
    // Format as ISO 8601 string
    const isoDeadline = deadlineDateTime.toISOString();
    console.log('🕒 TaskForm: Formatted ISO string:', isoDeadline);
    
    // Garantir que estamos enviando o projectId correto
    const taskData = {
      ...task,
      deadline: isoDeadline,
      // Garantir que o projeto seja enviado como projectId
      projectId: task.project,
      project: task.project, // manter ambos para compatibilidade
      checklist: initialChecklist.length > 0 ? initialChecklist : undefined
    };
    
    console.log('📝 TaskForm: Final task data with projectId:', taskData);
    
    if (taskToEdit) {
      console.log('🔄 TaskForm: Updating existing task:', taskToEdit.id);
      const updatedTask = {
        ...taskToEdit,
        ...taskData,
        id: taskToEdit.id // garantir que temos o ID
      };
      
      updateTask(updatedTask, { showLoading: true }).then(updatedTask => {
        console.log('✅ TaskForm: Task updated successfully:', updatedTask);
      }).catch(error => {
        console.error('❌ TaskForm: Error updating task:', error);
      });
    } else {
      console.log('➕ TaskForm: Creating new task');
      addTask({
        ...taskData,
        completed: false,
        timeSpent: 0,
      }).then(newTask => {
        console.log('✅ TaskForm: Task created successfully:', newTask);
      }).catch(error => {
        console.error('❌ TaskForm: Error creating task:', error);
      });
    }
    handleClose();
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setTask({
      title: '',
      description: '',
      project: '',
      deadline: new Date().toISOString().split('T')[0],
      deadlineTime: '12:00',
      priority: 'medium',
    });
    setInitialChecklist([]);
    setShowChecklistInput(false);
    setChecklistItem('');
    onClose?.();
  };
  
  const addChecklistItem = () => {
    if (checklistItem.trim()) {
      const newItem: ChecklistItem = {
        id: uuidv4(),
        text: checklistItem.trim(),
        completed: false
      };
      
      setInitialChecklist([...initialChecklist, newItem]);
      setChecklistItem('');
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addChecklistItem();
    }
  };
  
  const removeChecklistItem = (id: string) => {
    setInitialChecklist(initialChecklist.filter(item => item.id !== id));
  };

  return (
    <div>
      <div className={`modal ${isModalOpen || taskToEdit || initialProject ? 'is-active' : ''}`}>
        <div className="modal-background" onClick={handleClose}></div>
        <div className="modal-card">
          <header className="modal-card-head has-background-dark">
            <p className="modal-card-title has-text-light">
              {taskToEdit ? 'Editar Tarefa' : 'Nova Tarefa'}
            </p>
            <button 
              className="delete" 
              aria-label="close" 
              onClick={handleClose}
            ></button>
          </header>
          <section className="modal-card-body has-background-dark">
            <form onSubmit={handleSubmit}>
              <div className="field">
                <label className="label has-text-light">Título</label>
                <div className="control">
                  <input
                    className="input"
                    type="text"
                    value={task.title}
                    onChange={(e) => setTask({...task, title: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="field">
                <label className="label has-text-light">Descrição</label>
                <div className="control">
                  <textarea
                    className="textarea"
                    value={task.description}
                    onChange={(e) => setTask({...task, description: e.target.value})}
                  />
                </div>
              </div>

              <div className="field">
                <label className="label has-text-light">Projeto</label>
                <div className="control">
                  <div className="select">
                    <select
                      value={task.project}
                      onChange={(e) => setTask({...task, project: e.target.value})}
                      required
                      disabled={!!initialProject && !taskToEdit} // Only disable for new tasks, not when editing
                    >
                      <option value="">Selecione um projeto</option>
                      {projects.map(project => (
                        <option key={project.id} value={project.id}>{project.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="columns">
                <div className="column">
                  <div className="field">
                    <label className="label has-text-light">Data de Entrega</label>
                    <div className="control">
                      <input
                        className="input"
                        type="date"
                        value={task.deadline}
                        onChange={(e) => setTask({...task, deadline: e.target.value})}
                        required
                      />
                    </div>
                  </div>
                </div>
                <div className="column">
                  <div className="field">
                    <label className="label has-text-light">Horário</label>
                    <div className="control">
                      <input
                        className="input"
                        type="time"
                        value={task.deadlineTime}
                        onChange={(e) => setTask({...task, deadlineTime: e.target.value})}
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="field">
                <label className="label has-text-light">Prioridade</label>
                <div className="control">
                  <div className="select">
                    <select
                      value={task.priority}
                      onChange={(e) => setTask({...task, priority: e.target.value as Task['priority']})}
                    >
                      <option value="low">Baixa</option>
                      <option value="medium">Média</option>
                      <option value="high">Alta</option>
                    </select>
                  </div>
                </div>
              </div>
              
              {/* Seção de Checklist */}
              <div className="field">
                <label className="label has-text-light">
                  Checklist
                  <button 
                    type="button" 
                    className="button is-small is-info is-outlined ml-2"
                    onClick={() => setShowChecklistInput(!showChecklistInput)}
                  >
                    <span className="icon is-small">
                      <i className={`fas ${showChecklistInput ? 'fa-minus' : 'fa-plus'}`}></i>
                    </span>
                    <span>{showChecklistInput ? 'Esconder' : 'Adicionar Itens'}</span>
                  </button>
                </label>
                
                {showChecklistInput && (
                  <div className="checklist-input-container mt-2">
                    <div className="field has-addons">
                      <div className="control is-expanded">
                        <input
                          className="input"
                          type="text"
                          placeholder="Adicionar item ao checklist"
                          value={checklistItem}
                          onChange={(e) => setChecklistItem(e.target.value)}
                          onKeyDown={handleKeyDown}
                        />
                      </div>
                      <div className="control">
                        <button 
                          type="button" 
                          className="button is-primary"
                          onClick={addChecklistItem}
                          disabled={!checklistItem.trim()}
                        >
                          <span className="icon is-small">
                            <i className="fas fa-plus"></i>
                          </span>
                        </button>
                      </div>
                    </div>
                    
                    {/* Lista de itens do checklist */}
                    {initialChecklist.length > 0 && (
                      <div className="checklist-items mt-2">
                        {initialChecklist.map(item => (
                          <div key={item.id} className="box p-2 mb-2 is-flex is-justify-content-space-between is-align-items-center">
                            <span>{item.text}</span>
                            <button 
                              type="button"
                              className="delete"
                              onClick={() => removeChecklistItem(item.id)}
                              aria-label="Remover item"
                            ></button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="field is-grouped is-grouped-right">
                <div className="control">
                  <button type="button" className="button" onClick={handleClose}>
                    Cancelar
                  </button>
                </div>
                <div className="control">
                  <button type="submit" className="button is-primary">
                    {taskToEdit ? 'Salvar Alterações' : 'Adicionar Tarefa'}
                  </button>
                </div>
              </div>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
