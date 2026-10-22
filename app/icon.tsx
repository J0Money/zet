import { ImageResponse } from "next/og";
import { ZetIconSvg } from "@/app/components/zet-icon";

// Next.js' egen navnekonvention: genkendes automatisk som favicon (fanen i
// browseren), erstatter den gamle app/favicon.ico. Samme håndvægt-Z som de
// øvrige app-ikoner, bare i en lille størrelse, der passer til en fane.
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(<ZetIconSvg size={32} />, { ...size });
}
