// app/components/SignOutModal.tsx
"use client";
import { LogOut } from "lucide-react";
import { useState } from "react";
import { useEffect } from "react";

interface SignOutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSignOut: () => Promise<void>;
}

export function SignOutModal({
  isOpen,
  onClose,
  onSignOut,
}: SignOutModalProps) {
  const [signingOut, setSigningOut] = useState(false);

  // Optional enhancement: Add escape key support
useEffect(() => {
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && !signingOut) {
      onClose();
    }
  };

  if (isOpen) {
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }
}, [isOpen, signingOut, onClose]);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await onSignOut();
    } catch (error) {
      setSigningOut(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => !signingOut && onClose()}
      />

      {/* Modal */}
      <div className="relative bg-card border border-border rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <LogOut className="h-6 w-6 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Sign Out
          </h3>
          <p className="text-sm text-muted-foreground mb-6">
            Are you sure you want to sign out? You'll need to sign in again to
            access your account.
          </p>
          <div className="flex justify-center gap-4">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors font-medium"
              disabled={signingOut}
            >
              Cancel
            </button>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 text-sm bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors font-medium"
              disabled={signingOut}
            >
              {signingOut ? "Signing out..." : "Sign Out"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
