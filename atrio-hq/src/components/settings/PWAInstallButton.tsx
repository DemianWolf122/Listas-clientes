"use client";

import { useEffect, useState } from "react";
import { Download, Check, Share } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { subscribePWA, canPromptInstall, promptInstall, isStandalone, isIOS } from "@/lib/pwa";

export function PWAInstallButton() {
  const [, force] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    return subscribePWA(() => force((x) => x + 1));
  }, []);

  if (!mounted) return <div className="h-9" />;

  if (isStandalone()) {
    return (
      <div className="inline-flex items-center gap-2 rounded-lg bg-[#4FA373]/12 px-3 py-2 text-[13px] font-medium text-[#3d8560]">
        <Check size={16} /> Ya está instalada en este dispositivo 🎉
      </div>
    );
  }

  const prompt = canPromptInstall();
  const ios = isIOS();

  return (
    <>
      <Button
        variant="primary"
        onClick={async () => {
          if (prompt) await promptInstall();
          else setOpen(true);
        }}
      >
        <Download size={16} /> Instalar app
      </Button>

      <Modal open={open} onOpenChange={setOpen} title="Instalar en tu dispositivo">
        {ios ? (
          <div className="mt-3 text-[14px] leading-relaxed text-ink">
            <p className="text-ink-secondary">
              En <b>Safari</b>, para tener HQ de Atrio como app en tu pantalla de inicio:
            </p>
            <ol className="mt-3 space-y-2.5">
              <li className="flex gap-2">
                <span className="font-semibold text-accent">1.</span>
                <span>
                  Tocá el botón <b>Compartir</b> <Share size={14} className="mx-0.5 inline align-text-bottom" /> (el
                  cuadrado con la flecha hacia arriba).
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-accent">2.</span>
                <span>
                  Deslizá y elegí <b>“Agregar a inicio”</b>.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-accent">3.</span>
                <span>
                  Confirmá con <b>“Agregar”</b>.
                </span>
              </li>
            </ol>
            <p className="mt-3 rounded-lg bg-surface p-2.5 text-[13px] text-ink-secondary">
              Queda como una app, a pantalla completa, en tu iPad. 🏛️
            </p>
          </div>
        ) : (
          <p className="mt-3 text-[14px] leading-relaxed text-ink-secondary">
            Abrí el menú de tu navegador y elegí <b>“Instalar app”</b> o{" "}
            <b>“Agregar a la pantalla de inicio”</b>. En Chrome/Edge suele aparecer un ícono de instalar{" "}
            <Download size={14} className="inline align-text-bottom" /> en la barra de direcciones.
          </p>
        )}
      </Modal>
    </>
  );
}
