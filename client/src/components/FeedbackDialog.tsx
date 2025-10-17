import { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FeedbackDialog({ open, onOpenChange }: FeedbackDialogProps) {
  const tallyFormId = import.meta.env.VITE_TALLY_FORM_ID || "YOUR_FORM_ID";

  useEffect(() => {
    if (!open) return;

    const widgetScriptSrc = "https://tally.so/widgets/embed.js";

    const load = () => {
      if (typeof (window as any).Tally !== "undefined") {
        (window as any).Tally.loadEmbeds();
        return;
      }
      document
        .querySelectorAll("iframe[data-tally-src]:not([src])")
        .forEach((iframeEl: any) => {
          iframeEl.src = iframeEl.dataset.tallySrc;
        });
    };

    if (typeof (window as any).Tally !== "undefined") {
      load();
      return;
    }

    if (document.querySelector(`script[src="${widgetScriptSrc}"]`) === null) {
      const script = document.createElement("script");
      script.src = widgetScriptSrc;
      script.onload = load;
      script.onerror = load;
      document.body.appendChild(script);
    }
  }, [open]);

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e?.data?.includes("Tally.FormSubmitted")) {
        onOpenChange(false);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" data-testid="dialog-feedback">
        <DialogHeader>
          <DialogTitle data-testid="text-feedback-title">Il tuo feedback ci aiuta a migliorare</DialogTitle>
          <DialogDescription data-testid="text-feedback-description">
            Condividi la tua esperienza con ProdBuddy. Ci vogliono solo 2 minuti!
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <iframe
            data-tally-src={`https://tally.so/r/${tallyFormId}?alignLeft=1&hideTitle=1&transparentBackground=1&dynamicHeight=1`}
            loading="lazy"
            width="100%"
            height="500"
            frameBorder="0"
            marginHeight={0}
            marginWidth={0}
            title="ProdBuddy Feedback Form"
            data-testid="iframe-tally-form"
          ></iframe>
        </div>
      </DialogContent>
    </Dialog>
  );
}
