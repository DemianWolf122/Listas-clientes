"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useChannels } from "@/hooks/chat";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";

export default function ChatIndex() {
  const { data: channels, isLoading } = useChannels();
  const router = useRouter();

  useEffect(() => {
    if (channels && channels.length) {
      const target = channels.find((c) => c.kind === "channel") ?? channels[0];
      router.replace(`/chat/${target.id}`);
    }
  }, [channels, router]);

  return (
    <div className="flex h-full items-center justify-center">
      {isLoading || channels?.length ? (
        <Spinner />
      ) : (
        <EmptyState emoji="💬" title="Todavía no hay canales" hint="Creá el primer canal desde la barra lateral." />
      )}
    </div>
  );
}
