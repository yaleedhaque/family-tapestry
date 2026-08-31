import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { checkRateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const MAX_EDGE = 400;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const PUBLIC_URL = "https://eamcenktssskftpxeykw.supabase.co/storage/v1/object/public/portraits";

export async function POST(request: NextRequest) {
  const rl = checkRateLimit("upload", 10, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const personId = formData.get("personId") as string | null;

    if (!file || !personId) {
      return NextResponse.json({ error: "Missing file or personId" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 413 });
    }

    if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) {
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
    }

    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(personId)) {
      return NextResponse.json({ error: "Invalid personId" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const input = Buffer.from(bytes);

    const processed = await sharp(input)
      .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 80, mozjpeg: true })
      .toBuffer();

    const path = `portraits/${personId}.jpg`;
    const db = createServiceClient();

    const { error } = await db.storage
      .from("portraits")
      .upload(path, processed, {
        contentType: "image/jpeg",
        upsert: true,
      });

    if (error) {
      console.error("Storage upload error:", error);
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }

    const url = `${PUBLIC_URL}/${path}`;
    return NextResponse.json({ url, path, size: processed.length });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
