import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ProductionDashboardLayout } from "@/components/dashboard/ProductionDashboardLayout";
import { CallDetailModal } from "@/components/calls/CallDetailModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Phone, 
  Clock, 
  DollarSign, 
  User, 
  Calendar, 
  Search,
  FileText,
  PlayCircle,
  TrendingUp,
  Filter,
  Eye,
  ArrowUpDown
} from "lucide-react";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

interface Call {
  id: string;
  call_id: string;
  user_id: string;
  agent_id: string;
  company_id: string;
  timestamp: string;
  duration_sec: number;
  cost_usd: number;
  call_status: string;
  from_number: string;
  to_number: string;
  transcript?: string;
  call_summary?: string;
  sentiment?: string;
}

type SortField = 'timestamp' | 'duration_sec' | 'cost_usd' | 'call_status';
type SortOrder = 'asc' | 'desc';

export default function CallsSimple() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [filteredCalls, setFilteredCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>('timestamp');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [selectedCall, setSelectedCall] = useState<Call | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    totalCost: 0,
    totalDuration: 0,
    avgDuration: 0,
    completedCalls: 0
  });

  // User ID for alexbuenhombre2012@gmail.com
  const USER_ID = "efe4f9c1-8322-4ce7-8193-69bd8c982d03";

  useEffect(() => {
    fetchCalls();
  }, []);

  useEffect(() => {
    applyFiltersAndSort();
  }, [calls, searchTerm, statusFilter, sortField, sortOrder]);

  const fetchCalls = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("🔍 Fetching calls for user:", USER_ID);

      const { data, error: fetchError } = await supabase
        .from('calls')
        .select(`
          id,
          call_id,
          user_id,
          agent_id,
          company_id,
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
        .eq('user_id', USER_ID)
        .order('timestamp', { ascending: false });

      if (fetchError) {
        console.error("❌ Error fetching calls:", fetchError);
        setError(`Error: ${fetchError.message}`);
        return;
      }

      console.log("✅ Calls fetched successfully:", data?.length || 0);
      setCalls(data || []);

      // Calculate statistics
      if (data && data.length > 0) {
        const totalCost = data.reduce((sum, call) => sum + (call.cost_usd || 0), 0);
        const totalDuration = data.reduce((sum, call) => sum + (call.duration_sec || 0), 0);
        const avgDuration = totalDuration / data.length;
        const completedCalls = data.filter(call => call.call_status === 'completed').length;

        setStats({
          total: data.length,
          totalCost,
          totalDuration,
          avgDuration,
          completedCalls
        });
      }

    } catch (err: any) {
      console.error("❌ Exception fetching calls:", err