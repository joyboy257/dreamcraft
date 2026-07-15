import type { ReactNode } from "react";

export type DreamIntensity = "calm" | "vivid" | "fever";

export type MaterializationStep =
  | "requesting"
  | "validating"
  | "compiling"
  | "generating-spawn"
  | "staging"
  | "entering";

export interface DreamSample {
  id: string;
  label: string;
  text: string;
}

export interface ObjectiveView {
  title: string;
  detail?: string;
  progress?: string;
}

export interface DialogueChoiceView {
  id: string;
  label: string;
}

export interface DialogueView {
  speaker: string;
  text: string;
  choices: readonly DialogueChoiceView[];
  canClose?: boolean;
}

export interface EndingView {
  title: string;
  narration: string;
  detail?: string;
}

export interface ComfortSettings {
  muted: boolean;
  reducedMotion: boolean;
  cameraShake: boolean;
  cameraRoll: boolean;
  highContrast: boolean;
  fov: number;
  mouseSensitivity: number;
}

export interface CanvasEntryProps {
  isReady: boolean;
  isEntered: boolean;
  onEnter: () => void;
  children?: ReactNode;
}
