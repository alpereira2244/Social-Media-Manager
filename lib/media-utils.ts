import type { CampaignMediaContext } from "@/lib/types";

export function mediaTypeFromFile(file: File): CampaignMediaContext["type"] | undefined {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return undefined;
}

export function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function inferMediaKindFromUrl(url: string): CampaignMediaContext["type"] | undefined {
  const lower = url.toLowerCase().split("?")[0] ?? "";
  if (/\.(png|jpe?g|webp)$/.test(lower)) return "image";
  if (/\.(mp4|mov|webm)$/.test(lower)) return "video";
  if (/\.(mp3|wav|m4a)$/.test(lower)) return "audio";
  return undefined;
}
