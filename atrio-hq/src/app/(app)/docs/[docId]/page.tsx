"use client";

import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { Spinner } from "@/components/ui/Spinner";

const DocEditor = dynamic(() => import("@/components/docs/DocEditor").then((m) => m.DocEditor), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center">
      <Spinner />
    </div>
  ),
});

export default function DocPage() {
  const { docId } = useParams<{ docId: string }>();
  return <DocEditor id={docId} />;
}
