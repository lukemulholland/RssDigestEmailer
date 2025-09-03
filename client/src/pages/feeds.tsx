import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Globe, Edit, Trash2, Search, RotateCcw, AlertTriangle } from "lucide-react";
import { type Feed } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import AddFeedModal from "@/components/modals/add-feed-modal";

export default function Feeds() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: feeds = [], isLoading } = useQuery({
    queryKey: ["/api/feeds"],
    queryFn: api.getFeeds,
  });

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

  const checkAllMutation = useMutation({
    mutationFn: api.checkAllFeeds,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feeds"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "All feeds checked",
        description: "All active RSS feeds have been checked for new content.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to check some feeds. Please check individual feed status.",
        variant: "destructive",
      });
    },
  });

  const filteredFeeds = feeds.filter((feed: Feed) =>
    feed.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    feed.url.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "warning":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "error":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
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

  if (isLoading) {
    return (
      <div className="p-6 md:p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-12 bg-muted rounded-lg" />
          <div className="grid gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8" data-testid="feeds-page">
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
          <Input
            placeholder="Search feeds..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="search-feeds"
          />
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => checkAllMutation.mutate()}
            disabled={checkAllMutation.isPending}
            variant="outline"
            data-testid="check-all-feeds"
          >
            <RotateCcw size={16} className={checkAllMutation.isPending ? "animate-spin mr-2" : "mr-2"} />
            {checkAllMutation.isPending ? "Checking..." : "Check All"}
          </Button>
          <Button
            onClick={() => setShowAddModal(true)}
            data-testid="add-feed-button"
          >
            <Plus className="mr-2" size={16} />
            Add Feed
          </Button>
        </div>
      </div>

      {filteredFeeds.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Globe className="text-muted-foreground" size={32} />
            </div>
            <h3 className="text-lg font-semibold text-card-foreground mb-2">
              {searchTerm ? "No feeds found" : "No RSS feeds configured"}
            </h3>
            <p className="text-muted-foreground mb-6">
              {searchTerm 
                ? "Try adjusting your search terms to find what you're looking for."
                : "Add your first RSS feed to start automating content summaries."
              }
            </p>
            {!searchTerm && (
              <Button onClick={() => setShowAddModal(true)} data-testid="add-first-feed-empty">
                <Plus className="mr-2" size={16} />
                Add Your First Feed
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredFeeds.map((feed: Feed) => (
            <Card key={feed.id} data-testid={`feed-card-${feed.id}`}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      {feed.status === "error" ? (
                        <AlertTriangle className="text-red-600" size={24} />
                      ) : (
                        <Globe className="text-primary" size={24} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-semibold text-card-foreground truncate">{feed.name}</h3>
                        <Badge 
                          className={`${getStatusColor(feed.status)} text-xs font-medium`}
                          data-testid={`feed-status-badge-${feed.id}`}
                        >
                          <div className="w-2 h-2 rounded-full bg-current mr-1" />
                          {feed.status.charAt(0).toUpperCase() + feed.status.slice(1)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2 break-all">{feed.url}</p>
                      <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                        <span>Last updated: {getTimeAgo(feed.lastChecked)}</span>
                        <span>Check every {feed.checkFrequencyHours}h</span>
                        <span>{feed.includeInSummary ? "Included in summaries" : "Excluded from summaries"}</span>
                      </div>
                      {feed.lastError && (
                        <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                          <p className="text-xs text-red-600 dark:text-red-400">
                            <AlertTriangle className="inline mr-1" size={12} />
                            {feed.lastError}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => checkMutation.mutate(feed.id)}
                      disabled={checkMutation.isPending}
                      data-testid={`check-feed-${feed.id}`}
                    >
                      <RotateCcw size={16} className={checkMutation.isPending ? "animate-spin" : ""} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      data-testid={`edit-feed-${feed.id}`}
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
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AddFeedModal 
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
      />
    </div>
  );
}
