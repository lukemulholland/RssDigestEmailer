import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Search, 
  FileText, 
  Calendar, 
  Clock, 
  Newspaper, 
  Rss, 
  Check, 
  X, 
  Send, 
  RotateCcw,
  Sparkles
} from "lucide-react";
import { type Summary } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export default function Summaries() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSummary, setSelectedSummary] = useState<Summary | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: summaries = [], isLoading } = useQuery({
    queryKey: ["/api/summaries"],
    queryFn: () => api.getSummaries(),
  });

  const generateMutation = useMutation({
    mutationFn: api.generateSummary,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/summaries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Summary generated",
        description: "A new summary has been generated from your RSS feeds.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to generate summary. Please try again.",
        variant: "destructive",
      });
    },
  });

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

  const filteredSummaries = summaries.filter((summary: Summary) =>
    summary.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    summary.excerpt.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8" data-testid="summaries-page">
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
          <Input
            placeholder="Search summaries..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="search-summaries"
          />
        </div>
        <Button
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending}
          data-testid="generate-summary"
        >
          <Sparkles size={16} className={generateMutation.isPending ? "animate-pulse mr-2" : "mr-2"} />
          {generateMutation.isPending ? "Generating..." : "Generate New Summary"}
        </Button>
      </div>

      {filteredSummaries.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="text-muted-foreground" size={32} />
            </div>
            <h3 className="text-lg font-semibold text-card-foreground mb-2">
              {searchTerm ? "No summaries found" : "No summaries generated yet"}
            </h3>
            <p className="text-muted-foreground mb-6">
              {searchTerm 
                ? "Try adjusting your search terms to find what you're looking for."
                : "Generate your first summary from your RSS feeds."
              }
            </p>
            {!searchTerm && (
              <Button 
                onClick={() => generateMutation.mutate()}
                disabled={generateMutation.isPending}
                data-testid="generate-first-summary"
              >
                <Sparkles className="mr-2" size={16} />
                Generate First Summary
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {filteredSummaries.map((summary: Summary) => (
            <Card key={summary.id} data-testid={`summary-card-${summary.id}`}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-3">
                      <h3 className="text-lg font-semibold text-card-foreground">{summary.title}</h3>
                      <Badge 
                        variant={summary.emailSent ? "default" : summary.emailError ? "destructive" : "secondary"}
                        className="text-xs"
                        data-testid={`summary-status-${summary.id}`}
                      >
                        <Clock className="w-2 h-2 mr-1" />
                        {getTimeAgo(summary.generatedAt)}
                      </Badge>
                    </div>
                    
                    <p className="text-muted-foreground mb-4 leading-relaxed">
                      {summary.excerpt}
                    </p>
                    
                    <div className="flex items-center space-x-6 text-sm text-muted-foreground mb-4">
                      <span className="flex items-center">
                        <Newspaper className="mr-1" size={14} />
                        {summary.articleCount} articles
                      </span>
                      <span className="flex items-center">
                        <Rss className="mr-1" size={14} />
                        {summary.sourceCount} sources
                      </span>
                      <span className="flex items-center">
                        <Calendar className="mr-1" size={14} />
                        {new Date(summary.generatedAt).toLocaleDateString()}
                      </span>
                      <span className="flex items-center">
                        {summary.emailSent ? (
                          <>
                            <Check className="mr-1 text-green-600" size={14} />
                            Email sent
                          </>
                        ) : summary.emailError ? (
                          <>
                            <X className="mr-1 text-red-600" size={14} />
                            Email failed
                          </>
                        ) : (
                          <>
                            <Clock className="mr-1" size={14} />
                            Email pending
                          </>
                        )}
                      </span>
                    </div>

                    {summary.emailError && (
                      <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                        <p className="text-sm text-red-600 dark:text-red-400">
                          Email Error: {summary.emailError}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col space-y-2 ml-4 flex-shrink-0">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setSelectedSummary(summary)}
                      data-testid={`view-summary-${summary.id}`}
                    >
                      View Full
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
                        data-testid={`resend-email-${summary.id}`}
                      >
                        <Send size={12} className="mr-1" />
                        Resend
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Summary Detail Modal */}
      <Dialog open={!!selectedSummary} onOpenChange={() => setSelectedSummary(null)}>
        <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto" data-testid="summary-detail-modal">
          <DialogHeader>
            <DialogTitle>{selectedSummary?.title}</DialogTitle>
          </DialogHeader>
          
          {selectedSummary && (
            <div className="space-y-4">
              <div className="flex items-center space-x-4 text-sm text-muted-foreground pb-4 border-b border-border">
                <span className="flex items-center">
                  <Calendar className="mr-1" size={14} />
                  {new Date(selectedSummary.generatedAt).toLocaleDateString()}
                </span>
                <span className="flex items-center">
                  <Newspaper className="mr-1" size={14} />
                  {selectedSummary.articleCount} articles
                </span>
                <span className="flex items-center">
                  <Rss className="mr-1" size={14} />
                  {selectedSummary.sourceCount} sources
                </span>
              </div>
              
              <div 
                className="prose prose-sm max-w-none dark:prose-invert"
                dangerouslySetInnerHTML={{ 
                  __html: selectedSummary.content.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>')
                }}
                data-testid="summary-content"
              />
              
              <div className="flex justify-end space-x-3 pt-4 border-t border-border">
                <Button
                  variant="outline"
                  onClick={() => resendMutation.mutate(selectedSummary.id)}
                  disabled={resendMutation.isPending}
                  data-testid="resend-email-modal"
                >
                  <Send size={16} className="mr-2" />
                  Send Email
                </Button>
                <Button
                  onClick={() => setSelectedSummary(null)}
                  data-testid="close-summary-modal"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
