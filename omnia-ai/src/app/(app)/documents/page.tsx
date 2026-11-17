import { DocumentsView } from "@/components/DocumentsView";
import { providerStatus } from "@/lib/ai/providers";

export default function DocumentsPage() {
  const connected = providerStatus().some((p) => p.connected);
  return (
    <div className="content-narrow" style={{ maxWidth: 1280 }}>
      <DocumentsView connected={connected} />
    </div>
  );
}
