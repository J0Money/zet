export const plateTypes = {
  Bronze: { className: "bronze", stamp: "BRONZE" },
  Sølv: { className: "silver", stamp: "SILVER" },
  Guld: { className: "gold", stamp: "GOLD" },
  Diamant: { className: "diamond", stamp: "DIAMOND" },
};

export function WeightPlate({ name }: { name?: keyof typeof plateTypes }) {
  return <span className="disc" aria-hidden="true" data-empty={!name}>
    <span className="brand">ZET</span><span className="grip left" /><span className="grip right" />
    <span className="hub" /><span className="stamp">{name ? plateTypes[name].stamp : "ZET"}</span>
  </span>;
}
