import { ImageResponse } from "next/og";
import { ZetIconSvg } from "@/app/components/zet-icon";

// Next.js' egen navnekonvention: genkendes automatisk og sættes ind som
// <link rel="apple-touch-icon">, bruges når siden føjes til hjemmeskærmen
// på iPhone/iPad. 180×180 er Apples anbefalede størrelse.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(<ZetIconSvg size={180} />, { ...size });
}
