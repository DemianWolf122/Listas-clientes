"use client";

import "@blocknote/mantine/style.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { locales, type PartialBlock } from "@blocknote/core";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { MoreHorizontal, Trash2 } from "lucide-react";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@/components/ui/Menu";
import { EmojiPicker } from "@/components/ui/EmojiPicker";
import { Spinner } from "@/components/ui/Spinner";
import { useDoc, useUpdateDoc, useDeleteDoc } from "@/hooks/docs";
import { useAnnounceViewing } from "@/components/providers/PresenceProvider";
import { relativeTime } from "@/lib/utils";
import type { Doc, Json } from "@/lib/types/database";

export function DocEditor({ id }: { id: string }) {
  const { data: doc, isLoading } = useDoc(id);
  useAnnounceViewing(doc ? `el doc ${doc.title}` : null);

  if (isLoading || !doc) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner />
      </div>
    );
  }
  return <Editor key={doc.id} doc={doc} />;
}

function Editor({ doc }: { doc: Doc }) {
  const router = useRouter();
  const update = useUpdateDoc();
  const del = useDeleteDoc();
  const { resolvedTheme } = useTheme();
  const [title, setTitle] = useState(doc.title);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();

  const initialContent =
    Array.isArray(doc.content) && (doc.content as unknown[]).length
      ? (doc.content as unknown as PartialBlock[])
      : undefined;

  const editor = useCreateBlockNote({ initialContent, dictionary: locales.es });

  const scheduleSave = useCallback(() => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      update.mutate({ id: doc.id, content: editor.document as unknown as Json });
    }, 700);
  }, [doc.id, editor, update]);

  useEffect(() => () => clearTimeout(saveTimer.current), []);

  function commitTitle() {
    if (title !== doc.title) update.mutate({ id: doc.id, title: title.trim() || "Sin título" });
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-6 py-10 sm:px-12">
        {/* header */}
        <div className="group/head mb-1 flex items-center justify-end">
          <span className="mr-auto text-2xs text-ink-tertiary opacity-0 transition-opacity group-hover/head:opacity-100">
            Editado {relativeTime(doc.updated_at)}
          </span>
          <Menu>
            <MenuTrigger asChild>
              <button className="icon-btn">
                <MoreHorizontal size={16} />
              </button>
            </MenuTrigger>
            <MenuContent>
              <MenuItem
                danger
                onSelect={() => {
                  del.mutate(doc.id);
                  router.push("/docs");
                }}
              >
                <Trash2 size={14} /> Eliminar página
              </MenuItem>
            </MenuContent>
          </Menu>
        </div>

        <div className="flex items-center gap-3">
          <EmojiPicker onSelect={(e) => update.mutate({ id: doc.id, icon: e })}>
            <button className="text-5xl transition-transform hover:scale-105">{doc.icon}</button>
          </EmojiPicker>
        </div>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          placeholder="Sin título"
          className="mt-2 w-full border-none bg-transparent text-[40px] font-bold leading-tight tracking-tight text-ink outline-none placeholder:text-ink-tertiary"
        />

        <div className="mt-4 -ml-[54px]">
          <BlockNoteView
            editor={editor}
            theme={resolvedTheme === "dark" ? "dark" : "light"}
            onChange={scheduleSave}
          />
        </div>
      </div>
    </div>
  );
}
