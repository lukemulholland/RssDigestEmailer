import { Card, CardContent } from "@/components/ui/card";
import { Rss, Newspaper, Mail, CheckCircle } from "lucide-react";
import { type DashboardStats } from "@shared/schema";

interface StatsCardsProps {
  stats: DashboardStats;
}

export default function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      title: "Active Feeds",
      value: stats.activeFeeds,
      change: "+2 from last week",
      icon: Rss,
      bgColor: "bg-primary/10",
      iconColor: "text-primary",
    },
    {
      title: "Articles Today",
      value: stats.articlesToday,
      change: "+15% from yesterday",
      icon: Newspaper,
      bgColor: "bg-accent",
      iconColor: "text-accent-foreground",
    },
    {
      title: "Emails Sent",
      value: stats.emailsSent,
      change: "98.5% delivery rate",
      icon: Mail,
      bgColor: "bg-secondary",
      iconColor: "text-secondary-foreground",
    },
    {
      title: "Last Check",
      value: stats.lastCheck,
      change: "All feeds healthy",
      icon: CheckCircle,
      bgColor: "bg-green-500/10",
      iconColor: "text-green-600",
      isText: true,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.title} data-testid={`stat-${card.title.toLowerCase().replace(/\s+/g, '-')}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium">
                    {card.title}
                  </p>
                  <p className={`font-bold text-card-foreground ${card.isText ? 'text-lg' : 'text-3xl'}`}>
                    {card.value}
                  </p>
                </div>
                <div className={`w-12 h-12 ${card.bgColor} rounded-lg flex items-center justify-center`}>
                  <Icon className={card.iconColor} size={24} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                <span className="text-green-600">{card.change.includes('+') ? card.change.split(' ')[0] : ''}</span>
                {card.change.includes('+') ? ' ' + card.change.substring(card.change.indexOf(' ') + 1) : card.change}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
