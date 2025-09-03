import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  List, 
  FileText, 
  Mail, 
  Clock, 
  Activity,
  Rss,
  User,
  Moon,
  Sun
} from "lucide-react";
import { useState, useEffect } from "react";

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Manage Feeds", href: "/feeds", icon: List },
  { name: "Summaries", href: "/summaries", icon: FileText },
  { name: "Email Settings", href: "/email-settings", icon: Mail },
  { name: "Schedule", href: "/schedule", icon: Clock },
  { name: "Activity Logs", href: "/logs", icon: Activity },
];

export default function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const [location] = useLocation();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
    
    setIsDark(shouldBeDark);
    document.documentElement.classList.toggle('dark', shouldBeDark);
  }, []);

  const toggleTheme = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    localStorage.setItem('theme', newIsDark ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', newIsDark);
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onToggle}
          data-testid="sidebar-backdrop"
        />
      )}
      
      <aside 
        className={cn(
          "w-64 bg-card border-r border-border flex flex-col transition-transform duration-300 ease-in-out z-50",
          "md:relative absolute inset-y-0 left-0",
          "md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
        data-testid="sidebar"
      >
        <div className="p-6 border-b border-border">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Rss className="text-primary-foreground text-sm" size={16} />
            </div>
            <h1 className="text-xl font-semibold text-card-foreground">RSS Automation</h1>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          {navigation.map((item) => {
            const isActive = location === item.href;
            const Icon = item.icon;
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center space-x-3 px-3 py-2 rounded-md font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                data-testid={`nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <Icon size={20} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
        
        <div className="p-4 border-t border-border">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
              <User className="text-muted-foreground" size={16} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-card-foreground">Admin User</p>
              <p className="text-xs text-muted-foreground">admin@example.com</p>
            </div>
            <button 
              onClick={toggleTheme}
              className="p-1 rounded-md hover:bg-muted transition-colors"
              data-testid="theme-toggle"
            >
              {isDark ? (
                <Sun className="text-muted-foreground" size={16} />
              ) : (
                <Moon className="text-muted-foreground" size={16} />
              )}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
