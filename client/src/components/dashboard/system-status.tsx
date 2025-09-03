import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { type DashboardStats } from "@shared/schema";

interface SystemStatusProps {
  stats: DashboardStats;
}

export default function SystemStatus({ stats }: SystemStatusProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "operational":
        return "bg-green-100 text-green-800";
      case "warning":
        return "bg-yellow-100 text-yellow-800";
      case "error":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const services = [
    { name: "RSS Parser", status: stats.systemStatus.rssParser },
    { name: "Email Service", status: stats.systemStatus.emailService },
    { name: "AI Summarizer", status: stats.systemStatus.aiSummarizer },
    { name: "Scheduler", status: stats.systemStatus.scheduler },
  ];

  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-semibold text-card-foreground">System Status</h3>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {services.map((service) => (
            <div key={service.name} className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{service.name}</span>
              <Badge 
                className={`${getStatusColor(service.status)} text-xs font-medium`}
                data-testid={`status-${service.name.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <div className="w-2 h-2 rounded-full bg-current mr-1" />
                {service.status.charAt(0).toUpperCase() + service.status.slice(1)}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
