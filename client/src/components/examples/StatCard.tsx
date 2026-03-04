import StatCard from '../StatCard';
import { FileText, ShieldAlert, Clock } from 'lucide-react';

export default function StatCardExample() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
      <StatCard
        icon={FileText}
        title="Total Scans"
        value={125}
        subtitle="Lead Developer"
        onViewDetails={() => console.log('View total scans')}
      />
      <StatCard
        icon={ShieldAlert}
        title="Critical Vulnerabilities"
        value={85}
        subtitle="Security Researcher"
        onViewDetails={() => console.log('View vulnerabilities')}
      />
      <StatCard
        icon={Clock}
        title="Last Scan"
        value="Just Now"
        subtitle="Just Now"
        onViewDetails={() => console.log('View last scan')}
      />
    </div>
  );
}
