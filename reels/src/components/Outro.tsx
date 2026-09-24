import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { fontFamily } from "../fonts";

type OutroProps = {
  cta: string;
};

export const Outro: React.FC<OutroProps> = ({ cta }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({
    frame,
    fps,
    config: { damping: 200, mass: 0.6, stiffness: 160 },
    durationInFrames: 18,
  });

  const ctaOpacity = interpolate(frame, [10, 22], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background:
          "linear-gradient(160deg, oklch(0.28 0.06 290) 0%, oklch(0.52 0.16 345) 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 48,
      }}
    >
      <Img
        src={staticFile("brand/logo-full.png")}
        style={{
          width: 420,
          opacity: logoScale,
          transform: `scale(${0.7 + logoScale * 0.3})`,
        }}
      />
      <p
        style={{
          opacity: ctaOpacity,
          margin: 0,
          color: "#FFF7F5",
          fontFamily,
          fontWeight: 800,
          fontSize: 52,
          textAlign: "center",
          padding: "0 48px",
        }}
      >
        {cta}
      </p>
    </AbsoluteFill>
  );
};
