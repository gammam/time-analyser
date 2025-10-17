import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Calendar, Settings, ArrowRight, Rocket } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface OnboardingModalProps {
  open: boolean;
  onComplete: () => void;
  hasGoogleCredentials: boolean;
}

export function OnboardingModal({ open, onComplete, hasGoogleCredentials }: OnboardingModalProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: "Benvenuto in ProdBuddy",
      description: "Il tuo assistente personale per analizzare e migliorare la produttività",
      icon: Rocket,
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            ProdBuddy ti aiuta a valutare l'efficacia dei tuoi meeting e gestire i task JIRA in modo intelligente.
          </p>
          <div className="space-y-3 pt-2">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Analisi Meeting Automatica</p>
                <p className="text-sm text-muted-foreground">
                  Punteggi da 0 a 100 basati su agenda, partecipanti, timing e action items
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Predizione Task JIRA</p>
                <p className="text-sm text-muted-foreground">
                  Stima quali task puoi completare considerando meeting e context switching
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Gamification e Sfide</p>
                <p className="text-sm text-muted-foreground">
                  Achievement e sfide settimanali per migliorare costantemente
                </p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Connetti Google Calendar",
      description: "Permetti a ProdBuddy di analizzare i tuoi meeting",
      icon: Calendar,
      content: (
        <div className="space-y-4">
          {hasGoogleCredentials ? (
            <Card className="border-green-500/50 bg-green-500/5">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-6 w-6 text-green-500 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-green-700 dark:text-green-400">
                      Google Calendar Connesso!
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Sei pronto per sincronizzare i tuoi meeting
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <p className="text-muted-foreground">
                Per analizzare i tuoi meeting, dobbiamo accedere al tuo Google Calendar.
                I tuoi dati rimangono privati e sicuri.
              </p>
              <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                <p className="text-sm font-medium">Cosa farà ProdBuddy:</p>
                <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                  <li>✓ Leggere i tuoi eventi del calendario</li>
                  <li>✓ Analizzare titoli, partecipanti e note dei meeting</li>
                  <li>✓ Calcolare punteggi di produttività</li>
                </ul>
              </div>
              <Button
                className="w-full"
                size="lg"
                onClick={() => {
                  window.location.href = "/auth/google";
                }}
                data-testid="button-connect-google"
              >
                <Calendar className="mr-2 h-5 w-5" />
                Connetti Google Calendar
              </Button>
            </>
          )}
        </div>
      ),
    },
    {
      title: "Configura JIRA (Opzionale)",
      description: "Collega il tuo account JIRA per analisi task avanzate",
      icon: Settings,
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Se vuoi utilizzare la predizione dei task JIRA, puoi configurarlo successivamente
            nella sezione Settings.
          </p>
          <div className="bg-muted/50 p-4 rounded-lg space-y-3">
            <p className="text-sm font-medium">Come configurare JIRA:</p>
            <ol className="text-sm text-muted-foreground space-y-2 ml-4 list-decimal">
              <li>Vai su <span className="font-mono bg-background px-1">Settings</span> nel menu</li>
              <li>Crea un API Token su Atlassian</li>
              <li>Inserisci email, URL e API Token</li>
              <li>La tab Tasks si attiverà automaticamente</li>
            </ol>
          </div>
          <div className="flex items-start gap-2 text-sm text-muted-foreground bg-blue-500/10 p-3 rounded-lg">
            <span className="text-blue-500 font-medium">💡</span>
            <p>
              Puoi saltare questo passaggio e configurare JIRA quando vuoi.
              ProdBuddy funziona benissimo anche solo con l'analisi meeting!
            </p>
          </div>
        </div>
      ),
    },
  ];

  const currentStepData = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;
  const Icon = currentStepData.icon;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-[600px]"
        data-testid="dialog-onboarding"
      >
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Icon className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-xl" data-testid="text-onboarding-title">
                {currentStepData.title}
              </DialogTitle>
              <DialogDescription data-testid="text-onboarding-description">
                {currentStepData.description}
              </DialogDescription>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Passo {currentStep + 1} di {steps.length}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" data-testid="progress-onboarding" />
          </div>
        </DialogHeader>

        <div className="py-4" data-testid="content-onboarding-step">
          {currentStepData.content}
        </div>

        <div className="flex justify-between gap-3">
          {currentStep > 0 ? (
            <Button
              variant="outline"
              onClick={handleBack}
              data-testid="button-onboarding-back"
            >
              Indietro
            </Button>
          ) : (
            <div />
          )}
          <Button
            onClick={handleNext}
            className="ml-auto"
            data-testid="button-onboarding-next"
          >
            {currentStep === steps.length - 1 ? (
              "Inizia ad usare ProdBuddy"
            ) : (
              <>
                Avanti
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
