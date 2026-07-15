import { useId, type FormEvent, type KeyboardEvent } from "react";
import { MAX_DREAM_LENGTH, SAMPLE_DREAMS } from "../app/localPreview";
import type { DreamIntensity, DreamSample } from "./types";

const DEFAULT_SAMPLES: readonly DreamSample[] = SAMPLE_DREAMS.map(
  (text, index) => ({
    id: `sample-${index + 1}`,
    label: ["Tiny wonder", "Lost messages", "Golden celebration"][index] ??
      `Dream ${index + 1}`,
    text,
  }),
);

interface DreamInputFormProps {
  value: string;
  intensity: DreamIntensity;
  isBusy?: boolean;
  issue?: string | null;
  samples?: readonly DreamSample[];
  onValueChange: (value: string) => void;
  onIntensityChange: (intensity: DreamIntensity) => void;
  onSubmit: () => void;
}

const INTENSITIES: readonly { value: DreamIntensity; label: string; note: string }[] = [
  { value: "calm", label: "Calm", note: "Gentle motion" },
  { value: "vivid", label: "Vivid", note: "Balanced" },
  { value: "fever", label: "Fever", note: "Stranger rules" },
];

export function DreamInputForm({
  value,
  intensity,
  isBusy = false,
  issue = null,
  samples = DEFAULT_SAMPLES,
  onValueChange,
  onIntensityChange,
  onSubmit,
}: DreamInputFormProps): React.JSX.Element {
  const descriptionId = useId();
  const issueId = useId();

  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (!isBusy) onSubmit();
  };

  const handleTextareaKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  };

  return (
    <form className="dc-dream-form" onSubmit={submit} aria-busy={isBusy}>
      <div className="dc-form-heading">
        <label htmlFor="dream-description">What do you remember?</label>
        <span>{value.length}/{MAX_DREAM_LENGTH}</span>
      </div>
      <p id={descriptionId} className="dc-field-note">
        Include a place, a strange rule, and someone or something you met.
        Press Ctrl or Command + Enter when ready.
      </p>
      <textarea
        id="dream-description"
        name="dream"
        rows={6}
        required
        minLength={12}
        maxLength={MAX_DREAM_LENGTH}
        value={value}
        disabled={isBusy}
        aria-describedby={`${descriptionId}${issue ? ` ${issueId}` : ""}`}
        aria-invalid={Boolean(issue)}
        onChange={(event) => onValueChange(event.target.value)}
        onKeyDown={handleTextareaKeyDown}
        placeholder="I was walking through…"
      />
      {issue ? (
        <p id={issueId} className="dc-form-issue" role="alert">
          {issue}
        </p>
      ) : null}

      <fieldset className="dc-intensity">
        <legend>Dream intensity</legend>
        <div className="dc-segmented-control">
          {INTENSITIES.map((option) => (
            <label key={option.value}>
              <input
                type="radio"
                name="intensity"
                value={option.value}
                checked={intensity === option.value}
                disabled={isBusy}
                onChange={() => onIntensityChange(option.value)}
              />
              <span>
                <strong>{option.label}</strong>
                <small>{option.note}</small>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <button className="dc-primary-action" type="submit" disabled={isBusy}>
        {isBusy ? "Remembering your dream…" : "Enter Dream"}
        <span aria-hidden="true">→</span>
      </button>
      <p className="dc-privacy-note">
        No account is required. Your description is used only to create this dream.
      </p>

      <div className="dc-samples" aria-labelledby="dream-samples-title">
        <p id="dream-samples-title">Or begin with a sample</p>
        <div>
          {samples.map((sample) => (
            <button
              key={sample.id}
              type="button"
              disabled={isBusy}
              onClick={() => onValueChange(sample.text)}
            >
              <strong>{sample.label}</strong>
              <span>{sample.text}</span>
            </button>
          ))}
        </div>
      </div>
    </form>
  );
}
