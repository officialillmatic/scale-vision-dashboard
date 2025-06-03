
import React, { useState, useEffect } from 'react';
import { ProductionDashboardLayout } from '@/components/dashboard/ProductionDashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { supabase } from '@/integrations/supabase/client';
import { Phone, Clock, DollarSign, User, Calendar } from 'lucide-react';

interface CallData {
  id: string;
  call_id: string;
  user_id: string;
  timestamp: string;
  duration_sec: number;
  cost_usd: number;
  call_status: string;
  from_number: string | null;
  to_number: string | null;
  transcript: string | null;
  call_summary: string | null;
  sentiment: string | null;
}

export default function CallsSimple() {
  const [calls, setCalls] = useState<CallData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Usuario hardcodeado según requerimientos
  const targetUserId = "efe4f9c1-8322-4ce7-8193-69bd8c982d03";
  const userEmail = "alexbuenhombre2012@gmail.com";

  const fetchCalls = async () => {
    console.log('🔍 [CallsSimple] Iniciando consulta directa a Supabase...');
    console.log('🔍 [CallsSimple] Target user_id:', targetUserId);
    console.log('🔍 [CallsSimple] User email:', userEmail);
    
    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('calls')
        .select(`
          id,
          call_id,
          user_id,
          timestamp,
          duration_sec,
          cost_usd,
          call_status,
          from_number,
          to_number,
          transcript,
          call_summary,
          sentiment
        `)
        .eq('user_id', targetUserId)
        .order('timestamp', { ascending: false })
        .limit(100);

      console.log('🔍 [CallsSimple] Supabase response:', { data, error });
      console.log('🔍 [CallsSimple] Number of calls found:', data?.length || 0);

      if (error) {
        console.error('❌ [CallsSimple] Supabase error:', error);
        setError(`Error al cargar llamadas: ${error.message}`);
        return;
      }

      if (!data) {
        console.log('⚠️ [CallsSimple] No data returned from Supabase');
        setCalls([]);
        return;
      }

      console.log('✅ [CallsSimple] Calls loaded successfully:', data);
      setCalls(data);

    } catch (err: any) {
      console.error('❌ [CallsSimple] Exception:', err);
      setError(`Error inesperado: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCalls();
  }, []);

  // Funciones de cálculo de estadísticas
  const totalCalls = calls.length;
  const totalCost = calls.reduce((sum, call) => sum + (call.cost_usd || 0), 0);
  const totalDuration = calls.reduce((sum, call) => sum + (call.duration_sec || 0), 0);
  const averageDuration = totalCalls > 0 ? totalDuration / totalCalls : 0;

  // Función para enmascarar números de teléfono
  const maskPhoneNumber = (phone: string | null): string => {
    if (!phone || phone === 'unknown') return 'Desconocido';
    if (phone.length < 7) return phone;
    
    const first4 = phone.substring(0, 4);
    const last3 = phone.substring(phone.length - 3);
    const masked = '*'.repeat(Math.max(0, phone.length - 7));
    return `${first4}${masked}${last3}`;
  };

  // Función para formatear duración
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Función para formatear moneda
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Función para formatear fecha en español
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  // Función para obtener color del estado
  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Completada</Badge>;
      case 'failed':
      case 'error':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Error</Badge>;
      case 'user_hangup':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Usuario Colgó</Badge>;
      case 'dial_no_answer':
        return <Badge className="bg-orange-100 text-orange-800 border-orange-200">Sin Respuesta</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">{status || 'Desconocido'}</Badge>;
    }
  };

  // Función para obtener badge del sentimiento
  const getSentimentBadge = (sentiment: string | null) => {
    if (!sentiment) return <Badge variant="outline">Sin Análisis</Badge>;
    
    switch (sentiment.toLowerCase()) {
      case 'positive':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Positivo</Badge>;
      case 'negative':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Negativo</Badge>;
      case 'neutral':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Neutral</Badge>;
      default:
        return <Badge variant="outline">{sentiment}</Badge>;
    }
  };

  return (
    <ProductionDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Llamadas Simples</h1>
            <p className="text-gray-600">
              Vista directa de llamadas para: {userEmail}
            </p>
          </div>
          <Button onClick={fetchCalls} disabled={isLoading}>
            {isLoading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Cargando...
              </>
            ) : (
              <>
                <Calendar className="w-4 h-4 mr-2" />
                Actualizar
              </>
            )}
          </Button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Total Llamadas</p>
                  <p className="text-2xl font-bold text-gray-900">{totalCalls}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Phone className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-green-100/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Costo Total</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalCost)}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-purple-100/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Duración Total</p>
                  <p className="text-2xl font-bold text-gray-900">{formatDuration(totalDuration)}</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Clock className="h-5 w-5 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-gradient-to-br from-orange-50 to-orange-100/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Duración Promedio</p>
                  <p className="text-2xl font-bold text-gray-900">{formatDuration(Math.round(averageDuration))}</p>
                </div>
                <div className="p-3 bg-orange-100 rounded-lg">
                  <User className="h-5 w-5 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Calls List */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="border-b border-gray-100">
            <CardTitle className="text-xl font-semibold text-gray-900">
              Lista de Llamadas ({totalCalls})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner size="lg" />
              </div>
            ) : calls.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Phone className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-lg font-medium mb-2">No hay llamadas</p>
                <p className="text-sm">No se encontraron llamadas para este usuario.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {calls.map((call) => (
                  <div key={call.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-3">
                        {/* Call Info Header */}
                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <Phone className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">ID: {call.call_id}</p>
                            <p className="text-sm text-gray-500">{formatDate(call.timestamp)}</p>
                          </div>
                        </div>

                        {/* Call Details Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500">Desde:</p>
                            <p className="font-medium">{maskPhoneNumber(call.from_number)}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Hacia:</p>
                            <p className="font-medium">{maskPhoneNumber(call.to_number)}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Duración:</p>
                            <p className="font-medium">{formatDuration(call.duration_sec)}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Costo:</p>
                            <p className="font-medium">{formatCurrency(call.cost_usd)}</p>
                          </div>
                        </div>

                        {/* Status and Sentiment */}
                        <div className="flex items-center gap-4">
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Estado:</p>
                            {getStatusBadge(call.call_status)}
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Sentimiento:</p>
                            {getSentimentBadge(call.sentiment)}
                          </div>
                        </div>

                        {/* Summary */}
                        {call.call_summary && (
                          <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-xs text-gray-500 mb-1">Resumen:</p>
                            <p className="text-sm text-gray-700">{call.call_summary}</p>
                          </div>
                        )}

                        {/* Transcript Preview */}
                        {call.transcript && (
                          <div className="bg-blue-50 rounded-lg p-3">
                            <p className="text-xs text-blue-600 mb-1">Transcripción (vista previa):</p>
                            <p className="text-sm text-blue-700 line-clamp-2">
                              {call.transcript.substring(0, 150)}
                              {call.transcript.length > 150 && '...'}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Debug Info */}
        <Card className="border-2 border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <h3 className="font-medium text-blue-800 mb-2">🔍 Debug Info</h3>
            <div className="text-sm text-blue-700 space-y-1">
              <p><strong>User ID:</strong> {targetUserId}</p>
              <p><strong>Email:</strong> {userEmail}</p>
              <p><strong>Total Calls:</strong> {totalCalls}</p>
              <p><strong>Loading:</strong> {isLoading ? 'Sí' : 'No'}</p>
              <p><strong>Error:</strong> {error || 'Ninguno'}</p>
              <p><strong>Last Updated:</strong> {new Date().toLocaleTimeString('es-ES')}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </ProductionDashboardLayout>
  );
}
