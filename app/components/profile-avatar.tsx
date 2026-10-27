"use client";
import Image from "next/image";
import { useState } from "react";

export function ProfileAvatar({ userId, image, name, size = 44 }: { userId: string; image: string | null; name: string; size?: number }) {
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const src = image ? `/api/profile-image/${userId}?v=${encodeURIComponent(image.split("/").pop() ?? "")}` : null;
  return <span className="inline-grid shrink-0 place-items-center overflow-hidden rounded-[inherit]" style={{ width: size, height: size }} aria-hidden="true">
    {src && failedImage !== image ? <Image unoptimized src={src} alt="" width={size} height={size} className="h-full w-full object-cover" onError={() => setFailedImage(image)} />
      : name.trim().slice(0, 1).toLocaleUpperCase("da-DK")}
  </span>;
}
