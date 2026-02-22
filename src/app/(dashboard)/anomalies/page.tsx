import { AlertTriangle } from "lucide-react";

export default function AnomaliesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Anomalies</h1>
        <p className="text-gray-400 mt-1">AI-detected anomalies across your integrations</p>
      </div>
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-12 text-center">
        <AlertTriangle className="mx-auto h-10 w-10 text-gray-600 mb-4" />
        <p className="text-gray-400 font-medium">Coming in Phase 2</p>
        <p className="text-gray-600 text-sm mt-1">
          AI anomaly detection will be available once your integrations have enough data.
        </p>
      </div>
    </div>
  );
}
