import { VoiceAssistant } from "@/components/VoiceAssistant";
import { providerStatus } from "@/lib/ai/providers";

export default function VoicePage() {
  const connected = providerStatus().some((p) => p.connected);
  return (
    <div className="content-narrow" style={{ maxWidth: 1180 }}>
      <VoiceAssistant connected={connected} />
    </div>
  );
}
