"use client";

import { Button } from "@/components/ui/button";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export default function Home() {
 const router = useRouter()
  const [prompt, setPrompt] = useState("");
  const trpc = useTRPC();

  const messagesQuery = useQuery({
    ...trpc.messages.getMany.queryOptions(),
    refetchInterval: (query) => {
      const messages = query.state.data;
      if (!messages?.length) return 3000;

      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === "USER") return 3000;

      return false;
    },
  });

  const createProject = useMutation(
    trpc.project.create.mutationOptions({
      onSuccess: (data) => {
        toast.success("Build started!");
        setPrompt("");
        void messagesQuery.refetch();
        router.push(`/projects/${data.id}`)
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

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Messages</h2>

        {messagesQuery.isLoading && (
          <p className="text-sm text-muted-foreground">Loading messages...</p>
        )}

        {messagesQuery.isError && (
          <p className="text-sm text-red-600">
            Failed to load messages: {messagesQuery.error.message}
          </p>
        )}

        {messagesQuery.data?.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No messages yet. Submit a prompt to get started.
          </p>
        )}

        <ul className="space-y-3">
          {messagesQuery.data?.map((message) => (
            <li
              key={message.id}
              className={`rounded-lg border p-4 ${
                message.role === "USER"
                  ? "bg-muted/30"
                  : message.type === "ERROR"
                    ? "border-red-200 bg-red-50"
                    : "bg-background"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {message.role}
                  {message.type === "ERROR" ? " · Error" : ""}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(message.createdAt).toLocaleString()}
                </span>
              </div>

              <p className="text-sm whitespace-pre-wrap">{message.content}</p>

              {message.fragment && (
                <div className="mt-3 pt-3 border-t space-y-2">
                  <p className="text-sm font-medium">Preview</p>
                  <a
                    href={message.fragment.sanboxUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline break-all"
                  >
                    {message.fragment.sanboxUrl}
                  </a>
                  <p className="text-xs text-muted-foreground">
                    {Object.keys(message.fragment.files as object).length} file
                    {Object.keys(message.fragment.files as object).length === 1
                      ? ""
                      : "s"}{" "}
                    generated
                  </p>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
