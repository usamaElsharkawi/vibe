"use client"
import { Button } from "@/components/ui/button";
import { useTRPC } from "@/trpc/client";
import { useMutation } from "@tanstack/react-query";

export default function Home() {
  const trpc = useTRPC()
  const invoke = useMutation(trpc.generateApp.mutationOptions())
  return (
   <div className="p-4 max-w-7xl">
    <Button onClick={()=>{invoke.mutate({prompt:"myNameIsUsama"})}}>Invoke a background job</Button>
   </div>
  );
}
