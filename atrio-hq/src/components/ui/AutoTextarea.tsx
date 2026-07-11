"use client";

import { useEffect, useRef } from "react";

/**
 * Textarea que crece con el contenido (sin scroll interno), para escribir
 * descripciones y comentarios largos cómodos. Mantené un min-height por CSS.
 */
export function AutoTextarea({
  value,
  onChange,
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  function resize(el: HTMLTextAreaElement) {
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }

  useEffect(() => {
    if (ref.current) resize(ref.current);
  }, [value]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => {
        onChange(e);
        resize(e.target);
      }}
      className={className}
      {...props}
    />
  );
}
