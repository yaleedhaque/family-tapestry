/**
 * Hocuspocus server configuration for Digital Family Tapestry.
 *
 * Deploy this as a standalone Node.js process on Fly.io or Render (free tier).
 *
 * Setup:
 *   npm install -g hocuspocus
 *   OR: npm install @hocuspocus/server @hocuspocus/extension-database @hocuspocus/extension-redis
 *
 * Run:
 *   npx hocuspocus --port 1234
 *
 * Or use this config file with:
 *   node hocuspocus-server.js
 */

const { Server } = require("@hocuspocus/server");
const { Database } = require("@hocuspocus/extension-database");
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const server = Server.configure({
  port: parseInt(process.env.PORT ?? "1234"),

  async onLoadDocument(data) {
    // Load existing Yjs state from Postgres
    const { data: row } = await supabase
      .from("yjs_documents")
      .select("state")
      .eq("doc_name", data.documentName)
      .single();

    if (row?.state) {
      return row.state;
    }
    return null;
  },

  async onStoreDocument(data) {
    // Persist Yjs state to Postgres
    const state = Y.encodeStateAsUpdate(data.document);

    await supabase
      .from("yjs_documents")
      .upsert(
        {
          doc_name: data.documentName,
          state: Array.from(state),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "doc_name" }
      );
  },

  extensions: [
    // Optional: Redis for multi-instance sync
    // new Redis({ url: process.env.REDIS_URL }),
  ],
});

server.listen();
console.log(`Hocuspocus server running on port ${server.port}`);
