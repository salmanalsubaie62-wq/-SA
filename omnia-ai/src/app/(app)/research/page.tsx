import { ResearchView } from "@/components/ResearchView";
import { searchConnected } from "@/lib/web";

export default function ResearchPage() {
  return (
    <div className="content-narrow">
      <ResearchView connected={searchConnected()} />
    </div>
  );
}
