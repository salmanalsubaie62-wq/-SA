import { AgentTeam } from "@/components/AgentTeam";
import { providerStatus } from "@/lib/ai/providers";

export default function AgentsPage() {
  const connected = providerStatus().some((p) => p.connected);
  return (
    <div className="content-narrow" style={{ maxWidth: 1180 }}>
      <AgentTeam connected={connected} />
    </div>
  );
}
