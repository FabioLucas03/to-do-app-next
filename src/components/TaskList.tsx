import React, { useState, useEffect } from 'react';
import { useTaskContext } from '../context/TaskContext';
import Timer from './Timer';
import { Task } from '../types';
import TaskForm from './TaskForm';
import TaskDetailModal from './TaskDetailModal';

export default function TaskList() {
  const { tasks, projects, updateTask, deleteTask, deleteCompletedTasks } = useTaskContext();
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<'' | 'high' | 'medium' | 'low'>('');
  const [sortBy, setSortBy] = useState<'none' | 'title' | 'deadline' | 'overdue' | 'today' | 'completed'>('none');
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [taskToView, setTaskToView] = useState<Task | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Atualiza o tempo atual a cada minuto para verificar tarefas atrasadas
  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // 1 minuto

    return () => clearInterval(intervalId);
  }, []);

  const isTaskOverdue = (task: Task): boolean => {
    if (task.completed) return false; // Tarefas completas não são consideradas atrasadas
    const deadlineDate = new Date(task.deadline);
    return deadlineDate < currentTime;
  };

  const isTaskForToday = (task: Task): boolean => {
    const today = new Date();
    const deadline = new Date(task.deadline);
    
    return (
      deadline.getDate() === today.getDate() &&
      deadline.getMonth() === today.getMonth() &&
      deadline.getFullYear() === today.getFullYear()
    );
  };

  const getPriorityValue = (priority: Task['priority']) => {
    switch (priority) {
      case 'high': return 2;
      case 'medium': return 1;
      case 'low': return 0;
    }
  };

  const getPriorityClass = (priority: Task['priority']) => {
    switch (priority) {
      case 'high': return 'is-danger';
      case 'medium': return 'is-warning';
      case 'low': return 'is-info';
    }
  };

  const formatDeadline = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

  // Função auxiliar para extrair o ID do projeto (independentemente do tipo)
  const getProjectId = (project: any): string | null => {
    if (!project) return null;
    if (typeof project === 'string') return project;
    if (project && typeof project === 'object' && project.id) return project.id;
    return null;
  };

  const filteredTasks = tasks
    .filter(task => !selectedProject || getProjectId(task.project) === selectedProject)
    .filter(task => !priorityFilter || task.priority === priorityFilter)
    .sort((a, b) => {
      if (sortBy === 'title') {
        return a.title.localeCompare(b.title);
      } else if (sortBy === 'deadline') {
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      }
      return 0;
    })
    .filter(task => {
      if (sortBy === 'overdue') return isTaskOverdue(task);
      if (sortBy === 'today') return isTaskForToday(task);
      if (sortBy === 'completed') return task.completed;
      return true;
    });

  // Separar tarefas por status e atrasos
  const pendingTasks = filteredTasks.filter(task => !task.completed);
  const overdueTasks = pendingTasks.filter(isTaskOverdue);
  const upcomingTasks = pendingTasks.filter(task => !isTaskOverdue(task));
  const completedTasks = filteredTasks.filter(task => task.completed);

  // Função para atualizar o tempo gasto com menos frequência
  const handleTimeUpdate = (taskId: string, time: number) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      // Só atualizar se o tempo realmente mudou
      if (task.timeSpent !== time) {
        console.log(`⏱️ TaskList: Atualizando tempo da tarefa ${taskId} para ${time} segundos`);
        // Criar uma nova função para atualização apenas do tempo
        updateTask({ ...task, timeSpent: time }, { 
          showLoading: false // Nunca mostrar loading para atualizações de tempo
        });
      }
    }
  };

  const toggleTaskCompletion = (task: Task) => {
    console.log('Alterando status da tarefa:', task.id, 'para', !task.completed);
    
    // Criar uma cópia completa da tarefa, incluindo todos os campos necessários
    const updatedTask = {
      ...task,
      completed: !task.completed,
      // Garantir que temos o projectId correto
      projectId: typeof task.project === 'object' ? task.project.id : task.project
    };
    
    // Usar { showLoading: false } para não mostrar o indicador de loading
    updateTask(updatedTask, { showLoading: false }).then(result => {
      console.log('Tarefa atualizada com sucesso:', result);
    }).catch(error => {
      console.error('Erro ao atualizar tarefa:', error);
    });
  };

  const handleDeleteTask = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Impede que o evento de clique se propague para o card
    if (window.confirm('Tem certeza que deseja excluir esta tarefa?')) {
      deleteTask(taskId);
    }
  };

  const handleEditTask = (task: Task, e: React.MouseEvent) => {
    e.stopPropagation(); // Impede que o evento de clique se propague para o card
    setTaskToEdit(task);
  };

  const handleTaskClick = (task: Task) => {
    // Só abre o modal de detalhes se não estiver editando
    if (!taskToEdit) {
      setTaskToView(task);
    }
  };

  const handleClearCompletedTasks = () => {
    setShowConfirmation(true);
  };

  const confirmClearCompletedTasks = () => {
    deleteCompletedTasks();
    setShowConfirmation(false);
  };

  const cancelClearCompletedTasks = () => {
    setShowConfirmation(false);
  };

  const TaskCard = ({ task }: { task: Task }) => {
    const isOverdue = isTaskOverdue(task);
    
    // Cálculo do progresso do checklist
    const checklistCount = task.checklist?.length || 0;
    const checklistCompletedCount = task.checklist?.filter(item => item.completed).length || 0;
    const checklistProgress = checklistCount > 0 
      ? Math.round((checklistCompletedCount / checklistCount) * 100) 
      : 0;
    
    // Encontra o projeto correto usando o ID normalizado
    const projectId = getProjectId(task.project);
    const projectName = projectId 
      ? (
          // Verificar se o próprio projeto já tem o nome
          typeof task.project === 'object' && task.project.name 
            ? task.project.name
            : projects.find(p => p.id === projectId)?.name
        )
      : 'Sem projeto';

    const handleTaskCardClick = (e: React.MouseEvent) => {
      // Verificar se o clique não veio do timer ou dos botões
      const target = e.target as HTMLElement;
      if (
        target.closest('.timer-card') || 
        target.closest('.checkbox') || 
        target.closest('button') ||
        task.timerActive // Não interromper a visualização se o timer estiver ativo
      ) {
        return; // Não fazer nada se o clique foi no timer ou em botões
      }
      
      handleTaskClick(task);
    };

    // Verificar se o timer está ativo no banco de dados
    const timerActive = task.timerActive || false;
    
    return (
      <div 
        key={task.id} 
        className={`card mb-4 ${isOverdue ? 'overdue-task' : ''} ${timerActive ? 'has-active-timer' : ''}`}
        data-priority={task.priority}
        onClick={handleTaskCardClick}
        style={{ cursor: 'pointer' }}
      >
        <div className="card-content">
          <div className="columns">
            <div className="column is-8">
              <div className="is-flex is-justify-content-space-between is-align-items-center mb-2">
                <div className="is-flex is-align-items-center">
                  <label className="checkbox mr-2" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={() => toggleTaskCompletion(task)}
                      className="mr-2"
                    />
                    <span className={`title is-4 has-text-light ${task.completed ? 'has-text-grey-light line-through' : ''}`}>
                      {task.title}
                    </span>
                  </label>
                  
                  {/* Badge para mostrar o progresso do checklist */}
                  {!task.completed && checklistCount > 0 && (
                    <span className={`tag ml-2 ${
                      checklistProgress === 100 ? 'is-success' : 
                      checklistProgress > 50 ? 'is-primary' : 'is-warning'
                    }`}>
                      <span className="icon is-small mr-1">
                        <i className="fas fa-tasks"></i>
                      </span>
                      {checklistCompletedCount}/{checklistCount} ({checklistProgress}%)
                    </span>
                  )}
                </div>
                
                {!task.completed && (
                  <div className="buttons are-small">
                    <button 
                      className="button is-small is-danger is-outlined"
                      onClick={(e) => handleDeleteTask(task.id, e)}
                      title="Excluir Tarefa"
                      aria-label="Excluir Tarefa"
                    >
                      <span className="icon is-small">
                        <i className="fas fa-trash"></i>
                      </span>
                    </button>
                    <button 
                      className="button is-small is-info is-outlined"
                      onClick={(e) => handleEditTask(task, e)}
                      title="Editar Tarefa"
                      aria-label="Editar Tarefa"
                    >
                      <span className="icon is-small">
                        <i className="fas fa-edit"></i>
                      </span>
                    </button>
                  </div>
                )}
              </div>
              <p className="subtitle is-6 has-text-light">
                {projectName}
              </p>
              <p className={`has-text-light ${task.completed ? 'has-text-grey-light' : ''}`}>
                {task.description}
              </p>
              
              {/* Adicionar a barra de progresso do checklist se houver itens */}
              {checklistCount > 0 && (
                <div className="mb-3">
                  <div className="is-flex is-justify-content-space-between mb-1">
                    <small className="has-text-light">Checklist</small>
                    <small className="has-text-light">{checklistCompletedCount}/{checklistCount} ({checklistProgress}%)</small>
                  </div>
                  <progress 
                    className={`progress is-small ${
                      checklistProgress === 100 ? 'is-success' : 
                      checklistProgress > 50 ? 'is-primary' : 'is-warning'
                    }`} 
                    value={checklistProgress} 
                    max="100"
                  >
                    {checklistProgress}%
                  </progress>
                </div>
              )}
              
              <p className={`has-text-light ${task.completed ? 'has-text-grey-light' : ''} ${isOverdue ? 'overdue-text' : ''}`}>
                <span className="icon is-small mr-1">
                  <i className="fas fa-calendar-alt"></i>
                </span>
                Prazo: {formatDeadline(task.deadline)}
                {isOverdue && <span className="tag is-danger is-light ml-2">Atrasada</span>}
              </p>
              <span className={`tag ${getPriorityClass(task.priority)}`}>
                {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Média' : 'Baixa'}
              </span>
            </div>
            <div className="column is-4">
              {!task.completed && (
                <div className="timer-wrapper" onClick={(e) => e.stopPropagation()}>
                  <Timer 
                    taskId={task.id} 
                    onTimeUpdate={handleTimeUpdate}
                    initialTime={task.timeSpent}
                  />
                  {timerActive && (
                    <div className="tag is-success is-light mt-2">
                      <span className="icon is-small">
                        <i className="fas fa-spinner fa-pulse"></i>
                      </span>
                      <span>Timer Ativo</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="content p-0 has-text-centered" style={{ backgroundColor: 'var(--background-dark)' }}>
      {taskToEdit && (
        <TaskForm 
          taskToEdit={taskToEdit} 
          onClose={() => setTaskToEdit(null)}
        />
      )}
      
      {taskToView && !taskToEdit && (
        <TaskDetailModal
          task={taskToView}
          onClose={() => setTaskToView(null)}
        />
      )}
      
      {/* Modal de confirmação para limpar tarefas concluídas */}
      <div className={`modal ${showConfirmation ? 'is-active' : ''}`}>
        <div className="modal-background" onClick={cancelClearCompletedTasks}></div>
        <div className="modal-card">
          <header className="modal-card-head">
            <p className="modal-card-title">Confirmação</p>
            <button 
              className="delete" 
              aria-label="close" 
              onClick={cancelClearCompletedTasks}
            ></button>
          </header>
          <section className="modal-card-body">
            <p>Tem certeza que deseja excluir todas as tarefas concluídas? Esta ação não pode ser desfeita.</p>
            <p className="has-text-danger mt-2">Serão excluídas {completedTasks.length} tarefas.</p>
          </section>
          <footer className="modal-card-foot">
            <button className="button is-danger" onClick={confirmClearCompletedTasks}>
              Sim, excluir tarefas concluídas
            </button>
            <button className="button" onClick={cancelClearCompletedTasks}>
              Cancelar
            </button>
          </footer>
        </div>
      </div>
      
      <div className="filters mb-4 px-3 py-3 mx-auto">
        <div className="field is-grouped is-justify-content-center">
          <div className="control">
            <div className="select">
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
              >
                <option value="">Todos os projetos</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="control">
            <div className="select">
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value as '' | 'high' | 'medium' | 'low')}
              >
                <option value="">Prioridade: Todas</option>
                <option value="high">Prioridade: Alta</option>
                <option value="medium">Prioridade: Média</option>
                <option value="low">Prioridade: Baixa</option>
              </select>
            </div>
          </div>

          <div className="control">
            <div className="select">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'none' | 'title' | 'deadline' | 'overdue' | 'today' | 'completed')}
              >
                <option value="none">Mostrar: Todas</option>
                <option value="title">Ordenar por: Título</option>
                <option value="deadline">Ordenar por: Data-limite</option>
                <option value="overdue">Tarefas Atrasadas</option>
                <option value="today">Tarefas Para Hoje</option>
                <option value="completed">Tarefas Concluídas</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Exibe seções de tarefas somente quando não houver um filtro específico */}
      {(sortBy === 'none' || sortBy === 'title' || sortBy === 'deadline') && (
        <>
          {overdueTasks.length > 0 && (
            <div className="overdue-tasks mb-6 px-0 mx-auto">
              <h3 className="title is-5 has-text-danger mb-4 has-text-centered">
                Tarefas Atrasadas ({overdueTasks.length})
                {/* Mostrar progresso total do checklist de tarefas atrasadas */}
                {overdueTasks.some(task => task.checklist?.length) && (
                  <span className="ml-2 has-text-weight-normal is-size-6">
                    (Progresso checklist: {calculateGroupProgress(overdueTasks)}%)
                  </span>
                )}
              </h3>
              {overdueTasks.map(task => <TaskCard key={task.id} task={task} />)}
            </div>
          )}

          <div className="pending-tasks mb-6 px-0 mx-auto">
            <h3 className="title is-5 has-text-light mb-4 has-text-centered">
              Tarefas Pendentes ({upcomingTasks.length})
              {/* Mostrar progresso total do checklist de tarefas pendentes */}
              {upcomingTasks.some(task => task.checklist?.length) && (
                <span className="ml-2 has-text-weight-normal is-size-6">
                  (Progresso checklist: {calculateGroupProgress(upcomingTasks)}%)
                </span>
              )}
            </h3>
            {upcomingTasks.length === 0 ? (
              <p className="has-text-light has-text-centered">Nenhuma tarefa pendente.</p>
            ) : (
              upcomingTasks.map(task => <TaskCard key={task.id} task={task} />)
            )}
          </div>

          <div className="completed-tasks px-0 mx-auto">
            <h3 className="title is-5 has-text-light mb-4 has-text-centered">
              Tarefas Concluídas ({completedTasks.length})
              {completedTasks.some(task => task.checklist?.length) && (
                <span className="ml-2 has-text-weight-normal is-size-6">
                  (Progresso checklist: 100%)
                </span>
              )}
            </h3>
            
            {completedTasks.length > 0 && (
              <div className="has-text-right mb-4">
                <button 
                  className="button is-danger is-small"
                  onClick={handleClearCompletedTasks}
                >
                  <span className="icon is-small">
                    <i className="fas fa-trash-alt"></i>
                  </span>
                  <span>Limpar Concluídas</span>
                </button>
              </div>
            )}
            
            {completedTasks.length === 0 ? (
              <p className="has-text-light has-text-centered">Nenhuma tarefa concluída.</p>
            ) : (
              completedTasks.map(task => <TaskCard key={task.id} task={task} />)
            )}
          </div>
        </>
      )}

      {/* Exibe apenas as tarefas filtradas quando um filtro específico estiver ativo */}
      {(sortBy === 'overdue' || sortBy === 'today' || sortBy === 'completed') && (
        <div className="filtered-tasks mb-6 px-0 mx-auto" style={{ width: '100%', maxWidth: '100%' }}>
          <div className="is-flex is-justify-content-space-between is-align-items-center mb-4">
            <h3 className={`title is-5 mb-0 has-text-centered ${sortBy === 'overdue' ? 'has-text-danger' : 'has-text-light'}`}>
              {sortBy === 'overdue' && 'Tarefas Atrasadas'}
              {sortBy === 'today' && 'Tarefas Para Hoje'}
              {sortBy === 'completed' && 'Tarefas Concluídas'}
              ({filteredTasks.length})
            </h3>
            {sortBy === 'completed' && filteredTasks.length > 0 && (
              <button 
                className="button is-danger is-small"
                onClick={handleClearCompletedTasks}
              >
                <span className="icon is-small">
                  <i className="fas fa-trash-alt"></i>
                </span>
                <span>Limpar Concluídas</span>
              </button>
            )}
          </div>
          
          {filteredTasks.length === 0 ? (
            <p className="has-text-light has-text-centered">Nenhuma tarefa encontrada.</p>
          ) : (
            <div className="task-container" style={{ width: '100%', maxWidth: '100%' }}>
              {filteredTasks.map(task => <TaskCard key={task.id} task={task} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
  
  // Função para calcular o progresso médio de um grupo de tarefas
  function calculateGroupProgress(taskGroup: Task[]): number {
    if (!taskGroup.length) return 0;
    
    // Contar todos os itens de checklist e itens completos
    let totalItems = 0;
    let completedItems = 0;
    
    taskGroup.forEach(task => {
      if (task.checklist?.length) {
        totalItems += task.checklist.length;
        completedItems += task.checklist.filter(item => item.completed).length;
      }
    });
    
    return totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
  }
}