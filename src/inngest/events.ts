export const BUILD_PROJECT_EVENT =
  "vibe/project.build.requested" as const;

export interface BuildProjectEvent {
  name: typeof BUILD_PROJECT_EVENT;

  data: {
    prompt: string;
  };
}
