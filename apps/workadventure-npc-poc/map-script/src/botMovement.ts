export interface Position {
  x: number;
  y: number;
}

export type PendingCommand = { destinationArea: string } | { position: Position };

export interface BotMovementDeps {
  pollForCommand: () => Promise<PendingCommand | null>;
  getAreaCenter: (areaName: string) => Promise<Position | null>;
  moveTo: (x: number, y: number) => Promise<void>;
  onError?: (error: unknown) => void;
}

export async function checkForCommandAndMove(deps: BotMovementDeps): Promise<void> {
  try {
    const command = await deps.pollForCommand();
    if (!command) {
      return;
    }

    if ("position" in command) {
      await deps.moveTo(command.position.x, command.position.y);
      return;
    }

    const center = await deps.getAreaCenter(command.destinationArea);
    if (!center) {
      return;
    }

    await deps.moveTo(center.x, center.y);
  } catch (error) {
    deps.onError?.(error);
  }
}
