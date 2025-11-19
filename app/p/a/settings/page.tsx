// app/p/a/settings/page.tsx
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/server/prisma";
import {
  Settings,
  Home,
  Shield,
  Bell,
  Database,
  Mail,
  Globe,
  Users,
  Save,
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  Info,
  Key,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Upload,
  Download,
  Trash2,
  Plus,
  X,
} from "lucide-react";
import { format } from "date-fns";

export const metadata: Metadata = {
  title: "Settings | Admin Portal",
  description: "Manage system settings and configurations",
};

interface SystemSettings {
  siteName: string;
  siteDescription: string;
  allowRegistration: boolean;
  emailVerificationRequired: boolean;
  defaultUserRole: string;
  sessionTimeout: number;
  maxLoginAttempts: number;
  lockoutDuration: number;
  passwordMinLength: number;
  passwordRequireUppercase: boolean;
  passwordRequireLowercase: boolean;
  passwordRequireNumbers: boolean;
  passwordRequireSymbols: boolean;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  emailSettings: {
    smtpHost: string;
    smtpPort: number;
    smtpUser: string;
    smtpPassword: string;
    fromEmail: string;
    fromName: string;
  };
  backupSettings: {
    enabled: boolean;
    frequency: string;
    retentionDays: number;
    lastBackup?: Date;
  };
  securitySettings: {
    enableTwoFactor: boolean;
    sessionSecure: boolean;
    ipWhitelist: string[];
    auditRetention: number;
  };
}

interface NotificationTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  type: string;
  enabled: boolean;
}

type SessionUser = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: string | null;
};

