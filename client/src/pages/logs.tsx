import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Search, 
  Activity, 
  Info, 
  AlertTriangle, 
  XCircle,
  Rss,
  Mail,
  Settings,
  FileText
} from "lucide-react";
import { type ActivityLog } from "@shared/schema";

export default function Logs() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterLevel, setFilterLevel] = useState("all");
  const [filterType, setFilterType] = useState("all");

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["/api/logs"],
    queryFn: () => api.getLogs(200), // Get recent 200 logs
  });

  const filteredLogs = logs.filter((log: ActivityLog) => {
    const matchesSearch = log.message.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLevel = filterLevel === "all" || log.level === filterLevel;
    const matchesType = filterType === "all" || log.type === filterType;
    
    return matchesSearch && matchesLevel && matchesType;
  });

  const getLevelIcon = (level: string) => {
    switch (level) {
      case "info":
        return <Info className="text-blue-600" size={16} />;
      case "warning":
        return <AlertTriangle className="text-yellow-600" size={16} />;
      case "error":
        return <XCircle className="text-red-600" size={16} />;
      default:
        return <Info className="text-blue-600" size={16} />;
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case "info":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "warning":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "error":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "feed_check":
        return <Rss className="text-primary" size={14} />;
      case "summary_generation":
        return <FileText className="text-purple-600" size={14} />;
      case "email_sent":
        return <Mail className="text-green-600" size={14} />;
      case "error":
        return <XCircle className="text-red-600" size={14} />;
      default:
        return <Settings className="text-gray-600" size={14} />;
    }
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleString();
  };

  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  if (isLoading) {
    return (
      <div className="p-6 md:p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-12 bg-muted rounded-lg" />
          <div className="grid gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-muted rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8" data-testid="logs-page">
      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
              <Input
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="search-logs"
              />
            </div>
            
            <Select value={filterLevel} onValueChange={setFilterLevel}>
              <SelectTrigger className="w-full sm:w-32" data-testid="filter-level">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-40" data-testid="filter-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="feed_check">Feed Check</SelectItem>
                <SelectItem value="summary_generation">Summary</SelectItem>
                <SelectItem value="email_sent">Email</SelectItem>
                <SelectItem value="error">Errors</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Logs List */}
      {filteredLogs.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Activity className="text-muted-foreground" size={32} />
            </div>
            <h3 className="text-lg font-semibold text-card-foreground mb-2">
              {searchTerm || filterLevel !== "all" || filterType !== "all" 
                ? "No logs found" 
                : "No activity logs yet"
              }
            </h3>
            <p className="text-muted-foreground">
              {searchTerm || filterLevel !== "all" || filterType !== "all"
                ? "Try adjusting your search or filter criteria."
                : "Activity logs will appear here as the system processes RSS feeds."
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredLogs.map((log: ActivityLog) => (
            <Card key={log.id} data-testid={`log-${log.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {getLevelIcon(log.level)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="flex items-center space-x-1">
                        {getTypeIcon(log.type)}
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          {log.type.replace('_', ' ')}
                        </span>
                      </span>
                      <Badge 
                        className={`${getLevelColor(log.level)} text-xs`}
                        data-testid={`log-level-${log.id}`}
                      >
                        {log.level}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {getTimeAgo(log.createdAt)}
                      </span>
                    </div>
                    
                    <p className="text-sm text-card-foreground font-medium mb-1">
                      {log.message}
                    </p>
                    
                    <p className="text-xs text-muted-foreground">
                      {formatTime(log.createdAt)}
                    </p>
                    
                    {log.details != null && (
                      <details className="mt-2">
                        <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                          View details
                        </summary>
                        <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-x-auto">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
