import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useTaskContext } from '../context/TaskContext';
import { Task, Project } from '../types';
import { 
  BarChart, 
  PieChart,
  LineChart
} from '@mui/x-charts';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { Grid, Box, Card, CardContent, Typography, Paper, Container, ButtonGroup, Button } from '@mui/material';

// Create a dark theme for MUI components to match the app's dark theme
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#6a329f', // Purple color from your app
    },
    secondary: {
      main: '#3298dc', // Info color (blue)
    },
    error: {
      main: '#ff3860', // Danger color
    },
    warning: {
      main: '#ffdd57', // Warning color
    },
    success: {
      main: '#23d160', // Success color
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
  },
});

// Mock data for when we don't want to use the backend
const mockTaskData = [
  { id: '1', title: 'Task 1', completed: true, priority: 'high', project: 'project1', timeSpent: 7200, deadline: new Date('2023-05-10'), checklist: [{ id: '1', text: 'Item 1', completed: true }, { id: '2', text: 'Item 2', completed: true }] },
  { id: '2', title: 'Task 2', completed: false, priority: 'medium', project: 'project1', timeSpent: 3600, deadline: new Date('2023-05-15'), checklist: [{ id: '3', text: 'Item 1', completed: true }, { id: '4', text: 'Item 2', completed: false }] },
  { id: '3', title: 'Task 3', completed: true, priority: 'low', project: 'project2', timeSpent: 1800, deadline: new Date('2023-05-05'), checklist: [{ id: '5', text: 'Item 1', completed: true }] },
  { id: '4', title: 'Task 4', completed: false, priority: 'high', project: 'project3', timeSpent: 5400, deadline: new Date('2023-05-20'), checklist: [] },
  { id: '5', title: 'Task 5', completed: false, priority: 'medium', project: 'project2', timeSpent: 900, deadline: new Date('2023-05-25'), checklist: [{ id: '6', text: 'Item 1', completed: false }] },
  { id: '6', title: 'Task 6', completed: true, priority: 'low', project: 'project3', timeSpent: 10800, deadline: new Date('2023-05-01'), checklist: [] },
  { id: '7', title: 'Task 7', completed: false, priority: 'high', project: 'project1', timeSpent: 2700, deadline: new Date('2023-05-18'), checklist: [] },
  { id: '8', title: 'Task 8', completed: true, priority: 'medium', project: 'project2', timeSpent: 8100, deadline: new Date('2023-04-28'), checklist: [{ id: '7', text: 'Item 1', completed: true }] },
];

const mockProjectData = [
  { id: 'project1', name: 'Website Redesign' },
  { id: 'project2', name: 'Mobile App' },
  { id: 'project3', name: 'Backend API' },
];

