import { Sandbox } from "e2b";

import { createE2BSandbox } from "./client";
import { SandboxCommandError, SandboxPathError } from "./errors";
import type {
  CommandResult,
  SandboxFile,
  SandboxService as ISandboxService,
} from "./types";

const WORKSPACE_ROOT = "/home/user";

function normalizePath(path: string): string {
  if (!path.trim()) {
    throw new SandboxPathError(path);
  }

  const normalized = path.startsWith("/")
    ? path
    : `${WORKSPACE_ROOT}/${path}`;

  const absolute = new URL(normalized, "file:///").pathname;

  if (
    !absolute.startsWith(`${WORKSPACE_ROOT}/`) &&
    absolute !== WORKSPACE_ROOT
  ) {
    throw new SandboxPathError(path);
  }

  return absolute;
}

export class E2BSandboxService implements ISandboxService {
  constructor(private readonly sandbox: Sandbox) {}

  get sandboxId() {
    return this.sandbox.sandboxId;
  }

  async readFile(path: string): Promise<string> {
    const safePath = normalizePath(path);

    return this.sandbox.files.read(safePath);
  }

  async writeFile(path: string, content: string): Promise<void> {
    const safePath = normalizePath(path);

    await this.sandbox.files.write(safePath, content);
  }

  async writeFiles(files: SandboxFile[]): Promise<void> {
    await this.sandbox.files.write(
      files.map((file) => ({
        path: normalizePath(file.path),
        data: file.content,
      })),
    );
  }

  async runCommand(command: string): Promise<CommandResult> {
    if (!command.trim()) {
      throw new Error("Command cannot be empty");
    }

    const result = await this.sandbox.commands.run(command);

    const exitCode = result.exitCode ?? 0;

    if (exitCode !== 0) {
      throw new SandboxCommandError(
        command,
        exitCode,
        result.stderr ?? "",
      );
    }

    return {
      stdout: result.stdout ?? "",
      stderr: result.stderr ?? "",
      exitCode,
    };
  }

  getPreviewUrl(port: number): string {
    return `https://${this.sandbox.getHost(port)}`;
  }

  async kill(): Promise<void> {
    await this.sandbox.kill();
  }
}

export async function createSandboxService() {
  const sandbox = await createE2BSandbox();

  return new E2BSandboxService(sandbox);
}


