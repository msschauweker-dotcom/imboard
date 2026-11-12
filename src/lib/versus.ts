// Contract between the Versus room and an embedded game.
export type VersusProps = {
  seed: string;
  settings: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  round: number;
  /** Called once with the RAW play data; the server verifies and scores it. */
  onDone: (payload: Record<string, unknown>) => void;
};
