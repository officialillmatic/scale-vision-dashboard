import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  Bell, 
  RefreshCw, 
  Send, 
  ChevronDown, 
  ChevronUp,
  DollarSign,
  Clock,
  User,
  Mail,
  ExternalLink,
  Settings
} from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { formatCurrency } from '@/lib/formatters';

interface BalanceAlertsProps {
  /** Mostrar solo una versión compacta */
  compact?: boolean;
  /** Límite de usuarios a mostrar inicialmente */
  maxUsers?: number;
  /** Mostrar controles de administrador */
  showAdminControls?: boolean;
  /** Callback cuando se hace clic en configurar */
  onConfigureClick?: () => void;
}

export const BalanceAlerts: React.FC<BalanceAlertsProps> = ({
  compact = false,
  maxUsers = 5,
  showAdminControls = true,
  onConfigureClick
}) => {
  const {
    lowBalanceUsers,
    config,
    loading,
    lastCheck,
    stats,
    checkLowBalanceUsers,
    sendNotifications,
    getAlertColor,
    getAlertLabel,
    sortedUsers
  } = useNotifications();

  const [expanded, setExpanded] = useState(false);
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const displayUsers = expanded ? sortedUsers : sortedUsers.slice(0, maxUsers);
  const hasMore = sortedUsers.length > maxUsers;

  const handleRefresh = async () => {
    setRefreshing(true);
    await checkLowBalanceUsers(true);
    setRefreshing(false);
  };

  const handleSendNotifications = async () => {
    setSending(true);
    await sendNotifications();
    setSending(false);
  };

  const getAlertIcon = (level: string) => {
    switch (level) {
      case 'zero':
      case 'almost_zero':
      case 'critical':
        return <AlertTriangle className="w-4 h-4" />;
      case 'warning':
        return <Bell className="w-4 h-4" />;
      default:
        return <DollarSign className="w-4 h-4" />;
    }
  };

  const getUrgencyMessage = (level: string) => {
    switch (level) {
      case 'zero':
        return 'Usuario sin créditos - ACCIÓN INMEDIATA REQUERIDA';
      case 'almost_zero':
        return 'Balance casi agotado - Recargar urgentemente';
      case 'critical':
        return 'Balance crítico - Atención requerida';
      case 'warning':
        return 'Balance bajo - Considerar recarga';
      default:
        return 'Balance normal';
    }
  };

  if (loading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 text-center">
          <LoadingSpinner size="sm" />
          <span className="ml-2 text-sm text-gray-600">Verificando balances...</span>
        </CardContent>
      </Card>
    );
  }

  // Si no hay alertas y está en modo compacto, no mostrar nada
  if (compact && sortedUsers.length === 0) {
    return null;
  }

  // Si no hay alertas, mostrar estado vacío
  if (sortedUsers.length === 0) {
    return (
      <Card className="border-green-200 bg-green-50 shadow-sm">
        <CardContent className="p-4 text-center">
          <div className="flex items-center justify-center gap-2 text-green-700">
            <DollarSign className="w-5 h-5" />
            <span className="font-medium">✅ Todos los usuarios tienen balance adecuado</span>
          </div>
          <p className="text-sm text-green-600 mt-1">
            Última verificación: {lastCheck?.toLocaleTimeString() || 'Nunca'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${sortedUsers.length > 0 ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'} shadow-lg`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold text-red-800 flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            {compact ? (
              `⚠️ ${stats.totalAlerted} Usuario${stats.totalAlerted !== 1 ? 's' : ''} con Balance Bajo`
            ) : (
              '⚠️ ALERTA: Usuarios con Balance Bajo'
            )}
            <Badge variant="destructive" className="ml-auto">
              {stats.totalAlerted} usuario{stats.totalAlerted !== 1 ? 's' : ''}
            </Badge>
          </CardTitle>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleRefresh}
              disabled={refreshing}
              variant="outline"
              size="sm"
              className="border-red-300 text-red-700 hover:bg-red-100"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>

            {showAdminControls && config?.email_enabled && (
              <Button
                onClick={handleSendNotifications}
                disabled={sending}
                variant="outline"
                size="sm"
                className="border-blue-300 text-blue-700 hover:bg-blue-50"
              >
                {sending ? <LoadingSpinner size="sm" /> : <Send className="w-4 h-4" />}
                {sending ? 'Enviando...' : 'Notificar'}
              </Button>
            )}

            {showAdminControls && onConfigureClick && (
              <Button
                onClick={onConfigureClick}
                variant="outline"
                size="sm"
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                <Settings className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {!compact && (
          <div className="flex items-center gap-4 text-sm text-red-700 mt-2">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-red-600 rounded-full"></span>
              <span>{stats.zeroBalance} sin balance</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-red-500 rounded-full"></span>
              <span>{stats.criticalBalance} críticos</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
              <span>{stats.warningBalance} advertencia</span>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="p-4 pt-0">
        <div className="space-y-3">
          {displayUsers.map((user) => (
            <div 
              key={user.user_id}
              className={`flex items-center justify-between p-4 bg-white rounded-lg border transition-all duration-200 hover:shadow-md ${
                user.alert_level === 'zero' || user.alert_level === 'almost_zero' 
                  ? 'border-red-300 hover:bg-red-50' 
                  : user.alert_level === 'critical'
                  ? 'border-red-200 hover:bg-red-25'
                  : 'border-yellow-200 hover:bg-yellow-25'
              }`}
            >
              <div className="flex items-center gap-4 flex-1">
                <div className={`p-2 rounded-lg ${
                  user.alert_level === 'zero' || user.alert_level === 'almost_zero' 
                    ? 'bg-red-100' 
                    : user.alert_level === 'critical'
                    ? 'bg-red-100'
                    : 'bg-yellow-100'
                }`}>
                  {getAlertIcon(user.alert_level)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <p className="font-semibold text-gray-900 truncate">{user.user_name}</p>
                    <Badge variant={getAlertColor(user.alert_level) as any} className="text-xs">
                      {getAlertLabel(user.alert_level)}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      <span className="truncate max-w-48">{user.user_email}</span>
                    </div>
                    {!compact && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>
                          {user.hours_since_last_notification < 999 
                            ? `Notificado hace ${user.hours_since_last_notification}h`
                            : 'Sin notificar'
                          }
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {!compact && (
                    <p className="text-xs text-gray-500 mt-1 italic">
                      {getUrgencyMessage(user.alert_level)}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="text-right ml-4">
                <p className={`text-2xl font-bold ${
                  user.current_balance <= 0 ? 'text-red-600' : 
                  user.alert_level === 'critical' ? 'text-red-500' : 'text-yellow-600'
                }`}>
                  {formatCurrency(user.current_balance)}
                </p>
                {!compact && (
                  <div className="flex items-center gap-2 mt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs px-2 py-1"
                      onClick={() => window.open(`/admin/credits?user=${user.user_id}`, '_blank')}
                    >
                      <ExternalLink className="w-3 h-3 mr-1" />
                      Gestionar
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Botón para expandir/contraer */}
        {hasMore && (
          <div className="mt-4 text-center">
            <Button
              onClick={() => setExpanded(!expanded)}
              variant="ghost"
              size="sm"
              className="text-red-700 hover:bg-red-100"
            >
              {expanded ? (
                <>
                  <ChevronUp className="w-4 h-4 mr-1" />
                  Mostrar menos
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4 mr-1" />
                  Ver todos ({sortedUsers.length - maxUsers} más)
                </>
              )}
            </Button>
          </div>
        )}

        {/* Footer con información adicional */}
        <div className="mt-4 pt-4 border-t border-red-200 flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <span className="text-red-700">
              Última verificación: {lastCheck?.toLocaleTimeString() || 'Nunca'}
            </span>
            {config?.email_enabled && (
              <span className="text-blue-700">
                📧 Notificaciones: {config.notification_email}
              </span>
            )}
          </div>
          
          {config?.email_enabled && (
            <div className="text-xs text-gray-600">
              Auto-notificación cada {config.notification_frequency_hours}h
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
