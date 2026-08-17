"use client";

import { Button } from "@/components/ui/button";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export default function Home() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const trpc = useTRPC();

  const createProject = useMutation(
    trpc.project.create.mutationOptions({
      onSuccess: (data) => {
        toast.success("Build started!");
        setPrompt("");
        router.push(`/projects/${data.id}`);
      },
      onError: (error) => {
        toast.error(`Failed to start build: ${error.message}`);
      },
    }),
  );

  const handleSubmit = () => {
    const value = prompt.trim();
    if (!value) return;
    createProject.mutate({ value });
  };

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Vibe</h1>
        <p className="text-muted-foreground">
          Describe what you want to build. The coding agent will run in an E2B
          sandbox and save the result here when finished.
        </p>
      </div>

      <div className="flex gap-4 items-end">
        <div className="flex flex-col gap-2 flex-1">
          <label htmlFor="prompt-input" className="text-sm font-medium">
            Prompt
          </label>
          <input
            id="prompt-input"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit();
            }}
            className="border border-input rounded-md px-3 py-2 text-sm"
            placeholder="Build a todo app with drag and drop..."
          />
        </div>
        <Button
          onClick={handleSubmit}
          disabled={createProject.isPending || !prompt.trim()}
        >
          {createProject.isPending ? "Building..." : "Build"}
        </Button>
      </div>
    </div>
  );
}
