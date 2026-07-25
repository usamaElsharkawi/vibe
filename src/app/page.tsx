import { Button } from "@/components/ui/button";
import { getQueryClient, trpc } from "@/trpc/server";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import Image from "next/image";
import { Suspense } from "react";
import Client from "./Client";

export default function Home() {
  const queryClient = getQueryClient()
  void queryClient.prefetchQuery(trpc.hello.queryOptions({text:"usama"}))
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<p>Loading...</p>}>
        <Client/>
      </Suspense>
    </HydrationBoundary>
  );
}
