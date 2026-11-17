import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { handler } from "@/lib/http";
import { modelCatalog, MODE_INFO, MODES } from "@/lib/ai/gateway";
import { providerStatus } from "@/lib/ai/providers";
import { imageConnected, videoRenderConnected } from "@/lib/media";
import { searchConnected } from "@/lib/web";

export const GET = handler(async () => {
  await requireUser();
  return NextResponse.json({
    modes: MODES.map((id) => ({ id, ...MODE_INFO[id] })),
    providers: providerStatus(),
    catalog: modelCatalog(),
    capabilities: {
      chat: providerStatus().some((p) => p.connected),
      images: imageConnected(),
      videoRendering: videoRenderConnected(),
      webSearch: searchConnected(),
    },
  });
});
