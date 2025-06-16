// src/components/forms/AgentForms.tsx
// Formulario simple y funcional para agregar agentes

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { 
  Bot, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  Edit3,
  User,
  Building2,
  X
} from 'lucide-react';

// ========================================
// INTERFACES
// ========================================

export interface RetellAgentDetailed {
  agent_id: string;
  agent_name: string;
  voice_id: string;
  language: string;
  created_time: number;
  last_modification_time: number;
  response_engine?: {
    type: string;
    llm_id?: string;
  };
}

interface Company {
  id: string;
  name: string;
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
// COMPONENTE: AGREGAR AGENTE (SIMPLE Y FUNCIONAL)
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

  // Cargar agentes de Retell cuando se abre el modal
  useEffect(() => {
    if (retellAgents.length === 0 && !loadingRetellAgents) {
      onLoadRetellAgents();
    }
  }, []);

  // Auto-llenar nombre cuando se selecciona un agente
  const handleAgentSelect = (retellAgentId: string) => {
    const selectedAgent = retellAgents.find(agent => agent.agent_id === retellAgentId);
    
    setFormData(prev => ({
      ...prev,
      retell_agent_id: retellAgentId,
      name: selectedAgent?.agent_name || '',
      description: selectedAgent ? 
        `Agente de Retell AI - Voz: ${selectedAgent.voice_id} - Idioma: ${selectedAgent.language}` : 
        ''
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.retell_agent_id) {
      toast.error('Debe seleccionar un agente de Retell');
      return;
    }
    
    if (!formData.name.trim()) {
      toast.error('El nombre es obligatorio');
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
      // Error manejado en onSave
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit}>
        {/* ENCABEZADO DEL MODAL */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-purple-500" />
            <h3 className="text-lg font-semibold">Agregar Nuevo Agente</h3>
          </div>
          <Button 
            type="button" 
            variant="ghost" 
            size="sm" 
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* SELECTOR DE AGENTE DE RETELL */}
        <div className="space-y-2">
          <label className="block text-sm font-medium">
            Agente de Retell AI *
          </label>
          
          {loadingRetellAgents ? (
            <div className="flex items-center justify-center py-4 border rounded-lg bg-gray-50">
              <RefreshCw className="w-4 h-4 animate-spin mr-2" />
              <span className="text-sm text-gray-600">Cargando agentes de Retell...</span>
            </div>
          ) : retellAgents.length === 0 ? (
            <div className="space-y-3">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  No se encontraron agentes en Retell AI. Verifica tu conexión y API key.
                </AlertDescription>
              </Alert>
              <Button 
                type="button" 
                onClick={onLoadRetellAgents} 
                variant="outline" 
                size="sm"
                className="w-full"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Reintentar Carga
              </Button>
            </div>
          ) : (
            <select 
              value={formData.retell_agent_id}
              onChange={(e) => handleAgentSelect(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              required
            >
              <option value="">-- Seleccionar agente de Retell ({retellAgents.length} disponibles) --</option>
              {retellAgents.map(agent => (
                <option key={agent.agent_id} value={agent.agent_id}>
                  {agent.agent_name} - {agent.voice_id} ({agent.language})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* PREVIEW DEL AGENTE SELECCIONADO */}
        {formData.retell_agent_id && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Bot className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-800">Agente Seleccionado</span>
            </div>
            {(() => {
              const selectedAgent = retellAgents.find(a => a.agent_id === formData.retell_agent_id);
              return selectedAgent ? (
                <div className="text-xs text-purple-700 space-y-1">
                  <div><strong>ID:</strong> {selectedAgent.agent_id}</div>
                  <div><strong>Voz:</strong> {selectedAgent.voice_id}</div>
                  <div><strong>Idioma:</strong> {selectedAgent.language}</div>
                  <div><strong>Motor:</strong> {selectedAgent.response_engine?.type || 'N/A'}</div>
                </div>
              ) : null;
            })()}
          </div>
        )}

        {/* NOMBRE DEL AGENTE */}
        <div className="space-y-2">
          <label className="block text-sm font-medium">
            Nombre del agente *
          </label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Nombre que verán los usuarios"
            required
            className="w-full"
          />
          <p className="text-xs text-gray-500">
            Este será el nombre visible en el dashboard
          </p>
        </div>

        {/* EMPRESA (OPCIONAL) */}
        <div className="space-y-2">
          <label className="block text-sm font-medium">
            Empresa (opcional)
          </label>
          <select 
            value={formData.company_id}
            onChange={(e) => setFormData(prev => ({ ...prev, company_id: e.target.value }))}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="">Sin empresa asignada</option>
            {companies.map(company => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
        </div>

        {/* DESCRIPCIÓN (OPCIONAL) */}
        <div className="space-y-2">
          <label className="block text-sm font-medium">
            Descripción (opcional)
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Descripción del agente, capacidades, uso previsto..."
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
          />
        </div>

        {/* BOTONES */}
        <div className="flex justify-end space-x-3 pt-6 border-t">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onClose}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button 
            type="submit" 
            disabled={saving || !formData.retell_agent_id || !formData.name.trim()}
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

// ========================================
// COMPONENTE: EDITAR AGENTE
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('El nombre es obligatorio');
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
      // Error manejado en onSave
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit}>
        {/* ENCABEZADO */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Edit3 className="h-5 w-5 text-blue-500" />
            <h3 className="text-lg font-semibold">Editar Agente</h3>
          </div>
          <Button 
            type="button" 
            variant="ghost" 
            size="sm" 
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* INFORMACIÓN DEL AGENTE (READ-ONLY) */}
        <div className="bg-gray-50 border rounded-lg p-3 mb-4">
          <h4 className="text-sm font-medium mb-2">Información de Retell (solo lectura)</h4>
          <div className="text-xs text-gray-600 space-y-1">
            <div><strong>Retell ID:</strong> {agent.retell_agent_id}</div>
            <div><strong>Estado:</strong> 
              <Badge variant={agent.status === 'active' ? 'default' : 'secondary'} className="ml-2">
                {agent.status}
              </Badge>
            </div>
            <div><strong>Creado:</strong> {new Date(agent.created_at).toLocaleDateString()}</div>
          </div>
        </div>

        {/* NOMBRE */}
        <div className="space-y-2">
          <label className="block text-sm font-medium">Nombre *</label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Nombre del agente"
            required
          />
        </div>

        {/* EMPRESA */}
        <div className="space-y-2">
          <label className="block text-sm font-medium">Empresa</label>
          <select 
            value={formData.company_id}
            onChange={(e) => setFormData(prev => ({ ...prev, company_id: e.target.value }))}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="">Sin empresa asignada</option>
            {companies.map(company => (
              <option key={company.id} value={company.id}>{company.name}</option>
            ))}
          </select>
        </div>

        {/* DESCRIPCIÓN */}
        <div className="space-y-2">
          <label className="block text-sm font-medium">Descripción</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Descripción del agente"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            rows={3}
          />
        </div>

        {/* BOTONES */}
        <div className="flex justify-end space-x-3 pt-6 border-t">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
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
// COMPONENTE: EDITAR ASIGNACIÓN
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.agent_id) {
      toast.error('Debe seleccionar un agente');
      return;
    }

    setSaving(true);
    try {
      await onSave(assignment.id, {
        agent_id: formData.agent_id,
        is_primary: formData.is_primary
      });
    } catch (error) {
      // Error manejado en onSave
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit}>
        {/* ENCABEZADO */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">Editar Asignación</h3>
          <Button 
            type="button" 
            variant="ghost" 
            size="sm" 
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* INFORMACIÓN DEL USUARIO */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <h4 className="text-sm font-medium mb-2">Usuario asignado</h4>
          <div className="text-sm">
            <div><strong>Nombre:</strong> {assignment.user_name}</div>
            <div><strong>Email:</strong> {assignment.user_email}</div>
          </div>
        </div>

        {/* SELECTOR DE AGENTE */}
        <div className="space-y-2">
          <label className="block text-sm font-medium">Agente *</label>
          <select 
            value={formData.agent_id}
            onChange={(e) => setFormData(prev => ({ ...prev, agent_id: e.target.value }))}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            required
          >
            <option value="">Seleccionar agente</option>
            {agents.map(agent => (
              <option key={agent.id} value={agent.id}>
                {agent.name} ({agent.retell_agent_id})
              </option>
            ))}
          </select>
        </div>

        {/* ASIGNACIÓN PRIMARIA */}
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="primary"
            checked={formData.is_primary}
            onChange={(e) => setFormData(prev => ({ ...prev, is_primary: e.target.checked }))}
            className="rounded border-gray-300"
          />
          <label htmlFor="primary" className="text-sm">
            Asignación primaria
          </label>
        </div>
        <p className="text-xs text-gray-500">
          Solo puede haber una asignación primaria por usuario
        </p>

        {/* BOTONES */}
        <div className="flex justify-end space-x-3 pt-6 border-t">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
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
