// components/forms/AgentForms.tsx - PARTE 1: IMPORTS Y ADDAGENTFORM
// Crea este archivo nuevo: components/forms/AgentForms.tsx

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  Bot, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  Edit3 
} from 'lucide-react';
import { RetellAgentDetailed } from '@/services/agentService';

// ========================================
// INTERFACES
// ========================================

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
// COMPONENTE: FORMULARIO PARA AGREGAR AGENTE
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

  // Cargar agentes de Retell al montar el componente
  useEffect(() => {
    if (retellAgents.length === 0 && !loadingRetellAgents) {
      onLoadRetellAgents();
    }
  }, []);

  // Auto-llenar datos cuando se selecciona un agente de Retell
  const handleRetellAgentChange = (retellAgentId: string) => {
    const selectedAgent = retellAgents.find(agent => agent.agent_id === retellAgentId);
    
    setFormData(prev => ({
      ...prev,
      retell_agent_id: retellAgentId,
      name: selectedAgent?.agent_name || '',
      description: selectedAgent ? 
        `Agente de Retell - Voz: ${selectedAgent.voice_id} - Idioma: ${selectedAgent.language}` : 
        ''
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.retell_agent_id || !formData.name.trim()) {
      toast.error('Agente de Retell y nombre son obligatorios');
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
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* SELECTOR DE AGENTE RETELL */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Agente de Retell AI *
        </label>
        {loadingRetellAgents ? (
          <div className="flex items-center justify-center py-8 border rounded-lg">
            <RefreshCw className="w-4 h-4 animate-spin mr-2" />
            <span className="text-sm text-gray-600">Cargando agentes de Retell...</span>
          </div>
        ) : retellAgents.length === 0 ? (
          <div className="border rounded-lg p-4 text-center">
            <AlertTriangle className="w-6 h-6 text-orange-500 mx-auto mb-2" />
            <p className="text-sm text-gray-600 mb-2">No se encontraron agentes en Retell AI</p>
            <Button 
              type="button" 
              onClick={onLoadRetellAgents} 
              variant="outline" 
              size="sm"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Reintentar
            </Button>
          </div>
        ) : (
          <select 
            value={formData.retell_agent_id}
            onChange={(e) => handleRetellAgentChange(e.target.value)}
            className="w-full border rounded px-3 py-2"
            required
          >
            <option value="">Seleccionar agente de Retell</option>
            {retellAgents.map(agent => (
              <option key={agent.agent_id} value={agent.agent_id}>
                {agent.agent_name} - {agent.voice_id} ({agent.language})
              </option>
            ))}
          </select>
        )}
      </div>

      {/* INFORMACIÓN DEL AGENTE SELECCIONADO */}
      {formData.retell_agent_id && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
          {(() => {
            const selectedAgent = retellAgents.find(a => a.agent_id === formData.retell_agent_id);
            return selectedAgent ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium text-purple-800">
                    Información del Agente
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs text-purple-700">
                  <div><strong>ID:</strong> {selectedAgent.agent_id.slice(0, 12)}...</div>
                  <div><strong>Voz:</strong> {selectedAgent.voice_id}</div>
                  <div><strong>Idioma:</strong> {selectedAgent.language}</div>
                  <div><strong>Motor:</strong> {selectedAgent.response_engine?.type || 'N/A'}</div>
                </div>
              </div>
            ) : null;
          })()}
        </div>
      )}

      {/* NOMBRE PERSONALIZADO */}
      <div>
        <label className="block text-sm font-medium mb-2">Nombre del agente *</label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          placeholder="Nombre descriptivo para el agente"
          required
        />
        <p className="text-xs text-gray-500 mt-1">
          Este será el nombre que verán los usuarios
        </p>
      </div>

      {/* EMPRESA */}
      <div>
        <label className="block text-sm font-medium mb-2">Empresa</label>
        <select 
          value={formData.company_id}
          onChange={(e) => setFormData(prev => ({ ...prev, company_id: e.target.value }))}
          className="w-full border rounded px-3 py-2"
        >
          <option value="">Sin empresa asignada</option>
          {companies.map(company => (
            <option key={company.id} value={company.id}>{company.name}</option>
          ))}
        </select>
      </div>

      {/* DESCRIPCIÓN */}
      <div>
        <label className="block text-sm font-medium mb-2">Descripción</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Descripción opcional del agente"
          className="w-full border rounded px-3 py-2"
          rows={3}
        />
      </div>

      {/* BOTONES */}
      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
          Cancelar
        </Button>
        <Button type="submit" disabled={saving || !formData.retell_agent_id}>
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
  );
};
// components/forms/AgentForms.tsx - PARTE 2: EDITAGENTFORM
// Agregar este código después del AddAgentForm

