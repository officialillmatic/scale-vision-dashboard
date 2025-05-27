
export interface Transaction {
  id: string;
  user_id: string;
  company_id: string;
  amount: number;
  transaction_type: string;
  description?: string;
  call_id?: string;
  created_at: string;
}

export interface UserBalance {
  id: string;
  user_id: string;
  company_id: string;
  balance: number;
  warning_threshold?: number;
  last_updated: string;
  created_at: string;
}
