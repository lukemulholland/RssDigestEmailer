import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useState } from "react";
import StatsCards from "@/components/dashboard/stats-cards";
import FeedsList from "@/components/dashboard/feeds-list";
import QuickActions from "@/components/dashboard/quick-actions";
import SystemStatus from "@/components/dashboard/system-status";
import RecentSummaries from "@/components/dashboard/recent-summaries";
import AddFeedModal from "@/components/modals/add-feed-modal";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Play } from "lucide-react";

export default function Dashboard() {
  const [showAddFeedModal, setShowAddFeedModal] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    queryFn: api.getDashboardStats,
  });

  const { data: feeds = [], isLoading: feedsLoading } = useQuery({
    queryKey: ["/api/feeds"],
    queryFn: api.getFeeds,
  });

  const { data: summaries = [], isLoading: summariesLoading } = useQuery({
    queryKey: ["/api/summaries"],
    queryFn: () => api.getSummaries(3), // Get recent 3 summaries
  });

  const { data: schedule } = useQuery({
    queryKey: ["/api/schedule"],
    queryFn: api.getSchedule,
  });

  const runNowMutation = useMutation({
    mutationFn: api.runNow,
    onSuccess: () => {
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

  if (statsLoading || feedsLoading || summariesLoading) {
    return (
      <div className="p-6 md:p-8">
        <div className="animate-pulse space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded-lg" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 h-96 bg-muted rounded-lg" />
            <div className="space-y-6">
              <div className="h-64 bg-muted rounded-lg" />
              <div className="h-64 bg-muted rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-6 md:p-8">
        <div className="text-center">
          <p className="text-muted-foreground">Failed to load dashboard data.</p>
        </div>
      </div>
    );
  }

  const nextRun = schedule?.settings?.nextRun 
    ? new Date(schedule.settings.nextRun) 
    : null;

  const getNextRunText = () => {
    if (!nextRun) return "Not scheduled";
    
    const now = new Date();
    const diffMs = nextRun.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffMs < 0) return "Overdue";
    if (diffHours === 0) return `${diffMins}m`;
    return `${diffHours}h ${diffMins}m`;
  };

  return (
    <div className="p-6 md:p-8" data-testid="dashboard">
      <StatsCards stats={stats} />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <FeedsList 
          feeds={feeds} 
          onAddFeed={() => setShowAddFeedModal(true)} 
        />
        
        <div className="space-y-6">
          <QuickActions onAddFeed={() => setShowAddFeedModal(true)} />
          <SystemStatus stats={stats} />
          
          {/* Next Scheduled Run Card */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-card-foreground mb-4">Next Run</h3>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary" data-testid="next-run-time">
                  {getNextRunText()}
                </p>
                {nextRun && (
                  <p className="text-sm text-muted-foreground" data-testid="next-run-date">
                    {nextRun.toLocaleDateString()} at {nextRun.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  {schedule?.settings?.isEnabled 
                    ? `Runs every ${schedule.settings.frequencyHours} hours`
                    : "Scheduler disabled"
                  }
                </p>
              </div>
              <Button
                className="w-full mt-4"
                onClick={() => runNowMutation.mutate()}
                disabled={runNowMutation.isPending}
                data-testid="run-now"
              >
                <Play className="mr-2" size={16} />
                {runNowMutation.isPending ? "Processing..." : "Run Now"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <RecentSummaries summaries={summaries} />

      <AddFeedModal 
        isOpen={showAddFeedModal}
        onClose={() => setShowAddFeedModal(false)}
      />
    </div>
  );
}
