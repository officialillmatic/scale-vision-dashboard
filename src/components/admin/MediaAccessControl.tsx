
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getRecordingUrl, listFiles } from "@/services/storageService";
import { supabase } from "@/integrations/supabase/client";
import { Play, Download, Shield, Eye, Trash2, RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { toast } from "sonner";

interface MediaFile {
  name: string;
  id: string;
  updated_at: string;
  created_at: string;
  last_accessed_at?: string;
  metadata?: any;
  bucket_id: string;
}

interface AccessLog {
  id: string;
  file_path: string;
  user_id: string;
  access_type: string;
  timestamp: string;
  ip_address?: string;
}

export function MediaAccessControl() {
  const { user } = useAuth();
  const { isSuperAdmin } = useSuperAdmin();
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);
  const [selectedBucket, setSelectedBucket] = useState<string>('recordings');
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const buckets = [
    { id: 'recordings', name: 'Call Recordings', requiresAuth: true },
    { id: 'avatars', name: 'User Avatars', requiresAuth: false },
    { id: 'company-logos', name: 'Company Logos', requiresAuth: false }
  ];

  const fetchFiles = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const fileList = await listFiles(selectedBucket);
      if (fileList) {
        const formattedFiles: MediaFile[] = fileList.map(file => ({
          name: file.name,
          id: file.id || file.name,
          updated_at: file.updated_at,
          created_at: file.created_at,
          last_accessed_at: file.last_accessed_at,
          metadata: file.metadata,
          bucket_id: selectedBucket
        }));
        setFiles(formattedFiles);
      }
    } catch (error) {
      console.error('Error fetching files:', error);
      toast.error('Failed to fetch files');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAccessLogs = async () => {
    if (!isSuperAdmin) return;
    
    try {
      // This would typically come from a dedicated audit log table
      // For now, we'll simulate access logs
      const mockLogs: AccessLog[] = [
        {
          id: '1',
          file_path: 'recordings/sample-call-1.mp3',
          user_id: user?.id || '',
          access_type: 'view',
          timestamp: new Date().toISOString(),
          ip_address: '192.168.1.1'
        }
      ];
      setAccessLogs(mockLogs);
    } catch (error) {
      console.error('Error fetching access logs:', error);
    }
  };

  const handleFileAccess = async (file: MediaFile, accessType: 'view' | 'download') => {
    try {
      if (file.bucket_id === 'recordings') {
        const signedUrl = await getRecordingUrl(file.name);
        if (signedUrl) {
          if (accessType === 'view') {
            window.open(signedUrl, '_blank');
          } else {
            // Create download link
            const link = document.createElement('a');
            link.href = signedUrl;
            link.download = file.name;
            link.click();
          }
          
          // Log the access
          await logFileAccess(file.name, accessType);
          toast.success(`File ${accessType} successful`);
        } else {
          toast.error('Failed to generate access URL');
        }
      } else {
        // For public buckets, use direct URL
        const { data } = supabase.storage
          .from(file.bucket_id)
          .getPublicUrl(file.name);
        
        if (accessType === 'view') {
          window.open(data.publicUrl, '_blank');
        } else {
          const link = document.createElement('a');
          link.href = data.publicUrl;
          link.download = file.name;
          link.click();
        }
        
        await logFileAccess(file.name, accessType);
        toast.success(`File ${accessType} successful`);
      }
    } catch (error) {
      console.error('Error accessing file:', error);
      toast.error(`Failed to ${accessType} file`);
    }
  };

  const logFileAccess = async (filePath: string, accessType: string) => {
    try {
      await supabase
        .from('webhook_logs')
        .insert({
          event_type: `file_${accessType}`,
          status: 'completed',
          user_id: user?.id,
          processing_time_ms: 0
        });
    } catch (error) {
      console.error('Failed to log file access:', error);
    }
  };

  const filteredFiles = files.filter(file =>
    file.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    if (user) {
      fetchFiles();
      fetchAccessLogs();
    }
  }, [user, selectedBucket]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Media Access Control
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Select value={selectedBucket} onValueChange={setSelectedBucket}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select bucket" />
              </SelectTrigger>
              <SelectContent>
                {buckets.map(bucket => (
                  <SelectItem key={bucket.id} value={bucket.id}>
                    <div className="flex items-center gap-2">
                      {bucket.name}
                      {bucket.requiresAuth && (
                        <Badge variant="outline" className="text-xs">
                          Secured
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Input
              placeholder="Search files..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
            
            <Button
              variant="outline"
              onClick={fetchFiles}
              disabled={isLoading}
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>

          <div className="space-y-2">
            {filteredFiles.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {isLoading ? 'Loading files...' : 'No files found'}
              </div>
            ) : (
              filteredFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="font-medium">{file.name}</div>
                    <div className="text-sm text-muted-foreground">
                      Created: {new Date(file.created_at).toLocaleString()}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {selectedBucket}
                    </Badge>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleFileAccess(file, 'view')}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleFileAccess(file, 'download')}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    
                    {isSuperAdmin && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {isSuperAdmin && accessLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Access Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {accessLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-2 border rounded"
                >
                  <div>
                    <div className="font-medium">{log.file_path}</div>
                    <div className="text-sm text-muted-foreground">
                      {log.access_type} by {log.user_id}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(log.timestamp).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
