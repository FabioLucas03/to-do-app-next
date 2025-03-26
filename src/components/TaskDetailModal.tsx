import React, { useState, useEffect, useRef } from 'react';
import { useTaskContext } from '../context/TaskContext';
import { Task, Comment, TaskFile, ChecklistItem } from '../types';
import { v4 as uuidv4 } from 'uuid';
import TaskForm from './TaskForm';
import api from '../services/api'; // Adicionar esta importação

interface TaskDetailModalProps {
  task: Task;
  onClose: () => void;
}

export default function TaskDetailModal({ task: initialTask, onClose }: TaskDetailModalProps) {
  const { tasks, updateTask, addComment } = useTaskContext();
  const [activeTab, setActiveTab] = useState(() => {
    return initialTask.checklist && initialTask.checklist.length > 0 ? 'checklist' : 'details';
  });
  const [comment, setComment] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  
  // Estado para edição de comentários
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState('');
  
  // Estado para o checklist
  const [newChecklistItem, setNewChecklistItem] = useState('');
  
  // Estado local para manter a tarefa atualizada
  const [task, setTask] = useState<Task>(initialTask);
  
  // Adicionar estado para o tempo atualizado
  const [displayedTime, setDisplayedTime] = useState<number>(initialTask.timeSpent || 0);
  
  // UseEffect para sincronizar o estado local com a tarefa mais recente
  useEffect(() => {
    // Busca a versão mais recente da tarefa do contexto global
    const updatedTask = tasks.find(t => t.id === initialTask.id);
    if (updatedTask) {
      // Preservar o estado do timer durante atualizações
      const wasTimerActive = task.timerActive;
      
      // Criar uma cópia da tarefa atualizada, mas preservar o estado do timer se ele estava ativo
      const mergedTask = {
        ...updatedTask,
        timerActive: wasTimerActive || updatedTask.timerActive, // Preservar o estado ativo
      };
      
      setTask(mergedTask);
      
      // Atualizar o tempo exibido quando a tarefa for atualizada
      if (updatedTask.timeSpent !== displayedTime) {
        console.log(`⏱️ TaskDetailModal: Updating time from ${displayedTime}s to ${updatedTask.timeSpent}s`);
        setDisplayedTime(updatedTask.timeSpent || 0);
      }
    }
  }, [initialTask.id, tasks, displayedTime]);
  
  // Configurar um intervalo para verificar o tempo da tarefa a cada segundo
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    // Verificar periodicamente se o tempo da tarefa foi atualizado
    intervalRef.current = setInterval(() => {
      const currentTask = tasks.find(t => t.id === task.id);
      if (currentTask && currentTask.timeSpent !== displayedTime) {
        console.log(`⏱️ TaskDetailModal: Time changed in context: ${currentTask.timeSpent}s`);
        setDisplayedTime(currentTask.timeSpent || 0);
      }
    }, 1000);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [task.id, tasks, displayedTime]);
  
  // Formatar a data para exibição
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };
  
  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    
    console.log('➕ TaskDetailModal: Adding new comment:', comment);
    
    // Use the addComment function from TaskContext
    addComment(task.id, { text: comment }).then(() => {
      console.log('✅ TaskDetailModal: Comment added successfully');
      // No need to manually update state as addComment already does this
      setComment('');
    }).catch(error => {
      console.error('❌ TaskDetailModal: Error adding comment:', error);
    });
  };
  
  // Iniciar edição de um comentário
  const startEditComment = (comment: Comment) => {
    setEditingCommentId(comment.id);
    setEditCommentText(comment.text);
  };
  
  // Salvar edição do comentário
  const saveEditedComment = () => {
    if (!editCommentText.trim() || !editingCommentId) return;
    
    const updatedComments = task.comments?.map(comment => 
      comment.id === editingCommentId 
        ? { ...comment, text: editCommentText } 
        : comment
    ) || [];
    
    const updatedTask = {
      ...task,
      comments: updatedComments
    };
    
    updateTask(updatedTask);
    setTask(updatedTask);
    cancelEditComment();
  };
  
  // Cancelar edição do comentário
  const cancelEditComment = () => {
    setEditingCommentId(null);
    setEditCommentText('');
  };
  
  // Apagar um comentário
  const deleteComment = (commentId: string) => {
    if (window.confirm('Tem certeza que deseja excluir este comentário?')) {
      console.log(`🗑️ TaskDetailModal: Tentando excluir comentário ${commentId}`);
      
      // Use the direct comment deletion API
      api.comments.delete(commentId)
        .then(() => {
          console.log('✅ TaskDetailModal: Comment deleted successfully');
          
          // Update local state after successful API deletion
          if (task.comments) {
            const updatedComments = task.comments.filter(comment => comment.id !== commentId);
            
            console.log(`🔄 TaskDetailModal: Atualizando estado local. Comentários antes: ${task.comments.length}, depois: ${updatedComments.length}`);
            
            // Atualizar o estado local diretamente
            setTask({
              ...task,
              comments: updatedComments
            });
            
            // Também atualizar a tarefa no contexto global para manter a consistência
            const updatedTask = {
              ...task,
              comments: updatedComments
            };
            
            // Atualizar o contexto sem mostrar indicador de loading
            updateTask(updatedTask, { showLoading: false })
              .then(() => console.log('✅ TaskDetailModal: Contexto global atualizado após exclusão de comentário'))
              .catch(err => console.error('❌ TaskDetailModal: Erro ao atualizar contexto global:', err));
          }
        })
        .catch(error => {
          console.error('❌ TaskDetailModal: Error deleting comment:', error);
          alert('Erro ao excluir comentário. Por favor, tente novamente.');
        });
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFiles(e.target.files);
  };
  
  const handleFileUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFiles || selectedFiles.length === 0) return;
    
    // Processar cada arquivo com limite de tamanho
    Array.from(selectedFiles).forEach(file => {
      // Verificar o tamanho do arquivo (5MB é um bom limite para localStorage)
      if (file.size > 5 * 1024 * 1024) {
        alert(`O arquivo ${file.name} é muito grande (max: 5MB).`);
        return;
      }
      
      const fileReader = new FileReader();
      fileReader.readAsDataURL(file);
      fileReader.onload = () => {
        const fileContent = fileReader.result as string;
        
        // Verificar o tamanho do conteúdo base64
        if (fileContent.length > 5 * 1024 * 1024) {
          alert(`O arquivo ${file.name} é muito grande após codificação.`);
          return;
        }
        
        const newFile: TaskFile = {
          id: uuidv4(),
          name: file.name,
          url: fileContent,
          type: file.type,
          size: file.size
        };
        
        const updatedFiles = [...(task.files || []), newFile];
        const updatedTask = {
          ...task,
          files: updatedFiles
        };
        
        try {
          updateTask(updatedTask);
          setTask(updatedTask);
        } catch (error) {
          alert('Erro ao salvar o arquivo. O armazenamento pode estar cheio.');
          console.error('Error saving file:', error);
        }
      };
      
      fileReader.onerror = () => {
        alert(`Erro ao ler o arquivo ${file.name}.`);
      };
    });
    
    // Limpar o campo de arquivo
    setSelectedFiles(null);
    if (document.getElementById('file-upload') as HTMLInputElement) {
      (document.getElementById('file-upload') as HTMLInputElement).value = '';
    }
  };
  
  const handleRemoveFile = (fileId: string) => {
    if (!task.files) return;
    
    const updatedFiles = task.files.filter(file => file.id !== fileId);
    const updatedTask = {
      ...task,
      files: updatedFiles
    };
    
    updateTask(updatedTask);
    setTask(updatedTask); // Atualiza o estado local imediatamente
  };

  const handleAddChecklistItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChecklistItem.trim()) return;
    
    console.log('➕ TaskDetailModal: Adding new checklist item:', newChecklistItem);
    
    const newItem: ChecklistItem = {
      id: uuidv4(), // Temporary ID until saved
      text: newChecklistItem.trim(),
      completed: false
    };
    
    const updatedChecklist = [...(task.checklist || []), newItem];
    const updatedTask = {
      ...task,
      checklist: updatedChecklist
    };
    
    updateTask(updatedTask).then(() => {
      console.log('✅ TaskDetailModal: Task with new checklist item updated successfully');
    }).catch(error => {
      console.error('❌ TaskDetailModal: Error adding checklist item:', error);
    });
    
    setNewChecklistItem('');
  };
  
  // Modificar esta função para preservar a ordem original
  const toggleChecklistItem = (itemId: string) => {
    // Find the item to toggle without reordering
    const updatedChecklist = task.checklist?.map(item => 
      item.id === itemId ? { ...item, completed: !item.completed } : item
    ) || [];
    
    console.log('🔄 TaskDetailModal: Toggling checklist item', itemId);
    console.log('🔄 TaskDetailModal: Updated checklist', updatedChecklist);
    
    const updatedTask = {
      ...task,
      checklist: updatedChecklist
    };
    
    // Update both local state and backend without sorting
    setTask(updatedTask);
    
    // When updating a task with a checklist, make sure to include the checklist in the update
    updateTask(updatedTask, { showLoading: false }).then(() => {
      console.log('✅ TaskDetailModal: Task with checklist updated successfully');
    }).catch(error => {
      console.error('❌ TaskDetailModal: Error updating task with checklist:', error);
    });
  };
  
  const handleDeleteChecklistItem = (itemId: string) => {
    if (window.confirm('Tem certeza que deseja excluir este item?')) {
      // Use the direct checklist deletion API instead of updating the task
      api.checklist.delete(itemId)
        .then(() => {
          console.log('✅ Checklist item deleted successfully');
          // Update local state after successful API deletion
          const updatedChecklist = task.checklist?.filter(item => item.id !== itemId) || [];
          const updatedTask = {
            ...task,
            checklist: updatedChecklist
          };
          
          // Update local state only without calling updateTask
          setTask(updatedTask);
        })
        .catch(error => {
          console.error('❌ Error deleting checklist item:', error);
          alert('Erro ao excluir item da checklist. Por favor, tente novamente.');
        });
    }
  };
  
  const handleEditChecklistItem = (itemId: string, newText: string) => {
    if (!newText.trim()) return;
    
    const updatedChecklist = task.checklist?.map(item => 
      item.id === itemId ? { ...item, text: newText.trim() } : item
    ) || [];
    
    const updatedTask = {
      ...task,
      checklist: updatedChecklist
    };
    
    updateTask(updatedTask);
    setTask(updatedTask);
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsEditing(true);
  };
  
  const handleEditComplete = () => {
    // Busca a versão mais recente da tarefa após a edição
    const updatedTask = tasks.find(t => t.id === task.id);
    if (updatedTask) {
      setTask(updatedTask);
    }
    setIsEditing(false);
  };

  // Contadores para mostrar no sistema de abas
  const fileCount = task.files?.length || 0;
  const commentCount = task.comments?.length || 0;
  const checklistCount = task.checklist?.length || 0;
  const checklistCompletedCount = task.checklist?.filter(item => item.completed).length || 0;
  
  // Calcular o progresso do checklist
  const checklistProgress = checklistCount > 0 
    ? Math.round((checklistCompletedCount / checklistCount) * 100) 
    : 0;
  
  // Verifica se todos os itens do checklist estão concluídos
  const allChecklistItemsCompleted = task.checklist && 
    task.checklist.length > 0 && 
    task.checklist.every(item => item.completed);
  
  // Função para marcar a tarefa como concluída
  const markTaskAsCompleted = () => {
    const updatedTask = {
      ...task,
      completed: true
    };
    
    updateTask(updatedTask);
    setTask(updatedTask);
  };

  // Formatar o tempo para exibição
  const formatTime = (timeInSeconds: number): string => {
    const hours = Math.floor(timeInSeconds / 3600);
    const minutes = Math.floor((timeInSeconds % 3600) / 60);
    const seconds = timeInSeconds % 60;
    return `${hours}h ${minutes}m ${seconds}s`;
  };

  return (
    <div className="modal is-active">
      <div className="modal-background" onClick={onClose}></div>
      <div className="modal-card task-detail-modal">
        <header className="modal-card-head">
          <p className="modal-card-title">{task.title}</p>
          <button className="delete" aria-label="close" onClick={onClose}></button>
        </header>
        
        <section className="modal-card-body">
          {isEditing ? (
            <TaskForm 
              taskToEdit={task}
              onClose={handleEditComplete}
            />
          ) : (
            <div className="task-detail-content">
              {/* Cabeçalho com informações básicas e seletor de abas */}
              <div className="task-header">
                <div className="level is-mobile mb-2">
                  <div className="level-left">
                    <div className="tags">
                      <span className={`tag ${
                        task.priority === 'high' ? 'is-danger' : 
                        task.priority === 'medium' ? 'is-warning' : 'is-info'
                      }`}>
                        {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Média' : 'Baixa'}
                      </span>
                      <span className={`tag ${task.completed ? 'is-success' : 'is-warning'}`}>
                        {task.completed ? 'Concluída' : 'Pendente'}
                      </span>
                      
                      {checklistCount > 0 && (
                        <span className="tag is-info">
                          Progresso: {checklistCompletedCount}/{checklistCount} ({checklistProgress}%)
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="level-right">
                    <button 
                      className="button is-small is-info is-outlined"
                      onClick={handleEditClick}
                    >
                      <span className="icon">
                        <i className="fas fa-edit"></i>
                      </span>
                      <span>Editar</span>
                    </button>
                  </div>
                </div>
                
                {/* Sistema de abas */}
                <div className="tabs is-boxed mb-4">
                  <ul>
                    <li className={activeTab === 'checklist' ? 'is-active' : ''}>
                      <a onClick={() => setActiveTab('checklist')}>
                        <span className="icon is-small"><i className="fas fa-tasks"></i></span>
                        <span>Checklist</span>
                        {checklistCount > 0 && 
                          <span className="tag is-rounded is-primary ml-1">
                            {checklistCompletedCount}/{checklistCount}
                          </span>
                        }
                      </a>
                    </li>
                    <li className={activeTab === 'details' ? 'is-active' : ''}>
                      <a onClick={() => setActiveTab('details')}>
                        <span className="icon is-small"><i className="fas fa-info-circle"></i></span>
                        <span>Detalhes</span>
                      </a>
                    </li>
                    <li className={activeTab === 'files' ? 'is-active' : ''}>
                      <a onClick={() => setActiveTab('files')}>
                        <span className="icon is-small"><i className="fas fa-file"></i></span>
                        <span>Arquivos</span>
                        {fileCount > 0 && <span className="tag is-rounded is-primary ml-1">{fileCount}</span>}
                      </a>
                    </li>
                    <li className={activeTab === 'comments' ? 'is-active' : ''}>
                      <a onClick={() => setActiveTab('comments')}>
                        <span className="icon is-small"><i className="fas fa-comment"></i></span>
                        <span>Comentários</span>
                        {commentCount > 0 && <span className="tag is-rounded is-primary ml-1">{commentCount}</span>}
                      </a>
                    </li>
                  </ul>
                </div>
              </div>
              
              {/* Conteúdo das abas */}
              <div className="tab-content">
                {/* Aba de Detalhes */}
                {activeTab === 'details' && (
                  <div className="columns is-multiline">
                    <div className="column is-12">
                      <div className="task-info-section">
                        <h4>Descrição</h4>
                        <div className="content has-text-left">
                          <p>{task.description || "Sem descrição."}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="column is-6">
                      <div className="task-info-section">
                        <h4>Prazo</h4>
                        <div className="content has-text-left">
                          <p className={isTaskOverdue(task) ? 'overdue-text' : ''}>
                            <span className="icon is-small mr-1">
                              <i className="fas fa-calendar-alt"></i>
                            </span>
                            {formatDate(task.deadline)}
                            {isTaskOverdue(task) && <span className="tag is-danger is-light ml-2">Atrasada</span>}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="column is-6">
                      <div className="task-info-section">
                        <h4>Tempo Gasto</h4>
                        <div className="content has-text-left">
                          <p>
                            <span className="icon is-small mr-1">
                              <i className="fas fa-clock"></i>
                            </span>
                            {formatTime(displayedTime)} {/* Usar o tempo atualizado aqui */}
                            {/* Adicionar indicador de tempo ativo */}
                            {task.timeSpent !== displayedTime && (
                              <span className="tag is-success is-light ml-2 is-animated" 
                                    style={{animation: 'pulse 2s infinite'}}>
                                <span className="icon is-small">
                                  <i className="fas fa-spinner fa-pulse"></i>
                                </span>
                                <span>Atualizando</span>
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Aba de Checklist */}
                {activeTab === 'checklist' && (
                  <div className="column is-12 p-0">
                    <div className="task-info-section">
                      <form onSubmit={handleAddChecklistItem} className="mb-4">
                        <div className="field has-addons">
                          <div className="control is-expanded">
                            <input 
                              className="input" 
                              type="text" 
                              placeholder="Adicionar item ao checklist..." 
                              value={newChecklistItem}
                              onChange={(e) => setNewChecklistItem(e.target.value)}
                            />
                          </div>
                          <div className="control">
                            <button 
                              type="submit" 
                              className="button is-primary"
                              disabled={!newChecklistItem.trim()}
                            >
                              <span className="icon">
                                <i className="fas fa-plus"></i>
                              </span>
                              <span>Adicionar</span>
                            </button>
                          </div>
                        </div>
                      </form>
                      
                      {checklistCount > 0 && (
                        <>
                          <progress 
                            className={`progress ${
                              checklistProgress === 100 ? 'is-success' : 
                              checklistProgress > 50 ? 'is-primary' : 'is-warning'
                            }`} 
                            value={checklistProgress} 
                            max="100"
                          >
                            {checklistProgress}%
                          </progress>
                          
                          {/* Botão para marcar como concluída quando todos os itens estiverem completos */}
                          {allChecklistItemsCompleted && !task.completed && (
                            <div className="notification is-success is-light mb-4">
                              <div className="is-flex is-justify-content-space-between is-align-items-center">
                                <p>
                                  <span className="icon is-small mr-2">
                                    <i className="fas fa-check-circle"></i>
                                  </span>
                                  Todos os itens do checklist foram concluídos!
                                </p>
                                <button 
                                  className="button is-success"
                                  onClick={markTaskAsCompleted}
                                >
                                  <span className="icon is-small">
                                    <i className="fas fa-check"></i>
                                  </span>
                                  <span>Marcar Tarefa como Concluída</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                      
                      <div className="checklist-items">
                        {task.checklist && task.checklist.length > 0 ? (
                          <div className="mt-2">
                            {task.checklist.map((item) => (
                              <ChecklistItemComponent 
                                key={item.id} 
                                item={item} 
                                onToggle={toggleChecklistItem}
                                onDelete={handleDeleteChecklistItem}
                                onEdit={handleEditChecklistItem}
                              />
                            ))}
                          </div>
                        ) : (
                          <div className="notification is-info is-light mt-3">
                            <p>Nenhum item na checklist. Adicione itens para acompanhar o progresso da tarefa.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Aba de Arquivos */}
                {activeTab === 'files' && (
                  <div className="column is-12 p-0">
                    <div className="task-info-section">
                      <form onSubmit={handleFileUpload} className="mb-4">
                        <div className="field has-addons">
                          <div className="control is-expanded">
                            <div className="file has-name is-fullwidth">
                              <label className="file-label">
                                <input 
                                  id="file-upload"
                                  className="file-input" 
                                  type="file" 
                                  onChange={handleFileChange} 
                                  multiple
                                />
                                <span className="file-cta">
                                  <span className="file-icon">
                                    <i className="fas fa-upload"></i>
                                  </span>
                                  <span className="file-label">
                                    Selecionar arquivo(s)
                                  </span>
                                </span>
                                <span className="file-name">
                                  {selectedFiles ? 
                                    `${selectedFiles.length} arquivo(s) selecionado(s)` : 
                                    'Nenhum arquivo selecionado'}
                                </span>
                              </label>
                            </div>
                          </div>
                          <div className="control">
                            <button 
                              type="submit" 
                              className="button is-primary"
                              disabled={!selectedFiles || selectedFiles.length === 0}
                            >
                              <span className="icon">
                                <i className="fas fa-upload"></i>
                              </span>
                              <span>Upload</span>
                            </button>
                          </div>
                        </div>
                      </form>
                      
                      <div className="file-list">
                        {task.files && task.files.length > 0 ? (
                          <div className="columns is-multiline">
                            {task.files.map(file => (
                              <div className="column is-6" key={file.id}>
                                <div className="box has-text-left p-3">
                                  <div className="is-flex is-justify-content-space-between is-align-items-center">
                                    <div className="is-flex is-align-items-center">
                                      <span className="icon mr-2">
                                        <i className="fas fa-file"></i>
                                      </span>
                                      <div>
                                        <p className="is-size-6">{file.name}</p>
                                        <p className="is-size-7 has-text-grey">
                                          {(file.size / 1024).toFixed(2)} KB
                                        </p>
                                      </div>
                                    </div>
                                    <div className="buttons">
                                      <a 
                                        href={file.url} 
                                        download={file.name}
                                        className="button is-small is-info"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      >
                                        <span className="icon is-small">
                                          <i className="fas fa-download"></i>
                                        </span>
                                      </a>
                                      <button 
                                        onClick={() => handleRemoveFile(file.id)}
                                        className="button is-small is-danger"
                                      >
                                        <span className="icon is-small">
                                          <i className="fas fa-trash"></i>
                                        </span>
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="notification is-info is-light">
                            <p>Nenhum arquivo anexado. Faça upload de arquivos para esta tarefa.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Aba de Comentários */}
                {activeTab === 'comments' && (
                  <div className="column is-12 p-0">
                    <div className="task-info-section">
                      <form onSubmit={handleAddComment} className="mb-4">
                        <div className="field">
                          <div className="control">
                            <textarea 
                              className="textarea" 
                              placeholder="Adicione um comentário..."
                              value={comment}
                              onChange={(e) => setComment(e.target.value)}
                              rows={3}
                            ></textarea>
                          </div>
                        </div>
                        <div className="field">
                          <div className="control">
                            <button 
                              className="button is-primary" 
                              type="submit"
                              disabled={!comment.trim()}
                            >
                              <span className="icon">
                                <i className="fas fa-comment"></i>
                              </span>
                              <span>Comentar</span>
                            </button>
                          </div>
                        </div>
                      </form>
                      
                      <div className="comments-list">
                        {task.comments && task.comments.length > 0 ? (
                          task.comments.map(comment => (
                            <div key={comment.id} className="box has-text-left p-3 mb-3">
                              {editingCommentId === comment.id ? (
                                <div className="edit-comment-form">
                                  <div className="field">
                                    <div className="control">
                                      <textarea 
                                        className="textarea" 
                                        value={editCommentText}
                                        onChange={(e) => setEditCommentText(e.target.value)}
                                        rows={3}
                                        autoFocus
                                      ></textarea>
                                    </div>
                                  </div>
                                  <div className="field is-grouped">
                                    <div className="control">
                                      <button 
                                        className="button is-small is-primary" 
                                        onClick={saveEditedComment}
                                        disabled={!editCommentText.trim()}
                                      >
                                        Salvar
                                      </button>
                                    </div>
                                    <div className="control">
                                      <button 
                                        className="button is-small" 
                                        onClick={cancelEditComment}
                                      >
                                        Cancelar
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className="is-flex is-justify-content-space-between is-align-items-start mb-2">
                                    <p className="is-size-7 has-text-grey">
                                      {formatDate(comment.createdAt)}
                                    </p>
                                    <div className="buttons are-small">
                                      <button 
                                        className="button is-small is-info is-outlined"
                                        onClick={() => startEditComment(comment)}
                                        title="Editar Comentário"
                                      >
                                        <span className="icon is-small">
                                          <i className="fas fa-edit"></i>
                                        </span>
                                      </button>
                                      <button 
                                        className="button is-small is-danger is-outlined"
                                        onClick={() => deleteComment(comment.id)}
                                        title="Excluir Comentário"
                                      >
                                        <span className="icon is-small">
                                          <i className="fas fa-trash"></i>
                                        </span>
                                      </button>
                                    </div>
                                  </div>
                                  <p>{comment.text}</p>
                                </>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="notification is-info is-light">
                            <p>Nenhum comentário. Adicione o primeiro comentário a esta tarefa.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
        
        <footer className="modal-card-foot">
          <button className="button" onClick={onClose}>Fechar</button>
        </footer>
      </div>
    </div>
  );
}

// Componente para um item do checklist
interface ChecklistItemProps {
  item: ChecklistItem;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, text: string) => void;
}

const ChecklistItemComponent: React.FC<ChecklistItemProps> = ({ 
  item, 
  onToggle, 
  onDelete, 
  onEdit 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(item.text);
  
  const handleEdit = () => {
    setIsEditing(true);
    setEditText(item.text);
  };
  
  const handleSaveEdit = () => {
    if (editText.trim()) {
      onEdit(item.id, editText);
      setIsEditing(false);
    }
  };
  
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditText(item.text);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };
  
  return (
    <div className="box p-3 mb-2 checklist-item">
      {isEditing ? (
        <div className="field has-addons">
          <div className="control is-expanded">
            <input 
              className="input" 
              type="text" 
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
            />
          </div>
          <div className="control">
            <button 
              className="button is-primary"
              onClick={handleSaveEdit}
              disabled={!editText.trim()}
            >
              <span className="icon is-small">
                <i className="fas fa-check"></i>
              </span>
            </button>
          </div>
          <div className="control">
            <button className="button" onClick={handleCancelEdit}>
              <span className="icon is-small">
                <i className="fas fa-times"></i>
              </span>
            </button>
          </div>
        </div>
      ) : (
        <div className="is-flex is-justify-content-space-between is-align-items-center">
          <div className="is-flex is-align-items-center">
            <label className="checkbox mr-2" onClick={(e) => e.stopPropagation()}>
              <input
                type="checkbox"
                checked={item.completed}
                onChange={() => onToggle(item.id)}
                className="mr-2"
              />
              <span className={`${item.completed ? 'has-text-grey-light line-through' : ''}`}>
                {item.text}
              </span>
            </label>
          </div>
          
          <div className="buttons are-small">
            <button 
              className="button is-small is-info is-outlined"
              onClick={handleEdit}
              title="Editar Item"
            >
              <span className="icon is-small">
                <i className="fas fa-edit"></i>
              </span>
            </button>
            <button 
              className="button is-small is-danger is-outlined"
              onClick={() => onDelete(item.id)}
              title="Excluir Item"
            >
              <span className="icon is-small">
                <i className="fas fa-trash"></i>
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Função utilitária para verificar se uma tarefa está atrasada
const isTaskOverdue = (task: Task): boolean => {
  if (task.completed) return false; // Tarefas completas não são consideradas atrasadas
  const deadlineDate = new Date(task.deadline);
  return deadlineDate < new Date();
};

// Adicionar um keyframe de animação para o pulso
const pulseAnimation = `
@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.6; }
  100% { opacity: 1; }
}
`;

// Adicionar estilo ao documento
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.innerHTML = pulseAnimation;
  document.head.appendChild(style);
}
