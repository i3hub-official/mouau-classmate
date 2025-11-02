// app/admin/email-test/page.tsx - IMPROVED ERROR HANDLING
"use client";

import { useState } from "react";
import {
  Mail,
  CheckCircle,
  XCircle,
  RefreshCw,
  Settings,
  Send,
  AlertTriangle,
} from "lucide-react";

interface TestResult {
  success: boolean;
  message: string;
  details?: any;
  timestamp: Date;
  connectionVerified?: boolean;
}

interface ConnectionStatus {
  verified: boolean;
  lastChecked: number;
}

export default function EmailTestPage() {
  const [isTesting, setIsTesting] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus | null>(null);
  const [testEmail, setTestEmail] = useState("");
  const [smtpConfig, setSmtpConfig] = useState({
    host: process.env.NEXT_PUBLIC_SMTP_HOST || "",
    port: process.env.NEXT_PUBLIC_SMTP_PORT || "",
    user: process.env.NEXT_PUBLIC_SMTP_USER || "",
    secure: process.env.NEXT_PUBLIC_SMTP_SECURE === "true",
    pass: process.env.NEXT_PUBLIC_SMTP_PASS || "",
  });

  const addTestResult = (
    success: boolean,
    message: string,
    details?: any,
    connectionVerified?: boolean
  ) => {
    setTestResults((prev) => [
      {
        success,
        message,
        details,
        connectionVerified,
        timestamp: new Date(),
      },
      ...prev.slice(0, 9),
    ]); // Keep last 10 results
  };

  const testConnection = async () => {
    setIsTesting(true);
    try {
      const response = await fetch("/admin/email-test/connection", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();

      if (result.success && result.connectionVerified) {
        addTestResult(true, "✅ Connection test passed", result, true);
        setConnectionStatus(result.connectionStatus);
      } else {
        addTestResult(false, "❌ Connection test failed", result, false);
        setConnectionStatus(result.connectionStatus);
      }
    } catch (error) {
      addTestResult(
        false,
        "❌ Connection test failed - Network error",
        error,
        false
      );
    } finally {
      setIsTesting(false);
    }
  };

  const sendTestEmail = async () => {
    if (!testEmail) {
      addTestResult(false, "❌ Please enter a test email address");
      return;
    }

    setIsTesting(true);
    try {
      const response = await fetch("/admin/email-test/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ testEmail }),
      });

      const result = await response.json();

      if (result.success && result.connectionVerified) {
        addTestResult(true, "✅ Test email sent successfully", result, true);
        setConnectionStatus(result.connectionStatus);
      } else {
        addTestResult(false, "❌ Failed to send test email", result, false);
        setConnectionStatus(result.connectionStatus);
      }
    } catch (error) {
      addTestResult(
        false,
        "❌ Failed to send test email - Network error",
        error,
        false
      );
    } finally {
      setIsTesting(false);
    }
  };

  const runFullTest = async () => {
    setIsTesting(true);
    try {
      // Test connection first
      await testConnection();

      // Wait a bit between tests
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // If connection is good, send test email
      if (testEmail) {
        await sendTestEmail();
      }
    } finally {
      setIsTesting(false);
    }
  };

  const resetConnection = async () => {
    setIsTesting(true);
    try {
      const response = await fetch("/admin/email-test/reset", {
        method: "POST",
      });

      const result = await response.json();

      if (result.success) {
        addTestResult(
          true,
          "✅ Connection reset successfully",
          result,
          result.connectionStatus?.verified
        );
        setConnectionStatus(result.connectionStatus);
      } else {
        addTestResult(false, "❌ Failed to reset connection", result, false);
        setConnectionStatus(result.connectionStatus);
      }
    } catch (error) {
      addTestResult(
        false,
        "❌ Failed to reset connection - Network error",
        error,
        false
      );
    } finally {
      setIsTesting(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const getCommonSMTPIssues = () => [
    "Check SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS environment variables",
    "Verify your email provider's SMTP settings (Gmail, Outlook, etc.)",
    "Ensure your email password is an 'App Password' if using 2FA",
    "Check firewall and network connectivity to SMTP server",
    "Verify SMTP server supports the connection security setting (TLS/SSL)",
  ];

  return (
    <div className="min-h-screen bg-card-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-card rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Mail className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-400">
                Email Service Test
              </h1>
              <p className="text-gray-600">
                Test and verify your email service configuration
              </p>
            </div>
          </div>

          {/* Connection Status */}
          {connectionStatus && (
            <div
              className={`p-4 rounded-lg mb-4 ${
                connectionStatus.verified
                  ? "bg-green-50 border border-green-200"
                  : "bg-red-50 border border-red-200"
              }`}
            >
              <div className="flex items-center gap-3">
                {connectionStatus.verified ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                <div>
                  <p
                    className={`font-medium ${
                      connectionStatus.verified
                        ? "text-green-800"
                        : "text-red-800"
                    }`}
                  >
                    Connection{" "}
                    {connectionStatus.verified ? "Verified" : "Failed"}
                  </p>
                  <p
                    className={`text-sm ${
                      connectionStatus.verified
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    Last checked:{" "}
                    {new Date(connectionStatus.lastChecked).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SMTP Configuration */}
          <div className="bg-card-50 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Settings className="h-4 w-4 text-gray-600" />
              <h3 className="font-medium text-gray-400">SMTP Configuration</h3>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Host:</span>{" "}
                {smtpConfig.host || "Not set"}
              </div>
              <div>
                <span className="text-gray-600">Port:</span>{" "}
                {smtpConfig.port || "Not set"}
              </div>
              <div>
                <span className="text-gray-600">User:</span>{" "}
                {smtpConfig.user || "Not set"}
              </div>
              <div>
                <span className="text-gray-600">Secure:</span>{" "}
                {smtpConfig.secure ? "Yes" : "No"}
              </div>
            </div>
          </div>

          {/* Common Issues */}
          {connectionStatus && !connectionStatus.verified && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <h4 className="font-medium text-amber-800">
                  Common SMTP Issues
                </h4>
              </div>
              <ul className="text-sm text-amber-700 space-y-1">
                {getCommonSMTPIssues().map((issue, index) => (
                  <li key={index}>• {issue}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Test Controls */}
        <div className="bg-card rounded-lg shadow-sm p-6 mb-6">
          <h3 className="text-lg font-medium text-gray-400 mb-4">
            Test Controls
          </h3>

          <div className="space-y-4">
            {/* Test Email Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Test Email Address
              </label>
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="Enter email address to send test to"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={testConnection}
                disabled={isTesting}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-4 w-4 ${isTesting ? "animate-spin" : ""}`}
                />
                Test Connection
              </button>

              <button
                onClick={sendTestEmail}
                disabled={isTesting || !testEmail}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                Send Test Email
              </button>

              <button
                onClick={runFullTest}
                disabled={isTesting || !testEmail}
                className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
              >
                <CheckCircle className="h-4 w-4" />
                Full Test
              </button>

              <button
                onClick={resetConnection}
                disabled={isTesting}
                className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50"
              >
                <RefreshCw className="h-4 w-4" />
                Reset Connection
              </button>

              <button
                onClick={clearResults}
                className="inline-flex items-center gap-2 px-4 py-2 bg-card-600 text-white rounded-md hover:bg-card-700"
              >
                Clear Results
              </button>
            </div>
          </div>
        </div>

        {/* Test Results */}
        <div className="bg-card rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-400">Test Results</h3>
            <span className="text-sm text-gray-500">
              {testResults.length} result{testResults.length !== 1 ? "s" : ""}
            </span>
          </div>

          {testResults.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Mail className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No test results yet. Run a test to see results.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {testResults.map((result, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${
                    result.success
                      ? "bg-green-50 border-green-200"
                      : "bg-red-50 border-red-200"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {result.success ? (
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p
                        className={`font-medium ${
                          result.success ? "text-green-800" : "text-red-800"
                        }`}
                      >
                        {result.message}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        {result.timestamp.toLocaleString()}
                        {result.connectionVerified !== undefined && (
                          <span
                            className={`ml-2 px-2 py-1 rounded text-xs ${
                              result.connectionVerified
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            Connection:{" "}
                            {result.connectionVerified ? "OK" : "Failed"}
                          </span>
                        )}
                      </p>
                      {result.details && (
                        <details className="mt-2">
                          <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-400">
                            View Details
                          </summary>
                          <pre className="mt-2 p-2 bg-gray-900 rounded text-xs overflow-x-auto">
                            {JSON.stringify(result.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
