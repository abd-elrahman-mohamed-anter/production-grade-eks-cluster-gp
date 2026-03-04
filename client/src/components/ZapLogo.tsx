import { Shield } from "lucide-react";

export default function ZapLogo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`} data-testid="zap-logo">
      <div className="flex items-center justify-center w-8 h-8 rounded bg-primary">
        <Shield className="w-5 h-5 text-primary-foreground" />
      </div>
      <span className="text-lg font-semibold text-foreground">web vulnerability Scanner</span>
    </div>
  );
}