// ========================================
// COMPONENTE: FORMULARIO PARA EDITAR AGENTE
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
      // Error ya manejado en onSave
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* ALERTA PARA AGENTES NO SINCRONIZADOS */}
      {agent.id.startsWith('retell-') && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <span className="text-sm font-medium text-amber-800">
              Agente no sincronizado
            </span>
          </div>
          <p className="text-xs text-amber-700 mt-1">
            Este agente existe solo en Retell AI. Considere sincronizarlo primero.
          </p>
        </div>
      )}

      {/* NOMBRE */}
      <div>
        <label className="block text-sm font-medium mb-2">Nombre *</label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          placeholder="Nombre del agente"
          required
        />
      </div>

      {/* EMPRESA */}
      <div>
        <label className="block text-sm font-medium mb-2">Empresa</label>
        <select 
          value={formData.company_id}
          onChange={(e) => setFormData(prev => ({ ...prev, company_id: e.target.value }))}
          className="w-full border rounded px-3 py-2"
        >
          <option value="">Sin empresa asignada</option>
          {companies.map(company => (
            <option key={company.id} value={company.id}>{company.name}</option>
          ))}
        </select>
      </div>

      {/* DESCRIPCIÓN */}
      <div>
        <label className="block text-sm font-medium mb-2">Descripción</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Descripción del agente"
          className="w-full border rounded px-3 py-2"
          rows={3}
        />
      </div>

      {/* INFORMACIÓN RETELL (SOLO LECTURA) */}
      <div className="bg-gray-50 rounded-lg p-3">
        <h5 className="text-sm font-medium mb-2">Información de Retell (solo lectura)</h5>
        <div className="text-xs text-gray-600 space-y-1">
          <div><strong>Retell ID:</strong> {agent.retell_agent_id}</div>
          <div><strong>Estado:</strong> {agent.status}</div>
          <div><strong>Creado:</strong> {new Date(agent.created_at).toLocaleDateString()}</div>
        </div>
      </div>

      {/* BOTONES */}
      <div className="flex justify-end space-x-2 pt-4">
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
  );
};
// components/forms/AgentForms.tsx - PARTE 3: EDITASSIGNMENTFORM
// Agregar este código después del EditAgentForm

// ========================================
// COMPONENTE: FORMULARIO PARA EDITAR ASIGNACIÓN
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
      // Error ya manejado en onSave
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* INFORMACIÓN DEL USUARIO */}
      <div className="bg-gray-50 rounded-lg p-3">
        <h5 className="text-sm font-medium mb-2">Usuario asignado</h5>
        <div className="text-sm">
          <div><strong>Nombre:</strong> {assignment.user_name}</div>
          <div><strong>Email:</strong> {assignment.user_email}</div>
        </div>
      </div>

      {/* SELECTOR DE AGENTE */}
      <div>
        <label className="block text-sm font-medium mb-2">Agente *</label>
        <select 
          value={formData.agent_id}
          onChange={(e) => setFormData(prev => ({ ...prev, agent_id: e.target.value }))}
          className="w-full border rounded px-3 py-2"
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

      {/* CHECKBOX ASIGNACIÓN PRIMARIA */}
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
      <div className="flex justify-end space-x-2 pt-4">
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
  );
};
