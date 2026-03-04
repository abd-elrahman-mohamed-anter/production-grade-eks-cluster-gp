import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  icon: LucideIcon;
  title: string;
  value: string | number;
  subtitle: string;
  onViewDetails?: () => void;
}

export default function StatCard({ icon: Icon, title, value, subtitle, onViewDetails }: StatCardProps) {
  return (
    <Card className="bg-card border-card-border" data-testid={`stat-card-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="flex items-center justify-center w-10 h-10 rounded bg-primary/10 text-primary">
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          </div>
        </div>
        <Button
          variant="default"
          size="sm"
          className="mt-4"
          onClick={onViewDetails}
          data-testid={`button-view-details-${title.toLowerCase().replace(/\s+/g, '-')}`}
        >
          View Details
        </Button>
      </CardContent>
    </Card>
  );
}
