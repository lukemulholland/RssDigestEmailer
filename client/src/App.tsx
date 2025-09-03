import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "@/pages/dashboard";
import Feeds from "@/pages/feeds";
import Summaries from "@/pages/summaries";
import EmailSettings from "@/pages/email-settings";
import Schedule from "@/pages/schedule";
import Logs from "@/pages/logs";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import NotFound from "@/pages/not-found";
import { useState } from "react";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/feeds" component={Feeds} />
      <Route path="/summaries" component={Summaries} />
      <Route path="/email-settings" component={EmailSettings} />
      <Route path="/schedule" component={Schedule} />
      <Route path="/logs" component={Logs} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <div className="flex h-screen overflow-hidden">
          <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
          <main className="flex-1 flex flex-col overflow-hidden">
            <Header onSidebarToggle={() => setSidebarOpen(!sidebarOpen)} />
            <div className="flex-1 overflow-auto">
              <Router />
            </div>
          </main>
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
