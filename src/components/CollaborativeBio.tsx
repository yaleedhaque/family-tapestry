"use client";

import { useEffect, useRef, useCallback } from "react";
import * as Y from "yjs";

interface CollaborativeBioProps {
  personId: string;
  initialText: string;
  readOnly?: boolean;
  onTextChange?: (text: string) => void;
}

export default function CollaborativeBio({
  personId,
  initialText,
  readOnly = false,
  onTextChange,
}: CollaborativeBioProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const docRef = useRef<Y.Doc | null>(null);
  const textRef = useRef<Y.Text | null>(null);

  useEffect(() => {
    const doc = new Y.Doc();
    docRef.current = doc;
    const ytext = doc.getText(`bio:${personId}`);
    textRef.current = ytext;

    // Initialize with initial text if doc is new
    if (ytext.length === 0 && initialText) {
      ytext.insert(0, initialText);
    }

    // Render to DOM
    if (containerRef.current) {
      containerRef.current.textContent = ytext.toString();
    }

    // Observe changes
    ytext.observe(() => {
      if (containerRef.current && !readOnly) {
        containerRef.current.textContent = ytext.toString();
      }
      onTextChange?.(ytext.toString());
    });

    return () => {
      doc.destroy();
      docRef.current = null;
      textRef.current = null;
    };
  }, [personId, initialText, readOnly, onTextChange]);

  const handleInput = useCallback(() => {
    if (!textRef.current || readOnly || !containerRef.current) return;
    const newText = containerRef.current.textContent ?? "";
    if (textRef.current.toString() !== newText) {
      textRef.current.delete(0, textRef.current.length);
      textRef.current.insert(0, newText);
    }
  }, [readOnly]);

  return (
    <div
      ref={containerRef}
      contentEditable={!readOnly}
      suppressContentEditableWarning
      onInput={handleInput}
      className={`
        min-h-[80px] font-body text-sm text-parchment-dim leading-relaxed
        rounded-md border px-3 py-2 focus:outline-none focus:border-thread-gold
        transition-colors
        ${readOnly ? "cursor-default border-transparent" : "border-thread-gold-dim/30 bg-tapestry-bg/50"}
      `}
    />
  );
}
