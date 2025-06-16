// components/forms/AgentForms.tsx - PARTE 1: IMPORTS Y ADDAGENTFORM MEJORADO

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { 
  Bot, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  Edit3,
  Mic,
  Globe,
  Brain,
  User,
  Building2,
  Eye,
  Clock
} from 'lucide-react';
import { 
  RetellAgentDetailed,
  formatAgentForDisplay,
  validateAgentData,
  getTimeSinceLastModification
} from '@/services/agentService';

// ========================================
// INTERFACES MEJORADAS
// ========================================

interface Company {
  id: string;
  name: string;
  users_count?: number;
  agents_count?: number;
  status?: string;
}

interface Agent {
  id: string;
  name: string;
  retell_agent_id: string;
  company_id?: string;
  company_name?: string;
  status: string;
  description?: string;
  created_at: string;
  voice_id?: string;
  language?: string;
  llm_id?: string;
  assigned_users?: number;
  total_calls?: number;
}

interface UserAgentAssignment {
  id: string;
  user_id: string;
  agent_id: string;
  user_email: string;
  user_name: string;
  agent_name: string;
  is_primary: boolean;
  created_at: string;
}

// ========================================
// COMPONENTE: FORMULARIO PARA AGREGAR AGENTE MEJORADO
// ========================================

