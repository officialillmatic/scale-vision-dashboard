import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { supabase } from '@/integrations/supabase/client';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

interface Agent {
  id: string;
  name: string;
  rate_per_minute: number;
  retell_agent_id: string;
}

const CallsSimple = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [script, setScript] = useState('');
  const [agents, setAgents] = useState<Agent[] | null>(null);
  const [selectedAgent, setSelectedAgent] = useState('');
  const [loading, setLoading] = useState(false);
  const [agentsLoading, setAgentsLoading] = useState(true);
  const { toast } = useToast()

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    setAgentsLoading(true);
    try {
      const { data, error } = await supabase
        .from('retell_agents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching agents:', error);
        toast({
          variant: "destructive",
          title: "Uh oh! Something went wrong.",
          description: "Failed to fetch agents. Please try again.",
        })
      } else {
        setAgents(data);
      }
    } finally {
      setAgentsLoading(false);
    }
  };

  const handleCall = async () => {
    if (!phoneNumber || !script || !selectedAgent) {
      toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: "Please fill in all fields and select an agent.",
      })
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('start-simple-call', {
        body: {
          phone_number: phoneNumber,
          script: script,
          agent_id: selectedAgent,
        },
      });

      if (error) {
        console.error('Error starting call:', error);
        toast({
          variant: "destructive",
          title: "Uh oh! Something went wrong.",
          description: "Failed to start call. Please try again.",
        })
      } else {
        console.log('Call started successfully:', data);
        toast({
          title: "Call started!",
          description: `Call started successfully with number ${phoneNumber}.`,
        })
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-4">Simple Call Interface</h1>

        {/* Phone Number Input */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Phone Number</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              type="tel"
              placeholder="Enter phone number"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
          </CardContent>
        </Card>

        {/* Script Input */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Script</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Enter script"
              value={script}
              onChange={(e) => setScript(e.target.value)}
              className="min-h-[100px]"
            />
          </CardContent>
        </Card>

        {/* Agent Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select Agent</CardTitle>
          </CardHeader>
          <CardContent>
            <select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              className="w-full p-2 border rounded-md"
              disabled={agentsLoading}
            >
              <option value="">
                {agentsLoading ? 'Loading agents...' : 'Select an agent'}
              </option>
              {agents?.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name} - ${agent.rate_per_minute}/min (ID: {agent.retell_agent_id})
                </option>
              ))}
            </select>
            
            {selectedAgent && agents && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                {(() => {
                  const agent = agents.find(a => a.id === selectedAgent);
                  return agent ? (
                    <>
                      <h4 className="font-semibold">Selected Agent: {agent.name}</h4>
                      <p className="text-sm text-gray-600">Rate: ${agent.rate_per_minute}/minute</p>
                    </>
                  ) : null;
                })()}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Call Button */}
        <Button
          onClick={handleCall}
          disabled={loading}
          className="mt-4 w-full"
        >
          {loading ? (
            <>
              <LoadingSpinner size="sm" />
              Starting Call...
            </>
          ) : (
            "Start Call"
          )}
        </Button>
      </div>
    </DashboardLayout>
  );
};

export default CallsSimple;
