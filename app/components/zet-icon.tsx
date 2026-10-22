// Delt SVG-indhold til app-ikonerne (icon-192, icon-512, apple-icon), så
// formen kun er defineret ét sted. Baseret på Joes design (en håndvægt, der
// danner et "Z"), men farverne er ændret til appens egen indigo-palette
// (tre nuancer: mørk baggrund, hovedfarve og en mørkere accent til de små
// vægtskiver) i stedet for det oprindelige sort/lime, så ikonet matcher
// resten af ZET.
export function ZetIconSvg({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
      <rect width="1024" height="1024" fill="#1e1b4b" />
      <g transform="translate(512 512) scale(0.88) translate(-512 -512)">
        {/* Diagonal forbindelse */}
        <polygon points="588.5,340 728.5,340 435.5,684 295.5,684" fill="#6366f1" />
        {/* Øverste stang med vægtskiver i højre side */}
        <rect x="232" y="270" width="488" height="80" fill="#6366f1" />
        <rect x="720" y="200" width="65" height="220" rx="12" fill="#818cf8" />
        <rect x="797" y="230" width="50" height="160" rx="12" fill="#3730a3" />
        {/* Nederste stang med vægtskiver i venstre side */}
        <rect x="304" y="674" width="488" height="80" fill="#6366f1" />
        <rect x="239" y="604" width="65" height="220" rx="12" fill="#818cf8" />
        <rect x="177" y="634" width="50" height="160" rx="12" fill="#3730a3" />
      </g>
    </svg>
  );
}
