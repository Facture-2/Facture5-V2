import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { Project, Task, Employee } from '../../contexts/DataContext';
import { 
  Target, 
  Plus, 
  Clock, 
  User,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Edit,
  Trash2,
  MessageSquare,
  Paperclip
} from 'lucide-react';

interface ProjectKanbanProps {
  projects: Project[];
  tasks: Task[];
  employees: Employee[];
  onEditTask: (id: string) => void;
}

export default function ProjectKanban({ projects, tasks, employees, onEditTask }: ProjectKanbanProps) {
  const { updateTask, deleteTask } = useData();
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [draggedTask, setDraggedTask] = useState<string | null>(null);

  const filteredTasks = selectedProject === 'all' 
    ? tasks 
    : tasks.filter(task => task.projectId === selectedProject);

  const columns = [
    { 
      id: 'todo', 
      title: 'À Faire', 
      color: 'bg-gray-100 border-gray-300',
      headerColor: 'bg-gray-500'
    },
    { 
      id: 'in_progress', 
      title: 'En Cours', 
      color: 'bg-blue-100 border-blue-300',
      headerColor: 'bg-blue-500'
    },
    { 
      id: 'completed', 
      title: 'Terminé', 
      color: 'bg-green-100 border-green-300',
      headerColor: 'bg-green-500'
    }
  ];

  const getTasksByStatus = (status: string) => {
    return filteredTasks.filter(task => task.status === status);
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTask(taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    if (draggedTask) {
      updateTask(draggedTask, { status: newStatus as 'todo' | 'in_progress' | 'completed' });
      setDraggedTask(null);
    }
  };

  const handleDeleteTask = (id: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette tâche ?')) {
      deleteTask(id);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'border-l-red-500 bg-red-50';
      case 'medium':
        return 'border-l-yellow-500 bg-yellow-50';
      case 'low':
        return 'border-l-green-500 bg-green-50';
      default:
        return 'border-l-gray-500 bg-gray-50';
    }
  };

  const getDeadlineColor = (deadline: string, status: string) => {
    if (status === 'completed') return 'text-green-600';
    
    const deadlineDate = new Date(deadline);
    const today = new Date();
    const diffTime = deadlineDate.getTime() - today.getTime();
    const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (daysLeft < 0) return 'text-red-600 font-bold';
    if (daysLeft <= 3) return 'text-red-600';
    if (daysLeft <= 7) return 'text-orange-600';
    return 'text-gray-600';
  };

  const getEmployeeName = (employeeId: string) => {
    const employee = employees.find(emp => emp.id === employeeId);
    return employee ? `${employee.firstName} ${employee.lastName}` : 'Non assigné';
  };

  return (
    <div className="space-y-6">
      {/* Filtres */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Filtrer par projet
            </label>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="all">Tous les projets</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.name} - {project.client.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{filteredTasks.length}</p>
            <p className="text-sm text-gray-600 dark:text-gray-300">Tâches affichées</p>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {columns.map((column) => {
            const columnTasks = getTasksByStatus(column.id);
            
            return (
              <div key={column.id} className="space-y-4">
                {/* Column Header */}
                <div className={`${column.headerColor} text-white rounded-lg p-4`}>
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{column.title}</h3>
                    <span className="bg-white/20 px-2 py-1 rounded-full text-sm font-medium">
                      {columnTasks.length}
                    </span>
                  </div>
                </div>

                {/* Column Content */}
                <div 
                  className={`min-h-96 ${column.color} dark:bg-gray-700 border-2 border-dashed rounded-lg p-4 space-y-3`}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, column.id)}
                >
                  {columnTasks.map((task) => {
                    const project = projects.find(p => p.id === task.projectId);
                    const deadlineColor = getDeadlineColor(task.deadline, task.status);
                    const isOverdue = new Date(task.deadline) < new Date() && task.status !== 'completed';
                    
                    return (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task.id)}
                        className={`bg-white rounded-lg p-4 shadow-sm border-l-4 cursor-move hover:shadow-md transition-all duration-200 ${
                          getPriorityColor(task.priority)
                        } ${draggedTask === task.id ? 'opacity-50' : ''}`}
                        style={{ backgroundColor: 'white' }}
                      >
                        {/* Task Header */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <span className={`w-3 h-3 rounded-full ${
                              task.priority === 'high' ? 'bg-red-500' :
                              task.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                            }`} />
                            <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                              {project?.name || 'Projet supprimé'}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => onEditTask(task.id)}
                              className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                            >
                              <Edit className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteTask(task.id)}
                              className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Task Title */}
                        <h4 className="font-medium text-gray-900 mb-2">{task.title}</h4>
                        
                        {/* Task Description */}
                        {task.description && (
                          <p className="text-sm text-gray-600 mb-3">
                            {task.description.length > 80 ? 
                              task.description.substring(0, 80) + '...' : 
                              task.description
                            }
                          </p>
                        )}

                        {/* Task Meta */}
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <User className="w-4 h-4 text-gray-400" />
                            <span className="text-xs text-gray-600">
                              {getEmployeeName(task.assignedTo)}
                            </span>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span className={`text-xs ${deadlineColor}`}>
                              {new Date(task.deadline).toLocaleDateString('fr-FR')}
                              {isOverdue && ' (En retard)'}
                            </span>
                          </div>

                          {task.estimatedHours && (
                            <div className="flex items-center space-x-2">
                              <Clock className="w-4 h-4 text-gray-400" />
                              <span className="text-xs text-gray-600">
                                {task.estimatedHours}h estimées
                                {task.actualHours && ` • ${task.actualHours}h réelles`}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Task Actions */}
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
                          <div className="flex items-center space-x-2">
                            <button className="p-1 text-gray-400 hover:text-blue-600 transition-colors" title="Commentaires">
                              <MessageSquare className="w-4 h-4" />
                            </button>
                            <button className="p-1 text-gray-400 hover:text-green-600 transition-colors" title="Fichiers">
                              <Paperclip className="w-4 h-4" />
                            </button>
                          </div>
                          
                          {isOverdue && (
                            <AlertTriangle className="w-4 h-4 text-red-500 animate-pulse" />
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {columnTasks.length === 0 && (
                    <div className="text-center py-8">
                      <Target className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-gray-500 text-sm">Aucune tâche</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Légende */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-4">Légende</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Priorités</h5>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full" />
                <span className="text-sm text-gray-600 dark:text-gray-300">Haute priorité</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                <span className="text-sm text-gray-600 dark:text-gray-300">Priorité moyenne</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full" />
                <span className="text-sm text-gray-600 dark:text-gray-300">Basse priorité</span>
              </div>
            </div>
          </div>
          
          <div>
            <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Actions</h5>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <MessageSquare className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-gray-600 dark:text-gray-300">Commentaires</span>
              </div>
              <div className="flex items-center space-x-2">
                <Paperclip className="w-4 h-4 text-green-600" />
                <span className="text-sm text-gray-600 dark:text-gray-300">Fichiers joints</span>
              </div>
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span className="text-sm text-gray-600 dark:text-gray-300">Tâche en retard</span>
              </div>
            </div>
          </div>
          
          <div>
            <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Utilisation</h5>
            <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
              <p>• Glissez-déposez les tâches entre colonnes</p>
              <p>• Cliquez sur l'icône crayon pour modifier</p>
              <p>• Les couleurs indiquent la priorité</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}