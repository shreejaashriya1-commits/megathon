import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { supabaseServer, isSupabaseServerConfigured } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const bucket = (formData.get('bucket') as string) || 'evidence';

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const ext = path.extname(file.name) || '.jpg';
    const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;

    // Try Supabase Storage first if configured
    if (isSupabaseServerConfigured && supabaseServer) {
      const { error: uploadError } = await supabaseServer.storage
        .from(bucket)
        .upload(filename, buffer, {
          contentType: file.type || 'image/jpeg',
          upsert: false,
        });

      if (!uploadError) {
        const { data: publicUrlData } = supabaseServer.storage
          .from(bucket)
          .getPublicUrl(filename);

        return NextResponse.json({
          success: true,
          data: {
            url: publicUrlData.publicUrl,
            filename,
            source: 'supabase_storage',
          },
          message: 'Evidence uploaded successfully to Supabase Storage',
        });
      }
      console.warn('Supabase storage upload failed, falling back to local static storage:', uploadError);
    }

    // Local static storage fallback for development / hackathon demo
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, filename);
    fs.writeFileSync(filePath, buffer);
    const publicUrl = `/uploads/${filename}`;

    return NextResponse.json({
      success: true,
      data: {
        url: publicUrl,
        filename,
        source: 'local_storage',
      },
      message: 'Evidence saved successfully',
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'File upload failed' },
      { status: 500 }
    );
  }
}
