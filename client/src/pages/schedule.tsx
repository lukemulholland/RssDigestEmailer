import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { 
  Clock, 
  Play, 
  Settings, 
  Calendar,
  CheckCircle,
  AlertCircle,
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Schedule() {
  const [formData, setFormData] = useState({
    isEnabled: true,
    frequencyHours: 4,
    nextRun: null as Date | null,
    lastRun: null as Date | null,
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: scheduleData, isLoading } = useQuery({
    queryKey: ["/api/schedule"],
    queryFn: api.getSchedule,
  });

  useEffect(() => {
    if (scheduleData?.settings) {
      setFormData({
        isEnabled: scheduleData.settings.isEnabled,
        frequencyHours: scheduleData.settings.frequencyHours,
        nextRun: scheduleData.settings.nextRun ? new Date(scheduleData.settings.nextRun) : null,
        lastRun: scheduleData.settings.lastRun ? new Date(scheduleData.settings.lastRun) : null,
      });
    }
  }, [scheduleData]);

  const saveMutation = useMutation({
    mutationFn: api.saveSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedule"] });
      toast({
        title: "Schedule updated",
        description: "Your automation schedule has been saved successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to save schedule settings.",
        variant: "destructive",
      });
    },
  });

  const runNowMutation = useMutation({
    mutationFn: api.runNow,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedule"] });
      queryClient.invalidateQueries({ queryKey: ["/api/summaries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Processing started",
        description: "RSS feeds are being processed and summary generation has started.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to start processing. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    saveMutation.mutate({
      isEnabled: formData.isEnabled,
      frequencyHours: formData.frequencyHours,
    });
  };

  const getNextRunText = () => {
    if (!formData.nextRun) return "Not scheduled";
    
    const now = new Date();
    const diffMs = formData.nextRun.getTime() - now.getTime();
    
    if (diffMs < 0) return "Overdue";
    
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHours === 0) return `${diffMins} minutes`;
    return `${diffHours}h ${diffMins}m`;
  };

  const getLastRunText = () => {
    if (!formData.lastRun) return "Never";
    
    const now = new Date();
    const diffMs = now.getTime() - formData.lastRun.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  if (isLoading) {
    return (
      <div className="p-6 md:p-8">
        <div className="animate-pulse space-y-6">
          <div className="max-w-2xl mx-auto">
            <div className="h-96 bg-muted rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8" data-testid="schedule-page">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Current Status Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Clock className="text-primary" size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-card-foreground">Automation Schedule</h2>
                  <p className="text-muted-foreground">Current status and configuration</p>
                </div>
              </div>
              <Badge 
                variant={formData.isEnabled ? "default" : "secondary"}
                data-testid="schedule-status"
              >
                {formData.isEnabled ? "Enabled" : "Disabled"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-card-foreground">Status</span>
                  <div className="flex items-center space-x-2">
                    {formData.isEnabled ? (
                      <CheckCircle className="text-green-600" size={16} />
                    ) : (
                      <AlertCircle className="text-gray-500" size={16} />
                    )}
                    <span className="text-sm text-muted-foreground">
                      {formData.isEnabled ? "Active" : "Paused"}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-card-foreground">Frequency</span>
                  <span className="text-sm text-muted-foreground" data-testid="current-frequency">
                    Every {formData.frequencyHours} hours
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-card-foreground">Last Run</span>
                  <span className="text-sm text-muted-foreground" data-testid="last-run">
                    {getLastRunText()}
                  </span>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Next Scheduled Run</p>
                  <p className="text-xl font-bold text-primary" data-testid="next-run-time">
                    {getNextRunText()}
                  </p>
                  {formData.nextRun && (
                    <p className="text-xs text-muted-foreground" data-testid="next-run-date">
                      {formData.nextRun.toLocaleDateString()} at {formData.nextRun.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>
                
                <Button
                  className="w-full"
                  onClick={() => runNowMutation.mutate()}
                  disabled={runNowMutation.isPending}
                  data-testid="run-now-button"
                >
                  <Play size={16} className="mr-2" />
                  {runNowMutation.isPending ? "Processing..." : "Run Now"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Configuration Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-3">
              <Settings className="text-muted-foreground" size={20} />
              <h3 className="text-lg font-semibold text-card-foreground">Schedule Configuration</h3>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="schedule-enabled" className="text-base font-medium">
                    Enable Automatic Processing
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically check RSS feeds and generate summaries
                  </p>
                </div>
                <Switch
                  id="schedule-enabled"
                  checked={formData.isEnabled}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isEnabled: checked }))}
                  data-testid="enable-schedule-switch"
                />
              </div>

              <div>
                <Label htmlFor="frequency">Check Frequency</Label>
                <Select 
                  value={formData.frequencyHours.toString()} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, frequencyHours: parseInt(value) }))}
                  disabled={!formData.isEnabled}
                >
                  <SelectTrigger data-testid="select-frequency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Every hour</SelectItem>
                    <SelectItem value="2">Every 2 hours</SelectItem>
                    <SelectItem value="4">Every 4 hours</SelectItem>
                    <SelectItem value="6">Every 6 hours</SelectItem>
                    <SelectItem value="8">Every 8 hours</SelectItem>
                    <SelectItem value="12">Every 12 hours</SelectItem>
                    <SelectItem value="24">Daily</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  How often to check RSS feeds and generate summaries
                </p>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-medium text-card-foreground mb-2">What happens during each run?</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Check all active RSS feeds for new content</li>
                  <li>• Extract and analyze new articles</li>
                  <li>• Generate AI-powered summary</li>
                  <li>• Send email to configured recipients</li>
                  <li>• Log activity and update feed status</li>
                </ul>
              </div>

              <div className="flex justify-end">
                <Button 
                  type="submit" 
                  disabled={saveMutation.isPending}
                  data-testid="save-schedule"
                >
                  {saveMutation.isPending ? (
                    <>
                      <Loader2 className="animate-spin mr-2" size={16} />
                      Saving...
                    </>
                  ) : (
                    "Save Schedule"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
