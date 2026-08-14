export class SandboxError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);

    this.name = "SandboxError";
  }
}

export class SandboxPathError extends SandboxError {
  constructor(path: string) {
    super(`Invalid sandbox path: ${path}`);

    this.name = "SandboxPathError";
  }
}

export class SandboxCommandError extends SandboxError {
  constructor(
    command: string,
    exitCode: number,
    stderr: string,
  ) {
    super(
      `Command failed with exit code ${exitCode}: ${command}\n${stderr}`,
    );

    this.name = "SandboxCommandError";
  }
}