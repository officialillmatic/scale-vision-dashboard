import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCallData } from "@/hooks/useCallData";
import { WhiteLabelCallDetailsModal } from "./WhiteLabelCallDetailsModal";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { formatCurrency, formatDuration } from "@/lib/formatters";
import { CalendarIcon, Search, Phone, Clock, DollarSign, User, Bot, Filter, Download, Eye } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export const WhiteLabelCallsTable = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [agentFilter, setAgentFilter] = useState<string>("all");
  const [userFilter, setUserFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCall, setSelectedCall] = useState<any>(null);

  const { calls, isLoading, error, handleSync, isSyncing } = useCallData();

  // Filter calls based on current filters
  const filteredCalls = calls.filter(call => {
    const matchesSearch = !searchTerm || 
      call.from?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      call.to?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      call.call_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      call.agent?.name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDate = !dateFilter ||
      new Date(call.timestamp).toDateString() === dateFilter.toDateString();

    const matchesStatus = statusFilter === "all" || call.call_status === statusFilter;
    const matchesAgent = agentFilter === "all" || call.agent?.id === agentFilter;
    const matchesUser = userFilter === "all" || call.user_id === userFilter;

    return matchesSearch && matchesDate && matchesStatus && matchesAgent && matchesUser;
  });

  // Get unique values for filters
  const uniqueAgents = Array.from(new Set(calls.map(call => call.agent?.name).filter(Boolean)));
  const uniqueUsers = Array.from(new Set(calls.map(call => call.user_id).filter(Boolean)));
  const uniqueStatuses = Array.from(new Set(calls.map(call => call.call_status).filter(Boolean)));

  // Calculate summary metrics
  const totalCalls = filteredCalls.length;
  const totalDuration = filteredCalls.reduce((sum, call) => sum + (call.duration_sec || 0), 0);
  const totalCost = filteredCalls.reduce((sum, call) => sum + (call.cost_usd || 0), 0);
  const avgDuration = totalCalls > 0 ? totalDuration / totalCalls : 0;

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; label: string }> = {
      completed: { color: "bg-green-100 text-green-800 border-green-200", label: "Completed" },
      failed: { color: "bg-red-100 text-red-800 border-red-200", label: "Failed" },
      in_progress: { color: "bg-blue-100 text-blue-800 border-blue-200", label: "In Progress" },
      user_hangup: { color: "bg-yellow-100 text-yellow-800 border-yellow-200", label: "Hangup" },
      dial_no_answer: { color: "bg-gray-100 text-gray-800 border-gray-200", label: "No Answer" },
      voicemail: { color: "bg-purple-100 text-purple-800 border-purple-200", label: "Voicemail" }
    };

    const config = statusConfig[status] || statusConfig.completed;
    return (
      <Badge variant="outline" className={config.color}>
        {config.label}
      </Badge>
    );
  };

  const getOutcomeBadge = (call: any) => {
    if (call.disposition) {
      const outcomeConfig: Record<string, { color: string; label: string }> = {
        enrolled: { color: "bg-green-100 text-green-800", label: "Enrolled" },
        completed: { color: "bg-blue-100 text-blue-800", label: "Completed" },
        success: { color: "bg-green-100 text-green-800", label: "Success" },
        no_answer: { color: "bg-gray-100 text-gray-800", label: "No Answer" },
        voicemail: { color: "bg-purple-100 text-purple-800", label: "Voicemail" },
        busy: { color: "bg-yellow-100 text-yellow-800", label: "Busy" },
        declined: { color: "bg-red-100 text-red-800", label: "Declined" },
        failed: { color: "bg-red-100 text-red-800", label: "Failed" }
      };

      const config = outcomeConfig[call.disposition] || { color: "bg-gray-100 text-gray-800", label: call.disposition };
      return (
        <Badge variant="outline" className={config.color}>
          {config.label}
        </Badge>
      );
    }

    return <span className="text-gray-400">-</span>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <p className="text-red-700">Failed to load call data</p>
            <Button onClick={handleSync} variant="outline" className="bg-white">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Total Calls</p>
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
                <p className="text-sm text-gray-600 font-medium">Total Duration</p>
                <p className="text-2xl font-bold text-gray-900">{formatDuration(totalDuration)}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <Clock className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-purple-100/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Avg Duration</p>
                <p className="text-2xl font-bold text-gray-900">{formatDuration(avgDuration)}</p>
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
                <p className="text-sm text-gray-600 font-medium">Total Cost</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalCost)}</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="border-b border-gray-100 pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-semibold text-gray-900">Call Management</CardTitle>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="bg-white hover:bg-gray-50"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSync}
                disabled={isSyncing}
                className="bg-white hover:bg-gray-50"
              >
                {isSyncing ? <LoadingSpinner size="sm" /> : <Download className="h-4 w-4 mr-2" />}
                Sync
              </Button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search by phone number, call ID, or agent..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white"
            />
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 pt-4 border-t border-gray-100">
              {/* Date Filter */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal bg-white",
                      !dateFilter && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFilter ? format(dateFilter, "MMM dd, yyyy") : "Pick date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateFilter}
                    onSelect={setDateFilter}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {uniqueStatuses.map(status => (
                    <SelectItem key={status} value={status}>
                      {status.replace('_', ' ').toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Agent Filter */}
              <Select value={agentFilter} onValueChange={setAgentFilter}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="All Agents" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Agents</SelectItem>
                  {uniqueAgents.map(agent => (
                    <SelectItem key={agent} value={agent}>
                      {agent}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* User Filter */}
              <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="All Users" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {uniqueUsers.map(user => (
                    <SelectItem key={user} value={user}>
                      {user.slice(0, 8)}...
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Clear Filters */}
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("");
                  setDateFilter(undefined);
                  setStatusFilter("all");
                  setAgentFilter("all");
                  setUserFilter("all");
                }}
                className="bg-white hover:bg-gray-50"
              >
                Clear All
              </Button>
            </div>
          )}
        </CardHeader>

        <CardContent className="p-0">
          {filteredCalls.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Phone className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-lg font-medium mb-2">No calls found</p>
              <p className="text-sm">Try adjusting your filters or search terms.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-semibold">Date/Time</TableHead>
                    <TableHead className="font-semibold">From</TableHead>
                    <TableHead className="font-semibold">To</TableHead>
                    <TableHead className="font-semibold">Duration</TableHead>
                    <TableHead className="font-semibold">Agent</TableHead>
                    <TableHead className="font-semibold">User</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Outcome</TableHead>
                    <TableHead className="font-semibold">Cost</TableHead>
                    <TableHead className="font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCalls.map((call) => (
                    <TableRow key={call.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium text-sm">
                            {format(new Date(call.timestamp), "MMM dd, yyyy")}
                          </div>
                          <div className="text-xs text-gray-500">
                            {format(new Date(call.timestamp), "HH:mm:ss")}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {call.from_number || call.from || "Unknown"}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {call.to_number || call.to || "Unknown"}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatDuration(call.duration_sec || 0)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Bot className="h-4 w-4 text-blue-500" />
                          <span className="text-sm">{call.agent?.name || "Unknown"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-gray-500" />
                          <span className="text-sm font-mono">{call.user_id?.slice(0, 8)}...</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(call.call_status)}
                      </TableCell>
                      <TableCell>
                        {getOutcomeBadge(call)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(call.cost_usd || 0)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedCall(call)}
                            className="h-8 w-8 p-0"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {call.recording_url && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(call.recording_url, '_blank')}
                              className="h-8 w-8 p-0"
                            >
                              <Phone className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Call Details Modal */}
      <WhiteLabelCallDetailsModal
        call={selectedCall}
        isOpen={!!selectedCall}
        onClose={() => setSelectedCall(null)}
      />
    </div>
  );
};
