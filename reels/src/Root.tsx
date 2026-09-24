import "./index.css";
import { Composition } from "remotion";
import { reels, reelDurationInFrames } from "./data/reels";
import { ReelComposition } from "./ReelComposition";

const FPS = 30;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {reels
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((reel) => (
          <Composition
            key={reel.id}
            id={reel.id}
            component={ReelComposition}
            durationInFrames={reelDurationInFrames(reel, FPS)}
            fps={FPS}
            width={1080}
            height={1920}
            defaultProps={{ reelId: reel.id }}
          />
        ))}
    </>
  );
};
