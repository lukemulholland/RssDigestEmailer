import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Menu, RotateCcw, Bell } from "lucide-react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface HeaderProps {
  onSidebarToggle: () => void;
}

const pageTitle: Record<string, string> = {
  "/": "Dashboard",
  "/feeds": "Manage Feeds",
  "/summaries": "Summaries",
  "/email-settings": "Email Settings",
  "/schedule": "Schedule",
  "/logs": "Activity Logs",
};

const pageDescription: Record<string, string> = {
  "/": "Manage your RSS feed automation",
  "/feeds": "Configure and monitor your RSS feeds",
  "/summaries": "View generated summaries and insights",
  "/email-settings": "Configure email delivery settings",
  "/schedule": "Set up automated processing schedule",
  "/logs": "Monitor system activity and errors",
};

export default function Header({ onSidebarToggle }: HeaderProps) {
  const [location] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const refreshMutation = useMutation({
    mutationFn: api.checkAllFeeds,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feeds"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Feeds refreshed",
        description: "All feeds have been checked for new content.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to refresh feeds. Please try again.",
        variant: "destructive",
      });
    },
  });

  const title = pageTitle[location] || "RSS Automation";
  const description = pageDescription[location] || "";

  return (
    <header className="bg-card border-b border-border px-6 py-4 md:px-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden"
            onClick={onSidebarToggle}
            data-testid="sidebar-toggle"
          >
            <Menu size={20} />
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-foreground">{title}</h2>
            {description && (
              <p className="text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <Button
            onClick={() => refreshMutation.mutate()}
            disabled={refreshMutation.isPending}
            data-testid="refresh-feeds"
          >
            <RotateCcw 
              size={16} 
              className={refreshMutation.isPending ? "animate-spin mr-2" : "mr-2"} 
            />
            {refreshMutation.isPending ? "Refreshing..." : "Refresh All"}
          </Button>
          <div className="relative">
            <Button variant="ghost" size="sm" data-testid="notifications">
              <Bell size={20} />
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 w-3 h-3 p-0 text-xs"
              />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
