import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { uploadToR2 } from "@/lib/r2/client";
import { checkRateLimit } from "@/lib/rate-limit";

const MAX_EDGE = 1200;
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const rl = checkRateLimit("upload", 10, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } });
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

    const key = `portraits/${personId}.jpg`;
    const url = await uploadToR2(key, processed, "image/jpeg");

    return NextResponse.json({ url, key, size: processed.length });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
