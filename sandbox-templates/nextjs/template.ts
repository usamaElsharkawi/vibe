import { readFileSync } from 'fs';
import path from 'path';
import { Template, waitForURL } from 'e2b';

// Reuse the existing Dockerfile as-is. fromDockerfile() supports:
// FROM, RUN, COPY, ADD, WORKDIR, USER, ENV, ARG, CMD, ENTRYPOINT
const dockerfileContent = readFileSync(
  path.join(__dirname, 'e2b.Dockerfile'),
  'utf-8',
);

export const template = Template()
  .fromDockerfile(dockerfileContent)
  // Replaces compile_page.sh's manual curl-polling loop.
  // Runs once at the END of the build, waits for the dev server to
  // actually respond, then snapshots it — so every Sandbox.create()
  // from this template boots with Next.js already warm and compiled.
  .setStartCmd(
    'cd /home/user && npx next dev --turbopack',
    waitForURL('http://localhost:3000'),
  );
