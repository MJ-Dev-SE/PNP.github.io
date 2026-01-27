import "./PpoGridLoader.css";

type Props = {
  logos: string[];
};

export default function PpoGridLoader({ logos }: Props) {
  return (
    <div className="loader-wrapper">
      <div className="loader">
        {logos.slice(0, 7).map((logo, i) => (
          <div
            key={i}
            className="loader-square"
            style={{ backgroundImage: `url(${logo})` }}
          />
        ))}
      </div>

      <p className="loader-text">Loading inventory data…</p>
    </div>
  );
}
