// Reference: blueprint:javascript_log_in_with_replit
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";

export function useAuth() {
  const { toast } = useToast();
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  useEffect(() => {
    if (error && !isUnauthorizedError(error as Error)) {
      toast({
        title: "Authentication Error",
        description: "Failed to verify authentication. Please try again.",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}
