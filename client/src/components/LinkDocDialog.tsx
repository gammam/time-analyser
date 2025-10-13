import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation } from "@tanstack/react-query";
import { analyzeDocForMeeting } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface LinkDocDialogProps {
  meetingId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LinkDocDialog({ meetingId, open, onOpenChange }: LinkDocDialogProps) {
  const [docUrl, setDocUrl] = useState("");
  const { toast } = useToast();

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const docId = extractDocId(docUrl);
      if (!docId) throw new Error("Invalid Google Docs URL");
      return analyzeDocForMeeting(meetingId, docId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/meetings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      toast({
        title: "Document analyzed",
        description: "Meeting score has been updated based on the document content",
      });
      setDocUrl("");
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Analysis failed",
        description: error.message || "Failed to analyze document",
        variant: "destructive",
      });
    },
  });

  const extractDocId = (url: string): string | null => {
    const match = url.match(/docs\.google\.com\/document\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    analyzeMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="dialog-link-doc">
        <DialogHeader>
          <DialogTitle>Link Meeting Notes</DialogTitle>
          <DialogDescription>
            Paste the Google Docs URL containing your meeting notes to analyze and update the score.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="doc-url">Google Docs URL</Label>
              <Input
                id="doc-url"
                placeholder="https://docs.google.com/document/d/..."
                value={docUrl}
                onChange={(e) => setDocUrl(e.target.value)}
                data-testid="input-doc-url"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!docUrl || analyzeMutation.isPending}
              data-testid="button-analyze"
            >
              {analyzeMutation.isPending ? "Analyzing..." : "Analyze Notes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
