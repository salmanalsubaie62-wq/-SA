import { ChatView } from "@/components/ChatView";
import { assertProjectExists } from "@/lib/guards";
import { getCurrentUser } from "@/lib/auth";

export default async function ChatPage({ searchParams }: { searchParams: Promise<{ project?: string }> }) {
  const { project } = await searchParams;
  const user = await getCurrentUser();
  const projectId = project && user && assertProjectExists(user.id, project) ? project : null;
  return <ChatView projectId={projectId} />;
}
