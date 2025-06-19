import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Phone,
  Clock,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  Activity,
  Zap,
  Target,
  BarChart3,
  Bot,
  Building2,
  UserCheck,
  CreditCard,
  PieChart,
  Settings,
  ArrowRight
} from "lucide-react";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { useAuth } from "@/contexts/AuthContext";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell } from 'recharts';
import { CreditBalance } from "@/components/credits/CreditBalance";

// ============================================================================
// FUNCIÓN PARA REFRESCAR BALANCE DE CRÉDITOS
// ============================================================================
const refreshCreditBalance = async (userId: string) => {
  try {
    console.log('🔄 Refrescando balance de créditos en dashboard...');
    
    const { data: creditData, error } = await supabase
      .from('user_credits')
      .select('current_balance')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('❌ Error obteniendo balance actualizado:', error);
      return;
    }

    console.log(`✅ Balance verificado: $${creditData.current_balance}`);
    
    // El componente CreditBalance se actualizará automáticamente
    // ya que probablemente use su propio hook para obtener los datos
    
  } catch (error) {
    console.error('💥 Excepción refrescando balance:', error);
  }
};

interface Call {
  id: string;
  call_id: string;
  timestamp: string;
  duration_sec: number;
  cost_usd: number;
  call_status: string;
  sentiment?: string;
  recording_url?: string;
  agent_id?: string;
}

interface DashboardStats {
  totalCalls: number;
  totalCost: number;
  totalDuration: number;
  avgDuration: number;
  successRate: number;
  positiveRatio: number;
  callsToday: number;
  costToday: number;
}

