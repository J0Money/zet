import { ImageResponse } from "next/og";
import { ZetIconSvg } from "@/app/components/zet-icon";

export async function GET() {
  return new ImageResponse(<ZetIconSvg size={512} />, { width: 512, height: 512 });
}
