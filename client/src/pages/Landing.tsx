// Reference: blueprint:javascript_log_in_with_replit
import { Button } from "@/components/ui/button";
import { TrendingUp, Users, Trophy, Target } from "lucide-react";
import logoUrl from "@assets/generated_images/ProdBuddy_productivity_assistant_logo_e1b28eb0.png";

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-4 mb-4">
              <img src={logoUrl} alt="ProdBuddy" className="h-16 w-16 md:h-20 md:w-20" />
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              ProdBuddy
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Your friendly productivity assistant. Track meetings, predict task completion, 
              and level up your productivity game with smart insights.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
            <div className="p-6 rounded-lg border bg-card">
              <TrendingUp className="h-8 w-8 text-primary mb-4" />
              <h3 className="font-semibold text-lg mb-2">Score Tracking</h3>
              <p className="text-sm text-muted-foreground">
                Get instant meeting scores based on agenda quality, timing, participants, and outcomes
              </p>
            </div>
            <div className="p-6 rounded-lg border bg-card">
              <Users className="h-8 w-8 text-primary mb-4" />
              <h3 className="font-semibold text-lg mb-2">Smart Analysis</h3>
              <p className="text-sm text-muted-foreground">
                Automatically analyze meeting notes from Google Docs for action items and key points
              </p>
            </div>
            <div className="p-6 rounded-lg border bg-card">
              <Target className="h-8 w-8 text-primary mb-4" />
              <h3 className="font-semibold text-lg mb-2">Weekly Challenges</h3>
              <p className="text-sm text-muted-foreground">
                Improve your weak areas with targeted challenges and actionable feedback
              </p>
            </div>
            <div className="p-6 rounded-lg border bg-card">
              <Trophy className="h-8 w-8 text-primary mb-4" />
              <h3 className="font-semibold text-lg mb-2">Achievements</h3>
              <p className="text-sm text-muted-foreground">
                Earn badges and track your progress as you master effective meeting practices
              </p>
            </div>
          </div>

          {/* CTA */}
          <div className="pt-8">
            <Button 
              size="lg" 
              onClick={() => window.location.href = '/api/login'}
              data-testid="button-login"
            >
              Get Started
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
