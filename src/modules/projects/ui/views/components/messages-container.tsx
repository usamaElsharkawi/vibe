"use client";
import { useEffect, useRef } from "react";
import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { MessageCard } from "./message-card";
import { MessageForm } from "./message-form";
import { Fragment } from "@/generated/prisma/client";
import { MessageLoading } from "./message-loading";

interface Props {
  projectId: string;
  activeFragment: Fragment | null;
  setActiveFragment: (fragment: Fragment | null) => void;
}

export const MessageContainer = ({
  projectId,
  activeFragment,
  setActiveFragment,
}: Props) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastAssistantMessageIdRef = useRef<string | null>(null);
  const trpc = useTRPC();
  const { data: messages } = useSuspenseQuery(
    trpc.messages.getMany.queryOptions(
      {
        projectId,
      },
      {
        refetchInterval: 5000,
      },
    ),
  );

  const lastMessage = messages[messages.length - 1];
  const isUserMessage = lastMessage.role === "USER";

  //TODO: This causing problems

  useEffect(() => {
    const lastAssistantMessageWithFragment = messages.findLast(
      (message) => message.role === "ASSISTANT" && message.fragment,
    );

    if (
      lastAssistantMessageWithFragment &&
      lastAssistantMessageWithFragment.id !== lastAssistantMessageIdRef.current
    ) {
      setActiveFragment(lastAssistantMessageWithFragment.fragment);
      lastAssistantMessageIdRef.current = lastAssistantMessageWithFragment.id;
    }
  }, [activeFragment, messages, setActiveFragment]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView();
  }, []);
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 min-h-0 overflow-auto">
        <div className="pt-2 pr-1">
          {messages.map((message) => (
            <MessageCard
              key={message.id}
              content={message.content}
              role={message.role}
              fragment={message.fragment}
              createdAt={message.createdAt}
              isActiveFragment={message.fragment?.id === activeFragment?.id}
              onFragmentClick={setActiveFragment}
              type={message.type}
            />
          ))}
          {isUserMessage && <MessageLoading />}
          <div ref={bottomRef} />
        </div>
      </div>
      <div className="relative p-3 pt-1">
        <div className="absolute -top-6 left-6 right-0 h-6 bg-linear-to-b from-transparent to-background/70 pointer-events-none" />
        <MessageForm projectId={projectId} />
      </div>
    </div>
  );
};
