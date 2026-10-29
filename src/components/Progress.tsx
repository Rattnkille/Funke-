import { stageOf } from "@/lib/labels";
import { Flame } from "./Icons";

export function Progress({ done, total, percent }: { done: number; total: number; percent: number }) {
  const stage = stageOf(percent, total);
  const segs = Math.max(total, 1);
  return (
    <div className="progress">
      <div className="progress__top">
        <span className="progress__stage">
          <Flame percent={percent} />
          {stage.label}
        </span>
        <span className="muted small">
          {done} von {total} Missionen erledigt ({percent} %)
        </span>
      </div>
      <div
        className="progress__track"
        role="progressbar"
        aria-label="Projektfortschritt"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={`${done} von ${total} Missionen erledigt, ${stage.label}`}
      >
        {Array.from({ length: segs }, (_, i) => (
          <span key={i} className={`progress__seg${i < done ? " progress__seg--done" : ""}`} />
        ))}
      </div>
    </div>
  );
}
