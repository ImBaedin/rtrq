"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRTRQ } from "@rtrq/react-query";
import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WebSocketClient } from "@rtrq/core";
import { 
  Activity, 
  Wifi, 
  WifiOff, 
  Database, 
  Zap, 
  Clock,
  Users,
  MessageSquare,
  RefreshCw,
  Server
} from "lucide-react";

interface LogEntry {
  id: string;
  type: 'connection' | 'subscription' | 'unsubscription' | 'invalidation' | 'query';
  timestamp: Date;
  payload: any;
  details: string;
}

// Sample data fetchers for testing
const fetchUsers = async () => {
  await new Promise(resolve => setTimeout(resolve, 1000));
  return Array.from({ length: 5 }, (_, i) => ({
    id: i + 1,
    name: `User ${i + 1}`,
    email: `user${i + 1}@example.com`,
    lastActive: new Date(Date.now() - Math.random() * 86400000).toISOString(),
  }));
};

const fetchPosts = async () => {
  await new Promise(resolve => setTimeout(resolve, 800));
  return Array.from({ length: 3 }, (_, i) => ({
    id: i + 1,
    title: `Post ${i + 1}`,
    content: `This is the content of post ${i + 1}`,
    author: `Author ${i + 1}`,
    createdAt: new Date(Date.now() - Math.random() * 86400000).toISOString(),
  }));
};

const fetchComments = async () => {
  await new Promise(resolve => setTimeout(resolve, 600));
  return Array.from({ length: 8 }, (_, i) => ({
    id: i + 1,
    text: `Comment ${i + 1}`,
    author: `Commenter ${i + 1}`,
    postId: Math.floor(Math.random() * 3) + 1,
    createdAt: new Date(Date.now() - Math.random() * 86400000).toISOString(),
  }));
};

const fetchStats = async () => {
  await new Promise(resolve => setTimeout(resolve, 400));
  return {
    totalUsers: Math.floor(Math.random() * 1000) + 100,
    activeUsers: Math.floor(Math.random() * 100) + 10,
    totalPosts: Math.floor(Math.random() * 500) + 50,
    totalComments: Math.floor(Math.random() * 2000) + 200,
    serverLoad: Math.floor(Math.random() * 100),
  };
};

