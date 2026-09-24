import { useState } from "react";
import { AbsoluteFill, OffthreadVideo, staticFile } from "remotion";
import { Caption } from "./Caption";
import { fontFamily } from "../fonts";
import type { ReelShot } from "../data/reels";

type ShotProps = {
  reelId: string;
  shot: ReelShot;
  durationInFrames: number;
};

const PLACEHOLDER_GRADIENTS = [
  "linear-gradient(160deg, oklch(0.28 0.06 290) 0%, oklch(0.52 0.16 345) 100%)",
  "linear-gradient(160deg, oklch(0.52 0.16 345) 0%, oklch(0.72 0.10 65) 100%)",
];

export const Shot: React.FC<ShotProps> = ({ reelId, shot, durationInFrames }) => {
  const [videoMissing, setVideoMissing] = useState(!shot.media);
  const gradient =
    PLACEHOLDER_GRADIENTS[reelId.length % PLACEHOLDER_GRADIENTS.length];

  return (
    <AbsoluteFill style={{ backgroundColor: "#1a0f14" }}>
      {shot.media && !videoMissing ? (
        <OffthreadVideo
          src={staticFile(`videos/${reelId}/${shot.media}`)}
          muted={false}
          onError={() => setVideoMissing(true)}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        <AbsoluteFill
          style={{
            background: gradient,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 80,
            textAlign: "center",
          }}
        >
          <span style={{ fontSize: 64, marginBottom: 24 }}>🎬</span>
          <p
            style={{
              color: "rgba(255,255,255,0.55)",
              fontFamily,
              fontSize: 30,
              fontWeight: 600,
              lineHeight: 1.4,
            }}
          >
            Çekilecek görüntü:
            <br />
            {shot.visual}
          </p>
          {shot.media ? (
            <p
              style={{
                marginTop: 16,
                color: "rgba(255,255,255,0.35)",
                fontFamily: "monospace",
                fontSize: 20,
              }}
            >
              public/videos/{reelId}/{shot.media}
            </p>
          ) : null}
        </AbsoluteFill>
      )}
      {shot.caption ? (
        <Caption
          text={shot.caption}
          isHook={shot.isHook}
          shotDurationInFrames={durationInFrames}
        />
      ) : null}
    </AbsoluteFill>
  );
};
