import axios from 'axios';
import { Project, Task, Comment, ChecklistItem } from '../types';

const API_BASE_URL = 'http://localhost:8080/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request logging
api.interceptors.request.use(
  (config) => {
    console.log(`🚀 API REQUEST: ${config.method?.toUpperCase()} ${config.url}`);
    if (config.data) {
      console.log('📦 Request Payload:', config.data);
    }
    return config;
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// Add response logging
api.interceptors.response.use(
  (response) => {
    console.log(`✅ API RESPONSE ${response.status}: ${response.config.method?.toUpperCase()} ${response.config.url}`);
    console.log('📦 Response Data:', response.data);
    return response;
  },
  (error) => {
    console.error('❌ Response Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Project API
export const projectApi = {
  getAll: async (): Promise<Project[]> => {
    const response = await api.get('/projects');
    return response.data;
  },
  
  getOne: async (id: string): Promise<Project> => {
    const response = await api.get(`/projects/${id}`);
    return response.data;
  },
  
  create: async (project: Omit<Project, 'id'>): Promise<Project> => {
    const response = await api.post('/projects', project);
    return response.data;
  },
  
  update: async (id: string, project: Partial<Project>): Promise<Project> => {
    const response = await api.put(`/projects/${id}`, project);
    return response.data;
  },
  
  delete: async (id: string): Promise<void> => {
    await api.delete(`/projects/${id}`);
  }
};

// Task API
export const taskApi = {
  getAll: async (): Promise<Task[]> => {
    console.log('🔍 Fetching all tasks');
    const response = await api.get('/tasks');
    console.log(`📊 Retrieved ${response.data.length} tasks`);
    return response.data;
  },
  
  getByProject: async (projectId: string): Promise<Task[]> => {
    console.log(`🔍 Fetching tasks for project: ${projectId}`);
    const response = await api.get(`/tasks?projectId=${projectId}`);
    console.log(`📊 Retrieved ${response.data.length} tasks for project ${projectId}`);
    return response.data;
  },
  
  getOne: async (id: string): Promise<Task> => {
    console.log(`🔍 Fetching task: ${id}`);
    const response = await api.get(`/tasks/${id}`);
    console.log(`📊 Retrieved task: ${id}`);
    return response.data;
  },
  
  create: async (task: Omit<Task, 'id'>): Promise<Task> => {
    console.log('➕ Creating new task:', task);
    
    // Format deadline correctly if it's not already an ISO string
    if (task.deadline && !(task.deadline instanceof Date)) {
      console.log(`🔄 Original deadline: ${task.deadline}`);
      // Ensure deadline is an ISO string
      if (typeof task.deadline === 'string' && !task.deadline.includes('T')) {
        task.deadline = new Date(task.deadline).toISOString();
      }
      console.log(`🔄 Formatted deadline: ${task.deadline}`);
    }
    
    // Garantir que projectId seja enviado corretamente
    const taskToSend = { ...task };
    if (taskToSend.project) {
      taskToSend.projectId = taskToSend.project;
      console.log(`🔄 Setting projectId from project: ${taskToSend.projectId}`);
    }
    
    const response = await api.post('/tasks', taskToSend);
    console.log('✅ Task created successfully:', response.data);
    return response.data;
  },
  
  update: async (id: string, task: Partial<Task>): Promise<Task> => {
    console.log(`🔄 API: Atualizando tarefa ${id}:`, task);
    
    // Clone task to avoid modifying the original
    const taskToUpdate = { ...task };
    
    // Ensure deadline is properly formatted if it exists
    if (taskToUpdate.deadline) {
      console.log(`🔄 API: Deadline original: ${taskToUpdate.deadline}`);
      
      // If deadline is a Date object, convert to ISO string
      if (taskToUpdate.deadline instanceof Date) {
        console.log(`🔄 API: Convertendo Date para string ISO`);
        taskToUpdate.deadline = taskToUpdate.deadline.toISOString();
      }
      // If it's a string but not ISO formatted, convert it
      else if (typeof taskToUpdate.deadline === 'string' && !taskToUpdate.deadline.includes('T')) {
        console.log(`🔄 API: Convertendo string para Date e ISO`);
        try {
          taskToUpdate.deadline = new Date(taskToUpdate.deadline).toISOString();
        } catch (e) {
          console.error(`Erro ao converter data: ${e}`);
        }
      }
      
      console.log(`🔄 API: Deadline final: ${taskToUpdate.deadline}`);
    }
    
    // Explicitamente logging do campo completed
    console.log(`🔄 API: Campo 'completed' antes do envio:`, taskToUpdate.completed);
    
    // Enviar para a API
    const response = await api.put(`/tasks/${id}`, taskToUpdate);
    console.log('✅ API: Resposta da API após update:', response.data);
    return response.data;
  },
  
  // Adicionar uma função específica para atualizar apenas o tempo (mais leve)
  updateTimeOnly: async (id: string, timeSpent: number): Promise<void> => {
    console.log(`⏱️ API: Atualizando apenas o tempo da tarefa ${id} para ${timeSpent}s`);
    try {
      // Patch em vez de Put para enviar apenas os dados necessários
      await api.patch(`/tasks/${id}/time`, { timeSpent });
      console.log('✅ Tempo atualizado com sucesso no backend');
    } catch (error) {
      console.error('❌ Error updating task time:', error);
      // Não propagar o erro para não interromper a UI
    }
  },
  
  // Método específico para atualizar tanto o tempo quanto o estado ativo do timer
  updateTimer: async (id: string, timeSpent: number, timerActive: boolean): Promise<void> => {
    console.log(`⏱️ API: Atualizando timer da tarefa ${id}: tempo=${timeSpent}s, ativo=${timerActive}`);
    try {
      await api.patch(`/tasks/${id}/timer`, { timeSpent, timerActive });
      console.log('✅ Estado do timer atualizado com sucesso no backend');
    } catch (error) {
      console.error('❌ Error updating timer state:', error);
      throw error;
    }
  },
  
  delete: async (id: string): Promise<void> => {
    console.log(`❌ Deleting task: ${id}`);
    await api.delete(`/tasks/${id}`);
    console.log('✅ Task deleted successfully');
  }
};

// Comment API
export const commentApi = {
  getByTask: async (taskId: string): Promise<Comment[]> => {
    const response = await api.get(`/comments/task/${taskId}`);
    return response.data;
  },
  
  create: async (comment: Omit<Comment, 'id' | 'createdAt'>): Promise<Comment> => {
    const response = await api.post('/comments', comment);
    return response.data;
  },
  
  update: async (id: string, comment: Partial<Comment>): Promise<Comment> => {
    const response = await api.put(`/comments/${id}`, comment);
    return response.data;
  },
  
  delete: async (id: string): Promise<void> => {
    await api.delete(`/comments/${id}`);
  }
};

// Checklist API
export const checklistApi = {
  getByTask: async (taskId: string): Promise<ChecklistItem[]> => {
    const response = await api.get(`/checklist/task/${taskId}`);
    return response.data;
  },
  
  create: async (item: Omit<ChecklistItem, 'id'>): Promise<ChecklistItem> => {
    const response = await api.post('/checklist', item);
    return response.data;
  },
  
  update: async (id: string, item: Partial<ChecklistItem>): Promise<ChecklistItem> => {
    const response = await api.put(`/checklist/${id}`, item);
    return response.data;
  },
  
  delete: async (id: string): Promise<void> => {
    await api.delete(`/checklist/${id}`);
  }
};

export default {
  projects: projectApi,
  tasks: taskApi,
  comments: commentApi,
  checklist: checklistApi,
};
