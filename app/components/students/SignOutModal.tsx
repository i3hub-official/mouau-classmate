// app/components/SignOutModal.tsx
"use client";
import { LogOut } from "lucide-react";
import { useState, useEffect } from "react";

interface SignOutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSignOut: () => Promise<{ success: boolean; error?: string }>;
}

export function SignOutModal({
  isOpen,
  onClose,
  onSignOut,
}: SignOutModalProps) {
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset error when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setError(null);
    }
  }, [isOpen]);

  // Escape key support
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !signingOut) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen, signingOut, onClose]);

  const handleSignOut = async () => {
    setSigningOut(true);
    setError(null);

    try {
      const result = await onSignOut();

      if (!result.success) {
        setError(result.error || "Failed to sign out. Please try again.");
        setSigningOut(false);
      }
      // If successful, the redirect will happen in the onSignOut function
    } catch (error) {
      console.error("Sign out error:", error);
      setError("An unexpected error occurred. Please try again.");
      setSigningOut(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={() => !signingOut && onClose()}
        style={{ cursor: signingOut ? "not-allowed" : "pointer" }}
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

          <p className="text-sm text-muted-foreground mb-4">
            Are you sure you want to sign out? You'll need to sign in again to
            access your account.
          </p>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Loading State */}
          {signingOut && (
            <div className="mb-4 flex items-center justify-center gap-2 text-sm text-blue-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
              Signing out...
            </div>
          )}

          <div className="flex justify-center gap-4">
            <button
              onClick={onClose}
              disabled={signingOut}
              className="px-4 py-2 text-sm bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>

            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="px-4 py-2 text-sm bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              {signingOut ? "Signing Out..." : "Sign Out"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
