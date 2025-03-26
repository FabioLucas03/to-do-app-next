import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Task, Project, Comment, TaskFile, ChecklistItem } from '../types';
import api from '../services/api';

interface TaskContextProps {
  tasks: Task[];
  projects: Project[];
  addTask: (task: Omit<Task, 'id'>) => Promise<Task>;
  updateTask: (task: Task, options?: { showLoading: boolean }) => Promise<Task>;
  deleteTask: (id: string) => Promise<void>;
  deleteCompletedTasks: () => Promise<void>;
  addProject: (project: Omit<Project, 'id'>) => Promise<Project>;
  deleteProject: (id: string) => Promise<void>;
  addComment: (taskId: string, comment: Omit<Comment, 'id' | 'createdAt'>) => Promise<Comment>;
  addFile: (taskId: string, file: Omit<TaskFile, 'id'>) => void; // Files still handled locally
  removeFile: (taskId: string, fileId: string) => void; // Files still handled locally
  loading: boolean;
  error: string | null;
}

const TaskContext = createContext<TaskContextProps | undefined>(undefined);

// Files are still handled locally since we don't have file storage in the backend yet
const FILES_PREFIX = 'file_';

export function TaskProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingHeavyOperation, setLoadingHeavyOperation] = useState<boolean>(false);

  // Load data from API on initial render
  useEffect(() => {
    const fetchData = async () => {
      console.log('🔄 TaskContext: Initializing data fetch');
      setLoading(true);
      try {
        console.log('🔍 TaskContext: Fetching projects and tasks');
        const [projectsData, tasksData] = await Promise.all([
          api.projects.getAll(),
          api.tasks.getAll(),
        ]);
        
        console.log(`📊 TaskContext: Received ${projectsData.length} projects`);
        setProjects(projectsData);
        
        console.log(`📊 TaskContext: Received ${tasksData.length} tasks`);
        // Process tasks to handle file references and normalize project data
        const processedTasks = tasksData.map(task => {
          // Garantir que temos uma referência ao projeto mesmo que venha como projectId
          const projectRef = task.projectId && !task.project 
            ? task.projectId 
            : task.project;
              
          return {
            ...task,
            // Garantir que o campo project sempre exista
            project: projectRef,
            files: [], // Initialize empty files array since files are handled locally
          };
        });
        
        setTasks(processedTasks);
        console.log('✅ TaskContext: Initial data loaded successfully');
        
        // Verificar se existem tempos pendentes no localStorage para tarefas que foram salvas
        console.log('🔍 TaskContext: Checking for pending timer data in localStorage');
        
        // Para cada tarefa carregada, verificar se há tempo pendente
        for (const task of processedTasks) {
          const pendingTimeKey = `pending_time_${task.id}`;
          const pendingTime = localStorage.getItem(pendingTimeKey);
          
          if (pendingTime) {
            const timeValue = parseInt(pendingTime);
            console.log(`⏱️ TaskContext: Found pending time for task ${task.id}: ${timeValue}s`);
            
            // Se o tempo pendente for maior que o tempo atual da tarefa, atualizá-lo
            if (timeValue > task.timeSpent) {
              console.log(`⏱️ TaskContext: Applying pending time update (${timeValue}s > ${task.timeSpent}s)`);
              await updateTaskTimeOnly(task.id, timeValue);
            }
            
            // Remover item pendente após processamento
            localStorage.removeItem(pendingTimeKey);
          }
        }
        
        setError(null);
      } catch (err) {
        console.error("❌ TaskContext: Error fetching data:", err);
        setError("Failed to load data. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const addTask = async (task: Omit<Task, 'id'>): Promise<Task> => {
    console.log('➕ TaskContext: Adding task:', task);
    setLoadingHeavyOperation(true); // Use loadingHeavyOperation em vez de loading
    try {
      // Extract files to handle locally
      const { files, ...taskData } = task;
      
      console.log('🔄 TaskContext: Sending task to API:', taskData);
      // Send task to API
      const newTask = await api.tasks.create(taskData);
      console.log('✅ TaskContext: Task created in API:', newTask);
      
      // Add the task to local state with empty files array
      const taskWithFiles = {
        ...newTask,
        files: [] as TaskFile[],
      };
      
      // Add files if any
      if (files && files.length > 0) {
        console.log(`📁 TaskContext: Processing ${files.length} files locally`);
        // Handle files locally
        taskWithFiles.files = files.map(file => ({
          ...file,
          id: uuidv4(),
        }));
      }
      
      console.log('🔄 TaskContext: Updating local state with new task');
      setTasks(prev => [...prev, taskWithFiles]);
      return taskWithFiles;
    } catch (err) {
      console.error("❌ TaskContext: Error adding task:", err);
      setError("Failed to add task. Please try again.");
      throw err;
    } finally {
      setLoadingHeavyOperation(false); // Use loadingHeavyOperation
    }
  };

  // Cache para evitar atualizações duplicadas
  const recentUpdates = new Map<string, {time: number, timestamp: number}>();
  const UPDATE_THROTTLE_MS = 2000; // 2 segundos entre atualizações para o mesmo valor

  // Cache mais agressivo para evitar múltiplas chamadas de API
  // Manter apenas a última atualização de tempo para cada tarefa
  const lastTimeUpdate = useRef<Record<string, number>>({});

  // Criar uma função otimizada apenas para atualizações de tempo
  const updateTaskTimeOnly = async (taskId: string, timeSpent: number): Promise<void> => {
    console.log(`⏱️ TaskContext: Atualizando apenas o tempo da tarefa ${taskId} para ${timeSpent}s`);
    
    // Verificar se o tempo mudou significativamente (mais de 1 segundo)
    const task = tasks.find(t => t.id === taskId);
    if (task && Math.abs(task.timeSpent - timeSpent) <= 1) {
      console.log(`⏱️ TaskContext: Ignorando atualização mínima de tempo (diferença <= 1s)`);
      return;
    }
    
    // Atualizar o estado local imediatamente para que a UI reflita a mudança
    setTasks(prevTasks => prevTasks.map(task => 
      task.id === taskId ? {...task, timeSpent} : task
    ));
    
    // Importante: salvar localmente para caso a API falhe
    try {
      // Criar uma chave única para armazenar temporariamente
      const pendingTimeKey = `pending_time_${taskId}`;
      localStorage.setItem(pendingTimeKey, timeSpent.toString());
      
      // Enviar atualização ao backend
      await api.tasks.updateTimeOnly(taskId, timeSpent);
      console.log(`⏱️ TaskContext: Tempo atualizado com sucesso no backend: ${timeSpent}s`);
      
      // Se bem-sucedido, remover do armazenamento local
      localStorage.removeItem(pendingTimeKey);
    } catch (err) {
      console.error("❌ TaskContext: Erro ao atualizar tempo:", err);
      // Não mostrar erro para o usuário em atualizações silenciosas de tempo
    }
  };

  const updateTask = async (updatedTask: Task, options = { showLoading: true }): Promise<Task> => {
    console.log('🔄 TaskContext: Atualizando tarefa:', updatedTask);
    
    // Se for apenas uma atualização de tempo, use a função otimizada
    if ('timeSpent' in updatedTask && Object.keys(updatedTask).length === 2) {
      await updateTaskTimeOnly(updatedTask.id, updatedTask.timeSpent);
      return updatedTask;
    }

    // Atualize o estado local imediatamente, antes de chamar a API
    // para manter a interface responsiva
    setTasks(prevTasks => 
      prevTasks.map(task => task.id === updatedTask.id ? {...task, ...updatedTask} : task)
    );

    // Verificar se é uma atualização de tempo
    if ('timeSpent' in updatedTask && !('completed' in updatedTask)) {
      // Só atualizar se o tempo realmente mudou significativamente (mais de 5 segundos)
      const lastTime = lastTimeUpdate.current[updatedTask.id] || 0;
      
      if (Math.abs(updatedTask.timeSpent - lastTime) < 5) {
        console.log(`🔄 TaskContext: Ignorando atualização pequena de tempo (${updatedTask.timeSpent - lastTime}s)`);
        
        // Atualizar apenas o estado local sem chamar a API
        setTasks(tasks.map(task => 
          task.id === updatedTask.id ? {...task, timeSpent: updatedTask.timeSpent} : task
        ));
        
        // Retornar a tarefa como se tivesse sido atualizada
        return updatedTask;
      }
      
      // Registrar este tempo para comparações futuras
      lastTimeUpdate.current[updatedTask.id] = updatedTask.timeSpent;
      console.log(`🔄 TaskContext: Atualizando tempo para ${updatedTask.timeSpent}s (última: ${lastTime}s)`);
    }
    
    // Verificar se é uma atualização de tempo e se já foi feita recentemente
    if ('timeSpent' in updatedTask) {
      const taskKey = `${updatedTask.id}-time-${updatedTask.timeSpent}`;
      const now = Date.now();
      const lastUpdate = recentUpdates.get(taskKey);
      
      if (lastUpdate && (now - lastUpdate.timestamp) < UPDATE_THROTTLE_MS) {
        console.log('🔄 TaskContext: Ignorando atualização duplicada de tempo', 
          updatedTask.id, updatedTask.timeSpent);
        
        // Atualizar apenas o estado local sem chamar a API
        setTasks(tasks.map(task => 
          task.id === updatedTask.id ? {...task, timeSpent: updatedTask.timeSpent} : task
        ));
        
        // Retornar a tarefa como se tivesse sido atualizada
        return updatedTask;
      }
      
      // Registrar esta atualização
      recentUpdates.set(taskKey, {time: updatedTask.timeSpent, timestamp: now});
      
      // Limpar entradas antigas do cache (mais de 1 minuto)
      for (const [key, value] of recentUpdates.entries()) {
        if (now - value.timestamp > 60000) {
          recentUpdates.delete(key);
        }
      }
    }
    
    // Só mostra loading se a opção showLoading for true (comportamento padrão)
    // E só usamos loadingHeavyOperation que controla o indicador visual
    if (options.showLoading) {
      setLoadingHeavyOperation(true);
    }
    
    try {
      // Extract files to handle them separately
      const { files, ...taskData } = updatedTask;
      
      // Preserve the checklist and comments data for the update
      const checklist = taskData.checklist || [];
      const comments = taskData.comments || [];
      
      console.log('🔄 TaskContext: Task data includes:',
        `${checklist.length} checklist items,`,
        `${comments.length} comments,`,
        `completed: ${taskData.completed}`);
      
      // Garantir que o projectId esteja sempre presente
      let projectId = null;
      
      if (taskData.project) {
        if (typeof taskData.project === 'object') {
          projectId = taskData.project.id;
          console.log(`🔄 TaskContext: Extraído projectId do objeto: ${projectId}`);
        } else if (typeof taskData.project === 'string') {
          projectId = taskData.project;
          console.log(`🔄 TaskContext: Usando project string como ID: ${projectId}`);
        }
      }
      
      // Criar uma cópia limpa dos dados da tarefa
      const cleanTaskData = {
        ...taskData,
        // Adicionar o projectId explicitamente
        projectId: projectId || taskData.projectId,
        // Include checklist data explicitly 
        checklist: checklist,
        // Include comments data explicitly to enable updates
        comments: comments,
        // Garantir que o status de conclusão seja incluído
        completed: taskData.completed
      };
      
      console.log('🔄 TaskContext: Dados antes da limpeza:', cleanTaskData);
      
      // Remover campos problemáticos ou redundantes
      delete cleanTaskData.project; // Remover para evitar conflitos
      
      // Ensure the deadline is a proper date object if it exists
      if (cleanTaskData.deadline) {
        console.log(`🔄 TaskContext: Deadline original: ${cleanTaskData.deadline}`);
        // Se for string, converter para Date
        if (typeof cleanTaskData.deadline === 'string') {
          cleanTaskData.deadline = new Date(cleanTaskData.deadline);
          console.log(`🔄 TaskContext: Deadline convertido para Date: ${cleanTaskData.deadline}`);
        }
      }
      
      console.log('🔄 TaskContext: Dados limpos para API:', {
        ...cleanTaskData,
        checklist: cleanTaskData.checklist?.length || 0,
        completed: cleanTaskData.completed
      });
      
      // Update the task in the API
      const apiUpdatedTask = await api.tasks.update(updatedTask.id, cleanTaskData);
      console.log('✅ TaskContext: Tarefa atualizada com sucesso na API:', apiUpdatedTask);
      
      // Preserve the original order of checklist items if present
      if (updatedTask.checklist && updatedTask.checklist.length > 0 && 
          apiUpdatedTask.checklist && apiUpdatedTask.checklist.length > 0) {
        
        // Create a map of items by ID for quick lookup
        const itemsMap = new Map();
        apiUpdatedTask.checklist.forEach(item => {
          itemsMap.set(item.id, item);
        });
        
        // Reconstruct the checklist in the original order
        const orderedChecklist = updatedTask.checklist.map(originalItem => {
          // If item exists in the API response, use that (to get updated fields)
          // Otherwise, fallback to the original item
          return itemsMap.get(originalItem.id) || originalItem;
        });
        
        // Update with the ordered checklist
        apiUpdatedTask.checklist = orderedChecklist;
      }
      
      // Combine API response with local files
      const taskWithFiles = {
        ...apiUpdatedTask,
        files: updatedTask.files || [],
      };
      
      // Update local state immediately with the new data
      setTasks(prevTasks => prevTasks.map(task => 
        task.id === updatedTask.id ? taskWithFiles : task
      ));
      
      return taskWithFiles;
    } catch (err) {
      console.error("❌ TaskContext: Erro ao atualizar tarefa:", err);
      setError("Falha ao atualizar tarefa. Por favor, tente novamente.");
      throw err;
    } finally {
      // Só reseta loading se a opção showLoading foi true
      if (options.showLoading) {
        setLoadingHeavyOperation(false);
      }
    }
  };

  const deleteTask = async (id: string): Promise<void> => {
    setLoadingHeavyOperation(true); // Use o loading para operações pesadas
    try {
      // Delete the task from the API
      await api.tasks.delete(id);
      
      // Also clean up any file references
      const taskToDelete = tasks.find(t => t.id === id);
      if (taskToDelete?.files) {
        taskToDelete.files.forEach(file => {
          const fileKey = typeof file.url === 'string' && file.url.startsWith(FILES_PREFIX)
            ? file.url
            : `${FILES_PREFIX}${file.id}`;
          localStorage.removeItem(fileKey);
        });
      }
      
      // Update local state
      setTasks(tasks.filter(task => task.id !== id));
    } catch (err) {
      console.error("Error deleting task:", err);
      setError("Failed to delete task. Please try again.");
      throw err;
    } finally {
      setLoadingHeavyOperation(false);
    }
  };

  const deleteCompletedTasks = async (): Promise<void> => {
    setLoadingHeavyOperation(true);
    try {
      // Get all completed tasks
      const completedTasks = tasks.filter(task => task.completed);
      
      // Delete each completed task
      await Promise.all(completedTasks.map(async (task) => {
        await deleteTask(task.id);
      }));
      
      // Update local state
      setTasks(tasks.filter(task => !task.completed));
    } catch (err) {
      console.error("Error deleting completed tasks:", err);
      setError("Failed to delete completed tasks. Please try again.");
      throw err;
    } finally {
      setLoadingHeavyOperation(false);
    }
  };

  const addProject = async (project: Omit<Project, 'id'>): Promise<Project> => {
    setLoadingHeavyOperation(true);
    try {
      // Create project in the API
      const newProject = await api.projects.create(project);
      
      // Update local state
      setProjects([...projects, newProject]);
      return newProject;
    } catch (err) {
      console.error("Error adding project:", err);
      setError("Failed to add project. Please try again.");
      throw err;
    } finally {
      setLoadingHeavyOperation(false);
    }
  };

  const deleteProject = async (id: string): Promise<void> => {
    setLoadingHeavyOperation(true);
    try {
      // Get all tasks for this project to clean up files - improved project reference handling
      const projectTasks = tasks.filter(task => {
        if (typeof task.project === 'string') {
          return task.project === id;
        } else if (task.project && typeof task.project === 'object' && 'id' in task.project) {
          return task.project.id === id;
        }
        return false;
      });
      
      console.log(`🗑️ TaskContext: Encontradas ${projectTasks.length} tarefas associadas ao projeto ${id}`);
      
      // Clean up file references
      projectTasks.forEach(task => {
        if (task.files) {
          task.files.forEach(file => {
            const fileKey = typeof file.url === 'string' && file.url.startsWith(FILES_PREFIX)
              ? file.url
              : `${FILES_PREFIX}${file.id}`;
            localStorage.removeItem(fileKey);
          });
        }
      });
      
      // Delete the project from the API - the backend will handle cascading deletes
      await api.projects.delete(id);
      console.log(`✅ TaskContext: Projeto ${id} excluído da API com deleção em cascata`);
      
      // Update local state
      setProjects(projects.filter(project => project.id !== id));
      
      // Remove tasks associated with this project - improved to handle both string and object references
      setTasks(tasks.filter(task => {
        if (typeof task.project === 'string') {
          return task.project !== id;
        } else if (task.project && typeof task.project === 'object' && 'id' in task.project) {
          return task.project.id !== id;
        }
        return true; // Keep tasks with invalid project references
      }));
      
      console.log(`✅ TaskContext: Projeto e tarefas associadas removidas do estado local`);
    } catch (err) {
      console.error("❌ TaskContext: Error deleting project:", err);
      setError("Falha ao excluir projeto. Por favor, tente novamente.");
      throw err;
    } finally {
      setLoadingHeavyOperation(false);
    }
  };

  const addComment = async (taskId: string, comment: Omit<Comment, 'id' | 'createdAt'>): Promise<Comment> => {
    setLoadingHeavyOperation(true);
    try {
      // Create the comment through the API
      const commentData = { ...comment, taskId };
      const newComment = await api.comments.create(commentData);
      
      // Update local state
      setTasks(tasks.map(task => {
        if (task.id === taskId) {
          const updatedComments = [...(task.comments || []), newComment];
          return { ...task, comments: updatedComments };
        }
        return task;
      }));
      
      return newComment;
    } catch (err) {
      console.error("Error adding comment:", err);
      setError("Failed to add comment. Please try again.");
      throw err;
    } finally {
      setLoadingHeavyOperation(false);
    }
  };
  
  // Files are still handled locally since we don't have file storage in the API yet
  const addFile = (taskId: string, file: Omit<TaskFile, 'id'>) => {
    // Verify file size
    if (file.url.length > 1024 * 1024) {
      setError("File is too large (max: 1MB)");
      return;
    }
    
    const newFile: TaskFile = {
      ...file,
      id: uuidv4()
    };
    
    // Store the file content in localStorage
    try {
      localStorage.setItem(`${FILES_PREFIX}${newFile.id}`, newFile.url);
      
      // Update the task with the file reference
      setTasks(tasks.map(task => {
        if (task.id === taskId) {
          const updatedFiles = [...(task.files || []), {
            ...newFile,
            url: `${FILES_PREFIX}${newFile.id}` // Store reference key instead of the full content
          }];
          return { ...task, files: updatedFiles };
        }
        return task;
      }));
    } catch (e) {
      console.error("Error saving file:", e);
      setError("Failed to save file. Storage might be full.");
    }
  };
  
  const removeFile = (taskId: string, fileId: string) => {
    setTasks(tasks.map(task => {
      if (task.id === taskId && task.files) {
        // Find the file to remove from localStorage
        const fileToRemove = task.files.find(file => file.id === fileId);
        if (fileToRemove) {
          const fileKey = typeof fileToRemove.url === 'string' && fileToRemove.url.startsWith(FILES_PREFIX)
            ? fileToRemove.url
            : `${FILES_PREFIX}${fileId}`;
          localStorage.removeItem(fileKey);
        }
        
        const updatedFiles = task.files.filter(file => file.id !== fileId);
        return { ...task, files: updatedFiles };
      }
      return task;
    }));
  };

  return (
    <TaskContext.Provider value={{ 
      tasks, 
      projects, 
      addTask, 
      updateTask, 
      deleteTask,
      deleteCompletedTasks,
      addProject, 
      deleteProject,
      addComment,
      addFile,
      removeFile,
      loading, // mantenha essa prop para compatibilidade com código existente
      error
    }}>
      {error && (
        <div className="notification is-danger is-light" style={{
          position: 'fixed',
          bottom: '1rem',
          right: '1rem',
          zIndex: 1000,
          maxWidth: '300px'
        }}>
          <button className="delete" onClick={() => setError(null)}></button>
          <p>{error}</p>
        </div>
      )}
      
      {children}
    </TaskContext.Provider>
  );
}

export function useTaskContext() {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTaskContext must be used within a TaskProvider');
  }
  return context;
}
