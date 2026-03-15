"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PenLine, Settings, FolderOpen, Film } from "lucide-react";

export default function Header() {
  const pathname = usePathname();

  const linkClass = (path: string) =>
    `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
      pathname === path
        ? "bg-zinc-800 text-white"
        : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
    }`;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm">
      <div className="flex h-full items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 text-white font-semibold">
          <PenLine className="w-5 h-5 text-indigo-400" />
          <span>Script Factory</span>
        </Link>
        <nav className="flex items-center gap-1">
          <Link href="/" className={linkClass("/")}>홈</Link>
          <Link href="/tag-sources" className={linkClass("/tag-sources")}>
            <span className="flex items-center gap-1.5">
              <Film className="w-3.5 h-3.5" />
              소스 태깅
            </span>
          </Link>
          <Link href="/projects" className={linkClass("/projects")}>
            <span className="flex items-center gap-1.5">
              <FolderOpen className="w-3.5 h-3.5" />
              내 프로젝트
            </span>
          </Link>
          <Link href="/workspace" className={linkClass("/workspace")}>작업공간</Link>
          <Link href="/settings" className={linkClass("/settings")}>
            <Settings className="w-4 h-4" />
          </Link>
        </nav>
      </div>
    </header>
  );
}
