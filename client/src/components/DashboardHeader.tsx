import { useState } from "react";
import { LogOut, BarChart3, ListTodo, Settings, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./ThemeToggle";
import { Link, useLocation } from "wouter";
import { FeedbackDialog } from "./FeedbackDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { User } from "@shared/schema";
import logoUrl from "@assets/generated_images/ProdBuddy_productivity_assistant_logo_e1b28eb0.png";

interface DashboardHeaderProps {
  onDateRangeChange?: (range: string) => void;
  dateRange?: string;
  hasJiraCredentials?: boolean;
}

export function DashboardHeader({ onDateRangeChange, dateRange = "today", hasJiraCredentials = false }: DashboardHeaderProps) {
  const { user } = useAuth();
  const typedUser = user as User | undefined;
  const [location] = useLocation();
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  
  return (
    <>
      <FeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} />
      <header className="border-b bg-background sticky top-0 z-50">
        <div className="flex items-center justify-between p-4 gap-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <img src={logoUrl} alt="ProdBuddy" className="h-8 w-8" />
              <h1 className="text-xl font-bold">ProdBuddy</h1>
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
              {hasJiraCredentials && (
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
              )}
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

            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setFeedbackOpen(true)}
              className="gap-2"
              data-testid="button-feedback"
            >
              <MessageSquare className="h-4 w-4" />
              Feedback
            </Button>
            
            {typedUser && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full" data-testid="button-user-menu">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={typedUser.profileImageUrl || undefined} alt={typedUser.email || "User"} />
                      <AvatarFallback>
                        {typedUser.firstName?.[0] || typedUser.email?.[0] || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{typedUser.firstName || "User"}</p>
                      <p className="text-xs leading-none text-muted-foreground">{typedUser.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild data-testid="menu-settings">
                    <Link href="/settings">
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => window.location.href = '/api/logout'} data-testid="menu-logout">
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            
            <ThemeToggle />
          </div>
        </div>
      </header>
    </>
  );
}
