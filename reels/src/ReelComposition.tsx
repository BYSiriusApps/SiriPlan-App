import { AbsoluteFill, Sequence, useVideoConfig } from "remotion";
import { getReelById } from "./data/reels";
import { Shot } from "./components/Shot";
import { Outro } from "./components/Outro";

type ReelCompositionProps = {
  reelId: string;
};

export const ReelComposition: React.FC<ReelCompositionProps> = ({ reelId }) => {
  const { fps } = useVideoConfig();
  const reel = getReelById(reelId);

  let startFrame = 0;

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {reel.shots.map((shot, index) => {
        const durationInFrames = Math.round(shot.durationSec * fps);
        const from = startFrame;
        startFrame += durationInFrames;

        return (
          <Sequence
            key={index}
            from={from}
            durationInFrames={durationInFrames}
            layout="none"
          >
            {shot.isOutro ? (
              <Outro cta={shot.caption} />
            ) : (
              <Shot
                reelId={reel.id}
                shot={shot}
                durationInFrames={durationInFrames}
              />
            )}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
