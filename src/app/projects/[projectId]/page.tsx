import { ProjectView } from "@/modules/projects/ui/views/project-view";
import { getQueryClient, trpc } from "@/trpc/server";
import { auth } from "@clerk/nextjs/server";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { TRPCError } from "@trpc/server";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{
    projectId: string;
  }>;
}

const Page = async ({ params }: Props) => {
  await auth.protect();
  const { projectId } = await params;

  const queryClient = getQueryClient();

  try {
    await queryClient.query(
      trpc.projects.getOne.queryOptions({
        id: projectId,
      }),
    );
  } catch (error) {
    if (
      (error instanceof TRPCError && error.code === "NOT_FOUND") ||
      (error instanceof Error && (error as any).code === "NOT_FOUND")
    ) {
      notFound();
    }
    throw error;
  }

  await queryClient.query(
    trpc.messages.getMany.queryOptions({
      projectId,
    }),
  );

  await queryClient.query(trpc.usage.status.queryOptions());

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProjectView projectId={projectId} />
    </HydrationBoundary>
  );
};

export default Page;
