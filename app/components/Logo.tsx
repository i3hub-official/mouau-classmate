// app/components/Logo.tsx
"use client"; // This makes it a Client Component

import Image from "next/image";
import Link from "next/link";

export default function Logo() {
  return (
    <Link
      href="/"
      className="flex items-center gap-3 hover:opacity-80 transition-opacity"
    >
      <div className="p-2 border-2 border-primary/20 rounded-xl bg-primary/5">
        <Image
          src="/mouau_logo.webp"
          alt="MOUAU Logo"
          width={28}
          height={28}
          className="h-7 w-7 object-contain"
          onError={(e) => {
            e.currentTarget.src =
              "https://placehold.co/40x40/10b981/ffffff?text=M";
          }}
        />
      </div>
      <div>
        <h1 className="text-xl font-bold text-foreground">MOUAU ClassMate</h1>
        <p className="text-xs text-muted-foreground">Security Center</p>
      </div>
    </Link>
  );
}
