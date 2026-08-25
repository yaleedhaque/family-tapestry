"use client";

import { useEffect, useRef, useState } from "react";
import * as Y from "yjs";

const HOCUSPOCUS_URL = process.env.NEXT_PUBLIC_HOCUSPOCUS_URL ?? "ws://localhost:1234";

export function useYjsDoc(docId: string) {
  const docRef = useRef<Y.Doc | null>(null);
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    const doc = new Y.Doc();
    docRef.current = doc;

    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout>;

    const connect = () => {
      ws = new WebSocket(`${HOCUSPOCUS_URL}/${docId}`);

      ws.onopen = () => {
        setSynced(true);
      };

      ws.onmessage = (event) => {
        const data = new Uint8Array(
          typeof event.data === "string"
            ? Uint8Array.from(event.data, (c) => c.charCodeAt(0)).buffer
            : event.data
        );
        Y.applyUpdate(doc, data);
      };

      ws.onclose = () => {
        setSynced(false);
        reconnectTimer = setTimeout(connect, 2000);
      };

      ws.onerror = () => {
        ws?.close();
      };
    };

    // Sync local updates to server
    const updateHandler = (update: Uint8Array) => {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(update);
      }
    };
    doc.on("update", updateHandler);

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      doc.off("update", updateHandler);
      ws?.close();
      doc.destroy();
      docRef.current = null;
    };
  }, [docId]);

  return { doc: docRef.current, synced };
}
