import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Send, Activity } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface QuickActionsProps {
  onAddFeed: () => void;
}

export default function QuickActions({ onAddFeed }: QuickActionsProps) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const testEmailMutation = useMutation({
    mutationFn: api.sendTestEmail,
    onSuccess: () => {
      toast({
        title: "Test email sent",
        description: "Check your inbox for the test email.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to send test email. Please check your email settings.",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-card-foreground">Quick Actions</h3>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Button 
              className="w-full" 
              onClick={onAddFeed}
              data-testid="quick-add-feed"
            >
              <Plus className="mr-2" size={16} />
              Add New Feed
            </Button>
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => testEmailMutation.mutate()}
              disabled={testEmailMutation.isPending}
              data-testid="quick-test-email"
            >
              <Send className={testEmailMutation.isPending ? "animate-pulse mr-2" : "mr-2"} size={16} />
              {testEmailMutation.isPending ? "Sending..." : "Test Email"}
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setLocation("/logs")}
              data-testid="quick-view-logs"
            >
              <Activity className="mr-2" size={16} />
              View Logs
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
