import { Calendar, LogOut, BarChart3, ListTodo } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./ThemeToggle";
import { Link, useLocation } from "wouter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface DashboardHeaderProps {
  onDateRangeChange?: (range: string) => void;
  dateRange?: string;
}

export function DashboardHeader({ onDateRangeChange, dateRange = "today" }: DashboardHeaderProps) {
  const { user } = useAuth();
  const [location] = useLocation();
  
  return (
    <header className="border-b bg-background sticky top-0 z-50">
      <div className="flex items-center justify-between p-4 gap-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Productivity Analyzer</h1>
          </div>
          
          <nav className="flex gap-1">
            <Link href="/">
              <Button 
                variant={location === "/" ? "default" : "ghost"} 
                size="sm"
                className="gap-2"
                data-testid="nav-meetings"
              >
                <BarChart3 className="h-4 w-4" />
                Meetings
              </Button>
            </Link>
            <Link href="/tasks">
              <Button 
                variant={location === "/tasks" ? "default" : "ghost"} 
                size="sm"
                className="gap-2"
                data-testid="nav-tasks"
              >
                <ListTodo className="h-4 w-4" />
                Tasks
              </Button>
            </Link>
          </nav>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={dateRange} onValueChange={onDateRangeChange}>
            <SelectTrigger className="w-[140px]" data-testid="select-date-range">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="7days">Last 7 Days</SelectItem>
              <SelectItem value="30days">Last 30 Days</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
          
          {user && (
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.profileImageUrl} alt={user.email || "User"} />
                <AvatarFallback>
                  {user.firstName?.[0] || user.email?.[0] || "U"}
                </AvatarFallback>
              </Avatar>
            </div>
          )}
          
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => window.location.href = '/api/logout'}
            data-testid="button-logout"
          >
            <LogOut className="h-5 w-5" />
          </Button>
          
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
