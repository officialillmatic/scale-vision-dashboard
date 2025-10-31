import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  DollarSign, 
  History, 
  Edit3, 
  AlertTriangle,
  User,
  Eye,
  Lock
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/formatters';

interface UserCredit {
  user_id: string;
  email: string;
  name: string;
  current_balance: number;
  warning_threshold: number;
  critical_threshold: number;
  is_blocked: boolean;
  balance_status: string;
  recent_transactions_count: number;
  balance_updated_at: string;
  user_created_at: string;
}

interface UserCreditsListProps {
  users: UserCredit[];
  loading: boolean;
  selectedUsers: string[];
  onUserSelection: (userId: string, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
  onAdjustCredit: (userId: string) => void;
  onViewTransactions: (userId: string) => void;
  isSuperAdmin: boolean; // Nueva prop para determinar permisos
  getStatusBadgeColor?: (status: string) => string;
}

export function UserCreditsList({
  users,
  loading,
  selectedUsers,
  onUserSelection,
  onSelectAll,
  onAdjustCredit,
  onViewTransactions,
  isSuperAdmin,
  getStatusBadgeColor
}: UserCreditsListProps) {
  
  const defaultGetStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'blocked': return 'destructive';
      case 'critical': return 'destructive';
      case 'warning': return 'secondary';
      case 'normal': return 'default';
      default: return 'default';
    }
  };

  const getBadgeColor = getStatusBadgeColor || defaultGetStatusBadgeColor;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading Users...</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
              <Skeleton className="h-4 w-4" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-[200px]" />
                <Skeleton className="h-3 w-[150px]" />
              </div>
              <Skeleton className="h-8 w-[80px]" />
              <Skeleton className="h-8 w-[100px]" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (users.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No users found</h3>
          <p className="text-gray-600">Try adjusting your search or filter criteria.</p>
        </CardContent>
      </Card>
    );
  }

  const allSelected = users.length > 0 && selectedUsers.length === users.length;
  const someSelected = selectedUsers.length > 0 && selectedUsers.length < users.length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {/* Solo mostrar checkbox de selección múltiple para super admins */}
            {isSuperAdmin && (
              <Checkbox
                checked={allSelected}
                onCheckedChange={onSelectAll}
                className={someSelected ? "data-[state=checked]:bg-primary/50" : ""}
              />
            )}
            Users ({users.length})
            {!isSuperAdmin && (
              <Badge variant="outline" className="ml-2 text-xs">
                <Eye className="h-3 w-3 mr-1" />
                Read Only
              </Badge>
            )}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {users.map((user) => (
          <div
            key={user.user_id}
            className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center space-x-4 flex-1">
              {/* Solo mostrar checkbox individual para super admins */}
              {isSuperAdmin && (
                <Checkbox
                  checked={selectedUsers.includes(user.user_id)}
                  onCheckedChange={(checked) => onUserSelection(user.user_id, checked as boolean)}
                />
              )}
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium text-sm truncate">{user.email}</p>
                  {user.name && (
                    <span className="text-xs text-gray-500">({user.name})</span>
                  )}
                  <Badge variant={getBadgeColor(user.balance_status) as any}>
                    {user.balance_status}
                  </Badge>
                  {user.is_blocked && (
                    <Badge variant="destructive">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Blocked
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>Balance: {formatCurrency(user.current_balance)}</span>
                  <span>Transactions: {user.recent_transactions_count}</span>
                  <span>Updated: {formatDate(user.balance_updated_at)}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 ml-4">
              {/* Botón de historial - disponible para todos */}
              <Button
                size="sm"
                variant="outline"
                onClick={() => onViewTransactions(user.user_id)}
                title="View transaction history"
              >
                <History className="h-4 w-4 mr-1" />
                History
              </Button>
              
              {/* Botón de ajuste - solo para super admins */}
              {isSuperAdmin ? (
                <Button
                  size="sm"
                  onClick={() => onAdjustCredit(user.user_id)}
                  title="Adjust user credits"
                >
                  <Edit3 className="h-4 w-4 mr-1" />
                  Adjust
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  disabled
                  title="Super admin privileges required"
                  className="opacity-50 cursor-not-allowed"
                >
                  <Lock className="h-4 w-4 mr-1" />
                  Adjust
                </Button>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
