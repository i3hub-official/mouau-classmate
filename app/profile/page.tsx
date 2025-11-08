// app/profile/page.tsx
"use client";
import { useState, useEffect } from "react";
import { DashboardHeader } from "@/app/components/DashboardHeader";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  BookOpen,
  Building,
  GraduationCap,
  Save,
  Edit3,
  Eye,
  EyeOff,
  Key,
  Bell,
  Shield,
  CheckCircle2,
  XCircle,
  Loader,
} from "lucide-react";
import { UserService } from "@/lib/services/userService";
import { ProfileService } from "@/lib/services/profileService";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  matricNumber?: string;
  department?: string;
  college?: string;
  course?: string;
  phone?: string;
  state?: string;
  lga?: string;
  dateOfBirth?: string;
  gender?: string;
  maritalStatus?: string;
  admissionYear?: number;
  dateEnrolled?: string;
}

interface SecuritySettings {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface NotificationSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  assignmentReminders: boolean;
  gradeAlerts: boolean;
  lectureReminders: boolean;
}

export default function ProfilePage() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [notificationSettings, setNotificationSettings] =
    useState<NotificationSettings>({
      emailNotifications: true,
      pushNotifications: true,
      assignmentReminders: true,
      gradeAlerts: true,
      lectureReminders: true,
    });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  const [editMode, setEditMode] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);

      // Get current user ID from session
      const currentUser = await UserService.getCurrentUser();
      if (!currentUser?.id) {
        throw new Error("User not authenticated");
      }

      // Fetch profile data using the service
      const profileData = await ProfileService.getProfile();
      setUserProfile(profileData);

      // Fetch notification settings
      const notificationData = await ProfileService.getNotificationSettings();
      setNotificationSettings(notificationData);
    } catch (error) {
      console.error("Error fetching profile:", error);
      showMessage("error", "Failed to load profile data");
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;

    try {
      setSaving(true);

      const currentUser = await UserService.getCurrentUser();
      if (!currentUser?.id) {
        throw new Error("User not authenticated");
      }

      const updateData = {
        id: currentUser.id,
        name: userProfile.name,
        phone: userProfile.phone,
        state: userProfile.state,
        lga: userProfile.lga,
        dateOfBirth: userProfile.dateOfBirth,
        gender: userProfile.gender,
        maritalStatus: userProfile.maritalStatus,
      };

      await ProfileService.updateProfile(updateData);

      showMessage("success", "Profile updated successfully");
      setEditMode(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      showMessage(
        "error",
        error instanceof Error ? error.message : "Failed to update profile"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSecurityUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSaving(true);

      const currentUser = await UserService.getCurrentUser();
      if (!currentUser?.id) {
        throw new Error("User not authenticated");
      }

      await ProfileService.changePassword(securitySettings);

      setSecuritySettings({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      showMessage("success", "Password updated successfully");
    } catch (error) {
      console.error("Error updating password:", error);
      showMessage(
        "error",
        error instanceof Error ? error.message : "Failed to update password"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleNotificationUpdate = async () => {
    try {
      setSaving(true);

      const currentUser = await UserService.getCurrentUser();
      if (!currentUser?.id) {
        throw new Error("User not authenticated");
      }

      await ProfileService.updateNotificationSettings(
        notificationSettings
      );

      showMessage("success", "Notification settings updated");
    } catch (error) {
      console.error("Error updating notification settings:", error);
      showMessage("error", "Failed to update notification settings");
    } finally {
      setSaving(false);
    }
  };
  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const tabs = [
    { id: "profile", label: "Profile Information", icon: User },
    { id: "security", label: "Security", icon: Shield },
    { id: "notifications", label: "Notifications", icon: Bell },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader />
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <main className="w-full px-6 xl:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Profile Settings
            </h1>
            <p className="text-lg text-muted-foreground">
              Manage your account information and preferences
            </p>
          </div>
          {activeTab === "profile" && !editMode && (
            <button
              onClick={() => setEditMode(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors mt-4 lg:mt-0"
            >
              <Edit3 size={16} />
              Edit Profile
            </button>
          )}
        </div>

        {/* Message Alert */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg border ${
              message.type === "success"
                ? "bg-green-50 border-green-200 text-green-800"
                : "bg-red-50 border-red-200 text-red-800"
            }`}
          >
            <div className="flex items-center gap-2">
              {message.type === "success" ? (
                <CheckCircle2 size={20} />
              ) : (
                <XCircle size={20} />
              )}
              <span>{message.text}</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <div className="bg-card border border-border rounded-xl p-6 sticky top-24">
              <nav className="space-y-2">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                        activeTab === tab.id
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      }`}
                    >
                      <Icon size={18} />
                      <span className="font-medium">{tab.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Profile Information Tab */}
            {activeTab === "profile" && (
              <div className="bg-card border border-border rounded-xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <User className="h-6 w-6 text-primary" />
                  <h2 className="text-xl font-semibold text-foreground">
                    Personal Information
                  </h2>
                </div>

                <form onSubmit={handleProfileUpdate}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Basic Information */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium text-foreground border-b border-border pb-2">
                        Basic Information
                      </h3>

                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Full Name
                        </label>
                        <input
                          type="text"
                          value={userProfile?.name || ""}
                          onChange={(e) =>
                            setUserProfile((prev) =>
                              prev ? { ...prev, name: e.target.value } : null
                            )
                          }
                          disabled={!editMode}
                          className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Email Address
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <input
                            type="email"
                            value={userProfile?.email || ""}
                            disabled
                            className="w-full pl-10 pr-3 py-2 border border-border rounded-lg bg-muted text-muted-foreground"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Email cannot be changed
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Phone Number
                        </label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <input
                            type="tel"
                            value={userProfile?.phone || ""}
                            onChange={(e) =>
                              setUserProfile((prev) =>
                                prev ? { ...prev, phone: e.target.value } : null
                              )
                            }
                            disabled={!editMode}
                            className="w-full pl-10 pr-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Date of Birth
                        </label>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <input
                            type="date"
                            value={userProfile?.dateOfBirth || ""}
                            onChange={(e) =>
                              setUserProfile((prev) =>
                                prev
                                  ? { ...prev, dateOfBirth: e.target.value }
                                  : null
                              )
                            }
                            disabled={!editMode}
                            className="w-full pl-10 pr-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Academic Information */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium text-foreground border-b border-border pb-2">
                        Academic Information
                      </h3>

                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Matric Number
                        </label>
                        <input
                          type="text"
                          value={userProfile?.matricNumber || ""}
                          disabled
                          className="w-full px-3 py-2 border border-border rounded-lg bg-muted text-muted-foreground"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Department
                        </label>
                        <div className="relative">
                          <BookOpen className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <input
                            type="text"
                            value={userProfile?.department || ""}
                            disabled
                            className="w-full pl-10 pr-3 py-2 border border-border rounded-lg bg-muted text-muted-foreground"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Course of Study
                        </label>
                        <div className="relative">
                          <GraduationCap className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <input
                            type="text"
                            value={userProfile?.course || ""}
                            disabled
                            className="w-full pl-10 pr-3 py-2 border border-border rounded-lg bg-muted text-muted-foreground"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          College
                        </label>
                        <div className="relative">
                          <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <input
                            type="text"
                            value={userProfile?.college || ""}
                            disabled
                            className="w-full pl-10 pr-3 py-2 border border-border rounded-lg bg-muted text-muted-foreground"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Additional Information */}
                  <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        State of Origin
                      </label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                          type="text"
                          value={userProfile?.state || ""}
                          onChange={(e) =>
                            setUserProfile((prev) =>
                              prev ? { ...prev, state: e.target.value } : null
                            )
                          }
                          disabled={!editMode}
                          className="w-full pl-10 pr-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        LGA
                      </label>
                      <input
                        type="text"
                        value={userProfile?.lga || ""}
                        onChange={(e) =>
                          setUserProfile((prev) =>
                            prev ? { ...prev, lga: e.target.value } : null
                          )
                        }
                        disabled={!editMode}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50"
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {editMode && (
                    <div className="flex gap-3 mt-8 pt-6 border-t border-border">
                      <button
                        type="submit"
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                      >
                        {saving ? (
                          <Loader size={16} className="animate-spin" />
                        ) : (
                          <Save size={16} />
                        )}
                        {saving ? "Saving..." : "Save Changes"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditMode(false);
                          fetchUserProfile(); // Reset changes
                        }}
                        className="px-6 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </form>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === "security" && (
              <div className="bg-card border border-border rounded-xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <Shield className="h-6 w-6 text-primary" />
                  <h2 className="text-xl font-semibold text-foreground">
                    Security Settings
                  </h2>
                </div>

                <form onSubmit={handleSecurityUpdate}>
                  <div className="space-y-6 max-w-2xl">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Current Password
                      </label>
                      <div className="relative">
                        <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                          type={showCurrentPassword ? "text" : "password"}
                          value={securitySettings.currentPassword}
                          onChange={(e) =>
                            setSecuritySettings((prev) => ({
                              ...prev,
                              currentPassword: e.target.value,
                            }))
                          }
                          className="w-full pl-10 pr-10 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                          required
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowCurrentPassword(!showCurrentPassword)
                          }
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showCurrentPassword ? (
                            <EyeOff size={16} />
                          ) : (
                            <Eye size={16} />
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        New Password
                      </label>
                      <div className="relative">
                        <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                          type={showNewPassword ? "text" : "password"}
                          value={securitySettings.newPassword}
                          onChange={(e) =>
                            setSecuritySettings((prev) => ({
                              ...prev,
                              newPassword: e.target.value,
                            }))
                          }
                          className="w-full pl-10 pr-10 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showNewPassword ? (
                            <EyeOff size={16} />
                          ) : (
                            <Eye size={16} />
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Password must be at least 8 characters long
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Confirm New Password
                      </label>
                      <div className="relative">
                        <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          value={securitySettings.confirmPassword}
                          onChange={(e) =>
                            setSecuritySettings((prev) => ({
                              ...prev,
                              confirmPassword: e.target.value,
                            }))
                          }
                          className="w-full pl-10 pr-10 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                          required
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                          }
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showConfirmPassword ? (
                            <EyeOff size={16} />
                          ) : (
                            <Eye size={16} />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button
                        type="submit"
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                      >
                        {saving ? (
                          <Loader size={16} className="animate-spin" />
                        ) : (
                          <Save size={16} />
                        )}
                        {saving ? "Updating..." : "Update Password"}
                      </button>
                    </div>
                  </div>
                </form>

                {/* Security Tips */}
                <div className="mt-8 pt-6 border-t border-border">
                  <h3 className="text-lg font-medium text-foreground mb-4">
                    Security Tips
                  </h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>
                      • Use a strong, unique password that you don't use
                      elsewhere
                    </li>
                    <li>• Enable two-factor authentication if available</li>
                    <li>• Never share your password with anyone</li>
                    <li>• Log out from shared devices after use</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === "notifications" && (
              <div className="bg-card border border-border rounded-xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <Bell className="h-6 w-6 text-primary" />
                  <h2 className="text-xl font-semibold text-foreground">
                    Notification Preferences
                  </h2>
                </div>

                <div className="space-y-6 max-w-2xl">
                  <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                    <div>
                      <h3 className="font-medium text-foreground">
                        Email Notifications
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Receive notifications via email
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notificationSettings.emailNotifications}
                        onChange={(e) => {
                          setNotificationSettings((prev) => ({
                            ...prev,
                            emailNotifications: e.target.checked,
                          }));
                          handleNotificationUpdate();
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                    <div>
                      <h3 className="font-medium text-foreground">
                        Push Notifications
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Receive push notifications in your browser
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notificationSettings.pushNotifications}
                        onChange={(e) => {
                          setNotificationSettings((prev) => ({
                            ...prev,
                            pushNotifications: e.target.checked,
                          }));
                          handleNotificationUpdate();
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                    <div>
                      <h3 className="font-medium text-foreground">
                        Assignment Reminders
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Get reminders for upcoming assignment deadlines
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notificationSettings.assignmentReminders}
                        onChange={(e) => {
                          setNotificationSettings((prev) => ({
                            ...prev,
                            assignmentReminders: e.target.checked,
                          }));
                          handleNotificationUpdate();
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                    <div>
                      <h3 className="font-medium text-foreground">
                        Grade Alerts
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Notify when new grades are posted
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notificationSettings.gradeAlerts}
                        onChange={(e) => {
                          setNotificationSettings((prev) => ({
                            ...prev,
                            gradeAlerts: e.target.checked,
                          }));
                          handleNotificationUpdate();
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                    <div>
                      <h3 className="font-medium text-foreground">
                        Lecture Reminders
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Remind about upcoming lectures and classes
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notificationSettings.lectureReminders}
                        onChange={(e) => {
                          setNotificationSettings((prev) => ({
                            ...prev,
                            lectureReminders: e.target.checked,
                          }));
                          handleNotificationUpdate();
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
