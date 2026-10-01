export default function PulseDivider({ animate = true }) {
  return (
    <svg
      className={`pulse-divider ${animate ? "pulse-animate" : ""}`}
      viewBox="0 0 400 28"
      preserveAspectRatio="none"
    >
      <path d="M0 14 L140 14 L155 2 L170 26 L185 14 L400 14" />
    </svg>
  );
}
