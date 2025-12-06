import type { APIRoute } from 'astro';
import { writeFile } from 'fs/promises';
import { join } from 'path';

export const POST: APIRoute = async ({ request }) => {
  try {
    const contentType = request.headers.get('content-type');

    if (!contentType?.includes('multipart/form-data')) {
      return new Response(JSON.stringify({
        error: 'Content-Type must be multipart/form-data'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const productFolder = formData.get('product_folder') as string || 'default';
    const preserveFilename = formData.get('preserve_filename') === 'true';

    if (!file) {
      return new Response(JSON.stringify({
        error: 'No file provided. Send file as form field named "file"'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return new Response(JSON.stringify({
        error: 'Invalid file type. Allowed: JPG, PNG, GIF, WebP',
        received: file.type
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return new Response(JSON.stringify({
        error: 'File too large. Maximum size: 5MB',
        received: `${(file.size / 1024 / 1024).toFixed(2)}MB`
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Sanitize filename
    const originalName = file.name;

    let filename: string;
    if (preserveFilename) {
      // Keep original filename as-is (only basic sanitization)
      filename = originalName.replace(/[^a-zA-Z0-9._-]/g, '-');
    } else {
      // Add timestamp prefix (default behavior)
      const sanitizedName = originalName
        .toLowerCase()
        .replace(/[^a-z0-9.-]/g, '-')
        .replace(/-+/g, '-');
      const timestamp = Date.now();
      filename = `${timestamp}-${sanitizedName}`;
    }

    // OPTION 1: Save to /tmp (temporary, for development/testing)
    // Note: Files in /tmp are deleted when serverless function ends
    const tmpPath = join('/tmp', productFolder);
    const tmpFilePath = join(tmpPath, filename);

    // Create directory if not exists
    try {
      await writeFile(tmpFilePath, Buffer.from(await file.arrayBuffer()));
    } catch (err) {
      // Try without creating directory
      await writeFile(join('/tmp', filename), Buffer.from(await file.arrayBuffer()));
    }

    // OPTION 2: Use Vercel Blob Storage (recommended for production)
    // Uncomment if you have @vercel/blob installed and BLOB_READ_WRITE_TOKEN env var:
    /*
    import { put } from '@vercel/blob';
    const blob = await put(`images/${productFolder}/${filename}`, file, {
      access: 'public',
    });
    const publicUrl = blob.url;
    */

    // For now, return local path (user should commit to GitHub for production)
    const localPath = `/images/${productFolder}/${filename}`;

    return new Response(JSON.stringify({
      success: true,
      file: {
        original_name: originalName,
        saved_name: filename,
        filename_preserved: preserveFilename,
        size: file.size,
        type: file.type,
        local_path: localPath,
        temp_path: tmpFilePath,
        note: 'File saved to /tmp (temporary). For production, add this file to GitHub at /public/images/ or use Vercel Blob Storage.'
      },
      instructions: {
        manual_upload: `To make this image permanent, add it to your GitHub repo at: public/images/${productFolder}/${filename}`,
        vercel_blob: 'For automatic cloud storage, install @vercel/blob and set BLOB_READ_WRITE_TOKEN env variable'
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Upload error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to upload file',
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const GET: APIRoute = async () => {
  return new Response(JSON.stringify({
    message: 'Upload images via POST with multipart/form-data',
    usage: {
      method: 'POST',
      content_type: 'multipart/form-data',
      fields: {
        file: 'Image file (required)',
        product_folder: 'Folder name for organization (optional, default: "default")',
        preserve_filename: 'Keep original filename without timestamp prefix (optional, "true" or "false", default: "false")'
      },
      examples: {
        with_timestamp: `curl -X POST https://creativestuff.vercel.app/api/upload-image \\
  -F "file=@/path/to/image.jpg" \\
  -F "product_folder=my-product"`,
        preserve_original: `curl -X POST https://creativestuff.vercel.app/api/upload-image \\
  -F "file=@/path/to/Nature_LOcom.jpg" \\
  -F "product_folder=christmas-1171" \\
  -F "preserve_filename=true"`
      }
    }
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
