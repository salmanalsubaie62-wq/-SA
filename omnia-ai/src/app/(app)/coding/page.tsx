import { CodingLab } from "@/components/CodingLab";
import { providerStatus } from "@/lib/ai/providers";

export default function CodingPage() {
  const connected = providerStatus().some((p) => p.connected);
  return (
    <div className="content-narrow" style={{ maxWidth: 1280 }}>
      <CodingLab connected={connected} />
    </div>
  );
}
