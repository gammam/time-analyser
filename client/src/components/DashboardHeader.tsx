import { Calendar, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./ThemeToggle";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DashboardHeaderProps {
  onDateRangeChange?: (range: string) => void;
  dateRange?: string;
}

export function DashboardHeader({ onDateRangeChange, dateRange = "today" }: DashboardHeaderProps) {
  return (
    <header className="border-b bg-background sticky top-0 z-50">
      <div className="flex items-center justify-between p-4 gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Meeting Analyzer</h1>
          </div>
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
          
          <Button variant="ghost" size="icon" data-testid="button-settings">
            <Settings className="h-5 w-5" />
          </Button>
          
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
