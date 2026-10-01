export default function Logo({ size = 34, withText = true }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
        <circle cx="26" cy="26" r="18" stroke="var(--accent-teal)" strokeWidth="5" />
        <line
          x1="39"
          y1="39"
          x2="54"
          y2="54"
          stroke="var(--accent-violet)"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <path
          d="M13 26 L19 26 L23 17 L29 35 L33 26 L39 26"
          fill="none"
          stroke="var(--bg)"
          strokeOpacity="0.85"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {withText && (
        <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.15rem" }}>
          MedLens <span style={{ color: "var(--accent-teal)" }}>AI</span>
        </span>
      )}
    </div>
  );
}
