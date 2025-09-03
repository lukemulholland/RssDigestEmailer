import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Globe, Edit, Trash2 } from "lucide-react";
import { type Feed } from "@shared/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface FeedsListProps {
  feeds: Feed[];
  onAddFeed: () => void;
}

export default function FeedsList({ feeds, onAddFeed }: FeedsListProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const deleteMutation = useMutation({
    mutationFn: api.deleteFeed,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feeds"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Feed deleted",
        description: "The RSS feed has been removed successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete feed. Please try again.",
        variant: "destructive",
      });
    },
  });

  const checkMutation = useMutation({
    mutationFn: api.checkFeed,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feeds"] });
      toast({
        title: "Feed checked",
        description: "The RSS feed has been checked for new content.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to check feed. Please try again.",
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "warning":
        return "bg-yellow-100 text-yellow-800";
      case "error":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTimeAgo = (date: Date | null) => {
    if (!date) return "Never";
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <div className="lg:col-span-2">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-card-foreground">RSS Feeds</h3>
            <Button onClick={onAddFeed} data-testid="add-feed">
              <Plus className="mr-2" size={16} />
              Add Feed
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {feeds.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No RSS feeds configured yet.</p>
                <Button onClick={onAddFeed} data-testid="add-first-feed">
                  <Plus className="mr-2" size={16} />
                  Add Your First Feed
                </Button>
              </div>
            ) : (
              feeds.map((feed) => (
                <div 
                  key={feed.id} 
                  className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                  data-testid={`feed-${feed.id}`}
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Globe className="text-primary" size={20} />
                    </div>
                    <div>
                      <h4 className="font-medium text-card-foreground">{feed.name}</h4>
                      <p className="text-sm text-muted-foreground">{feed.url}</p>
                      <p className="text-xs text-muted-foreground">
                        Last updated: {getTimeAgo(feed.lastChecked)}
                      </p>
                      {feed.lastError && (
                        <p className="text-xs text-red-600 mt-1">
                          Error: {feed.lastError}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge 
                      className={`${getStatusColor(feed.status)} text-xs font-medium`}
                      data-testid={`feed-status-${feed.id}`}
                    >
                      <div className="w-2 h-2 rounded-full bg-current mr-1" />
                      {feed.status.charAt(0).toUpperCase() + feed.status.slice(1)}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => checkMutation.mutate(feed.id)}
                      disabled={checkMutation.isPending}
                      data-testid={`check-feed-${feed.id}`}
                    >
                      <Edit size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteMutation.mutate(feed.id)}
                      disabled={deleteMutation.isPending}
                      data-testid={`delete-feed-${feed.id}`}
                    >
                      <Trash2 className="text-destructive" size={16} />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
