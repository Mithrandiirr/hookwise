import { GitBranch } from "lucide-react";

export default function FlowsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Flows</h1>
        <p className="text-gray-400 mt-1">Track multi-step event chains across providers</p>
      </div>
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-12 text-center">
        <GitBranch className="mx-auto h-10 w-10 text-gray-600 mb-4" />
        <p className="text-gray-400 font-medium">Coming in Phase 2</p>
        <p className="text-gray-600 text-sm mt-1">
          Define event flows like: Shopify order → Stripe payment → SendGrid email.
        </p>
      </div>
    </div>
  );
}
