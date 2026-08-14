export interface SandboxFile {
  path: string;
  content: string;
}

export interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface SandboxService {
  readonly sandboxId: string;

  readFile(path: string): Promise<string>;

  writeFile(path: string, content: string): Promise<void>;

  writeFiles(files: SandboxFile[]): Promise<void>;

  runCommand(command: string): Promise<CommandResult>;

  getPreviewUrl(port: number): string;

  kill(): Promise<void>;
}