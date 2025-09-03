import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface AddFeedModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddFeedModal({ isOpen, onClose }: AddFeedModalProps) {
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [checkFrequencyHours, setCheckFrequencyHours] = useState("4");
  const [includeInSummary, setIncludeInSummary] = useState(true);
  const [validating, setValidating] = useState(false);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createMutation = useMutation({
    mutationFn: api.createFeed,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feeds"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Feed added",
        description: "RSS feed has been added successfully.",
      });
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to add RSS feed. Please check the URL and try again.",
        variant: "destructive",
      });
    },
  });

  const handleClose = () => {
    setUrl("");
    setName("");
    setCheckFrequencyHours("4");
    setIncludeInSummary(true);
    setValidating(false);
    onClose();
  };

  const validateUrl = async (feedUrl: string) => {
    if (!feedUrl) return;
    
    setValidating(true);
    try {
      const response = await api.validateFeedUrl(feedUrl);
      const result = await response.json();
      
      if (result.valid && result.title && !name) {
        setName(result.title);
      }
      
      if (!result.valid) {
        toast({
          title: "Invalid URL",
          description: result.error || "This URL is not a valid RSS feed.",
          variant: "destructive",
        });
      }
    } catch (error) {
      // Validation failed, but we'll let the user proceed
    } finally {
      setValidating(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url) {
      toast({
        title: "Error",
        description: "Feed URL is required.",
        variant: "destructive",
      });
      return;
    }

    createMutation.mutate({
      url,
      name: name || "Untitled Feed",
      checkFrequencyHours: parseInt(checkFrequencyHours),
      includeInSummary,
      isActive: true,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md" data-testid="add-feed-modal">
        <DialogHeader>
          <DialogTitle>Add RSS Feed</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="feed-url">Feed URL</Label>
            <Input
              id="feed-url"
              type="url"
              placeholder="https://example.com/feed.xml"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onBlur={() => validateUrl(url)}
              required
              data-testid="input-feed-url"
            />
            {validating && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center">
                <Loader2 className="animate-spin mr-1" size={12} />
                Validating feed...
              </p>
            )}
          </div>
          
          <div>
            <Label htmlFor="feed-name">Display Name</Label>
            <Input
              id="feed-name"
              placeholder="Custom name for this feed"
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-testid="input-feed-name"
            />
          </div>
          
          <div>
            <Label htmlFor="check-frequency">Check Frequency</Label>
            <Select value={checkFrequencyHours} onValueChange={setCheckFrequencyHours}>
              <SelectTrigger data-testid="select-frequency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Every hour</SelectItem>
                <SelectItem value="4">Every 4 hours</SelectItem>
                <SelectItem value="12">Every 12 hours</SelectItem>
                <SelectItem value="24">Daily</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="auto-summarize"
              checked={includeInSummary}
              onCheckedChange={(checked) => setIncludeInSummary(!!checked)}
              data-testid="checkbox-include-summary"
            />
            <Label htmlFor="auto-summarize" className="text-sm">
              Include in automated summaries
            </Label>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createMutation.isPending || validating}
              data-testid="button-add-feed"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="animate-spin mr-2" size={16} />
                  Adding...
                </>
              ) : (
                "Add Feed"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