interface AdminStats {
  totalUsers: number;
  totalAgents: number;
  totalCompanies: number;
  totalCredits: number;
  totalCalls: number;
  activeUsers: number;
  totalCreditTransactions: number;
  avgCreditsPerUser: number;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
// ============================================================================
// FUNCIÓN PARA PROCESAR LLAMADAS PENDIENTES EN DASHBOARD
// ============================================================================
const processUnprocessedCalls = async (userId: string) => {
  try {
    console.log('🔄 DASHBOARD: Procesando llamadas pendientes...');
    
    if (!userId) {
      alert('❌ Usuario no identificado');
      return { success: false, message: 'Usuario no identificado' };
    }

    // Obtener agentes del usuario con sus tarifas
    const { data: userAgents, error: agentsError } = await supabase
      .from('user_agent_assignments')
      .select(`
        agent_id,
        agents!inner (
          id,
          name,
          rate_per_minute,
          retell_agent_id
        )
      `)
      .eq('user_id', userId)
      .eq('is_primary', true);

    if (agentsError || !userAgents || userAgents.length === 0) {
      console.error('❌ Error obteniendo agentes del usuario:', agentsError);
      return { success: false, message: 'No se encontraron agentes asignados' };
    }

    const userAgentIds = userAgents.map(assignment => assignment.agents.id);
    console.log('👤 Agentes del usuario:', userAgentIds);

    // Buscar llamadas completadas sin costo asignado
    const { data: unprocessedCalls, error: callsError } = await supabase
      .from('calls')
      .select(`
        id,
        call_id,
        duration_sec,
        cost_usd,
        call_status,
        agent_id
      `)
      .in('agent_id', userAgentIds)
      .in('call_status', ['completed', 'ended'])
      .gt('duration_sec', 0)
      .eq('cost_usd', 0)
      .limit(10); // Procesar máximo 10 llamadas por vez

    if (callsError) {
      console.error('❌ Error obteniendo llamadas:', callsError);
      return { success: false, message: 'Error obteniendo llamadas' };
    }

    if (!unprocessedCalls || unprocessedCalls.length === 0) {
      console.log('✅ No hay llamadas pendientes de procesar');
      return { success: true, message: 'No hay llamadas pendientes', processed: 0 };
    }

    console.log(`🎯 Encontradas ${unprocessedCalls.length} llamadas para procesar`);

    let processedCount = 0;
    let errors = 0;

    // Procesar cada llamada
    for (const call of unprocessedCalls) {
      try {
        // Encontrar la tarifa del agente
        const agentData = userAgents.find(assignment => 
          assignment.agents.id === call.agent_id || 
          assignment.agents.retell_agent_id === call.agent_id
        );

        if (!agentData?.agents.rate_per_minute) {
          console.warn(`⚠️ No se encontró tarifa para agente ${call.agent_id}`);
          continue;
        }

        const duration = call.duration_sec;
        const rate = agentData.agents.rate_per_minute;
        const cost = (duration / 60) * rate;

        console.log(`💰 Procesando llamada ${call.call_id}: ${duration}s × $${rate}/min = $${cost.toFixed(4)}`);

        // 1. Actualizar costo en la tabla calls
        const { error: updateError } = await supabase
          .from('calls')
          .update({ cost_usd: cost })
          .eq('call_id', call.call_id);

        if (updateError) {
          console.error(`❌ Error actualizando llamada ${call.call_id}:`, updateError);
          errors++;
          continue;
        }

        // 2. Verificar si ya existe transacción
        const { data: existingTransaction } = await supabase
          .from('credit_transactions')
          .select('id')
          .eq('user_id', userId)
          .eq('call_id', call.id) // Usar UUID real
          .eq('transaction_type', 'debit')
          .single();

        if (existingTransaction) {
          console.log(`✅ Ya existe transacción para llamada ${call.call_id}`);
          processedCount++;
          continue;
        }

        // 3. Obtener balance actual
        const { data: userCredit, error: creditError } = await supabase
          .from('user_credits')
          .select('current_balance')
          .eq('user_id', userId)
          .single();

        if (creditError) {
          console.error('❌ Error obteniendo balance:', creditError);
          errors++;
          continue;
        }

        const currentBalance = userCredit?.current_balance || 0;
        const newBalance = currentBalance - cost;

        // 4. Actualizar balance
        const { error: updateBalanceError } = await supabase
          .from('user_credits')
          .update({ 
            current_balance: newBalance,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId);

        if (updateBalanceError) {
          console.error('❌ Error actualizando balance:', updateBalanceError);
          errors++;
          continue;
        }

        // 5. Registrar transacción
        const { error: transactionError } = await supabase
          .from('credit_transactions')
          .insert({
            user_id: userId,
            call_id: call.id, // UUID real
            amount: cost,
            transaction_type: 'debit',
            description: `Call cost deduction - Call ID: ${call.call_id}`,
            created_at: new Date().toISOString()
          });

        if (transactionError) {
          console.error('❌ Error registrando transacción:', transactionError);
          // Revertir balance
          await supabase
            .from('user_credits')
            .update({ current_balance: currentBalance })
            .eq('user_id', userId);
          errors++;
          continue;
        }

        console.log(`🎉 Llamada ${call.call_id} procesada exitosamente - $${cost.toFixed(4)}`);
        processedCount++;

        // Pequeña pausa entre llamadas
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`❌ Error procesando llamada ${call.call_id}:`, error);
        errors++;
      }
    }

    // Emitir evento para actualizar balance inmediatamente
    if (typeof window !== 'undefined' && processedCount > 0) {
      window.dispatchEvent(new CustomEvent('balanceUpdated', {
        detail: {
          userId,
          processed: processedCount,
          source: 'dashboard-refresh'
        }
      }));
    }

    const message = `✅ Procesadas ${processedCount} llamadas exitosamente${errors > 0 ? ` (${errors} errores)` : ''}`;
    console.log(message);

    return {
      success: true,
      message,
      processed: processedCount,
      errors
    };

  } catch (error) {
    console.error('💥 Error en processUnprocessedCalls:', error);
    return {
      success: false,
      message: `Error: ${error.message}`,
      processed: 0
    };
  }
};

// ============================================================================
// FUNCIÓN PARA EL BOTÓN REFRESH BALANCE
// ============================================================================
const handleRefreshBalance = async (userId: string, setRefreshing: (state: boolean) => void) => {
  setRefreshing(true);
  
  try {
    console.log('🔄 Iniciando Refresh Balance desde Dashboard...');
    
    const result = await processUnprocessedCalls(userId);
    
    if (result.success) {
      if (result.processed > 0) {
        alert(`✅ ¡Balance actualizado!\n\n📞 Llamadas procesadas: ${result.processed}\n💰 Los descuentos se han aplicado automáticamente.\n\nRevisa tu balance actualizado arriba.`);
      } else {
        alert('✅ Tu balance está actualizado\n\nNo hay llamadas pendientes de procesar.');
      }
    } else {
      alert(`❌ Error actualizando balance:\n\n${result.message}\n\nPor favor contacta soporte si el problema persiste.`);
    }
    
  } catch (error) {
    console.error('❌ Error en handleRefreshBalance:', error);
    alert('❌ Error inesperado actualizando balance\n\nPor favor intenta de nuevo o contacta soporte.');
  } finally {
    setRefreshing(false);
  }
};
export default function DashboardPage() {
  const { user } = useAuth();
  
  // ✅ VERIFICAR SI ES SUPER ADMIN
  const isSuperAdmin = user?.user_metadata?.role === 'super_admin';
  
  console.log('=== DASHBOARD DEBUG ===');
  console.log('User:', user);
  console.log('User metadata role:', user?.user_metadata?.role);
  console.log('Is super admin:', isSuperAdmin);
  console.log('========================');
  
  // Estados para usuarios normales
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshingBalance, setRefreshingBalance] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalCalls: 0,
    totalCost: 0,
    totalDuration: 0,
    avgDuration: 0,
    successRate: 0,
    positiveRatio: 0,
    callsToday: 0,
    costToday: 0
  });
  const [audioDurations, setAudioDurations] = useState<{[key: string]: number}>({});

  // Estados para super admin
  const [adminStats, setAdminStats] = useState<AdminStats>({
    totalUsers: 0,
    totalAgents: 0,
    totalCompanies: 0,
    totalCredits: 0,
    totalCalls: 0,
    activeUsers: 0,
    totalCreditTransactions: 0,
    avgCreditsPerUser: 0
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [userDistribution, setUserDistribution] = useState<any[]>([]);
  const [userAgents, setUserAgents] = useState<any[]>([]);

  // ✅ useEffect PRINCIPAL - CORREGIDO PARA CARGA AUTOMÁTICA
  useEffect(() => {
    if (user?.id) {
      if (isSuperAdmin) {
        fetchAdminStats();
      } else {
        // ✅ CARGAR DATOS AUTOMÁTICAMENTE PARA USUARIOS NORMALES
        console.log('🚀 [Dashboard] Usuario normal detectado, cargando datos automáticamente...');
        fetchCallsData();
        // Refrescar balance automáticamente
        refreshCreditBalance(user.id);
      }
    }
  }, [user?.id, isSuperAdmin]);

  // ✅ LISTENER PARA BALANCE UPDATE EN DASHBOARD
useEffect(() => {
  if (!user?.id) return;

  console.log('🔔 Dashboard: Configurando listener para balanceUpdated...');
  
  const handleBalanceUpdate = (event: CustomEvent) => {
    console.log('💳 Dashboard: Evento balanceUpdated recibido:', event.detail);
    
    const { userId, deduction, source } = event.detail;
    
    // Solo procesar si es para este usuario
    if (userId === user.id || userId === 'current-user' || userId === 'test-user') {
      console.log('✅ Dashboard: Refrescando balance automáticamente...');
      
      // Refrescar balance automáticamente
      if (user?.id) {
        refreshCreditBalance(user.id);
      }
      
      // También forzar actualización de datos de calls si es necesario
      if (source === 'automatic_processing' || source === 'dashboard-refresh') {
        fetchCallsData();
      }
    }
  };

  // Escuchar el evento
  window.addEventListener('balanceUpdated', handleBalanceUpdate as EventListener);
  
  console.log('✅ Dashboard: Listener balanceUpdated configurado');
  
  return () => {
    window.removeEventListener('balanceUpdated', handleBalanceUpdate as EventListener);
    console.log('🧹 Dashboard: Listener balanceUpdated removido');
  };
}, [user?.id]);

  // ✅ useEffect para recalcular estadísticas automáticamente
  useEffect(() => {
    console.log('📊 Dashboard - useEffect para estadísticas automáticas ejecutado:', {
      callsLength: calls.length,
      loading: loading,
      audioDurationsCount: Object.keys(audioDurations).length,
      isSuperAdmin: isSuperAdmin
    });

    // Solo para usuarios normales (no super admin)
    if (!isSuperAdmin && !loading && calls.length > 0) {
      console.log('🧮 Dashboard - Recalculando estadísticas automáticamente...');
      
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      let totalCost = 0;
      let totalDuration = 0;
      let completedCalls = 0;
      let callsToday = 0;
      let costToday = 0;
      let positiveCalls = 0;
      let callsWithSentiment = 0;

      calls.forEach((call, index) => {
        // 1. Obtener duración real usando la función existente
        const duration = getCallDuration(call);
        totalDuration += duration;
        
        // 2. Calcular costo usando la función existente
        const callCost = calculateCallCostForDashboard ? 
          calculateCallCostForDashboard(call, userAgents || []) : 
          (call.cost_usd || 0);
        totalCost += callCost;
        
        // 3. Contar llamadas completadas
        if (['completed', 'ended'].includes(call.call_status?.toLowerCase())) {
          completedCalls++;
        }
        
        // 4. Verificar si es de hoy
        const callDate = new Date(call.timestamp);
        if (callDate >= today) {
          callsToday++;
          costToday += callCost;
        }
        
        // 5. Análisis de sentimiento
        if (call.sentiment) {
          callsWithSentiment++;
          if (call.sentiment === 'positive') {
            positiveCalls++;
          }
        }

        if (index < 3) { // Log solo las primeras 3 para debug
          console.log(`📞 Dashboard AUTO - Call ${call.call_id?.substring(0, 8)}: duration=${duration}s, cost=$${callCost.toFixed(4)}, today=${callDate >= today}`);
        }
      });

      const totalCalls = calls.length;
      const avgDuration = totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0;
      const successRate = totalCalls > 0 ? (completedCalls / totalCalls) * 100 : 0;
      const positiveRatio = callsWithSentiment > 0 ? (positiveCalls / callsWithSentiment) * 100 : 0;

      const finalStats = {
        totalCalls,
        totalCost: Number(totalCost.toFixed(4)),
        totalDuration,
        avgDuration,
        successRate: Number(successRate.toFixed(1)),
        positiveRatio: Number(positiveRatio.toFixed(1)),
        callsToday,
        costToday: Number(costToday.toFixed(4))
      };

      console.log('✅ Dashboard - Estadísticas AUTO actualizadas:', {
        totalCalls: finalStats.totalCalls,
        totalCost: `$${finalStats.totalCost}`,
        totalDuration: `${finalStats.totalDuration}s`,
        successRate: `${finalStats.successRate}%`,
        callsToday: finalStats.callsToday,
        costToday: `$${finalStats.costToday}`
      });

      setStats(finalStats);
      
    } else if (!isSuperAdmin && !loading && calls.length === 0) {
      // Resetear estadísticas si no hay llamadas
      console.log('🔄 Dashboard - Reseteando estadísticas (no hay llamadas)');
      setStats({
        totalCalls: 0,
        totalCost: 0,
        totalDuration: 0,
        avgDuration: 0,
        successRate: 0,
        positiveRatio: 0,
        callsToday: 0,
        costToday: 0
      });
    }
  }, [calls, loading, audioDurations, isSuperAdmin, userAgents]); // ✅ DEPENDENCIAS CLAVE
  // ============================================================================
  // 🤖 FUNCIONES DEL SUPER ADMIN (MANTENER IGUAL)
  // ============================================================================
  const fetchAdminStats = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔍 Fetching admin statistics...');

      // Ejecutar todas las consultas en paralelo
      const [
        usersResult,
        agentsResult,
        companiesResult,
        creditsResult,
        callsResult,
        creditTransactionsResult
      ] = await Promise.all([
        supabase.from('users').select('id, created_at', { count: 'exact' }),
        supabase.from('agents').select('id', { count: 'exact' }),
        supabase.from('companies').select('id', { count: 'exact' }),
        supabase.from('user_credits').select('current_balance'),
        supabase.from('calls').select('id', { count: 'exact' }),
        supabase.from('credit_transactions').select('id', { count: 'exact' })
      ]);

      console.log('📊 Admin raw results:', {
        users: usersResult,
        agents: agentsResult,
        companies: companiesResult,
        credits: creditsResult,
        calls: callsResult,
        transactions: creditTransactionsResult
      });

      // Calcular estadísticas administrativas
      const totalUsers = usersResult.count || 0;
      const totalAgents = agentsResult.count || 0;
      const totalCompanies = companiesResult.count || 0;
      const totalCalls = callsResult.count || 0;
      const totalCreditTransactions = creditTransactionsResult.count || 0;

      const totalCredits = creditsResult.data?.reduce((sum, credit) => sum + (credit.current_balance || 0), 0) || 0;
      const avgCreditsPerUser = totalUsers > 0 ? totalCredits / totalUsers : 0;
      const activeUsers = creditsResult.data?.filter(credit => (credit.current_balance || 0) > 0).length || 0;

      const calculatedAdminStats = {
        totalUsers,
        totalAgents,
        totalCompanies,
        totalCredits,
        totalCalls,
        activeUsers,
        totalCreditTransactions,
        avgCreditsPerUser
      };

      setAdminStats(calculatedAdminStats);
      prepareAdminChartData(usersResult.data || [], creditsResult.data || []);

      console.log('✅ Admin stats calculated:', calculatedAdminStats);

    } catch (err: any) {
      console.error('💥 Error fetching admin stats:', err);
      setError(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const prepareAdminChartData = (users: any[], credits: any[]) => {
    // Datos para gráfico de líneas - usuarios registrados por mes
    const usersByMonth = users.reduce((acc, user) => {
      const month = new Date(user.created_at).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short' 
      });
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {});

    const chartData = Object.entries(usersByMonth).map(([month, count]) => ({
      month,
      users: count
    }));

    setChartData(chartData);

    // Distribución de usuarios por estado de créditos
    const usersWithCredits = credits.filter(c => (c.current_balance || 0) > 0).length;
    const usersWithoutCredits = credits.length - usersWithCredits;
    
    setUserDistribution([
      { name: 'With Credits', value: usersWithCredits, color: COLORS[1] },
      { name: 'Without Credits', value: usersWithoutCredits, color: COLORS[3] }
    ]);
  };

  // ============================================================================
  // 👤 FUNCIONES DE USUARIOS NORMALES - CORREGIDAS
  // ============================================================================
  
  const loadAudioDuration = async (call: Call) => {
    if (!call.recording_url || audioDurations[call.id]) return;
    
    try {
      const audio = new Audio(call.recording_url);
      return new Promise<void>((resolve) => {
        audio.addEventListener('loadedmetadata', () => {
          const duration = Math.round(audio.duration);
          setAudioDurations(prev => ({
            ...prev,
            [call.id]: duration
          }));
          resolve();
        });
        audio.addEventListener('error', () => resolve());
      });
    } catch (error) {
      console.log('Error loading audio duration:', error);
    }
  };

  // ✅ FUNCIÓN CORREGIDA: getCallDuration
  const getCallDuration = (call: Call) => {
    // Priorizar duration_sec de la BD (más confiable para estadísticas)
    if (call.duration_sec && call.duration_sec > 0) {
      return call.duration_sec;
    }
    
    // Fallback a audioDurations si está disponible
    if (audioDurations[call.id] && audioDurations[call.id] > 0) {
      return audioDurations[call.id];
    }
    
    return 0;
  };

  // ✅ NUEVA FUNCIÓN: calculateCallCostForDashboard
  const calculateCallCostForDashboard = (call: Call, userAgents: any[]) => {
    console.log(`💰 [Dashboard] Calculando costo para llamada ${call.call_id?.substring(0, 8)}:`, {
      existing_cost: call.cost_usd,
      duration_sec: call.duration_sec,
      agent_id: call.agent_id
    });

    // Si ya tiene un costo válido en BD, usarlo
    if (call.cost_usd && call.cost_usd > 0) {
      console.log(`✅ [Dashboard] Usando costo existente: $${call.cost_usd}`);
      return call.cost_usd;
    }
    
    // Obtener duración
    const duration = getCallDuration(call);
    if (duration === 0) {
      console.log(`⚠️ [Dashboard] Sin duración, costo = $0`);
      return 0;
    }
    
    const durationMinutes = duration / 60;
    
    // Buscar el agente en las asignaciones del usuario para obtener rate_per_minute
    const userAgentAssignment = userAgents.find(assignment => 
      assignment.agents?.id === call.agent_id || 
      assignment.agents?.retell_agent_id === call.agent_id
    );
    
    if (userAgentAssignment?.agents?.rate_per_minute) {
      const rate = userAgentAssignment.agents.rate_per_minute;
      const calculatedCost = durationMinutes * rate;
      console.log(`🧮 [Dashboard] Costo calculado: ${durationMinutes.toFixed(2)}min × $${rate}/min = $${calculatedCost.toFixed(4)}`);
      return calculatedCost;
    }
    
    console.log(`❌ [Dashboard] Sin tarifa disponible, costo = $0`);
    return 0;
  };
  // ✅ FUNCIÓN CORREGIDA: fetchCallsData
  const fetchCallsData = async () => {
    if (!user?.id) {
      setError("User not authenticated");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('🔍 [Dashboard] Fetching calls data for regular user...');

      // 👤 USUARIO NORMAL: Ver solo llamadas de sus agentes asignados
      const { data: userAgents, error: agentsError } = await supabase
        .from('user_agent_assignments')
        .select(`
          agent_id,
          agents!inner (
            id,
            name,
            retell_agent_id,
            rate_per_minute
          )
        `)
        .eq('user_id', user.id);

      if (agentsError) {
        console.error('❌ [Dashboard] Error fetching user agents:', agentsError);
        setError(`Error fetching agents: ${agentsError.message}`);
        return;
      }

      if (!userAgents || userAgents.length === 0) {
        console.log('⚠️ [Dashboard] No agents assigned to user');
        setCalls([]);
        setUserAgents([]);
        setStats({
          totalCalls: 0,
          totalCost: 0,
          totalDuration: 0,
          avgDuration: 0,
          successRate: 0,
          positiveRatio: 0,
          callsToday: 0,
          costToday: 0
        });
        setLoading(false);
        return;
      }

      const userAgentIds = userAgents.map(assignment => assignment.agents.id);
      const userRetellAgentIds = userAgents.map(assignment => assignment.agents.retell_agent_id).filter(Boolean);
      const allAgentIds = [...userAgentIds, ...userRetellAgentIds];
      
      console.log('👤 [Dashboard] User agent IDs:', allAgentIds);
      setUserAgents(userAgents || []);

      // Obtener llamadas de esos agentes
      const { data, error: fetchError } = await supabase
        .from('calls')
        .select('*')
        .in('agent_id', allAgentIds)
        .order('timestamp', { ascending: false });

      if (fetchError) {
        console.error('❌ [Dashboard] Error fetching calls for user:', fetchError);
        setError(`Error: ${fetchError.message}`);
        return;
      }

      const callsData = data || [];
      console.log('✅ [Dashboard] User calls loaded:', callsData.length);

      setCalls(callsData);
      setUserAgents(userAgents || []);

      // Load audio durations for recent calls
      if (callsData && callsData.length > 0) {
        const recentCalls = callsData.slice(0, 10).filter(call => call.recording_url);
        await Promise.all(recentCalls.map(call => loadAudioDuration(call)));
      }

      

    } catch (err: any) {
      console.error('💥 [Dashboard] Exception fetching calls data:', err);
      setError(`Exception: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  // ============================================================================
  // FUNCIONES AUXILIARES PARA GRÁFICOS (MANTENER IGUAL)
  // ============================================================================
  
  // Prepare chart data for regular users
  const getChartData = () => {
    if (!calls.length) return [];
    
    const last7Days = [...Array(7)].map((_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();

    return last7Days.map(date => {
      const daysCalls = calls.filter(call => 
        call.timestamp.split('T')[0] === date
      );
      
      return {
        date: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
        calls: daysCalls.length,
        cost: daysCalls.reduce((sum, call) => sum + (call.cost_usd || 0), 0),
        avgDuration: daysCalls.length > 0 
          ? daysCalls.reduce((sum, call) => sum + getCallDuration(call), 0) / daysCalls.length 
          : 0
      };
    });
  };

  const getSentimentData = () => {
    const sentimentCounts = {
      positive: calls.filter(call => call.sentiment === 'positive').length,
      negative: calls.filter(call => call.sentiment === 'negative').length,
      neutral: calls.filter(call => call.sentiment === 'neutral').length,
    };

    return [
      { name: 'Positive', value: sentimentCounts.positive, color: '#10B981' },
      { name: 'Neutral', value: sentimentCounts.neutral, color: '#6B7280' },
      { name: 'Negative', value: sentimentCounts.negative, color: '#EF4444' },
    ].filter(item => item.value > 0);
  };

  const formatDuration = (seconds: number) => {
    if (!seconds || seconds === 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatCurrency = (amount: number) => {
  const roundedAmount = Math.round((amount || 0) * 10000) / 10000;
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  }).format(roundedAmount);
};
  // ============================================================================
  // VERIFICACIONES Y ESTADOS DE CARGA
  // ============================================================================
  
  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <p className="text-red-600 font-medium">Please log in to view dashboard</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <LoadingSpinner size="lg" />
          <span className="ml-3 text-gray-600">Loading dashboard...</span>
        </div>
      </DashboardLayout>
    );
  }
  // 🤖 RENDER SUPER ADMIN DASHBOARD
  if (isSuperAdmin) {
    return (
      <DashboardLayout>
        <div className="w-full space-y-4 sm:space-y-6">
          {/* Super Admin Account Balance */}
          <div className="w-full">
            <CreditBalance 
              onRequestRecharge={() => {
                alert('Super admins can manage all user credits in the Admin Credits section');
              }}
              showActions={true}
            />
          </div>

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                🛡️ Admin Dashboard
              </h1>
              <p className="text-gray-600 text-sm sm:text-base">
                System-wide analytics and management overview
              </p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs sm:text-sm">
                <Activity className="w-3 h-3 mr-1" />
                Super Admin
              </Badge>
              <Button
                onClick={fetchAdminStats}
                disabled={loading}
                variant="outline"
                size="sm"
                className="text-xs sm:text-sm"
              >
                {loading ? <LoadingSpinner size="sm" /> : "🔄"} Refresh
              </Button>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <Card className="border-red-200 bg-red-50 w-full">
              <CardContent className="p-3 sm:p-4">
                <p className="text-red-800 font-medium text-sm sm:text-base">❌ {error}</p>
              </CardContent>
            </Card>
          )}

          {/* Main Statistics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {/* Total Users */}
            <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100/50">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm text-gray-600 font-medium">Total Users</p>
                    <p className="text-2xl sm:text-3xl font-bold text-gray-900">{adminStats.totalUsers}</p>
                    <div className="flex items-center mt-1 sm:mt-2">
                      <UserCheck className="w-3 h-3 sm:w-4 sm:h-4 text-green-600 mr-1" />
                      <span className="text-xs text-green-600 font-medium">{adminStats.activeUsers} active</span>
                    </div>
                  </div>
                  <Users className="h-8 w-8 sm:h-12 sm:w-12 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            {/* Total Agents */}
            <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-green-100/50">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm text-gray-600 font-medium">Total Agents</p>
                    <p className="text-2xl sm:text-3xl font-bold text-gray-900">{adminStats.totalAgents}</p>
                    <div className="flex items-center mt-1 sm:mt-2">
                      <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-green-600 mr-1" />
                      <span className="text-xs text-gray-600">AI Agents</span>
                    </div>
                  </div>
                  <Bot className="h-8 w-8 sm:h-12 sm:w-12 text-green-600" />
                </div>
              </CardContent>
            </Card>

            {/* Total Credits */}
            <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-purple-100/50">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm text-gray-600 font-medium">Total Credits</p>
                    <p className="text-2xl sm:text-3xl font-bold text-gray-900">{formatCurrency(adminStats.totalCredits)}</p>
                    <div className="flex items-center mt-1 sm:mt-2">
                      <span className="text-xs text-purple-600 font-medium">
                        {formatCurrency(adminStats.avgCreditsPerUser)} avg/user
                      </span>
                    </div>
                  </div>
                  <DollarSign className="h-8 w-8 sm:h-12 sm:w-12 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            {/* Total Companies */}
            <Card className="border-0 shadow-sm bg-gradient-to-br from-orange-50 to-orange-100/50">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm text-gray-600 font-medium">Companies</p>
                    <p className="text-2xl sm:text-3xl font-bold text-gray-900">{adminStats.totalCompanies}</p>
                    <div className="flex items-center mt-1 sm:mt-2">
                      <Building2 className="w-3 h-3 sm:w-4 sm:h-4 text-orange-600 mr-1" />
                      <span className="text-xs text-gray-600">Organizations</span>
                    </div>
                  </div>
                  <Building2 className="h-8 w-8 sm:h-12 sm:w-12 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Secondary Statistics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <Card className="border-0 shadow-sm bg-gradient-to-br from-indigo-50 to-indigo-100/50">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm text-gray-600 font-medium">Total System Calls</p>
                    <p className="text-2xl sm:text-3xl font-bold text-gray-900">{adminStats.totalCalls}</p>
                    <div className="flex items-center mt-1 sm:mt-2">
                      <Activity className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-600 mr-1" />
                      <span className="text-xs text-gray-600">All users</span>
                    </div>
                  </div>
                  <BarChart3 className="h-8 w-8 sm:h-12 sm:w-12 text-indigo-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-gradient-to-br from-pink-50 to-pink-100/50">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm text-gray-600 font-medium">Credit Transactions</p>
                    <p className="text-2xl sm:text-3xl font-bold text-gray-900">{adminStats.totalCreditTransactions}</p>
                    <div className="flex items-center mt-1 sm:mt-2">
                      <CreditCard className="w-3 h-3 sm:w-4 sm:h-4 text-pink-600 mr-1" />
                      <span className="text-xs text-gray-600">Total transactions</span>
                    </div>
                  </div>
                  <CreditCard className="h-8 w-8 sm:h-12 sm:w-12 text-pink-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* User Registration Trend */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2 sm:pb-4">
                <CardTitle className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                  User Registration Trend
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2 sm:p-6">
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" stroke="#64748b" fontSize={10} />
                    <YAxis stroke="#64748b" fontSize={10} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#fff', 
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="users" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      dot={{ fill: '#3b82f6', strokeWidth: 2, r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* User Distribution */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2 sm:pb-4">
                <CardTitle className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <PieChart className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                  User Distribution
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2 sm:p-6">
                <div className="flex items-center justify-center">
                  <ResponsiveContainer width="100%" height={250}>
                    <RechartsPieChart>
                      <Pie
                        data={userDistribution}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {userDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Settings className="h-5 w-5 text-gray-600" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Button 
                  variant="outline" 
                  className="h-16 flex items-center justify-between p-4"
                  onClick={() => window.location.href = '/team'}
                >
                  <div className="flex items-center gap-3">
                    <Users className="h-6 w-6 text-blue-600" />
                    <div className="text-left">
                      <div className="font-semibold">Manage Users</div>
                      <div className="text-xs text-gray-500">User management</div>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                </Button>

                <Button 
                  variant="outline" 
                  className="h-16 flex items-center justify-between p-4"
                  onClick={() => window.location.href = '/admin/credits'}
                >
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-6 w-6 text-green-600" />
                    <div className="text-left">
                      <div className="font-semibold">Manage Credits</div>
                      <div className="text-xs text-gray-500">Credit administration</div>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                </Button>

                <Button 
                  variant="outline" 
                  className="h-16 flex items-center justify-between p-4"
                  onClick={() => window.location.href = '/settings'}
                >
                  <div className="flex items-center gap-3">
                    <Settings className="h-6 w-6 text-purple-600" />
                    <div className="text-left">
                      <div className="font-semibold">System Settings</div>
                      <div className="text-xs text-gray-500">Configuration</div>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }
  // 👤 RENDER REGULAR USER DASHBOARD (LAYOUT CORREGIDO)
  const regularChartData = getChartData();
  const sentimentData = getSentimentData();

  return (
    <DashboardLayout>
      {/* ✅ CONTENEDOR PRINCIPAL CON ESPACIADO MEJORADO */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        
        {/* ✅ SECCIÓN 1: CREDIT BALANCE - PROMINENTE Y BIEN ESPACIADO */}
        <div className="w-full">
          <CreditBalance 
            onRequestRecharge={() => {
              alert('Please contact support to recharge your account: support@drscaleai.com');
            }}
            showActions={true}
          />
        </div>

        {/* ✅ SECCIÓN 2: HEADER DEL DASHBOARD - ORGANIZADO */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 tracking-tight">
              📊 Dashboard
            </h1>
            <p className="text-gray-600 text-lg">
              Real-time analytics for your AI call system
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 px-3 py-1">
              <Activity className="w-4 h-4 mr-2" />
              Live Data
            </Badge>
            
            <Button
              onClick={() => {
                fetchCallsData();
                if (user?.id) refreshCreditBalance(user.id);
              }}
              disabled={loading}
              variant="outline"
              size="default"
              className="px-4 py-2"
            >
              {loading ? <LoadingSpinner size="sm" /> : "🔄"} Refresh Data
            </Button>
          </div>
        </div>

        {/* ✅ SECCIÓN 3: ERROR ALERT - MEJORADO */}
        {error && (
          <Card className="border-red-200 bg-red-50 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                  <span className="text-red-600 text-lg">❌</span>
                </div>
                <p className="text-red-800 font-medium">{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ✅ SECCIÓN 4: MÉTRICAS PRINCIPALES - GRID MEJORADO */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          
          {/* Tarjeta 1: Total Calls */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 via-blue-50 to-blue-100 hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-blue-600/80 uppercase tracking-wide">
                    Total Calls
                  </p>
                  <p className="text-3xl font-bold text-gray-900">
                    {stats.totalCalls.toLocaleString()}
                  </p>
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center text-green-600">
                      <TrendingUp className="w-4 h-4 mr-1" />
                      <span className="text-sm font-semibold">+{stats.callsToday}</span>
                    </div>
                    <span className="text-xs text-gray-600">today</span>
                  </div>
                </div>
                <div className="p-3 bg-blue-100 rounded-xl">
                  <Phone className="h-8 w-8 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tarjeta 2: Success Rate */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 via-green-50 to-green-100 hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-green-600/80 uppercase tracking-wide">
                    Success Rate
                  </p>
                  <p className="text-3xl font-bold text-gray-900">
                    {stats.successRate.toFixed(1)}%
                  </p>
                  <div className="flex items-center space-x-2">
                    {stats.successRate >= 80 ? (
                      <div className="flex items-center text-green-600">
                        <TrendingUp className="w-4 h-4 mr-1" />
                        <span className="text-sm font-semibold">Excellent</span>
                      </div>
                    ) : stats.successRate >= 60 ? (
                      <div className="flex items-center text-yellow-600">
                        <Target className="w-4 h-4 mr-1" />
                        <span className="text-sm font-semibold">Good</span>
                      </div>
                    ) : (
                      <div className="flex items-center text-red-600">
                        <TrendingDown className="w-4 h-4 mr-1" />
                        <span className="text-sm font-semibold">Needs Improvement</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="p-3 bg-green-100 rounded-xl">
                  <TrendingUp className="h-8 w-8 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tarjeta 3: Total Cost */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 via-purple-50 to-purple-100 hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-purple-600/80 uppercase tracking-wide">
                    Total Cost
                  </p>
                  <p className="text-3xl font-bold text-gray-900">
                    {formatCurrency(stats.totalCost)}
                  </p>
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center text-purple-600">
                      <DollarSign className="w-4 h-4 mr-1" />
                      <span className="text-sm font-semibold">{formatCurrency(stats.costToday)}</span>
                    </div>
                    <span className="text-xs text-gray-600">today</span>
                  </div>
                </div>
                <div className="p-3 bg-purple-100 rounded-xl">
                  <DollarSign className="h-8 w-8 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tarjeta 4: Average Duration */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-50 via-orange-50 to-orange-100 hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-orange-600/80 uppercase tracking-wide">
                    Avg Duration
                  </p>
                  <p className="text-3xl font-bold text-gray-900">
                    {formatDuration(stats.avgDuration)}
                  </p>
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center text-orange-600">
                      <Clock className="w-4 h-4 mr-1" />
                      <span className="text-sm font-semibold">Per call</span>
                    </div>
                  </div>
                </div>
                <div className="p-3 bg-orange-100 rounded-xl">
                  <Clock className="h-8 w-8 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ✅ SECCIÓN 5: GRÁFICOS PRINCIPALES - LAYOUT MEJORADO */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Gráfico 1: Call Activity - Rediseñado */}
          <Card className="border-0 shadow-lg bg-white hover:shadow-xl transition-all duration-300">
            <CardHeader className="pb-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <BarChart3 className="h-5 w-5 text-blue-600" />
                  </div>
                  Call Activity
                </CardTitle>
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  Last 7 Days
                </Badge>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Daily call volume and performance trends
              </p>
            </CardHeader>
            <CardContent className="p-6">
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={regularChartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <defs>
                      <linearGradient id="callGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#64748b" 
                      fontSize={12}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      stroke="#64748b" 
                      fontSize={12}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#fff', 
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        fontSize: '14px',
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                      }}
                      labelStyle={{ color: '#374151', fontWeight: 'bold' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="calls" 
                      stroke="#3b82f6" 
                      strokeWidth={3}
                      dot={{ fill: '#3b82f6', strokeWidth: 2, r: 5 }}
                      activeDot={{ r: 7, fill: '#1d4ed8' }}
                      fill="url(#callGradient)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              
              {/* Métricas adicionales del gráfico */}
              <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-gray-100">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {regularChartData.reduce((sum, day) => sum + day.calls, 0)}
                  </p>
                  <p className="text-xs text-gray-600 uppercase tracking-wide">Total This Week</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {regularChartData.length > 0 ? Math.max(...regularChartData.map(d => d.calls)) : 0}
                  </p>
                  <p className="text-xs text-gray-600 uppercase tracking-wide">Peak Day</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600">
                    {regularChartData.length > 0 ? (regularChartData.reduce((sum, day) => sum + day.calls, 0) / regularChartData.length).toFixed(1) : 0}
                  </p>
                  <p className="text-xs text-gray-600 uppercase tracking-wide">Daily Average</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Gráfico 2: Sentiment Analysis - Rediseñado */}
          <Card className="border-0 shadow-lg bg-white hover:shadow-xl transition-all duration-300">
            <CardHeader className="pb-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Zap className="h-5 w-5 text-purple-600" />
                  </div>
                  Sentiment Analysis
                </CardTitle>
                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                  All Calls
                </Badge>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Customer sentiment distribution across conversations
              </p>
            </CardHeader>
            <CardContent className="p-6">
              <div className="h-80 w-full">
                {sentimentData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <defs>
                        <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                          <dropShadow dx="2" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.1"/>
                        </filter>
                      </defs>
                      <Pie
                        data={sentimentData}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        innerRadius={40}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                        filter="url(#shadow)"
                      >
                        {sentimentData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.color}
                            stroke="#fff"
                            strokeWidth={2}
                          />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: '#fff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '12px',
                          fontSize: '14px',
                          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                        }}
                      />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500">
                    <Zap className="h-12 w-12 mb-4 opacity-50" />
                    <p className="text-lg font-medium">No sentiment data available</p>
                    <p className="text-sm">Complete some calls to see sentiment analysis</p>
                  </div>
                )}
              </div>
              
              {/* Sentiment Summary */}
              <div className="mt-6 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-green-600">
                      {stats.positiveRatio.toFixed(1)}%
                    </p>
                    <p className="text-sm text-gray-600 font-medium">Positive Sentiment</p>
                  </div>
                  <div className="flex items-center space-x-4">
                    {sentimentData.map((item, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: item.color }}
                        ></div>
                        <span className="text-sm text-gray-600">{item.name}: {item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ✅ SECCIÓN 6: COST ANALYSIS - GRÁFICO COMPLETO MEJORADO */}
        <Card className="border-0 shadow-lg bg-white hover:shadow-xl transition-all duration-300">
          <CardHeader className="pb-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
                Cost Analysis
              </CardTitle>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                Last 7 Days
              </Badge>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Daily spending breakdown and cost optimization insights
            </p>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={regularChartData} 
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                >
                  <defs>
                    <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.3}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#64748b" 
                    fontSize={12}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    stroke="#64748b" 
                    fontSize={12}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => `${value.toFixed(2)}`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      fontSize: '14px',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                    }}
                    formatter={(value) => [formatCurrency(Number(value)), 'Cost']}
                    labelStyle={{ color: '#374151', fontWeight: 'bold' }}
                  />
                  <Bar 
                    dataKey="cost" 
                    fill="url(#costGradient)" 
                    radius={[8, 8, 0, 0]}
                    stroke="#059669"
                    strokeWidth={1}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            {/* Cost Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6 pt-4 border-t border-gray-100">
              <div className="text-center p-4 bg-green-50 rounded-xl">
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(regularChartData.reduce((sum, day) => sum + day.cost, 0))}
                </p>
                <p className="text-xs text-gray-600 uppercase tracking-wide mt-1">Total This Week</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-xl">
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(regularChartData.length > 0 ? Math.max(...regularChartData.map(d => d.cost)) : 0)}
                </p>
                <p className="text-xs text-gray-600 uppercase tracking-wide mt-1">Highest Day</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-xl">
                <p className="text-2xl font-bold text-purple-600">
                  {formatCurrency(regularChartData.length > 0 ? (regularChartData.reduce((sum, day) => sum + day.cost, 0) / regularChartData.length) : 0)}
                </p>
                <p className="text-xs text-gray-600 uppercase tracking-wide mt-1">Daily Average</p>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-xl">
                <p className="text-2xl font-bold text-orange-600">
                  {stats.totalCalls > 0 ? formatCurrency(stats.totalCost / stats.totalCalls) : '$0.00'}
                </p>
                <p className="text-xs text-gray-600 uppercase tracking-wide mt-1">Cost Per Call</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ✅ SECCIÓN 7: QUICK STATS - TARJETAS FINALES REDISEÑADAS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Quick Stat 1: Total Conversations */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-indigo-50 via-indigo-50 to-indigo-100 hover:shadow-xl transition-all duration-300 group">
            <CardContent className="p-6 text-center">
              <div className="mx-auto w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <Users className="h-8 w-8 text-indigo-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-2">
                {stats.totalCalls.toLocaleString()}
              </p>
              <p className="text-sm font-medium text-indigo-600 uppercase tracking-wider">
                Total Conversations
              </p>
              <div className="mt-3 pt-3 border-t border-indigo-200">
                <p className="text-xs text-gray-600">
                  Across all time periods
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stat 2: Total Talk Time */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-pink-50 via-pink-50 to-pink-100 hover:shadow-xl transition-all duration-300 group">
            <CardContent className="p-6 text-center">
              <div className="mx-auto w-16 h-16 bg-pink-100 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <Target className="h-8 w-8 text-pink-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-2">
                {formatDuration(stats.totalDuration)}
              </p>
              <p className="text-sm font-medium text-pink-600 uppercase tracking-wider">
                Total Talk Time
              </p>
              <div className="mt-3 pt-3 border-t border-pink-200">
                <p className="text-xs text-gray-600">
                  {(stats.totalDuration / 3600).toFixed(1)} hours total
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stat 3: Recorded Calls */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-teal-50 via-teal-50 to-teal-100 hover:shadow-xl transition-all duration-300 group">
            <CardContent className="p-6 text-center">
              <div className="mx-auto w-16 h-16 bg-teal-100 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <Activity className="h-8 w-8 text-teal-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-2">
                {calls.filter(call => call.recording_url).length.toLocaleString()}
              </p>
              <p className="text-sm font-medium text-teal-600 uppercase tracking-wider">
                Recorded Calls
              </p>
              <div className="mt-3 pt-3 border-t border-teal-200">
                <p className="text-xs text-gray-600">
                  {stats.totalCalls > 0 ? 
                    `${((calls.filter(call => call.recording_url).length / stats.totalCalls) * 100).toFixed(1)}% recorded` 
                    : '0% recorded'
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ✅ SECCIÓN 8: FOOTER MEJORADO */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <div className="text-center space-y-3">
            <p className="text-sm text-gray-500">
              Dashboard automatically updates every 5 minutes
            </p>
            <div className="flex items-center justify-center space-x-4 text-xs text-gray-400">
              <span>Last updated: {new Date().toLocaleTimeString()}</span>
              <span>•</span>
              <span>Real-time data</span>
              <span>•</span>
              <span>Version 2.0</span>
            </div>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
