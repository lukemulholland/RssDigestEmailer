import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Mail, Send, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function EmailSettings() {
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

  const { data: emailSettings, isLoading } = useQuery({
    queryKey: ["/api/email-settings"],
    queryFn: api.getEmailSettings,
  });

  useEffect(() => {
    if (emailSettings) {
      setFormData({
        smtpServer: emailSettings.smtpServer || "",
        smtpPort: emailSettings.smtpPort || 587,
        smtpSecurity: emailSettings.smtpSecurity || "TLS",
        fromEmail: emailSettings.fromEmail || "",
        username: emailSettings.username || "",
        password: "", // Don't populate password for security
        recipients: emailSettings.recipients ? emailSettings.recipients.join(", ") : "",
        subjectTemplate: emailSettings.subjectTemplate || "RSS Summary - {date}",
        isActive: emailSettings.isActive ?? true,
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

  if (isLoading) {
    return (
      <div className="p-6 md:p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-12 bg-muted rounded-lg" />
          <div className="grid gap-4">
            <div className="h-96 bg-muted rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8" data-testid="email-settings-page">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Mail className="text-primary" size={20} />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-card-foreground">Email Configuration</h2>
                <p className="text-muted-foreground">Configure SMTP settings for automated email delivery</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Status Indicator */}
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center space-x-3">
                  {emailSettings ? (
                    <CheckCircle className="text-green-600" size={20} />
                  ) : (
                    <AlertCircle className="text-yellow-600" size={20} />
                  )}
                  <div>
                    <p className="font-medium text-card-foreground">
                      {emailSettings ? "Email Configured" : "Email Not Configured"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {emailSettings 
                        ? `Sending from ${emailSettings.fromEmail}` 
                        : "Complete the form below to enable email delivery"
                      }
                    </p>
                  </div>
                </div>
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(checked) => handleInputChange("isActive", checked)}
                  data-testid="email-active-switch"
                />
              </div>

              {/* SMTP Configuration */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-card-foreground">SMTP Server Configuration</h3>
                
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
              </div>

              {/* Authentication */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-card-foreground">Authentication</h3>
                
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
                    required={!emailSettings}
                    data-testid="input-password"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    For Gmail, use an App Password instead of your regular password
                  </p>
                </div>
              </div>

              {/* Email Configuration */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-card-foreground">Email Configuration</h3>
                
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
              </div>
              
              <div className="flex justify-end space-x-3 pt-6 border-t border-border">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => testMutation.mutate()}
                  disabled={testMutation.isPending || !formData.smtpServer}
                  data-testid="test-email-button"
                >
                  {testMutation.isPending ? (
                    <>
                      <Loader2 className="animate-spin mr-2" size={16} />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2" size={16} />
                      Send Test Email
                    </>
                  )}
                </Button>
                <Button 
                  type="submit" 
                  disabled={saveMutation.isPending}
                  data-testid="save-email-settings"
                >
                  {saveMutation.isPending ? (
                    <>
                      <Loader2 className="animate-spin mr-2" size={16} />
                      Saving...
                    </>
                  ) : (
                    "Save Settings"
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