export default function Analytics() {
  const { tasks: contextTasks, projects: contextProjects } = useTaskContext();
  const [isClient, setIsClient] = useState(false);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'all'>('week');
  const [useMockData, setUseMockData] = useState(true); // Set to true to use mock data

  // Data sources - either context data or mock data
  const tasks = useMockData ? mockTaskData : contextTasks;
  const projects = useMockData ? mockProjectData : contextProjects;

  // Ensure we only render charts on the client side to avoid SSR issues
  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div className="container section has-text-centered">
        <p className="is-size-4 has-text-light">Carregando Analytics...</p>
      </div>
    );
  }

  // Data processing functions
  const calculateTasksByStatus = () => {
    const completed = tasks.filter(task => task.completed).length;
    const pending = tasks.length - completed;
    return [
      { id: 0, value: completed, label: 'Concluídas', color: '#23d160' },
      { id: 1, value: pending, label: 'Pendentes', color: '#ff3860' }
    ];
  };

  const calculateTasksByPriority = () => {
    const high = tasks.filter(task => task.priority === 'high').length;
    const medium = tasks.filter(task => task.priority === 'medium').length;
    const low = tasks.filter(task => task.priority === 'low').length;
    
    return [
      { id: 0, value: high, label: 'Alta', color: '#ff3860' },
      { id: 1, value: medium, label: 'Média', color: '#ffdd57' },
      { id: 2, value: low, label: 'Baixa', color: '#3298dc' },
    ];
  };

  const calculateTasksByProject = () => {
    const projectCounts = new Map<string, { count: number, name: string, color: string }>();
    
    // Predefined colors for consistency
    const colors = ['#6a329f', '#3298dc', '#ff3860', '#ffdd57', '#23d160', '#ff9e3b', '#b86bff', '#54c8ff'];
    
    // Count tasks by project
    tasks.forEach(task => {
      let projectId: string;
      
      if (typeof task.project === 'string') {
        projectId = task.project;
      } else if (task.project && typeof task.project === 'object') {
        projectId = task.project.id;
      } else if (task.projectId) {
        projectId = task.projectId;
      } else {
        // Skip if no project association
        return;
      }
      
      if (!projectCounts.has(projectId)) {
        const project = projects.find(p => p.id === projectId);
        projectCounts.set(projectId, { 
          count: 0, 
          name: project?.name || 'Unknown Project',
          color: colors[projectCounts.size % colors.length]
        });
      }
      
      const currentCount = projectCounts.get(projectId)!.count;
      projectCounts.set(projectId, {
        ...projectCounts.get(projectId)!,
        count: currentCount + 1
      });
    });
    
    return Array.from(projectCounts.entries()).map(([id, data], index) => ({
      id: index,
      value: data.count,
      label: data.name,
      color: data.color
    }));
  };

  const calculateTimeSpentByProject = () => {
    const timeByProject = new Map<string, { total: number, name: string }>();
    
    tasks.forEach(task => {
      let projectId: string;
      
      if (typeof task.project === 'string') {
        projectId = task.project;
      } else if (task.project && typeof task.project === 'object') {
        projectId = task.project.id;
      } else if (task.projectId) {
        projectId = task.projectId;
      } else {
        // Skip if no project association
        return;
      }
      
      if (!timeByProject.has(projectId)) {
        const project = projects.find(p => p.id === projectId);
        timeByProject.set(projectId, { 
          total: 0, 
          name: project?.name || 'Unknown Project' 
        });
      }
      
      const currentTotal = timeByProject.get(projectId)!.total;
      timeByProject.set(projectId, {
        ...timeByProject.get(projectId)!,
        total: currentTotal + (task.timeSpent || 0)
      });
    });
    
    // Convert seconds to hours for better visualization
    return Array.from(timeByProject.entries()).map(([id, data]) => ({
      project: data.name,
      hours: Math.round((data.total / 3600) * 100) / 100 // Convert to hours with 2 decimal places
    }));
  };

  const calculateChecklistProgress = () => {
    let totalItems = 0;
    let completedItems = 0;
    
    tasks.forEach(task => {
      if (task.checklist && task.checklist.length > 0) {
        totalItems += task.checklist.length;
        completedItems += task.checklist.filter(item => item.completed).length;
      }
    });
    
    return [
      { id: 0, value: completedItems, label: 'Concluídos', color: '#23d160' },
      { id: 1, value: totalItems - completedItems, label: 'Pendentes', color: '#ff3860' }
    ];
  };

  const calculateTasksCompletionOverTime = () => {
    // Filter tasks based on the selected time range
    const now = new Date();
    const filteredTasks = tasks.filter(task => {
      if (!task.completed) return false;
      
      const completionDate = new Date(task.deadline); // Using deadline as a proxy for completion date
      
      if (timeRange === 'week') {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(now.getDate() - 7);
        return completionDate >= oneWeekAgo;
      }
      
      if (timeRange === 'month') {
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(now.getMonth() - 1);
        return completionDate >= oneMonthAgo;
      }
      
      return true; // 'all' time range
    });
    
    // Group by date
    const completionByDate: Record<string, number> = {};
    
    filteredTasks.forEach(task => {
      const date = new Date(task.deadline);
      const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
      
      if (!completionByDate[dateStr]) {
        completionByDate[dateStr] = 0;
      }
      
      completionByDate[dateStr] += 1;
    });
    
    // Sort dates and prepare data for chart
    const sortedDates = Object.keys(completionByDate).sort();
    
    return sortedDates.map(date => {
      const [year, month, day] = date.split('-').map(Number);
      return {
        date: new Date(year, month - 1, day),
        count: completionByDate[date]
      };
    });
  };

  // Chart data
  const tasksByStatus = calculateTasksByStatus();
  const tasksByPriority = calculateTasksByPriority();
  const tasksByProject = calculateTasksByProject();
  const timeSpentByProject = calculateTimeSpentByProject();
  const checklistProgress = calculateChecklistProgress();
  const tasksCompletionOverTime = calculateTasksCompletionOverTime();

  // Toggle between mock and real data
  const toggleDataSource = () => {
    setUseMockData(!useMockData);
  };

  return (
    <ThemeProvider theme={darkTheme}>
      <Head>
        <title>Analytics - Task Todo Next</title>
        <meta name="description" content="Analytics dashboard for task management" />
      </Head>

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4, background: '#121212', color: '#ffffff' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Typography variant="h4" component="h1">
            Dashboard de Analytics
          </Typography>
          <Box>
            <Button 
              sx={{ mr: 2 }} 
              variant={useMockData ? "contained" : "outlined"} 
              color="secondary"
              onClick={toggleDataSource}
            >
              {useMockData ? "Usando Dados de Exemplo" : "Usando Dados Reais"}
            </Button>
            <Link href="/" passHref legacyBehavior>
              <Button variant="contained" color="primary" component="a">
                Voltar à Lista de Tarefas
              </Button>
            </Link>
          </Box>
        </Box>

        <Grid container spacing={3}>
          {/* Summary Cards */}
          <Grid item xs={12} md={3}>
            <Card sx={{ height: '100%', bgcolor: 'background.paper' }}>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Total de Tarefas
                </Typography>
                <Typography variant="h3">{tasks.length}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card sx={{ height: '100%', bgcolor: 'background.paper' }}>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Tarefas Concluídas
                </Typography>
                <Typography variant="h3" color="success.main">
                  {tasks.filter(task => task.completed).length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card sx={{ height: '100%', bgcolor: 'background.paper' }}>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Tarefas Pendentes
                </Typography>
                <Typography variant="h3" color="error.main">
                  {tasks.filter(task => !task.completed).length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card sx={{ height: '100%', bgcolor: 'background.paper' }}>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Total de Projetos
                </Typography>
                <Typography variant="h3" color="primary.main">
                  {projects.length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Task Status Chart */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, height: '100%', bgcolor: 'background.paper' }}>
              <Typography variant="h6" gutterBottom>
                Tarefas por Status
              </Typography>
              <Box sx={{ height: 300 }}>
                <PieChart
                  series={[{
                    data: tasksByStatus,
                    innerRadius: 30,
                    outerRadius: 100,
                    paddingAngle: 1,
                    cornerRadius: 5,
                    startAngle: -90,
                    endAngle: 270,
                    cx: 150,
                    cy: 150
                  }]}
                  width={400}
                  height={300}
                  slotProps={{
                    legend: { hidden: false }
                  }}
                />
              </Box>
            </Paper>
          </Grid>

          {/* Task Priority Chart */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, height: '100%', bgcolor: 'background.paper' }}>
              <Typography variant="h6" gutterBottom>
                Tarefas por Prioridade
              </Typography>
              <Box sx={{ height: 300 }}>
                <PieChart
                  series={[{
                    data: tasksByPriority,
                    innerRadius: 30,
                    outerRadius: 100,
                    paddingAngle: 1,
                    cornerRadius: 5,
                    startAngle: -90,
                    endAngle: 270,
                    cx: 150,
                    cy: 150
                  }]}
                  width={400}
                  height={300}
                  slotProps={{
                    legend: { hidden: false }
                  }}
                />
              </Box>
            </Paper>
          </Grid>

          {/* Tasks by Project */}
          <Grid item xs={12}>
            <Paper sx={{ p: 2, bgcolor: 'background.paper' }}>
              <Typography variant="h6" gutterBottom>
                Distribuição de Tarefas por Projeto
              </Typography>
              <Box sx={{ height: 400 }}>
                <BarChart
                  xAxis={[{
                    id: 'projects',
                    data: tasksByProject.map(item => item.label),
                    scaleType: 'band',
                  }]}
                  series={[{
                    data: tasksByProject.map(item => item.value),
                    color: '#6a329f',
                    label: 'Tarefas'
                  }]}
                  height={400}
                />
              </Box>
            </Paper>
          </Grid>

          {/* Time Spent by Project */}
          <Grid item xs={12}>
            <Paper sx={{ p: 2, bgcolor: 'background.paper' }}>
              <Typography variant="h6" gutterBottom>
                Tempo Gasto por Projeto (horas)
              </Typography>
              <Box sx={{ height: 400 }}>
                <BarChart
                  xAxis={[{
                    id: 'projects',
                    data: timeSpentByProject.map(item => item.project),
                    scaleType: 'band',
                  }]}
                  series={[{
                    data: timeSpentByProject.map(item => item.hours),
                    color: '#3298dc',
                    label: 'Horas'
                  }]}
                  height={400}
                />
              </Box>
            </Paper>
          </Grid>

          {/* Checklist Progress */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, height: '100%', bgcolor: 'background.paper' }}>
              <Typography variant="h6" gutterBottom>
                Progresso dos Checklists
              </Typography>
              <Box sx={{ height: 300 }}>
                <PieChart
                  series={[{
                    data: checklistProgress,
                    innerRadius: 30,
                    outerRadius: 100,
                    paddingAngle: 1,
                    cornerRadius: 5,
                    startAngle: -90,
                    endAngle: 270,
                    cx: 150,
                    cy: 150
                  }]}
                  width={400}
                  height={300}
                  slotProps={{
                    legend: { hidden: false }
                  }}
                />
              </Box>
            </Paper>
          </Grid>

          {/* Tasks Completed Over Time */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, height: '100%', bgcolor: 'background.paper' }}>
              <Typography variant="h6" gutterBottom>
                Tarefas Concluídas ao Longo do Tempo
              </Typography>
              <ButtonGroup size="small" sx={{ mb: 2 }}>
                <Button 
                  variant={timeRange === 'week' ? 'contained' : 'outlined'} 
                  onClick={() => setTimeRange('week')}
                >
                  Última Semana
                </Button>
                <Button 
                  variant={timeRange === 'month' ? 'contained' : 'outlined'}
                  onClick={() => setTimeRange('month')}
                >
                  Último Mês
                </Button>
                <Button 
                  variant={timeRange === 'all' ? 'contained' : 'outlined'}
                  onClick={() => setTimeRange('all')}
                >
                  Todo Período
                </Button>
              </ButtonGroup>
              <Box sx={{ height: 260 }}>
                {tasksCompletionOverTime.length > 0 ? (
                  <LineChart
                    xAxis={[{
                      data: tasksCompletionOverTime.map(item => item.date),
                      scaleType: 'time',
                      valueFormatter: (date) => 
                        date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
                    }]}
                    series={[{
                      data: tasksCompletionOverTime.map(item => item.count),
                      area: true,
                      showMark: true,
                      color: '#6a329f',
                      label: 'Tarefas Concluídas'
                    }]}
                    height={260}
                  />
                ) : (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                    <Typography color="text.secondary">
                      Nenhum dado disponível para o período selecionado
                    </Typography>
                  </Box>
                )}
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </ThemeProvider>
  );
}
