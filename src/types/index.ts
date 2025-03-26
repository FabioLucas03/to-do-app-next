export interface Comment {
  id: string;
  text: string;
  createdAt: Date;
}

export interface TaskFile {
  id: string;
  name: string;
  url: string; // Armazenará o URL do arquivo ou base64 para exemplos simples
  type: string; // Tipo MIME do arquivo
  size: number; // Tamanho em bytes
}

// Interface para os itens do checklist
export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  project: string | { id: string; name: string; }; // Atualizado para aceitar string ou objeto
  projectId?: string; // Adicionado para maior compatibilidade
  deadline: Date | string; // Modificar para aceitar tanto Date quanto string
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
  timeSpent: number; // in seconds
  timerActive?: boolean; // Novo campo para rastrear o estado do timer
  comments?: Comment[];
  files?: TaskFile[];
  checklist?: ChecklistItem[]; // Nova propriedade para o checklist
}

export interface Project {
  id: string;
  name: string;
}

export interface TimerState {
  isRunning: boolean;
  currentTaskId: string | null;
  startTime: number | null;
  elapsed: number;
}

export interface TaskContextProps {
  tasks: Task[];
  projects: Project[];
  addTask: (task: Omit<Task, 'id'>) => Promise<Task>;
  updateTask: (task: Task, options?: { showLoading?: boolean }) => Promise<Task>;
  deleteTask: (id: string) => Promise<void>;
  deleteCompletedTasks: () => Promise<void>;
  addProject: (project: Omit<Project, 'id'>) => Promise<Project>;
  deleteProject: (id: string) => Promise<void>;
  addComment: (taskId: string, comment: Omit<Comment, 'id' | 'createdAt'>) => Promise<Comment>;
  addFile: (taskId: string, file: Omit<TaskFile, 'id'>) => void;
  removeFile: (taskId: string, fileId: string) => void;
  loading: boolean;
  error: string | null;
}
