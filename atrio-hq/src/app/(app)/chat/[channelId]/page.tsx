"use client";

import { useParams } from "next/navigation";
import { ChatView } from "@/components/chat/ChatView";

export default function ChannelPage() {
  const { channelId } = useParams<{ channelId: string }>();
  return <ChatView channelId={channelId} />;
}
