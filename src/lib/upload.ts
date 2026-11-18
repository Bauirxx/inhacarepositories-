"use client";

import { createClient } from "@/lib/supabase/client";

export type UploadBucket =
  | "avatars"
  | "post-media"
  | "business-media"
  | "product-media"
  | "event-media"
  | "chat-media"
  | "documents";

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const MAX_VIDEO_BYTES = 25 * 1024 * 1024;

export class UploadError extends Error {}

function randomName(ext: string): string {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36);
  return `${id}.${ext}`;
}

/**
 * Redimensiona e comprime uma imagem no browser antes do upload.
 * Reduz drasticamente o consumo de dados em redes móveis.
 */
export async function compressImage(
  file: File,
  options: { maxSize?: number; quality?: number } = {},
): Promise<{ blob: Blob; width: number; height: number; ext: string; type: string }> {
  const maxSize = options.maxSize ?? 1600;
  const quality = options.quality ?? 0.82;

  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) {
    return { blob: file, width: 0, height: 0, ext: file.name.split(".").pop() || "jpg", type: file.type };
  }
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return { blob: file, width: bitmap.width, height: bitmap.height, ext: "jpg", type: file.type };
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  const hasAlpha = file.type === "image/png";
  const type = hasAlpha ? "image/png" : "image/webp";
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, type, hasAlpha ? undefined : quality),
  );
  if (!blob) return { blob: file, width, height, ext: "jpg", type: file.type };
  // Se a compressão não ajudou, mantemos o original.
  if (blob.size >= file.size && file.size <= MAX_IMAGE_BYTES) {
    return { blob: file, width, height, ext: file.name.split(".").pop() || "jpg", type: file.type };
  }
  return { blob, width, height, ext: hasAlpha ? "png" : "webp", type };
}

export interface UploadResult {
  url: string;
  path: string;
  type: "image" | "video";
  width?: number;
  height?: number;
}

/**
 * Faz upload de um ficheiro para o Supabase Storage.
 * @param folder pasta de topo (user id para buckets públicos, conversation id para chat-media)
 */
export async function uploadFile(
  file: File,
  bucket: UploadBucket,
  folder: string,
  options: { allowVideo?: boolean; maxSize?: number } = {},
): Promise<UploadResult> {
  const isImage = IMAGE_TYPES.includes(file.type);
  const isVideo = VIDEO_TYPES.includes(file.type);
  const isPdf = file.type === "application/pdf";

  if (!isImage && !(options.allowVideo && isVideo) && !(bucket === "documents" && isPdf)) {
    throw new UploadError("Tipo de ficheiro não suportado. Use JPG, PNG ou WEBP.");
  }
  if (isVideo && file.size > MAX_VIDEO_BYTES) {
    throw new UploadError("O vídeo excede o tamanho máximo de 25 MB.");
  }
  if (!isImage && file.size > MAX_IMAGE_BYTES) {
    throw new UploadError("O ficheiro excede o tamanho máximo de 6 MB.");
  }

  const supabase = createClient();
  let body: Blob = file;
  let ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  let contentType = file.type;
  let width: number | undefined;
  let height: number | undefined;

  if (isImage) {
    const compressed = await compressImage(file, { maxSize: options.maxSize });
    body = compressed.blob;
    ext = compressed.ext;
    contentType = compressed.type;
    width = compressed.width || undefined;
    height = compressed.height || undefined;
    if (body.size > MAX_IMAGE_BYTES) {
      throw new UploadError("A imagem é demasiado grande mesmo após compressão.");
    }
  }

  const path = `${folder}/${randomName(ext)}`;
  const { error } = await supabase.storage.from(bucket).upload(path, body, {
    contentType,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) {
    throw new UploadError(
      error.message.includes("row-level security") || error.message.includes("not allowed")
        ? "Sem permissão para enviar este ficheiro."
        : `Falha no envio: ${error.message}`,
    );
  }

  const url =
    bucket === "chat-media" || bucket === "documents"
      ? path
      : supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;

  return { url, path, type: isVideo ? "video" : "image", width, height };
}

/** Obtém um URL assinado temporário para ficheiros em buckets privados. */
export async function getSignedUrl(bucket: UploadBucket, path: string, expiresIn = 3600): Promise<string | null> {
  const supabase = createClient();
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
  return data?.signedUrl ?? null;
}
