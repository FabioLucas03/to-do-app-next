import React, { useState, useEffect, useRef, memo } from 'react';
import api from '../services/api'; // Adicionar esta importação

interface TimerProps {
  taskId: string;
  onTimeUpdate: (taskId: string, time: number) => void;
  initialTime?: number;
}

// Completely separate timer state manager (singleton pattern)
class TimerManager {
  private static instance: TimerManager;
  private timers: Record<string, {
    isActive: boolean;
    currentTime: number;
    lastTickTime: number;
    updateCallbacks: Set<(time: number) => void>;
  }> = {};
  // Removemos o SAVE_INTERVAL e lastSaveTime, não precisamos mais disso

  // Adicionar rastreamento explícito de timers ativos entre remontagens
  private activeTimers: Set<string> = new Set();

  private constructor() {}

  public static getInstance(): TimerManager {
    if (!TimerManager.instance) {
      TimerManager.instance = new TimerManager();
    }
    return TimerManager.instance;
  }

  public registerTimer(id: string, initialTime: number = 0): void {
    if (!this.timers[id]) {
      this.timers[id] = {
        isActive: this.activeTimers.has(id), // Manter estado ativo entre remontagens
        currentTime: initialTime,
        lastTickTime: Date.now(),
        updateCallbacks: new Set()
      };
    } else if (this.timers[id].currentTime !== initialTime && initialTime > 0) {
      this.timers[id].currentTime = initialTime;
    }
  }

  public startTimer(id: string): void {
    if (this.timers[id]) {
      this.timers[id].isActive = true;
      this.timers[id].lastTickTime = Date.now();
      this.activeTimers.add(id); // Registrar timer ativo
      console.log(`⏱️ TimerManager: Timer ${id} started and added to active timers`);
    }
  }

  public stopTimer(id: string): void {
    if (this.timers[id]) {
      this.timers[id].isActive = false;
      this.activeTimers.delete(id); // Remover timer inativo
      console.log(`⏱️ TimerManager: Timer ${id} stopped and removed from active timers`);
    }
  }

  public resetTimer(id: string): void {
    if (this.timers[id]) {
      this.timers[id].isActive = false;
      this.timers[id].currentTime = 0;
      this.timers[id].lastTickTime = Date.now();
      // Notify all components about the reset
      this.timers[id].updateCallbacks.forEach(callback => callback(0));
    }
  }

  public updateTime(id: string, time: number): void {
    if (this.timers[id]) {
      this.timers[id].currentTime = time;
      this.timers[id].lastTickTime = Date.now();
    }
  }

  public getTime(id: string): number {
    return this.timers[id]?.currentTime || 0;
  }

  public isActive(id: string): boolean {
    return this.timers[id]?.isActive || false;
  }

  public addUpdateCallback(id: string, callback: (time: number) => void): void {
    if (this.timers[id]) {
      this.timers[id].updateCallbacks.add(callback);
    }
  }

  public removeUpdateCallback(id: string, callback: (time: number) => void): void {
    if (this.timers[id]) {
      this.timers[id].updateCallbacks.delete(callback);
    }
  }

  public calculateMissedTime(id: string): number {
    if (!this.timers[id] || !this.timers[id].isActive) return 0;
    
    const now = Date.now();
    const elapsed = Math.floor((now - this.timers[id].lastTickTime) / 1000);
    
    if (elapsed > 0) {
      this.timers[id].lastTickTime = now;
      this.timers[id].currentTime += elapsed;
      return this.timers[id].currentTime;
    }
    
    return this.timers[id].currentTime;
  }

  // Novo método para preservar o estado ativo
  public preserveTimerState(id: string): { isActive: boolean, time: number } {
    const timerState = {
      isActive: this.isActive(id),
      time: this.getTime(id)
    };
    console.log(`⏱️ TimerManager: Preserving timer state for ${id}: active=${timerState.isActive}, time=${timerState.time}`);
    return timerState;
  }

  public restoreTimerState(id: string, state: { isActive: boolean, time: number }): void {
    if (this.timers[id]) {
      this.timers[id].isActive = state.isActive;
      this.timers[id].currentTime = state.time;
      this.timers[id].lastTickTime = Date.now();
      
      // Manter o registro de timers ativos atualizado
      if (state.isActive) {
        this.activeTimers.add(id);
      } else {
        this.activeTimers.delete(id);
      }
      
      console.log(`⏱️ TimerManager: Restored timer state for ${id}: active=${state.isActive}, time=${state.time}`);
    }
  }

  // Não precisamos mais desses métodos
  // public shouldSaveToDatabase(id: string): boolean { ... }
  // public markAsSaved(id: string): void { ... }
}

