import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useTaskContext } from '../context/TaskContext';
import { 
  BarChart, 
  PieChart,
  LineChart
} from '@mui/x-charts';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { Grid, Box, Card, CardContent, Typography, Paper, Container, ButtonGroup, Button, CircularProgress } from '@mui/material';
import analyticsService from '../services/analytics';

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

export default function Analytics() {
  const [isClient, setIsClient] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'all'>('week');
  const [error, setError] = useState<string | null>(null);
  
  // State for analytics data
  const [summary, setSummary] = useState({
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    totalProjects: 0
  });
  const [tasksByStatus, setTasksByStatus] = useState<any[]>([]);
  const [tasksByPriority, setTasksByPriority] = useState<any[]>([]);
  const [tasksByProject, setTasksByProject] = useState<any[]>([]);
  const [timeSpentByProject, setTimeSpentByProject] = useState<any[]>([]);
  const [checklistProgress, setChecklistProgress] = useState<any[]>([]);
  const [tasksCompletionOverTime, setTasksCompletionOverTime] = useState<any[]>([]);

  // Ensure we only render charts on the client side to avoid SSR issues
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Fetch all analytics data when the component mounts
  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Fetch summary data
        const summaryData = await analyticsService.getSummary();
        setSummary(summaryData);
        
        // Fetch all other analytics in parallel
        const [
          statusData,
          priorityData,
          projectData,
          timeData,
          checklistData
        ] = await Promise.all([
          analyticsService.getTasksByStatus(),
          analyticsService.getTasksByPriority(),
          analyticsService.getTasksByProject(),
          analyticsService.getTimeSpentByProject(),
          analyticsService.getChecklistProgress()
        ]);
        
        setTasksByStatus(statusData);
        setTasksByPriority(priorityData);
        setTasksByProject(projectData);
        setTimeSpentByProject(timeData);
        setChecklistProgress(checklistData);
        
        // Fetch completion over time data separately based on timeRange
        await fetchCompletionOverTime(timeRange);
      } catch (err) {
        console.error('Failed to fetch analytics data:', err);
        setError('Falha ao carregar dados de analytics. Por favor, tente novamente.');
      } finally {
        setIsLoading(false);
      }
    };
    
    // Only fetch data on the client side
    if (isClient) {
      fetchAnalyticsData();
    }
  }, [isClient]);

  // Fetch completion over time data when timeRange changes
  const fetchCompletionOverTime = async (range: 'week' | 'month' | 'all') => {
    try {
      const completionData = await analyticsService.getTasksCompletionOverTime(range);
      
      // Convert date strings to Date objects for the chart
      const formattedData = completionData.map(item => ({
        date: new Date(item.date),
        count: item.count
      }));
      
      setTasksCompletionOverTime(formattedData);
    } catch (err) {
      console.error('Failed to fetch completion over time data:', err);
    }
  };

  // Handle time range change
  const handleTimeRangeChange = (range: 'week' | 'month' | 'all') => {
    setTimeRange(range);
    fetchCompletionOverTime(range);
  };

  if (!isClient) {
    return (
      <div className="container section has-text-centered">
        <p className="is-size-4 has-text-light">Carregando Analytics...</p>
      </div>
    );
  }

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
          <Link href="/" passHref legacyBehavior>
            <Button variant="contained" color="primary" component="a">
              Voltar à Lista de Tarefas
            </Button>
          </Link>
        </Box>

        {error && (
          <Paper sx={{ p: 2, mb: 3, bgcolor: 'error.dark' }}>
            <Typography color="white">{error}</Typography>
            <Button 
              variant="contained" 
              color="primary" 
              sx={{ mt: 2 }}
              onClick={() => window.location.reload()}
            >
              Tentar Novamente
            </Button>
          </Paper>
        )}

        {isLoading ? (
          <Box display="flex" justifyContent="center" alignItems="center" height="50vh">
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={3}>
            {/* Summary Cards */}
            <Grid item xs={12} md={3}>
              <Card sx={{ height: '100%', bgcolor: 'background.paper' }}>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Total de Tarefas
                  </Typography>
                  <Typography variant="h3">{summary.totalTasks}</Typography>
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
                    {summary.completedTasks}
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
                    {summary.pendingTasks}
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
                    {summary.totalProjects}
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
                  {tasksByStatus.length > 0 ? (
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
                  ) : (
                    <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                      <Typography color="text.secondary">Nenhum dado disponível</Typography>
                    </Box>
                  )}
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
                  {tasksByPriority.length > 0 ? (
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
                  ) : (
                    <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                      <Typography color="text.secondary">Nenhum dado disponível</Typography>
                    </Box>
                  )}
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
                  {tasksByProject.length > 0 ? (
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
                  ) : (
                    <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                      <Typography color="text.secondary">Nenhum dado disponível</Typography>
                    </Box>
                  )}
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
                  {timeSpentByProject.length > 0 ? (
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
                  ) : (
                    <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                      <Typography color="text.secondary">Nenhum dado disponível</Typography>
                    </Box>
                  )}
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
                  {checklistProgress.length > 0 ? (
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
                  ) : (
                    <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                      <Typography color="text.secondary">Nenhum dado disponível</Typography>
                    </Box>
                  )}
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
                    onClick={() => handleTimeRangeChange('week')}
                  >
                    Última Semana
                  </Button>
                  <Button 
                    variant={timeRange === 'month' ? 'contained' : 'outlined'}
                    onClick={() => handleTimeRangeChange('month')}
                  >
                    Último Mês
                  </Button>
                  <Button 
                    variant={timeRange === 'all' ? 'contained' : 'outlined'}
                    onClick={() => handleTimeRangeChange('all')}
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
        )}
      </Container>
    </ThemeProvider>
  );
}
