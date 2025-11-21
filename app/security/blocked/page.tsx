// app/security/blocked/page.tsx
import Link from "next/link";
import {
  Shield,
  AlertTriangle,
  Siren,
  Lock,
  AlertOctagon,
  Mail,
  Clock,
  FileWarning,
  ShieldAlert,
  Ban,
} from "lucide-react";
import Logo from "@/app/components/Logo";
import { ThemeToggle } from "@/app/components/theme-toggle";

// Force server rendering + disable caching forever
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function BlockedPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;

  const id = params.id as string;
  const scoreRaw = params.score as string;
  const reason = params.reason as string;
  const action = params.action as string;
  const timestamp = new Date().toISOString();

  // BLOCK DIRECT ACCESS
  if (!id || !scoreRaw || !reason || !action) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-error/5 to-background flex items-center justify-center px-4">
        <div className="text-center space-y-6 max-w-lg">
          <div className="mx-auto size-20 bg-error/10 rounded-full flex items-center justify-center">
            <AlertOctagon className="size-10 text-error" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-error">
            403 Forbidden
          </h1>
          <p className="text-lg text-muted-foreground">
            This security page can only be accessed via the threat defense
            system.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 mt-4 px-6 py-3 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition"
          >
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  const scoreNum = !isNaN(Number(scoreRaw)) ? Number(scoreRaw) : 0;
  const score = scoreNum > 0 ? Math.round(scoreNum) : 0;

  const getThreatConfig = (score: number) => {
    if (score >= 95)
      return {
        level: "CRITICAL",
        color: "text-red-500",
        bg: "bg-red-500/10",
        border: "border-red-500/30",
        icon: Ban,
      };
    if (score >= 85)
      return {
        level: "SEVERE",
        color: "text-orange-500",
        bg: "bg-orange-500/10",
        border: "border-orange-500/30",
        icon: ShieldAlert,
      };
    if (score >= 70)
      return {
        level: "HIGH",
        color: "text-amber-500",
        bg: "bg-amber-500/10",
        border: "border-amber-500/30",
        icon: AlertTriangle,
      };
    return {
      level: "ELEVATED",
      color: "text-yellow-500",
      bg: "bg-yellow-500/10",
      border: "border-yellow-500/30",
      icon: FileWarning,
    };
  };

  const threat = getThreatConfig(score);
  const ThreatIcon = threat.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex flex-col">
      {/* HEADER */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-xl">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">
          <Logo />
          <ThemeToggle />
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 md:py-12">
        <div className="max-w-2xl w-full space-y-8">
          {/* Hero Section */}
          <div className="text-center space-y-4">
            <div
              className={`mx-auto size-16 ${threat.bg} rounded-full flex items-center justify-center ${threat.border} border-2`}
            >
              <Lock className={`size-8 ${threat.color}`} />
            </div>

            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                Access <span className={threat.color}>Blocked</span>
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Threat Defense System • Automatic Protection
              </p>
            </div>
          </div>

          {/* Main Card */}
          <div
            className={`bg-card border ${threat.border} rounded-xl shadow-lg overflow-hidden`}
          >
            {/* Card Header */}
            <div className={`${threat.bg} border-b ${threat.border} px-5 py-4`}>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                  <Siren className={`size-5 ${threat.color}`} />
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Incident ID
                    </p>
                    <p className="text-sm font-mono font-semibold text-foreground">
                      {id}
                    </p>
                  </div>
                </div>
                <div className="sm:text-right">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Action
                  </p>
                  <p className={`text-sm font-bold ${threat.color}`}>
                    {action}
                  </p>
                </div>
              </div>
            </div>

            {/* Card Body */}
            <div className="p-5 space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div
                  className={`${threat.bg} rounded-lg p-4 ${threat.border} border`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <ThreatIcon className={`size-4 ${threat.color}`} />
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Threat Level
                    </p>
                  </div>
                  <p className={`text-xl font-bold ${threat.color}`}>
                    {threat.level}
                  </p>
                </div>

                <div className="bg-muted/20 rounded-lg p-4 border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="size-4 text-muted-foreground" />
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Confidence
                    </p>
                  </div>
                  <p className="text-xl font-bold font-mono text-foreground">
                    {score}
                    <span className="text-sm text-muted-foreground font-normal">
                      /100
                    </span>
                  </p>
                </div>
              </div>

              {/* Reason */}
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                  Detection Reason
                </p>
                <div className="bg-muted/20 border border-border rounded-lg p-4">
                  <p className="text-sm font-mono text-foreground break-all leading-relaxed">
                    {reason}
                  </p>
                </div>
              </div>

              {/* Timestamp */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="size-3.5" />
                <span>Blocked at {new Date(timestamp).toLocaleString()}</span>
              </div>

              {/* Warning Banner */}
              <div
                className={`${threat.bg} ${threat.border} border rounded-lg p-4 flex gap-3`}
              >
                <AlertTriangle
                  className={`size-5 ${threat.color} shrink-0 mt-0.5`}
                />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">
                    Security Report Generated
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Your activity was flagged and logged by our automated
                    defense system. Repeated violations may result in permanent
                    restrictions.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Appeal Section */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="size-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                <Mail className="size-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  Think this is a mistake?
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Contact our security team with your Incident ID for manual
                  review.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href={`mailto:security@mouau-classmate.com?subject=Security%20Appeal%20-%20${id}&body=Incident%20ID:%20${id}%0AReason:%20${encodeURIComponent(
                  reason
                )}%0A%0APlease%20describe%20why%20you%20believe%20this%20block%20was%20a%20mistake:%0A`}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition"
              >
                <Mail className="size-4" />
                Submit Appeal
              </Link>
              <Link
                href="/"
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-muted text-foreground text-sm font-medium rounded-lg hover:bg-muted/80 transition border border-border"
              >
                Return Home
              </Link>
            </div>

            <div className="pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground text-center">
                Reference:{" "}
                <code className="bg-muted px-2 py-0.5 rounded text-xs font-mono">
                  {id}
                </code>
              </p>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} MOUAU ClassMate • Protected by I3Hub
            ATDS
          </p>
        </div>
      </main>
    </div>
  );
}
