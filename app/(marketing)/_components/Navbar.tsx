"use client";
import React from "react";
import { useScrollTop } from "@/hooks/use_scroll_top";
import { cn } from "@/lib/utils";
import Logo from "./Logo";
import { ModeToggle } from "@/components/mode-toggle";
import { useConvexAuth } from "convex/react";
import { SignInButton, UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/Spinner";
import Link from "next/link";
const Navbar = () => {
  const scrolled = useScrollTop();
  const { isAuthenticated, isLoading } = useConvexAuth();
  return (
    <div
      className={cn(
        "z-50 dark:bg-[#1f1f1f] bg-background fixed top-0 flex items-center w-full p-6",
        scrolled && "border-b shadow-sm"
      )}
    >
      <Logo />
      <div className="md:ml-auto md:justify-end justify-between w-full flex items-center gap-x-2">
        {isLoading && <Spinner />}
        {!isAuthenticated && !isLoading && (
          <>
            <SignInButton mode="modal">
              <Button variant={"ghost"} size={"sm"}>
                Login
              </Button>
            </SignInButton>
            <SignInButton mode="modal">
              <Button size={"sm"}>Get Motion Free!</Button>
            </SignInButton>
          </>
        )}
        {isAuthenticated && !isLoading && (
          <>
            <UserButton afterSignOutUrl="/" />
            <Button size={"sm"}>
              <Link href="/documents">Enter Motion</Link>
            </Button>
          </>
        )}
        <ModeToggle />
      </div>
    </div>
  );
};

export default Navbar;
