import { Sandbox } from "e2b";

export async function createE2BSandbox() {
  const templateId = process.env.E2B_TEMPLATE_ID;

  if (!templateId) {
    throw new Error("E2B_TEMPLATE_ID is not configured");
  }

  return Sandbox.create(templateId, {
    timeoutMs: 30 * 60 * 1000,
  });
}