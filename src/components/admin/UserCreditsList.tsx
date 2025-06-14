import React from 'react';
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { Plus, History } from 'lucide-react';
import { UserCredit } from './SuperAdminCreditPanel';

export interface UserCreditsListProps {
  users: UserCredit[];
  loading: boolean;
  selectedUsers: string[];
  onUserSelection: (userId: string) => void;
  onSelectAll: () => void;
  onAdjustCredit: (userId: string) => void;
  onViewTransactions: (userId: string) => void;
  getStatusBadgeColor: (status: string) => 'destructive' | 'secondary' | 'default';
}

export function UserCreditsList({
  users,
  loading,
  selectedUsers,
  onUserSelection,
  onSelectAll,
  onAdjustCredit,
  onViewTransactions,
  getStatusBadgeColor,
}: UserCreditsListProps) {
  if (loading) {
    return <p>Loading...</p>;
  }

  if (users.length === 0) {
    return <p>No users found.</p>;
  }

  const allSelected = users.every(u => selectedUsers.includes(u.user_id));

  return (
    <div className="mt-4 overflow-x-auto">
      <Table>
        <Thead>
          <Tr>
            <Th>
              <Checkbox checked={allSelected} onChange={onSelectAll} />
            </Th>
            <Th>Email</Th>
            <Th>Name</Th>
            <Th>Balance</Th>
            <Th>Status</Th>
            <Th>Recent Txns</Th>
            <Th>Last Updated</Th>
            <Th>Created At</Th>
            <Th>Actions</Th>
          </Tr>
        </Thead>
        <Tbody>
          {users.map(user => (
            <Tr key={user.user_id}>
              <Td>
                <Checkbox
                  checked={selectedUsers.includes(user.user_id)}
                  onChange={() => onUserSelection(user.user_id)}
                />
              </Td>
              <Td>{user.email}</Td>
              <Td>{user.name}</Td>
              <Td>${user.current_balance.toFixed(2)}</Td>
              <Td>
                <Badge variant={getStatusBadgeColor(user.balance_status)}>
                  {user.balance_status[0].toUpperCase() + user.balance_status.slice(1)}
                </Badge>
              </Td>
              <Td>{user.recent_transactions_count}</Td>
              <Td>
                {formatDistanceToNow(new Date(user.balance_updated_at), {
                  addSuffix: true,
                })}
              </Td>
              <Td>
                {new Date(user.user_created_at).toLocaleDateString()}
              </Td>
              <Td className="space-x-2">
                <Button onClick={() => onAdjustCredit(user.user_id)} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
                <Button
                  onClick={() => onViewTransactions(user.user_id)}
                  size="sm"
                  variant="outline"
                >
                  <History className="h-4 w-4" />
                </Button>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </div>
  );
}