export const AddAgentForm: React.FC<{
  onClose: () => void;
  onSave: (agentData: { 
    retell_agent_id: string; 
    name: string; 
    company_id?: string; 
    description?: string;
  }) => Promise<void>;
  companies: Company[];
  retellAgents: RetellAgentDetailed[];
  loadingRetellAgents: boolean;
  onLoadRetellAgents: () => void;
}> = ({ onClose, onSave, companies, retellAgents, loadingRetellAgents, onLoadRetellAgents }) => {
  const [formData, setFormData] = useState({
    retell_agent_id: '',
    name: '',
    company_id: '',
    description: ''
  });
  const [saving, setSaving] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<RetellAgentDetailed | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Cargar agentes de Retell al montar el componente
  useEffect(() => {
    if (retellAgents.length === 0 && !loadingRetellAgents) {
      onLoadRetellAgents();
    }
  }, []);

  // Filtrar agentes por término de búsqueda
  const filteredAgents = retellAgents.filter(agent => 
    agent.agent_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agent.voice_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agent.language.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Auto-llenar datos cuando se selecciona un agente de Retell
  const handleRetellAgentChange = (retellAgentId: string) => {
    const selectedAgent = retellAgents.find(agent => agent.agent_id === retellAgentId);
    
    if (selectedAgent) {
      setSelectedAgent(selectedAgent);
      setFormData(prev => ({
        ...prev,
        retell_agent_id: retellAgentId,
        name: selectedAgent.agent_name || '',
        description: `Agente de Retell AI - Voz: ${selectedAgent.voice_id} - Idioma: ${selectedAgent.language} - Motor: ${selectedAgent.response_engine?.type || 'N/A'}`
      }));
    } else {
      setSelectedAgent(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validaciones mejoradas
    if (!formData.retell_agent_id || !formData.name.trim()) {
      toast.error('Agente de Retell y nombre son obligatorios');
      return;
    }

    if (formData.name.length > 100) {
      toast.error('El nombre no puede exceder 100 caracteres');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        retell_agent_id: formData.retell_agent_id,
        name: formData.name.trim(),
        company_id: formData.company_id || undefined,
        description: formData.description.trim() || undefined
      });
    } catch (error) {
      // Error ya manejado en onSave
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* SECCIÓN: SELECTOR DE AGENTE RETELL MEJORADO */}
        <div>
          <label className="block text-sm font-medium mb-2 flex items-center gap-2">
            <Bot className="h-4 w-4 text-purple-500" />
            Agente de Retell AI *
          </label>
          
          {loadingRetellAgents ? (
            <div className="flex items-center justify-center py-8 border rounded-lg bg-gray-50">
              <RefreshCw className="w-5 h-5 animate-spin mr-3 text-purple-500" />
              <span className="text-sm text-gray-600">Cargando agentes de Retell...</span>
            </div>
          ) : retellAgents.length === 0 ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p>No se encontraron agentes en Retell AI o hay un problema de conexión.</p>
                  <Button 
                    type="button" 
                    onClick={onLoadRetellAgents} 
                    variant="outline" 
                    size="sm"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Reintentar carga
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              {/* Buscador de agentes */}
              <Input
                placeholder="Buscar agentes por nombre, voz o idioma..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="text-sm"
              />
              
              {/* Selector de agente */}
              <select 
                value={formData.retell_agent_id}
                onChange={(e) => handleRetellAgentChange(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm"
                required
              >
                <option value="">Seleccionar agente de Retell ({filteredAgents.length} disponibles)</option>
                {filteredAgents.map(agent => (
                  <option key={agent.agent_id} value={agent.agent_id}>
                    {agent.agent_name} - {agent.voice_id} ({agent.language})
                  </option>
                ))}
              </select>
              
              {/* Mostrar información si hay búsqueda pero sin resultados */}
              {searchTerm && filteredAgents.length === 0 && (
                <p className="text-xs text-gray-500 text-center py-2">
                  No se encontraron agentes que coincidan con "{searchTerm}"
                </p>
              )}
            </div>
          )}
        </div>

        {/* INFORMACIÓN DETALLADA DEL AGENTE SELECCIONADO */}
        {selectedAgent && (
          <Card className="border-purple-200 bg-purple-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Eye className="h-4 w-4 text-purple-600" />
                Información del Agente Seleccionado
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Bot className="h-3 w-3 text-purple-600" />
                    <span><strong>ID:</strong> {selectedAgent.agent_id.slice(0, 12)}...</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mic className="h-3 w-3 text-purple-600" />
                    <span><strong>Voz:</strong> {selectedAgent.voice_id}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Globe className="h-3 w-3 text-purple-600" />
                    <span><strong>Idioma:</strong> {selectedAgent.language}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Brain className="h-3 w-3 text-purple-600" />
                    <span><strong>Motor:</strong> {selectedAgent.response_engine?.type || 'N/A'}</span>
                  </div>
                  {selectedAgent.response_engine?.llm_id && (
                    <div className="flex items-center gap-2">
                      <Brain className="h-3 w-3 text-purple-600" />
                      <span><strong>LLM:</strong> {selectedAgent.response_engine.llm_id}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3 text-purple-600" />
                    <span><strong>Modificado:</strong> {getTimeSinceLastModification(selectedAgent)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* NOMBRE PERSONALIZADO */}
        <div>
          <label className="block text-sm font-medium mb-2 flex items-center gap-2">
            <User className="h-4 w-4 text-blue-500" />
            Nombre del agente *
          </label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Nombre descriptivo para el agente"
            required
            maxLength={100}
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Este será el nombre que verán los usuarios</span>
            <span>{formData.name.length}/100</span>
          </div>
        </div>

        {/* EMPRESA */}
        <div>
          <label className="block text-sm font-medium mb-2 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-green-500" />
            Empresa
          </label>
          <select 
            value={formData.company_id}
            onChange={(e) => setFormData(prev => ({ ...prev, company_id: e.target.value }))}
            className="w-full border rounded px-3 py-2"
          >
            <option value="">Sin empresa asignada</option>
            {companies.map(company => (
              <option key={company.id} value={company.id}>
                {company.name}
                {company.users_count !== undefined && ` (${company.users_count} usuarios)`}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Opcional: Asignar el agente a una empresa específica
          </p>
        </div>

        {/* DESCRIPCIÓN */}
        <div>
          <label className="block text-sm font-medium mb-2">Descripción</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Descripción opcional del agente (capacidades, uso previsto, etc.)"
            className="w-full border rounded px-3 py-2 text-sm"
            rows={3}
            maxLength={500}
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Información adicional sobre el agente</span>
            <span>{formData.description.length}/500</span>
          </div>
        </div>

        {/* BOTONES */}
        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button 
            type="submit" 
            disabled={saving || !formData.retell_agent_id || !formData.name.trim()}
            className="min-w-[120px]"
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Agregando...
              </>
            ) : (
              <>
                <Bot className="w-4 h-4 mr-2" />
                Agregar Agente
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};
// components/forms/AgentForms.tsx - PARTE 2: EDITAGENTFORM MEJORADO

// ========================================
// COMPONENTE: FORMULARIO PARA EDITAR AGENTE MEJORADO
// ========================================

export const EditAgentForm: React.FC<{
  agent: Agent;
  onClose: () => void;
  onSave: (agentId: string, updatedData: { 
    name: string; 
    company_id?: string; 
    description?: string; 
  }) => Promise<void>;
  companies: Company[];
}> = ({ agent, onClose, onSave, companies }) => {
  const [formData, setFormData] = useState({
    name: agent.name,
    company_id: agent.company_id || '',
    description: agent.description || ''
  });
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Detectar cambios en el formulario
  useEffect(() => {
    const hasFormChanges = 
      formData.name !== agent.name ||
      formData.company_id !== (agent.company_id || '') ||
      formData.description !== (agent.description || '');
    
    setHasChanges(hasFormChanges);
  }, [formData, agent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validaciones mejoradas
    if (!formData.name.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }

    if (formData.name.length > 100) {
      toast.error('El nombre no puede exceder 100 caracteres');
      return;
    }

    if (!hasChanges) {
      toast.info('No hay cambios para guardar');
      return;
    }

    setSaving(true);
    try {
      await onSave(agent.id, {
        name: formData.name.trim(),
        company_id: formData.company_id || undefined,
        description: formData.description.trim() || undefined
      });
    } catch (error) {
      // Error ya manejado en onSave
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setFormData({
      name: agent.name,
      company_id: agent.company_id || '',
      description: agent.description || ''
    });
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* ALERTAS INFORMATIVAS */}
        <div className="space-y-2">
          {/* Alerta para agentes no sincronizados */}
          {agent.id.startsWith('retell-') && (
            <Alert className="border-amber-200 bg-amber-50">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription>
                <div className="space-y-1">
                  <p className="font-medium text-amber-800">Agente no sincronizado</p>
                  <p className="text-xs text-amber-700">
                    Este agente existe solo en Retell AI. Para editarlo completamente, considere sincronizarlo primero.
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Indicador de cambios */}
          {hasChanges && (
            <Alert className="border-blue-200 bg-blue-50">
              <Edit3 className="h-4 w-4 text-blue-600" />
              <AlertDescription>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-blue-800">Hay cambios sin guardar</span>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={handleReset}
                    className="text-xs h-6"
                  >
                    Deshacer
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* INFORMACIÓN ACTUAL DEL AGENTE */}
        <Card className="border-gray-200 bg-gray-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Bot className="h-4 w-4 text-gray-600" />
              Información Actual del Agente
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-gray-600">
              <div className="space-y-1">
                <div><strong>Estado:</strong> 
                  <Badge variant={agent.status === 'active' ? 'default' : 'secondary'} className="ml-2 text-xs">
                    {agent.status}
                  </Badge>
                </div>
                <div><strong>Retell ID:</strong> 
                  <code className="ml-1 bg-gray-200 px-1 rounded text-xs">
                    {agent.retell_agent_id}
                  </code>
                </div>
                <div><strong>Creado:</strong> {new Date(agent.created_at).toLocaleDateString('es-ES')}</div>
              </div>
              <div className="space-y-1">
                {agent.voice_id && (
                  <div className="flex items-center gap-1">
                    <Mic className="h-3 w-3" />
                    <strong>Voz:</strong> {agent.voice_id}
                  </div>
                )}
                {agent.language && (
                  <div className="flex items-center gap-1">
                    <Globe className="h-3 w-3" />
                    <strong>Idioma:</strong> {agent.language}
                  </div>
                )}
                {agent.assigned_users !== undefined && (
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    <strong>Usuarios:</strong> {agent.assigned_users}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CAMPOS EDITABLES */}
        <div className="space-y-4">
          {/* NOMBRE */}
          <div>
            <label className="block text-sm font-medium mb-2 flex items-center gap-2">
              <User className="h-4 w-4 text-blue-500" />
              Nombre *
            </label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Nombre del agente"
              required
              maxLength={100}
              className={hasChanges && formData.name !== agent.name ? 'border-blue-300 bg-blue-50' : ''}
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Nombre visible para los usuarios</span>
              <span>{formData.name.length}/100</span>
            </div>
          </div>

          {/* EMPRESA */}
          <div>
            <label className="block text-sm font-medium mb-2 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-green-500" />
              Empresa
            </label>
            <select 
              value={formData.company_id}
              onChange={(e) => setFormData(prev => ({ ...prev, company_id: e.target.value }))}
              className={`w-full border rounded px-3 py-2 ${
                hasChanges && formData.company_id !== (agent.company_id || '') 
                  ? 'border-blue-300 bg-blue-50' 
                  : ''
              }`}
            >
              <option value="">Sin empresa asignada</option>
              {companies.map(company => (
                <option key={company.id} value={company.id}>
                  {company.name}
                  {company.users_count !== undefined && ` (${company.users_count} usuarios)`}
                </option>
              ))}
            </select>
            {formData.company_id !== (agent.company_id || '') && (
              <p className="text-xs text-blue-600 mt-1">
                {formData.company_id 
                  ? `Se asignará a: ${companies.find(c => c.id === formData.company_id)?.name}` 
                  : 'Se quitará la asignación de empresa'
                }
              </p>
            )}
          </div>

          {/* DESCRIPCIÓN */}
          <div>
            <label className="block text-sm font-medium mb-2">Descripción</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Descripción del agente (opcional)"
              className={`w-full border rounded px-3 py-2 text-sm ${
                hasChanges && formData.description !== (agent.description || '') 
                  ? 'border-blue-300 bg-blue-50' 
                  : ''
              }`}
              rows={3}
              maxLength={500}
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Información adicional sobre el agente</span>
              <span>{formData.description.length}/500</span>
            </div>
          </div>
        </div>

        {/* BOTONES */}
        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          {hasChanges && (
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleReset} 
              disabled={saving}
            >
              Deshacer Cambios
            </Button>
          )}
          <Button 
            type="submit" 
            disabled={saving || !hasChanges || !formData.name.trim()}
            className="min-w-[120px]"
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Guardar Cambios
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};
// components/forms/AgentForms.tsx - PARTE 3: EDITASSIGNMENTFORM MEJORADO

// ========================================
// COMPONENTE: FORMULARIO PARA EDITAR ASIGNACIÓN MEJORADO
// ========================================

export const EditAssignmentForm: React.FC<{
  assignment: UserAgentAssignment;
  onClose: () => void;
  onSave: (assignmentId: string, updatedData: { 
    agent_id: string; 
    is_primary: boolean; 
  }) => Promise<void>;
  agents: Agent[];
}> = ({ assignment, onClose, onSave, agents }) => {
  const [formData, setFormData] = useState({
    agent_id: assignment.agent_id,
    is_primary: assignment.is_primary
  });
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Detectar cambios en el formulario
  useEffect(() => {
    const hasFormChanges = 
      formData.agent_id !== assignment.agent_id ||
      formData.is_primary !== assignment.is_primary;
    
    setHasChanges(hasFormChanges);
  }, [formData, assignment]);

  // Filtrar agentes activos y disponibles
  const availableAgents = agents.filter(agent => 
    agent.status === 'active' && !agent.id.startsWith('retell-')
  );

  const selectedAgent = agents.find(agent => agent.id === formData.agent_id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.agent_id) {
      toast.error('Debe seleccionar un agente');
      return;
    }

    if (!hasChanges) {
      toast.info('No hay cambios para guardar');
      return;
    }

    setSaving(true);
    try {
      await onSave(assignment.id, {
        agent_id: formData.agent_id,
        is_primary: formData.is_primary
      });
    } catch (error) {
      // Error ya manejado en onSave
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setFormData({
      agent_id: assignment.agent_id,
      is_primary: assignment.is_primary
    });
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* INFORMACIÓN DEL USUARIO */}
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <User className="h-4 w-4 text-blue-600" />
              Usuario Asignado
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <User className="h-3 w-3 text-blue-600" />
                <span><strong>Nombre:</strong> {assignment.user_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-blue-600">@</span>
                <span><strong>Email:</strong> {assignment.user_email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-3 w-3 text-blue-600" />
                <span><strong>Asignado:</strong> {new Date(assignment.created_at).toLocaleDateString('es-ES')}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* INDICADOR DE CAMBIOS */}
        {hasChanges && (
          <Alert className="border-green-200 bg-green-50">
            <Edit3 className="h-4 w-4 text-green-600" />
            <AlertDescription>
              <div className="flex items-center justify-between">
                <span className="text-sm text-green-800">Hay cambios pendientes por guardar</span>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={handleReset}
                  className="text-xs h-6"
                >
                  Deshacer
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* ASIGNACIÓN ACTUAL */}
        <Card className="border-gray-200 bg-gray-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Bot className="h-4 w-4 text-gray-600" />
              Asignación Actual
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Bot className="h-3 w-3" />
                <span><strong>Agente:</strong> {assignment.agent_name}</span>
              </div>
              <div className="flex items-center gap-2">
                {assignment.is_primary ? (
                  <CheckCircle className="h-3 w-3 text-green-500" />
                ) : (
                  <span className="h-3 w-3 rounded-full border border-gray-400"></span>
                )}
                <span><strong>Tipo:</strong> {assignment.is_primary ? 'Primaria' : 'Secundaria'}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CAMPOS EDITABLES */}
        <div className="space-y-4">
          {/* SELECTOR DE AGENTE */}
          <div>
            <label className="block text-sm font-medium mb-2 flex items-center gap-2">
              <Bot className="h-4 w-4 text-purple-500" />
              Agente *
            </label>
            
            {availableAgents.length === 0 ? (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  No hay agentes activos disponibles para asignar.
                </AlertDescription>
              </Alert>
            ) : (
              <select 
                value={formData.agent_id}
                onChange={(e) => setFormData(prev => ({ ...prev, agent_id: e.target.value }))}
                className={`w-full border rounded px-3 py-2 ${
                  hasChanges && formData.agent_id !== assignment.agent_id 
                    ? 'border-green-300 bg-green-50' 
                    : ''
                }`}
                required
              >
                <option value="">Seleccionar agente</option>
                {availableAgents.map(agent => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name} ({agent.retell_agent_id})
                    {agent.company_name && ` - ${agent.company_name}`}
                  </option>
                ))}
              </select>
            )}
            
            {/* Información del agente seleccionado */}
            {selectedAgent && formData.agent_id !== assignment.agent_id && (
              <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs">
                <p className="text-green-800">
                  <strong>Nuevo agente:</strong> {selectedAgent.name}
                </p>
                {selectedAgent.description && (
                  <p className="text-green-700 mt-1">{selectedAgent.description}</p>
                )}
              </div>
            )}
          </div>

          {/* TIPO DE ASIGNACIÓN */}
          <div>
            <label className="block text-sm font-medium mb-3">Tipo de Asignación</label>
            <div className="space-y-3">
              {/* Opción Primaria */}
              <div className={`flex items-start space-x-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                formData.is_primary 
                  ? 'border-green-300 bg-green-50' 
                  : 'border-gray-200 hover:bg-gray-50'
              }`}>
                <input
                  type="radio"
                  id="primary"
                  name="assignment_type"
                  checked={formData.is_primary}
                  onChange={() => setFormData(prev => ({ ...prev, is_primary: true }))}
                  className="mt-1"
                />
                <div className="flex-1">
                  <label htmlFor="primary" className="text-sm font-medium cursor-pointer">
                    Asignación Primaria
                  </label>
                  <p className="text-xs text-gray-600 mt-1">
                    Este será el agente principal del usuario. Solo puede haber una asignación primaria por usuario.
                  </p>
                </div>
                <CheckCircle className="h-4 w-4 text-green-500 mt-1" />
              </div>

              {/* Opción Secundaria */}
              <div className={`flex items-start space-x-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                !formData.is_primary 
                  ? 'border-blue-300 bg-blue-50' 
                  : 'border-gray-200 hover:bg-gray-50'
              }`}>
                <input
                  type="radio"
                  id="secondary"
                  name="assignment_type"
                  checked={!formData.is_primary}
                  onChange={() => setFormData(prev => ({ ...prev, is_primary: false }))}
                  className="mt-1"
                />
                <div className="flex-1">
                  <label htmlFor="secondary" className="text-sm font-medium cursor-pointer">
                    Asignación Secundaria
                  </label>
                  <p className="text-xs text-gray-600 mt-1">
                    Agente de respaldo o para casos específicos. El usuario puede tener múltiples asignaciones secundarias.
                  </p>
                </div>
                <span className="h-4 w-4 rounded-full border-2 border-blue-500 mt-1"></span>
              </div>
            </div>

            {/* Advertencia sobre cambio de primaria */}
            {formData.is_primary && !assignment.is_primary && (
              <Alert className="mt-3 border-amber-200 bg-amber-50">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-xs text-amber-800">
                  <strong>Atención:</strong> Al hacer esta asignación primaria, cualquier otra asignación primaria 
                  del usuario se convertirá automáticamente en secundaria.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>

        {/* BOTONES */}
        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          {hasChanges && (
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleReset} 
              disabled={saving}
            >
              Deshacer Cambios
            </Button>
          )}
          <Button 
            type="submit" 
            disabled={saving || !hasChanges || !formData.agent_id}
            className="min-w-[120px]"
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Guardar Cambios
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

// ========================================
// COMPONENTE ADICIONAL: CREAR NUEVA ASIGNACIÓN
// ========================================

export const CreateAssignmentForm: React.FC<{
  onClose: () => void;
  onSave: (assignmentData: { 
    user_id: string; 
    agent_id: string; 
    is_primary: boolean; 
  }) => Promise<void>;
  agents: Agent[];
  users: { id: string; email: string; name: string; }[];
  preselectedUserId?: string;
}> = ({ onClose, onSave, agents, users, preselectedUserId }) => {
  const [formData, setFormData] = useState({
    user_id: preselectedUserId || '',
    agent_id: '',
    is_primary: false
  });
  const [saving, setSaving] = useState(false);

  // Filtrar agentes activos
  const availableAgents = agents.filter(agent => 
    agent.status === 'active' && !agent.id.startsWith('retell-')
  );

  const selectedUser = users.find(user => user.id === formData.user_id);
  const selectedAgent = agents.find(agent => agent.id === formData.agent_id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.user_id || !formData.agent_id) {
      toast.error('Usuario y agente son obligatorios');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        user_id: formData.user_id,
        agent_id: formData.agent_id,
        is_primary: formData.is_primary
      });
    } catch (error) {
      // Error ya manejado en onSave
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* SELECTOR DE USUARIO */}
      <div>
        <label className="block text-sm font-medium mb-2 flex items-center gap-2">
          <User className="h-4 w-4 text-blue-500" />
          Usuario *
        </label>
        {preselectedUserId ? (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded">
            <p className="text-sm">
              <strong>{selectedUser?.name}</strong> ({selectedUser?.email})
            </p>
          </div>
        ) : (
          <select 
            value={formData.user_id}
            onChange={(e) => setFormData(prev => ({ ...prev, user_id: e.target.value }))}
            className="w-full border rounded px-3 py-2"
            required
          >
            <option value="">Seleccionar usuario</option>
            {users.map(user => (
              <option key={user.id} value={user.id}>
                {user.name} ({user.email})
              </option>
            ))}
          </select>
        )}
      </div>

      {/* SELECTOR DE AGENTE */}
      <div>
        <label className="block text-sm font-medium mb-2 flex items-center gap-2">
          <Bot className="h-4 w-4 text-purple-500" />
          Agente *
        </label>
        <select 
          value={formData.agent_id}
          onChange={(e) => setFormData(prev => ({ ...prev, agent_id: e.target.value }))}
          className="w-full border rounded px-3 py-2"
          required
        >
          <option value="">Seleccionar agente</option>
          {availableAgents.map(agent => (
            <option key={agent.id} value={agent.id}>
              {agent.name} ({agent.retell_agent_id})
              {agent.company_name && ` - ${agent.company_name}`}
            </option>
          ))}
        </select>
        {selectedAgent?.description && (
          <p className="text-xs text-gray-600 mt-1">{selectedAgent.description}</p>
        )}
      </div>

      {/* TIPO DE ASIGNACIÓN */}
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="is_primary_new"
          checked={formData.is_primary}
          onChange={(e) => setFormData(prev => ({ ...prev, is_primary: e.target.checked }))}
          className="rounded border-gray-300"
        />
        <label htmlFor="is_primary_new" className="text-sm flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-green-500" />
          Asignación primaria
        </label>
      </div>
      <p className="text-xs text-gray-500">
        Solo puede haber una asignación primaria por usuario
      </p>

      {/* BOTONES */}
      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
          Cancelar
        </Button>
        <Button type="submit" disabled={saving || !formData.user_id || !formData.agent_id}>
          {saving ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Creando...
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4 mr-2" />
              Crear Asignación
            </>
          )}
        </Button>
      </div>
    </form>
  );
};