// Component implementation using the singleton manager
const Timer = memo(({ taskId, onTimeUpdate, initialTime = 0 }: TimerProps) => {
  // Get the singleton timer manager
  const timerManager = TimerManager.getInstance();
  
  // Estado local simplificado
  const [seconds, setSeconds] = useState(initialTime);
  const [isActive, setIsActive] = useState(false);
  
  // Refs para valores que não precisam causar re-renderização
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const saveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastReportedTime = useRef<number>(initialTime);
  const currentSecondsRef = useRef<number>(initialTime);
  const mountCountRef = useRef(0); // Rastrear montagens para lidar com remontagens durante navegação de UI
  const preservedStateRef = useRef<{isActive: boolean, time: number} | null>(null);
  
  // Atualizar a ref do valor atual sempre que o estado mudar
  useEffect(() => {
    currentSecondsRef.current = seconds;
  }, [seconds]);

  // Inicialização e limpeza com lógica aprimorada para remontagens
  useEffect(() => {
    mountCountRef.current++;
    const currentMountCount = mountCountRef.current;
    console.log(`⏱️ Timer[${taskId}]: Mounting timer component #${currentMountCount}, initialTime=${initialTime}`);
    
    // Verificar se há um estado ativo no TimerManager ou um estado preservado
    const timerActive = timerManager.isActive(taskId);
    const wasActive = preservedStateRef.current?.isActive || timerActive;
    
    console.log(`⏱️ Timer[${taskId}]: Timer was active? ${wasActive}, manager active=${timerActive}`);
    
    // Se tivermos um estado preservado de uma montagem anterior, restaure-o
    if (preservedStateRef.current) {
      console.log(`⏱️ Timer[${taskId}]: Restoring preserved state: active=${preservedStateRef.current.isActive}, time=${preservedStateRef.current.time}`);
      
      // Atualizar o TimerManager com o estado preservado
      timerManager.restoreTimerState(taskId, preservedStateRef.current);
      
      // Atualizar o estado local
      setSeconds(preservedStateRef.current.time);
      setIsActive(preservedStateRef.current.isActive);
      currentSecondsRef.current = preservedStateRef.current.time;
      
      // Limpar o estado preservado após a restauração
      preservedStateRef.current = null;
    } else {
      // Registrar o timer no gerenciador
      timerManager.registerTimer(taskId, initialTime);
      
      // Inicializar valores a partir do TimerManager
      const storedTime = Math.max(initialTime, timerManager.getTime(taskId));
      
      console.log(`⏱️ Timer[${taskId}]: Initial values - time=${storedTime}, active=${wasActive}`);
      
      // Atualizar estado local
      setSeconds(storedTime);
      currentSecondsRef.current = storedTime;
      lastReportedTime.current = storedTime;
      
      // IMPORTANTE: Manter o estado ativo se o timer estava ativo antes
      if (wasActive) {
        setIsActive(true);
        timerManager.startTimer(taskId);
      }
    }
    
    // Evento para salvar quando a janela é fechada
    const handleBeforeUnload = () => {
      const currentTime = currentSecondsRef.current;
      const currentActive = isActive;
      console.log(`⏱️ Timer[${taskId}]: Window closing, saving time=${currentTime}, active=${currentActive}`);
      
      // Salvar tempo e estado
      api.tasks.updateTimer(taskId, currentTime, currentActive)
        .catch(error => console.error('Failed to save timer state on page close:', error));
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      // Verificar se estamos sendo desmontados devido à navegação de UI ou fechamento real
      const isRealUnmount = mountCountRef.current === currentMountCount;
      
      // Limpar recursos ao desmontar
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      // Preservar o estado para possível remontagem
      const currentActive = timerManager.isActive(taskId);
      const currentTime = currentSecondsRef.current;
      
      console.log(`⏱️ Timer[${taskId}]: Unmounting #${currentMountCount}, preserving state: active=${currentActive}, time=${currentTime}`);
      preservedStateRef.current = { isActive: currentActive, time: currentTime };
      
      // Limpar intervalos, mas não alterar o estado do timer no TimerManager
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      
      if (saveIntervalRef.current) {
        clearInterval(saveIntervalRef.current);
        saveIntervalRef.current = null;
      }
      
      // Apenas salvar o tempo, sem mudar o estado ativo
      onTimeUpdate(taskId, currentTime);
    };
  }, [taskId, timerManager, initialTime]);

  // Efeito separado para lidar com as mudanças de estado ativo/inativo
  useEffect(() => {
    console.log(`⏱️ Timer[${taskId}]: Active state changed to ${isActive}`);
    
    // Verificar se o timer estava ativo no banco de dados ao inicializar
    const checkTimerStateInBackend = async () => {
      try {
        // Faça uma chamada única para verificar o estado do timer no backend
        const task = await api.tasks.getOne(taskId);
        if (task.timerActive && !isActive) {
          console.log(`⏱️ Timer[${taskId}]: Timer was active in backend but inactive locally. Activating...`);
          setIsActive(true);
        }
      } catch (error) {
        console.error(`⏱️ Timer[${taskId}]: Failed to check timer state in backend`, error);
      }
    };
    
    // Verificar o estado do timer apenas na montagem inicial
    if (!isActive && mountCountRef.current === 1) {
      checkTimerStateInBackend();
    }
    
    if (isActive) {
      // Parar qualquer intervalo existente antes de criar novos
      stopIntervals();
      
      // Iniciar intervalo principal para contagem (1 segundo)
      intervalRef.current = setInterval(() => {
        setSeconds(prevSeconds => {
          const newValue = prevSeconds + 1;
          currentSecondsRef.current = newValue; // Atualizar a ref
          timerManager.updateTime(taskId, newValue);
          return newValue;
        });
      }, 1000);
      
      // Iniciar intervalo para salvar no backend (1 minuto)
      saveIntervalRef.current = setInterval(() => {
        const currentTime = currentSecondsRef.current;
        console.log(`⏱️ Timer[${taskId}]: Auto-saving active timer, time=${currentTime}`);
        
        if (currentTime > lastReportedTime.current) {
          onTimeUpdate(taskId, currentTime);
          lastReportedTime.current = currentTime;
          
          // Atualizar também o estado ativo, mantendo-o ativo
          api.tasks.updateTimer(taskId, currentTime, true)
            .catch(error => console.error('Failed to update active timer state:', error));
        }
      }, 60000); // 1 minuto
      
      // Registrar no gerenciador
      timerManager.startTimer(taskId);
      
    } else if (timerManager.isActive(taskId)) { // Só parar se estava realmente ativo
      // Parar o timer apenas se o botão de pausa foi clicado
      stopIntervals();
      timerManager.stopTimer(taskId);
      
      // Salvar estado atual no backend quando pausar
      const currentTime = currentSecondsRef.current;
      console.log(`⏱️ Timer[${taskId}]: Saving on pause, time=${currentTime}`);
      
      onTimeUpdate(taskId, currentTime);
      lastReportedTime.current = currentTime;
      
      // Salvar estado inativo no backend
      api.tasks.updateTimer(taskId, currentTime, false)
        .catch(error => console.error('Failed to save inactive state:', error));
    }
    
    return () => {
      stopIntervals();
    };
  }, [isActive, taskId]); // Remover seconds e outras dependências não essenciais
  
  // Função auxiliar para parar intervalos
  const stopIntervals = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    if (saveIntervalRef.current) {
      clearInterval(saveIntervalRef.current);
      saveIntervalRef.current = null;
    }
  };

  // Handler para alternar entre ativo/inativo
  const handleToggle = () => {
    console.log(`⏱️ Timer[${taskId}]: Toggle button clicked, current=${isActive}`);
    
    // Quando alternar para ativo, atualizar o backend imediatamente
    if (!isActive) {
      api.tasks.updateTimer(taskId, currentSecondsRef.current, true)
        .then(() => console.log(`⏱️ Timer[${taskId}]: Timer activated in backend`))
        .catch(error => console.error('Failed to activate timer in backend:', error));
    }
    
    setIsActive(!isActive);
  };
  
  // Handler para resetar o timer
  const handleReset = () => {
    console.log(`⏱️ Timer[${taskId}]: Reset button clicked`);
    
    // Parar o timer e limpar intervalos
    setIsActive(false);
    stopIntervals();
    
    // Resetar valores
    setSeconds(0);
    currentSecondsRef.current = 0;
    lastReportedTime.current = 0;
    timerManager.resetTimer(taskId);
    
    // Salvar o reset no backend
    onTimeUpdate(taskId, 0);
    api.tasks.updateTimer(taskId, 0, false)
      .catch(error => console.error('Failed to save reset state:', error));
  };
  
  const formatTime = (timeInSeconds: number) => {
    const hrs = Math.floor(timeInSeconds / 3600);
    const mins = Math.floor((timeInSeconds % 3600) / 60);
    const secs = timeInSeconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  return (
    <div 
      className="card timer-card" 
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
    >
      <div className="card-content">
        <p className="is-size-4">{formatTime(seconds)}</p>
        <div className="buttons">
          <button 
            className={`button ${isActive ? 'is-danger' : 'is-primary'} mt-2`}
            onClick={handleToggle}
            type="button"
          >
            {isActive ? 'Pause' : 'Start'}
          </button>
          <button 
            className="button is-light mt-2"
            onClick={handleReset}
            type="button"
            disabled={seconds === 0}
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
});

export default Timer;
