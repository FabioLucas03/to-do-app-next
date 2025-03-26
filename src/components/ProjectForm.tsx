import React, { useState } from 'react';
import { useTaskContext } from '../context/TaskContext';
import TaskForm from './TaskForm';
import { Project } from '../types';

export default function ProjectForm() {
  const { addProject, projects, deleteProject } = useTaskContext();
  const [projectName, setProjectName] = useState('');
  const [error, setError] = useState('');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isAddingTask, setIsAddingTask] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = projectName.trim();
    
    if (!trimmedName) {
      setError('Nome do projeto é obrigatório');
      return;
    }
    
    if (projects.some(p => p.name.toLowerCase() === trimmedName.toLowerCase())) {
      setError('Já existe um projeto com este nome');
      return;
    }

    addProject({ name: trimmedName });
    setProjectName('');
    setError('');
  };

  const handleDeleteProject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Tem certeza que deseja excluir este projeto e todas as suas tarefas?')) {
      deleteProject(id);
    }
  };

  const handleAddTask = (project: Project) => {
    setSelectedProject(project);
    setIsAddingTask(true);
  };

  const handleCloseTaskModal = () => {
    setSelectedProject(null);
    setIsAddingTask(false);
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="box has-background-dark mb-4">
        <div className="field">
          <label className="label has-text-light">Nome do Projeto</label>
          <div className="field has-addons">
            <div className="control is-expanded">
              <input
                className={`input ${error ? 'is-danger' : ''}`}
                type="text"
                value={projectName}
                onChange={(e) => {
                  setProjectName(e.target.value);
                  setError('');
                }}
                placeholder="Digite o nome do projeto"
              />
            </div>
            <div className="control">
              <button 
                type="submit" 
                className="button is-primary"
                style={{ backgroundColor: 'rgb(106, 50, 159)', borderColor: 'transparent' }}
                disabled={!projectName.trim()}
              >
                Adicionar
              </button>
            </div>
          </div>
          {error && <p className="help is-danger">{error}</p>}
        </div>
      </form>

      {projects.length > 0 && (
        <div className="box has-background-dark mb-4">
          <h3 className="subtitle is-5 has-text-light mb-3">Projetos Existentes:</h3>
          <div className="project-list">
            {projects.map(project => (
              <div 
                key={project.id} 
                className="card mb-3"
              >
                <div className="card-content p-3">
                  <div className="is-flex is-flex-direction-column">
                    <div className="is-flex is-justify-content-space-between mb-2">
                      <span className="has-text-light is-size-5">{project.name}</span>
                      <button 
                        className="button is-small is-danger is-outlined project-delete-btn"
                        onClick={(e) => handleDeleteProject(project.id, e)}
                        aria-label="Excluir Projeto"
                      >
                        <span className="icon is-small">
                          <i className="fas fa-trash"></i>
                        </span>
                      </button>
                    </div>
                    <div>
                      <button 
                        className="button is-primary is-small is-fullwidth"
                        onClick={() => handleAddTask(project)}
                      >
                        <span className="icon is-small">
                          <i className="fas fa-plus"></i>
                        </span>
                        <span>Nova Tarefa</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isAddingTask && selectedProject && (
        <TaskForm 
          initialProject={selectedProject} 
          onClose={handleCloseTaskModal} 
        />
      )}
    </>
  );
}
