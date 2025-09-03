import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Send } from "lucide-react";

interface EmailConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function EmailConfigModal({ isOpen, onClose }: EmailConfigModalProps) {
  const [formData, setFormData] = useState({
    smtpServer: "",
    smtpPort: 587,
    smtpSecurity: "TLS",
    fromEmail: "",
    username: "",
    password: "",
    recipients: "",
    subjectTemplate: "RSS Summary - {date}",
    isActive: true,
  });
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: emailSettings } = useQuery({
    queryKey: ["/api/email-settings"],
    queryFn: api.getEmailSettings,
    enabled: isOpen,
  });

  useEffect(() => {
    if (emailSettings) {
      setFormData({
        ...emailSettings,
        recipients: emailSettings.recipients.join(", "),
        password: "", // Don't populate password for security
      });
    }
  }, [emailSettings]);

  const saveMutation = useMutation({
    mutationFn: api.saveEmailSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-settings"] });
      toast({
        title: "Settings saved",
        description: "Email configuration has been saved successfully.",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to save email settings. Please check your configuration.",
        variant: "destructive",
      });
    },
  });

  const testMutation = useMutation({
    mutationFn: api.sendTestEmail,
    onSuccess: () => {
      toast({
        title: "Test email sent",
        description: "Check your inbox for the test email.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Test failed",
        description: error?.message || "Failed to send test email. Please check your settings.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const recipients = formData.recipients
      .split(",")
      .map(email => email.trim())
      .filter(email => email);

    if (recipients.length === 0) {
      toast({
        title: "Error",
        description: "At least one recipient email is required.",
        variant: "destructive",
      });
      return;
    }

    saveMutation.mutate({
      ...formData,
      recipients,
    });
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto" data-testid="email-config-modal">
        <DialogHeader>
          <DialogTitle>Email Configuration</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="smtp-server">SMTP Server</Label>
            <Input
              id="smtp-server"
              placeholder="smtp.gmail.com"
              value={formData.smtpServer}
              onChange={(e) => handleInputChange("smtpServer", e.target.value)}
              required
              data-testid="input-smtp-server"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="smtp-port">Port</Label>
              <Input
                id="smtp-port"
                type="number"
                placeholder="587"
                value={formData.smtpPort}
                onChange={(e) => handleInputChange("smtpPort", parseInt(e.target.value))}
                required
                data-testid="input-smtp-port"
              />
            </div>
            <div>
              <Label htmlFor="smtp-security">Security</Label>
              <Select 
                value={formData.smtpSecurity} 
                onValueChange={(value) => handleInputChange("smtpSecurity", value)}
              >
                <SelectTrigger data-testid="select-smtp-security">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TLS">TLS</SelectItem>
                  <SelectItem value="SSL">SSL</SelectItem>
                  <SelectItem value="None">None</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="email"
              placeholder="your-email@gmail.com"
              value={formData.username}
              onChange={(e) => handleInputChange("username", e.target.value)}
              required
              data-testid="input-username"
            />
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Your email password or app password"
              value={formData.password}
              onChange={(e) => handleInputChange("password", e.target.value)}
              required={!emailSettings} // Only required for new configurations
              data-testid="input-password"
            />
            <p className="text-xs text-muted-foreground mt-1">
              For Gmail, use an App Password instead of your regular password
            </p>
          </div>
          
          <div>
            <Label htmlFor="from-email">From Email</Label>
            <Input
              id="from-email"
              type="email"
              placeholder="noreply@yoursite.com"
              value={formData.fromEmail}
              onChange={(e) => handleInputChange("fromEmail", e.target.value)}
              required
              data-testid="input-from-email"
            />
          </div>
          
          <div>
            <Label htmlFor="recipient-emails">Recipients</Label>
            <Textarea
              id="recipient-emails"
              rows={3}
              placeholder="email1@example.com, email2@example.com"
              value={formData.recipients}
              onChange={(e) => handleInputChange("recipients", e.target.value)}
              required
              data-testid="textarea-recipients"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Separate multiple emails with commas
            </p>
          </div>
          
          <div>
            <Label htmlFor="subject-template">Email Subject Template</Label>
            <Input
              id="subject-template"
              placeholder="Daily News Summary - {date}"
              value={formData.subjectTemplate}
              onChange={(e) => handleInputChange("subjectTemplate", e.target.value)}
              required
              data-testid="input-subject-template"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Use {"{date}"} to include the current date
            </p>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => testMutation.mutate()}
              disabled={testMutation.isPending || !formData.smtpServer}
              data-testid="button-test-email"
            >
              {testMutation.isPending ? (
                <>
                  <Loader2 className="animate-spin mr-2" size={16} />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2" size={16} />
                  Test
                </>
              )}
            </Button>
            <Button 
              type="submit" 
              disabled={saveMutation.isPending}
              data-testid="button-save-email"
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="animate-spin mr-2" size={16} />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
