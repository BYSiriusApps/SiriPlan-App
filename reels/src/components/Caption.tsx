import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { fontFamily } from "../fonts";

type CaptionProps = {
  text: string;
  isHook?: boolean;
  /** Sahnenin toplam kare sayısı — çıkış animasyonunu zamanlamak için. */
  shotDurationInFrames: number;
};

export const Caption: React.FC<CaptionProps> = ({
  text,
  isHook,
  shotDurationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({
    frame,
    fps,
    config: { damping: 200, mass: 0.5, stiffness: 180 },
    durationInFrames: 14,
  });

  const exitStart = shotDurationInFrames - 8;
  const exit = interpolate(frame, [exitStart, shotDurationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const opacity = Math.min(entrance, exit);
  const translateY = interpolate(entrance, [0, 1], [40, 0]);

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: isHook ? undefined : 220,
        top: isHook ? 260 : undefined,
        display: "flex",
        justifyContent: "center",
        padding: "0 64px",
        opacity,
        transform: `translateY(${translateY}px) scale(${0.9 + entrance * 0.1})`,
      }}
    >
      <div
        style={{
          background: "rgba(15, 8, 12, 0.72)",
          borderRadius: 28,
          padding: "28px 40px",
          maxWidth: "100%",
        }}
      >
        <p
          style={{
            margin: 0,
            color: "#FFF7F5",
            fontFamily,
            fontWeight: 800,
            fontSize: isHook ? 72 : 58,
            lineHeight: 1.15,
            textAlign: "center",
            letterSpacing: -0.5,
            textWrap: "balance" as never,
          }}
        >
          {text}
        </p>
      </div>
    </div>
  );
};
