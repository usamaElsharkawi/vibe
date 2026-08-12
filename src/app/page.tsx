"use client"
import { Button } from "@/components/ui/button";
import { useTRPC } from "@/trpc/client";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const trpc = useTRPC();
  const invoke = useMutation(trpc.project.build.mutationOptions({
    onSuccess: () => {
      toast.success("Sandbox job triggered! Check Inngest logs for the preview URL.");
    },
    onError: (error) => {
      toast.error(`Failed to trigger sandbox: ${error.message}`);
    },
  }));

  return (
    <div className="p-4 max-w-7xl">
      <h1 className="text-2xl font-bold mb-4">Vibe — Infrastructure Milestone</h1>
      <p className="text-muted-foreground mb-6">
        Click the button below to start an E2B sandbox with a Next.js app running inside it.
        The preview URL will appear in the Inngest logs.
      </p>
      <div className="flex gap-4 items-end">
        <div className="flex flex-col gap-2">
          <label htmlFor="value-input" className="text-sm font-medium">Value (passed to the job)</label>
          <input
            id="value-input"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="border border-input rounded-md px-3 py-2 text-sm"
            placeholder="Optional value..."
          />
        </div>
        <Button
          onClick={() => invoke.mutate({ projectId: crypto.randomUUID(), prompt })}
          disabled={invoke.isPending}
        >
          {invoke.isPending ? "Starting Sandbox..." : "Start Sandbox"}
        </Button>
      </div>
      {invoke.isSuccess && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-800">
          ✅ Sandbox job has been triggered successfully. Check the Inngest logs.
        </div>
      )}
      {invoke.isError && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-800">
          ❌ Failed to trigger sandbox: {invoke.error.message}
        </div>
      )}
    </div>
  );
}
