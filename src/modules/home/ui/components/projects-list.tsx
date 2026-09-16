"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Loader2Icon, Trash2Icon } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useTRPC } from "@/trpc/client";
import { useUser } from "@clerk/nextjs";

export const ProjectsList = () => {
  const trpc = useTRPC();
  const user = useUser();
  const queryClient = useQueryClient();
  const [loadingProjectId, setLoadingProjectId] = useState<string | null>(null);
  const { data: projects } = useQuery(trpc.projects.getMany.queryOptions());
  const name = user.user?.firstName || user.user?.username;
  const deleteProject = useMutation(
    trpc.projects.delete.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.projects.getMany.queryOptions(),
        );
        setLoadingProjectId(null);
      },
      onError: (error) => {
        toast.error(error.message);
        setLoadingProjectId(null);
      },
    }),
  );

  const handleDelete = (projectId: string) => {
    setLoadingProjectId(projectId);
    deleteProject.mutate({ id: projectId });
  };

  return (
    <div className="w-full bg-white dark:bg-sidebar rounded-xl p-8 border flex flex-col gap-y-6 sm:gap-y-4">
      <h2 className="text-2xl font-semibold">
        {name ? `${name}'s` : "Saved"} Vibes
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {projects?.length === 0 && (
          <div className="col-span-full text-center">
            <p className="text-sm text-muted-foreground">No projects found</p>
          </div>
        )}
        {projects?.map((project) => (
          <div
            key={project.id}
            className="group relative min-w-0 rounded-md border bg-background shadow-xs transition-all hover:bg-accent hover:text-accent-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50"
          >
            <Link
              href={`/projects/${project.id}`}
              onClick={() => setLoadingProjectId(project.id)}
              className="flex min-h-20 items-center gap-x-4 p-4 pr-12 font-normal text-start"
            >
              <Image
                src="/logo.svg"
                alt="Vibe"
                width={32}
                height={32}
                className="object-contain"
              />
              <div className="flex min-w-0 flex-col">
                <h3 className="truncate font-medium">{project.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {formatDistanceToNow(project.updatedAt, {
                    addSuffix: true,
                  })}
                </p>
              </div>
            </Link>
            <button
              type="button"
              aria-label={`Delete ${project.name}`}
              disabled={loadingProjectId !== null}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                handleDelete(project.id);
              }}
              className="absolute right-3 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100 disabled:pointer-events-none"
            >
              {loadingProjectId === project.id ? (
                <Loader2Icon
                  className="size-4 animate-spin"
                  aria-label="Loading"
                />
              ) : (
                <Trash2Icon className="size-4" />
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