export default async function AdminSettingsPage() {
  // Check if user is authenticated and is an admin
  const session = (await getServerSession()) as { user?: SessionUser } | null;
  if (!session || session.user?.role !== "ADMIN") {
    redirect("/signin");
  }

  // Get current settings
  const settings = await getSystemSettings();
  const notificationTemplates = await getNotificationTemplates();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Home className="h-4 w-4" />
            <span>Admin Portal</span>
            <span>/</span>
            <span className="text-foreground">Settings</span>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              System Settings
            </h1>
            <p className="text-muted-foreground">
              Configure system-wide settings and preferences
            </p>
          </div>
        </div>

        {/* Settings Tabs */}
        <div className="space-y-6">
          {/* General Settings */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-foreground mb-6 flex items-center">
              <Settings className="h-5 w-5 mr-2 text-primary" />
              General Settings
            </h2>

            <form
              action="/api/a/settings/general"
              method="POST"
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label
                    htmlFor="siteName"
                    className="text-sm font-medium text-foreground"
                  >
                    Site Name
                  </label>
                  <input
                    id="siteName"
                    name="siteName"
                    type="text"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    defaultValue={settings.siteName}
                    placeholder="MOUAU Classmate"
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="siteDescription"
                    className="text-sm font-medium text-foreground"
                  >
                    Site Description
                  </label>
                  <textarea
                    id="siteDescription"
                    name="siteDescription"
                    rows={3}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    defaultValue={settings.siteDescription}
                    placeholder="E-learning platform for MOUAU"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-3">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      name="allowRegistration"
                      defaultChecked={settings.allowRegistration}
                      className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary focus:ring-2"
                    />
                    <span className="text-sm font-medium text-foreground">
                      Allow User Registration
                    </span>
                  </label>

                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      name="emailVerificationRequired"
                      defaultChecked={settings.emailVerificationRequired}
                      className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary focus:ring-2"
                    />
                    <span className="text-sm font-medium text-foreground">
                      Require Email Verification
                    </span>
                  </label>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="defaultUserRole"
                    className="text-sm font-medium text-foreground"
                  >
                    Default User Role
                  </label>
                  <select
                    id="defaultUserRole"
                    name="defaultUserRole"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    defaultValue={settings.defaultUserRole}
                  >
                    <option value="STUDENT">Student</option>
                    <option value="TEACHER">Teacher</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-border">
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-6 py-2 transition-colors shadow-sm hover:shadow-md"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save General Settings
                </button>
              </div>
            </form>
          </div>

          {/* Security Settings */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-foreground mb-6 flex items-center">
              <Shield className="h-5 w-5 mr-2 text-primary" />
              Security Settings
            </h2>

            <form
              action="/api/a/settings/security"
              method="POST"
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-foreground">
                    Session Security
                  </h3>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label
                        htmlFor="sessionTimeout"
                        className="text-sm font-medium text-foreground"
                      >
                        Session Timeout (minutes)
                      </label>
                      <input
                        id="sessionTimeout"
                        name="sessionTimeout"
                        type="number"
                        min="5"
                        max="1440"
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        defaultValue={settings.sessionTimeout}
                      />
                    </div>

                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        name="sessionSecure"
                        defaultChecked={settings.securitySettings.sessionSecure}
                        className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary focus:ring-2"
                      />
                      <span className="text-sm font-medium text-foreground">
                        Secure Sessions (HTTPS only)
                      </span>
                    </label>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-foreground">
                    Password Policy
                  </h3>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label
                        htmlFor="passwordMinLength"
                        className="text-sm font-medium text-foreground"
                      >
                        Minimum Length
                      </label>
                      <input
                        id="passwordMinLength"
                        name="passwordMinLength"
                        type="number"
                        min="6"
                        max="128"
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        defaultValue={settings.passwordMinLength}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">
                        Password Requirements
                      </label>
                      <div className="space-y-3">
                        <label className="flex items-center space-x-3 cursor-pointer">
                          <input
                            type="checkbox"
                            name="passwordRequireUppercase"
                            defaultChecked={settings.passwordRequireUppercase}
                            className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary focus:ring-2"
                          />
                          <span className="text-sm text-foreground">
                            Require Uppercase Letter
                          </span>
                        </label>

                        <label className="flex items-center space-x-3 cursor-pointer">
                          <input
                            type="checkbox"
                            name="passwordRequireLowercase"
                            defaultChecked={settings.passwordRequireLowercase}
                            className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary focus:ring-2"
                          />
                          <span className="text-sm text-foreground">
                            Require Lowercase Letter
                          </span>
                        </label>

                        <label className="flex items-center space-x-3 cursor-pointer">
                          <input
                            type="checkbox"
                            name="passwordRequireNumbers"
                            defaultChecked={settings.passwordRequireNumbers}
                            className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary focus:ring-2"
                          />
                          <span className="text-sm text-foreground">
                            Require Numbers
                          </span>
                        </label>

                        <label className="flex items-center space-x-3 cursor-pointer">
                          <input
                            type="checkbox"
                            name="passwordRequireSymbols"
                            defaultChecked={settings.passwordRequireSymbols}
                            className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary focus:ring-2"
                          />
                          <span className="text-sm text-foreground">
                            Require Special Characters
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-foreground">
                    Login Protection
                  </h3>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label
                        htmlFor="maxLoginAttempts"
                        className="text-sm font-medium text-foreground"
                      >
                        Max Login Attempts
                      </label>
                      <input
                        id="maxLoginAttempts"
                        name="maxLoginAttempts"
                        type="number"
                        min="3"
                        max="10"
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        defaultValue={settings.maxLoginAttempts}
                      />
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor="lockoutDuration"
                        className="text-sm font-medium text-foreground"
                      >
                        Lockout Duration (minutes)
                      </label>
                      <input
                        id="lockoutDuration"
                        name="lockoutDuration"
                        type="number"
                        min="5"
                        max="1440"
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        defaultValue={settings.lockoutDuration}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-foreground">
                    Advanced Security
                  </h3>

                  <div className="space-y-4">
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        name="enableTwoFactor"
                        defaultChecked={
                          settings.securitySettings.enableTwoFactor
                        }
                        className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary focus:ring-2"
                      />
                      <span className="text-sm font-medium text-foreground">
                        Enable Two-Factor Authentication
                      </span>
                    </label>

                    <div className="space-y-2">
                      <label
                        htmlFor="auditRetention"
                        className="text-sm font-medium text-foreground"
                      >
                        Audit Log Retention (days)
                      </label>
                      <input
                        id="auditRetention"
                        name="auditRetention"
                        type="number"
                        min="30"
                        max="365"
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        defaultValue={settings.securitySettings.auditRetention}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-border">
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-6 py-2 transition-colors shadow-sm hover:shadow-md"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Security Settings
                </button>
              </div>
            </form>
          </div>

          {/* Email Settings */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-foreground mb-6 flex items-center">
              <Mail className="h-5 w-5 mr-2 text-primary" />
              Email Configuration
            </h2>

            <form
              action="/api/a/settings/email"
              method="POST"
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label
                    htmlFor="smtpHost"
                    className="text-sm font-medium text-foreground"
                  >
                    SMTP Host
                  </label>
                  <input
                    id="smtpHost"
                    name="smtpHost"
                    type="text"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    defaultValue={settings.emailSettings.smtpHost}
                    placeholder="smtp.gmail.com"
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="smtpPort"
                    className="text-sm font-medium text-foreground"
                  >
                    SMTP Port
                  </label>
                  <input
                    id="smtpPort"
                    name="smtpPort"
                    type="number"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    defaultValue={settings.emailSettings.smtpPort}
                    placeholder="587"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label
                    htmlFor="smtpUser"
                    className="text-sm font-medium text-foreground"
                  >
                    SMTP Username
                  </label>
                  <input
                    id="smtpUser"
                    name="smtpUser"
                    type="text"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    defaultValue={settings.emailSettings.smtpUser}
                    placeholder="noreply@mouau.edu"
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="smtpPassword"
                    className="text-sm font-medium text-foreground"
                  >
                    SMTP Password
                  </label>
                  <div className="relative">
                    <input
                      id="smtpPassword"
                      name="smtpPassword"
                      type="password"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 pr-10 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      defaultValue={settings.emailSettings.smtpPassword}
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => {
                        const input = document.getElementById(
                          "smtpPassword"
                        ) as HTMLInputElement;
                        input.type =
                          input.type === "password" ? "text" : "password";
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label
                    htmlFor="fromEmail"
                    className="text-sm font-medium text-foreground"
                  >
                    From Email
                  </label>
                  <input
                    id="fromEmail"
                    name="fromEmail"
                    type="email"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    defaultValue={settings.emailSettings.fromEmail}
                    placeholder="noreply@mouau.edu"
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="fromName"
                    className="text-sm font-medium text-foreground"
                  >
                    From Name
                  </label>
                  <input
                    id="fromName"
                    name="fromName"
                    type="text"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    defaultValue={settings.emailSettings.fromName}
                    placeholder="MOUAU Classmate"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-border">
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-lg border border-border bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 text-sm font-medium transition-colors"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Test Configuration
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-6 py-2 transition-colors shadow-sm hover:shadow-md"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Email Settings
                </button>
              </div>
            </form>
          </div>

          {/* Backup Settings */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-foreground mb-6 flex items-center">
              <Database className="h-5 w-5 mr-2 text-primary" />
              Backup Configuration
            </h2>

            <form
              action="/api/a/settings/backup"
              method="POST"
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="space-y-4">
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        name="backupEnabled"
                        defaultChecked={settings.backupSettings.enabled}
                        className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary focus:ring-2"
                      />
                      <span className="text-sm font-medium text-foreground">
                        Enable Automatic Backups
                      </span>
                    </label>

                    <div className="space-y-2">
                      <label
                        htmlFor="backupFrequency"
                        className="text-sm font-medium text-foreground"
                      >
                        Backup Frequency
                      </label>
                      <select
                        id="backupFrequency"
                        name="backupFrequency"
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        defaultValue={settings.backupSettings.frequency}
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor="retentionDays"
                        className="text-sm font-medium text-foreground"
                      >
                        Retention Period (days)
                      </label>
                      <input
                        id="retentionDays"
                        name="retentionDays"
                        type="number"
                        min="7"
                        max="365"
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        defaultValue={settings.backupSettings.retentionDays}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-foreground">
                    Backup Status
                  </h3>

                  <div className="space-y-4">
                    {settings.backupSettings.lastBackup ? (
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-foreground">
                          Last backup:{" "}
                          {format(settings.backupSettings.lastBackup, "PPP p")}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        <span className="text-sm text-foreground">
                          No backup history
                        </span>
                      </div>
                    )}

                    <div className="pt-4 space-x-3">
                      <button
                        type="button"
                        className="inline-flex items-center justify-center rounded-lg border border-border bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 text-sm font-medium transition-colors"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download Latest Backup
                      </button>
                      <button
                        type="submit"
                        className="inline-flex items-center justify-center rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 transition-colors shadow-sm hover:shadow-md"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Save Backup Settings
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </form>
          </div>

          {/* Notification Templates */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-foreground flex items-center">
                <Bell className="h-5 w-5 mr-2 text-primary" />
                Notification Templates
              </h2>
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-lg border border-border bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 text-sm font-medium transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Template
              </button>
            </div>

            <div className="space-y-6">
              {notificationTemplates.map((template) => (
                <div
                  key={template.id}
                  className="rounded-lg border border-border bg-background p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-foreground">
                        {template.name}
                      </h3>
                      <span className="text-sm text-muted-foreground">
                        Type: {template.type}
                      </span>
                    </div>
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        defaultChecked={template.enabled}
                        className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary focus:ring-2"
                      />
                      <span className="text-sm font-medium text-foreground">
                        Enabled
                      </span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">
                        Subject
                      </label>
                      <input
                        type="text"
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        defaultValue={template.subject}
                      />
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <label className="text-sm font-medium text-foreground">
                      Message Body
                    </label>
                    <textarea
                      rows={4}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      defaultValue={template.body}
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      className="inline-flex items-center justify-center rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 transition-colors shadow-sm hover:shadow-md"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save Template
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Server-side functions
async function getSystemSettings(): Promise<SystemSettings> {
  const configs = await prisma.systemConfig.findMany();

  const settings: Record<string, any> = {};
  configs.forEach((config) => {
    settings[config.key] = config.value;
  });

  return {
    siteName: settings.siteName || "MOUAU Classmate",
    siteDescription:
      settings.siteDescription || "E-learning platform for MOUAU",
    allowRegistration: settings.allowRegistration === "true",
    emailVerificationRequired: settings.emailVerificationRequired === "true",
    defaultUserRole: settings.defaultUserRole || "STUDENT",
    sessionTimeout: parseInt(settings.sessionTimeout || "30"),
    maxLoginAttempts: parseInt(settings.maxLoginAttempts || "5"),
    lockoutDuration: parseInt(settings.lockoutDuration || "30"),
    passwordMinLength: parseInt(settings.passwordMinLength || "8"),
    passwordRequireUppercase: settings.passwordRequireUppercase === "true",
    passwordRequireLowercase: settings.passwordRequireLowercase === "true",
    passwordRequireNumbers: settings.passwordRequireNumbers === "true",
    passwordRequireSymbols: settings.passwordRequireSymbols === "true",
    maintenanceMode: settings.maintenanceMode === "true",
    maintenanceMessage:
      settings.maintenanceMessage || "System is under maintenance",
    emailSettings: {
      smtpHost: settings.smtpHost || "",
      smtpPort: parseInt(settings.smtpPort || "587"),
      smtpUser: settings.smtpUser || "",
      smtpPassword: settings.smtpPassword || "",
      fromEmail: settings.fromEmail || "",
      fromName: settings.fromName || "",
    },
    backupSettings: {
      enabled: settings.backupEnabled === "true",
      frequency: settings.backupFrequency || "weekly",
      retentionDays: parseInt(settings.retentionDays || "30"),
      lastBackup: settings.lastBackup
        ? new Date(settings.lastBackup)
        : undefined,
    },
    securitySettings: {
      enableTwoFactor: settings.enableTwoFactor === "true",
      sessionSecure: settings.sessionSecure === "true",
      ipWhitelist: settings.ipWhitelist ? JSON.parse(settings.ipWhitelist) : [],
      auditRetention: parseInt(settings.auditRetention || "90"),
    },
  };
}

async function getNotificationTemplates(): Promise<NotificationTemplate[]> {
  // In a real implementation, this would fetch from database
  return [
    {
      id: "welcome-email",
      name: "Welcome Email",
      subject: "Welcome to MOUAU Classmate",
      body: "Hello {{name}},\n\nWelcome to our e-learning platform...",
      type: "email",
      enabled: true,
    },
    {
      id: "password-reset",
      name: "Password Reset",
      subject: "Reset your password",
      body: "Hello {{name}},\n\nClick here to reset your password...",
      type: "email",
      enabled: true,
    },
    {
      id: "assignment-due",
      name: "Assignment Due Reminder",
      subject: "Assignment Due Soon",
      body: "Hello {{name}},\n\nYou have an assignment due soon...",
      type: "notification",
      enabled: true,
    },
  ];
}
