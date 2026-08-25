import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { uploadToR2 } from "@/lib/r2/client";

const MAX_EDGE = 1200;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const personId = formData.get("personId") as string | null;

    if (!file || !personId) {
      return NextResponse.json(
        { error: "Missing file or personId" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const input = Buffer.from(bytes);

    // Resize and compress
    const processed = await sharp(input)
      .resize({
        width: MAX_EDGE,
        height: MAX_EDGE,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 80, mozjpeg: true })
      .toBuffer();

    // Upload to R2
    const key = `portraits/${personId}.jpg`;
    const url = await uploadToR2(key, processed, "image/jpeg");

    return NextResponse.json({
      url,
      key,
      size: processed.length,
    });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
}
