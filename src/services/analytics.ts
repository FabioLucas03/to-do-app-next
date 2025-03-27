import axios from 'axios';
import api from './api';

// Create a dedicated analytics API service
const analyticsApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Add logging interceptors
analyticsApi.interceptors.request.use(
  config => {
    console.log(`📊 Analytics API Request to: ${config.url}`);
    return config;
  },
  error => {
    console.error('❌ Analytics API Request Error:', error);
    return Promise.reject(error);
  }
);

analyticsApi.interceptors.response.use(
  response => {
    console.log(`✅ Analytics API Response from: ${response.config.url}`, response.status);
    return response;
  },
  error => {
    console.error('❌ Analytics API Response Error:', error);
    return Promise.reject(error);
  }
);

interface TasksByStatusItem {
  id: number;
  value: number;
  label: string;
  color: string;
}

interface TasksByPriorityItem {
  id: number;
  value: number;
  label: string;
  color: string;
}

interface TasksByProjectItem {
  id: number;
  value: number;
  label: string;
  color: string;
}

interface TimeSpentByProjectItem {
  project: string;
  hours: number;
}

interface ChecklistProgressItem {
  id: number;
  value: number;
  label: string;
  color: string;
}

interface TaskCompletionOverTimeItem {
  date: string;
  count: number;
}

interface SummaryData {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  totalProjects: number;
}

export const analyticsService = {
  getTasksByStatus: async (): Promise<TasksByStatusItem[]> => {
    const response = await analyticsApi.get('/analytics/tasks-by-status');
    return response.data;
  },

  getTasksByPriority: async (): Promise<TasksByPriorityItem[]> => {
    const response = await analyticsApi.get('/analytics/tasks-by-priority');
    return response.data;
  },

  getTasksByProject: async (): Promise<TasksByProjectItem[]> => {
    const response = await analyticsApi.get('/analytics/tasks-by-project');
    return response.data;
  },

  getTimeSpentByProject: async (): Promise<TimeSpentByProjectItem[]> => {
    const response = await analyticsApi.get('/analytics/time-by-project');
    return response.data;
  },

  getChecklistProgress: async (): Promise<ChecklistProgressItem[]> => {
    const response = await analyticsApi.get('/analytics/checklist-progress');
    return response.data;
  },

  getTasksCompletionOverTime: async (timeRange: 'week' | 'month' | 'all'): Promise<TaskCompletionOverTimeItem[]> => {
    const response = await analyticsApi.get(`/analytics/completion-over-time?timeRange=${timeRange}`);
    return response.data;
  },

  getSummary: async (): Promise<SummaryData> => {
    const response = await analyticsApi.get('/analytics/summary');
    return response.data;
  }
};

export default analyticsService;
