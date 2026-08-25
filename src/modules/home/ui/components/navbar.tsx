"use client";

import Link from "next/link";
import { UserButton, SignInButton, Show, SignUpButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import Image from "next/image";

const Navbar = () => {
  return (
    <nav className="p-4 bg-transparent fixed left-0 right-0 z-50 trasition-all duration-200 border-b border-transparent">
      <div className="flex max-w-5xl mx-auto w-full justify-between items-center">
        <Link href="/" className="flex items-center gap-2 group cursor-pointer">
          <Image
            src="/logo.svg"
            alt="Vibe"
            width={24}
            height={24}
            className="hidden md:block"
          />
          <span className="font-semibold text-lg">Vibe</span>
        </Link>
        <div className="ml-auto flex items-center gap-x-2">
                <Show when="signed-out">
                  <SignInButton mode="modal">
                    <Button variant="ghost" size="sm">Sign in</Button>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <Button variant="default" size="sm">Sign up</Button>
                  </SignUpButton>
                </Show>
                <Show when="signed-in">
                  <UserButton />
                </Show>
              </div>
      </div>
    </nav>
  );
};

export default Navbar;
