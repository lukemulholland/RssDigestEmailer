import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Clock, Newspaper, Rss, Check, X, RotateCcw, Send } from "lucide-react";
import { type Summary } from "@shared/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface RecentSummariesProps {
  summaries: Summary[];
}

export default function RecentSummaries({ summaries }: RecentSummariesProps) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const resendMutation = useMutation({
    mutationFn: api.sendSummaryEmail,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/summaries"] });
      toast({
        title: "Email sent",
        description: "The summary has been resent via email.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to resend email. Please try again.",
        variant: "destructive",
      });
    },
  });

  const retryMutation = useMutation({
    mutationFn: api.retrySummary,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/summaries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Summary regenerated",
        description: "The summary has been regenerated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to regenerate summary. Please try again.",
        variant: "destructive",
      });
    },
  });

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

  return (
    <Card className="mt-8">
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-card-foreground">Recent Summaries</h3>
          <Button 
            variant="ghost" 
            onClick={() => setLocation("/summaries")}
            data-testid="view-all-summaries"
          >
            View All <ArrowRight className="ml-1" size={16} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {summaries.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No summaries generated yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {summaries.map((summary) => (
              <div 
                key={summary.id} 
                className="py-6 hover:bg-muted/50 transition-colors"
                data-testid={`summary-${summary.id}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h4 className="font-medium text-card-foreground">{summary.title}</h4>
                      <Badge 
                        variant={summary.emailSent ? "default" : summary.emailError ? "destructive" : "secondary"}
                        className="text-xs"
                        data-testid={`summary-status-${summary.id}`}
                      >
                        <Clock className="w-2 h-2 mr-1" />
                        {getTimeAgo(summary.generatedAt)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {summary.excerpt}
                    </p>
                    <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                      <span data-testid={`summary-articles-${summary.id}`}>
                        <Newspaper className="mr-1 inline" size={12} />
                        {summary.articleCount} articles
                      </span>
                      <span data-testid={`summary-sources-${summary.id}`}>
                        <Rss className="mr-1 inline" size={12} />
                        {summary.sourceCount} sources
                      </span>
                      <span data-testid={`summary-email-status-${summary.id}`}>
                        {summary.emailSent ? (
                          <>
                            <Check className="mr-1 inline text-green-600" size={12} />
                            Email sent
                          </>
                        ) : summary.emailError ? (
                          <>
                            <X className="mr-1 inline text-red-600" size={12} />
                            Email failed
                          </>
                        ) : (
                          <>
                            <Clock className="mr-1 inline" size={12} />
                            Pending
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col space-y-2 ml-4">
                    <Button 
                      variant="secondary" 
                      size="sm"
                      onClick={() => setLocation(`/summaries`)}
                      data-testid={`view-summary-${summary.id}`}
                    >
                      View
                    </Button>
                    {summary.emailError ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => retryMutation.mutate(summary.id)}
                        disabled={retryMutation.isPending}
                        data-testid={`retry-summary-${summary.id}`}
                      >
                        <RotateCcw size={12} className="mr-1" />
                        Retry
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => resendMutation.mutate(summary.id)}
                        disabled={resendMutation.isPending}
                        data-testid={`resend-summary-${summary.id}`}
                      >
                        <Send size={12} className="mr-1" />
                        Resend
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