export default function RTRQDevApp() {
  const queryClient = useQueryClient();
  const [connectionState, setConnectionState] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [wsClient, setWsClient] = useState<WebSocketClient | null>(null);
  const logIdCounter = useRef(0);
  
  // WebSocket URL configuration
  const [wsUrl, setWsUrl] = useState("ws://localhost:3001");
  const [isConnecting, setIsConnecting] = useState(false);
  const [rtrqConfig, setRtrqConfig] = useState<{url: string, options: any} | null>(null);

  // Initialize RTRQ only when config is set
  useRTRQ(rtrqConfig || undefined);

  // Test queries for demonstration
  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
    staleTime: 30000,
  });

  const postsQuery = useQuery({
    queryKey: ['posts'],
    queryFn: fetchPosts,
    staleTime: 30000,
  });

  const commentsQuery = useQuery({
    queryKey: ['comments'],
    queryFn: fetchComments,
    staleTime: 30000,
  });

  const statsQuery = useQuery({
    queryKey: ['stats'],
    queryFn: fetchStats,
    staleTime: 15000,
  });

  // Conditional queries that can be enabled/disabled
  const [enableOptionalQuery1, setEnableOptionalQuery1] = useState(false);
  const [enableOptionalQuery2, setEnableOptionalQuery2] = useState(false);

  const optionalQuery1 = useQuery({
    queryKey: ['optional', 'query1'],
    queryFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 500));
      return { data: 'Optional Query 1 Data', timestamp: new Date().toISOString() };
    },
    enabled: enableOptionalQuery1,
    staleTime: 20000,
  });

  const optionalQuery2 = useQuery({
    queryKey: ['optional', 'query2'],
    queryFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 700));
      return { data: 'Optional Query 2 Data', timestamp: new Date().toISOString() };
    },
    enabled: enableOptionalQuery2,
    staleTime: 25000,
  });

  // Add log entry helper
  const addLog = (type: LogEntry['type'], payload: any, details: string) => {
    const logEntry: LogEntry = {
      id: `log-${++logIdCounter.current}`,
      type,
      timestamp: new Date(),
      payload,
      details,
    };
    setLogs(prev => [logEntry, ...prev].slice(0, 100)); // Keep last 100 logs
  };

  // Connection management
  const connectToServer = () => {
    if (!wsUrl.trim()) {
      addLog('connection', { error: 'Invalid URL' }, 'Cannot connect: WebSocket URL is empty');
      return;
    }

    setIsConnecting(true);
    setConnectionState('connecting');
    addLog('connection', { url: wsUrl }, `Attempting to connect to ${wsUrl}`);

    setRtrqConfig({
      url: wsUrl,
      options: {
        reconnect: true,
        reconnectAttempts: 3,
        reconnectInterval: 2000,
      }
    });

    // Simulate connection feedback (in real usage, this would come from RTRQ events)
    setTimeout(() => {
      setIsConnecting(false);
      setConnectionState('connected');
      addLog('connection', { state: 'connected', url: wsUrl }, `Connected to RTRQ server at ${wsUrl}`);
    }, 1000);
  };

  const disconnectFromServer = () => {
    setRtrqConfig(null);
    setConnectionState('disconnected');
    addLog('connection', { state: 'disconnected' }, 'Disconnected from RTRQ server');
  };

  // Get active queries
  const activeQueries = queryClient.getQueryCache().getAll().filter(query => 
    query.getObserversCount() > 0
  );

  // Server action simulators
  const triggerInvalidation = (queryKey: string[]) => {
    queryClient.invalidateQueries({ queryKey });
    addLog('invalidation', { queryKey }, `Manually triggered invalidation for ${JSON.stringify(queryKey)}`);
  };

  const triggerServerInvalidation = async (queryKey: string[]) => {
    if (!rtrqConfig) {
      addLog('invalidation', { error: 'No server connection' }, 'Cannot trigger server invalidation: not connected to RTRQ server');
      return;
    }

    try {
      // Convert WebSocket URL to HTTP URL for the invalidation endpoint
      const httpUrl = rtrqConfig.url.replace('ws://', 'http://').replace('wss://', 'https://');
      
      addLog('invalidation', { queryKey, action: 'sending' }, `Sending server invalidation request for ${JSON.stringify(queryKey)}`);
      
      const response = await fetch(`${httpUrl}/invalidate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ key: queryKey }),
      });

      if (response.ok) {
        addLog('invalidation', { queryKey, source: 'server', status: 'success' }, `Server invalidation successful for ${JSON.stringify(queryKey)}`);
      } else {
        const errorText = await response.text();
        addLog('invalidation', { queryKey, source: 'server', status: 'error', error: errorText }, `Server invalidation failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addLog('invalidation', { queryKey, source: 'server', status: 'error', error: errorMessage }, `Server invalidation error: ${errorMessage}`);
    }
  };

  // Format timestamp
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      fractionalSecondDigits: 3
    });
  };

  // Get status badge variant
  const getStatusVariant = (state: string) => {
    switch (state) {
      case 'connected': return 'default';
      case 'connecting': return 'secondary';
      case 'error': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <div className="min-h-screen p-6 space-y-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">RTRQ Development Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Real-time query invalidation testing environment
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={getStatusVariant(connectionState)} className="flex items-center gap-2">
              {connectionState === 'connected' ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
              {connectionState.charAt(0).toUpperCase() + connectionState.slice(1)}
            </Badge>
          </div>
        </div>

        {/* WebSocket Configuration */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="w-5 h-5" />
              RTRQ Server Configuration
            </CardTitle>
            <CardDescription>
              Configure the WebSocket URL for the external RTRQ server
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label htmlFor="ws-url" className="text-sm font-medium mb-2 block">
                  WebSocket Server URL
                </label>
                <input
                  id="ws-url"
                  type="text"
                  value={wsUrl}
                  onChange={(e) => setWsUrl(e.target.value)}
                  placeholder="ws://localhost:3001"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={connectionState === 'connected'}
                />
              </div>
              <div className="flex gap-2">
                {connectionState === 'disconnected' ? (
                  <Button 
                    onClick={connectToServer}
                    disabled={isConnecting || !wsUrl.trim()}
                    className="flex items-center gap-2"
                  >
                    <Wifi className="w-4 h-4" />
                    {isConnecting ? 'Connecting...' : 'Connect'}
                  </Button>
                ) : (
                  <Button 
                    onClick={disconnectFromServer}
                    variant="destructive"
                    className="flex items-center gap-2"
                  >
                    <WifiOff className="w-4 h-4" />
                    Disconnect
                  </Button>
                )}
              </div>
            </div>
            <div className="mt-3 text-sm text-muted-foreground">
              {connectionState === 'disconnected' && (
                <span>👆 Enter the URL of your RTRQ server and click Connect to start monitoring queries</span>
              )}
              {connectionState === 'connecting' && (
                <span>⏳ Establishing connection to RTRQ server...</span>
              )}
              {connectionState === 'connected' && (
                <span>✅ Connected to RTRQ server at <code>{wsUrl}</code></span>
              )}
              {connectionState === 'error' && (
                <span>❌ Failed to connect to RTRQ server. Please check the URL and try again.</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Connection Status & Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Connection</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold capitalize">{connectionState}</div>
              <p className="text-xs text-muted-foreground">
                WebSocket status
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Queries</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeQueries.length}</div>
              <p className="text-xs text-muted-foreground">
                Currently subscribed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Log Entries</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{logs.length}</div>
              <p className="text-xs text-muted-foreground">
                Total interactions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Server Load</CardTitle>
              <Server className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statsQuery.data?.serverLoad || 0}%</div>
              <p className="text-xs text-muted-foreground">
                Simulated load
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Active Queries Section */}
          <div className="xl:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Active Query Subscriptions
                </CardTitle>
                <CardDescription>
                  Live queries being monitored by RTRQ
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Core Queries */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Users className="w-4 h-4 text-blue-500" />
                        <div>
                          <div className="font-medium">Users Query</div>
                          <div className="text-sm text-muted-foreground">['users']</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={usersQuery.isLoading ? 'secondary' : usersQuery.isError ? 'destructive' : 'default'}>
                          {usersQuery.isLoading ? 'Loading' : usersQuery.isError ? 'Error' : 'Success'}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => triggerInvalidation(['users'])}
                        >
                          <RefreshCw className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <MessageSquare className="w-4 h-4 text-green-500" />
                        <div>
                          <div className="font-medium">Posts Query</div>
                          <div className="text-sm text-muted-foreground">['posts']</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={postsQuery.isLoading ? 'secondary' : postsQuery.isError ? 'destructive' : 'default'}>
                          {postsQuery.isLoading ? 'Loading' : postsQuery.isError ? 'Error' : 'Success'}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => triggerInvalidation(['posts'])}
                        >
                          <RefreshCw className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <MessageSquare className="w-4 h-4 text-purple-500" />
                        <div>
                          <div className="font-medium">Comments Query</div>
                          <div className="text-sm text-muted-foreground">['comments']</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={commentsQuery.isLoading ? 'secondary' : commentsQuery.isError ? 'destructive' : 'default'}>
                          {commentsQuery.isLoading ? 'Loading' : commentsQuery.isError ? 'Error' : 'Success'}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => triggerInvalidation(['comments'])}
                        >
                          <RefreshCw className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Activity className="w-4 h-4 text-orange-500" />
                        <div>
                          <div className="font-medium">Stats Query</div>
                          <div className="text-sm text-muted-foreground">['stats']</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={statsQuery.isLoading ? 'secondary' : statsQuery.isError ? 'destructive' : 'default'}>
                          {statsQuery.isLoading ? 'Loading' : statsQuery.isError ? 'Error' : 'Success'}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => triggerInvalidation(['stats'])}
                        >
                          <RefreshCw className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Optional Queries */}
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Optional Queries</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-full ${enableOptionalQuery1 ? 'bg-green-500' : 'bg-gray-300'}`} />
                        <div>
                          <div className="font-medium">Optional Query 1</div>
                          <div className="text-sm text-muted-foreground">['optional', 'query1']</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant={enableOptionalQuery1 ? "destructive" : "default"}
                          onClick={() => setEnableOptionalQuery1(!enableOptionalQuery1)}
                        >
                          {enableOptionalQuery1 ? 'Disable' : 'Enable'}
                        </Button>
                        {enableOptionalQuery1 && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => triggerInvalidation(['optional', 'query1'])}
                          >
                            <RefreshCw className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-full ${enableOptionalQuery2 ? 'bg-green-500' : 'bg-gray-300'}`} />
                        <div>
                          <div className="font-medium">Optional Query 2</div>
                          <div className="text-sm text-muted-foreground">['optional', 'query2']</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant={enableOptionalQuery2 ? "destructive" : "default"}
                          onClick={() => setEnableOptionalQuery2(!enableOptionalQuery2)}
                        >
                          {enableOptionalQuery2 ? 'Disable' : 'Enable'}
                        </Button>
                        {enableOptionalQuery2 && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => triggerInvalidation(['optional', 'query2'])}
                          >
                            <RefreshCw className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Server Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Server Actions
                </CardTitle>
                <CardDescription>
                  Trigger invalidations and test server communications
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h4 className="font-medium">Manual Invalidations</h4>
                    <Button
                      onClick={() => triggerInvalidation(['users'])}
                      className="w-full justify-start"
                      variant="outline"
                    >
                      <Users className="w-4 h-4 mr-2" />
                      Invalidate Users
                    </Button>
                    <Button
                      onClick={() => triggerInvalidation(['posts'])}
                      className="w-full justify-start"
                      variant="outline"
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Invalidate Posts
                    </Button>
                    <Button
                      onClick={() => {
                        triggerInvalidation(['users']);
                        triggerInvalidation(['posts']);
                        triggerInvalidation(['comments']);
                      }}
                      className="w-full justify-start"
                      variant="outline"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Invalidate All
                    </Button>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-medium">Server-Side Triggers</h4>
                    <Button
                      onClick={() => triggerServerInvalidation(['users'])}
                      className="w-full justify-start"
                      variant="outline"
                    >
                      <Server className="w-4 h-4 mr-2" />
                      Server Invalidate Users
                    </Button>
                    <Button
                      onClick={() => triggerServerInvalidation(['stats'])}
                      className="w-full justify-start"
                      variant="outline"
                    >
                      <Activity className="w-4 h-4 mr-2" />
                      Server Invalidate Stats
                    </Button>
                    <Button
                      onClick={() => {
                        triggerServerInvalidation(['users']);
                        triggerServerInvalidation(['posts']);
                        triggerServerInvalidation(['comments']);
                        triggerServerInvalidation(['stats']);
                      }}
                      className="w-full justify-start"
                      variant="outline"
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      Bulk Server Invalidate
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Interaction Log */}
          <Card className="xl:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                RTRQ Interaction Log
              </CardTitle>
              <CardDescription>
                Real-time log of all RTRQ events and operations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {logs.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    No interactions yet...
                  </div>
                )}
                {logs.map((log) => (
                  <div key={log.id} className="p-3 border rounded-lg text-sm">
                    <div className="flex items-center justify-between mb-1">
                      <Badge variant="outline" className="text-xs">
                        {log.type}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatTime(log.timestamp)}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {log.details}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-3 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLogs([])}
                  className="w-full"
                >
                  Clear Log
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Query Data Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Sample Data Preview</CardTitle>
              <CardDescription>Current query results</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Users ({usersQuery.data?.length || 0})</h4>
                <div className="text-sm text-muted-foreground">
                  {usersQuery.data?.slice(0, 3).map(user => user.name).join(', ') || 'Loading...'}
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Posts ({postsQuery.data?.length || 0})</h4>
                <div className="text-sm text-muted-foreground">
                  {postsQuery.data?.slice(0, 2).map(post => post.title).join(', ') || 'Loading...'}
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Statistics</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Total Users: {statsQuery.data?.totalUsers || '...'}</div>
                  <div>Active Users: {statsQuery.data?.activeUsers || '...'}</div>
                  <div>Total Posts: {statsQuery.data?.totalPosts || '...'}</div>
                  <div>Comments: {statsQuery.data?.totalComments || '...'}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Query Cache Info</CardTitle>
              <CardDescription>React Query cache details</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span>Total Queries:</span>
                  <span>{queryClient.getQueryCache().getAll().length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Active Queries:</span>
                  <span>{activeQueries.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Stale Queries:</span>
                  <span>{queryClient.getQueryCache().getAll().filter(q => q.isStale()).length}</span>
                </div>
                                 <div className="flex justify-between">
                   <span>Loading Queries:</span>
                   <span>{queryClient.getQueryCache().getAll().filter(q => q.state.fetchStatus === 'fetching').length}</span>
                 </div>
                
                <div className="pt-3 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      queryClient.clear();
                      addLog('query', {}, 'Cleared all query cache');
                    }}
                    className="w-full"
                  >
                    Clear All Cache
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
