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
  AlertCircle,
  Lock,
  Settings,
  Info,
  ChevronRight,
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

interface StatesResponse {
  type: string;
  message: string;
  count: number;
  states: string[];
}

interface LGAsResponse {
  type: string;
  message: string;
  state: string;
  count: number;
  lgas: string[];
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

  // State and LGA management
  const [states, setStates] = useState<string[]>([]);
  const [lgas, setLgas] = useState<string[]>([]);
  const [isLoadingStates, setIsLoadingStates] = useState(false);
  const [isLoadingLgas, setIsLoadingLgas] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const lgaCache = new Map<string, string[]>();

  // Track which fields have been updated before
  const [updatedFields, setUpdatedFields] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchUserProfile();
    fetchStatesData();
  }, []);

  // Fetch states data
  const fetchStatesData = async () => {
    setIsLoadingStates(true);
    setApiError(null);
    try {
      const cached = localStorage.getItem("cachedStates");
      if (cached) {
        setStates(JSON.parse(cached));
        return;
      }

      const res = await fetch("https://apinigeria.vercel.app/api/v1/states");
      if (!res.ok) {
        throw new Error("Failed to fetch states");
      }

      const data: StatesResponse = await res.json();
      const statesList = data.states || [];
      setStates(statesList);
      localStorage.setItem("cachedStates", JSON.stringify(statesList));
      localStorage.setItem("cachedTimestamp", Date.now().toString());
    } catch (error) {
      console.error("Failed to load states");
      setApiError("Failed to load states data. Please try again later.");
    } finally {
      setIsLoadingStates(false);
    }
  };

  // Fetch LGAs when state changes
  useEffect(() => {
    const fetchLgasData = async () => {
      if (!userProfile?.state) {
        setLgas([]);
        return;
      }

      if (lgaCache.has(userProfile.state)) {
        setLgas(lgaCache.get(userProfile.state) || []);
        return;
      }

      setIsLoadingLgas(true);
      setApiError(null);
      try {
        const res = await fetch(
          `https://apinigeria.vercel.app/api/v1/lga?state=${encodeURIComponent(
            userProfile.state
          )}`
        );

        if (!res.ok) {
          throw new Error("Failed to fetch LGAs");
        }

        const data: LGAsResponse = await res.json();
        const lgasList = data.lgas || [];
        setLgas(lgasList);
        lgaCache.set(userProfile.state, lgasList);
      } catch (error) {
        console.error("Failed to load LGAs");
        setApiError("Failed to load LGAs data. Please try again later.");
      } finally {
        setIsLoadingLgas(false);
      }
    };

    fetchLgasData();
  }, [userProfile?.state]);

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

      // Initialize updated fields based on current data
      if (profileData) {
        const fields = new Set<string>();
        if (profileData.name) fields.add("name");
        if (profileData.phone) fields.add("phone");
        if (profileData.dateOfBirth) fields.add("dateOfBirth");
        if (profileData.state) fields.add("state");
        if (profileData.lga) fields.add("lga");
        if (profileData.gender) fields.add("gender");
        if (profileData.maritalStatus) fields.add("maritalStatus");
        setUpdatedFields(fields);
      }
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
        name: userProfile.name,
        phone: userProfile.phone,
        state: userProfile.state,
        lga: userProfile.lga,
        dateOfBirth: userProfile.dateOfBirth,
        gender: userProfile.gender,
        maritalStatus: userProfile.maritalStatus,
      };

      await ProfileService.updateProfile(updateData);

      // Update the updatedFields set with newly filled fields
      const newUpdatedFields = new Set(updatedFields);
      if (userProfile.name) newUpdatedFields.add("name");
      if (userProfile.phone) newUpdatedFields.add("phone");
      if (userProfile.dateOfBirth) newUpdatedFields.add("dateOfBirth");
      if (userProfile.state) newUpdatedFields.add("state");
      if (userProfile.lga) newUpdatedFields.add("lga");
      if (userProfile.gender) newUpdatedFields.add("gender");
      if (userProfile.maritalStatus) newUpdatedFields.add("maritalStatus");
      setUpdatedFields(newUpdatedFields);

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

      await ProfileService.updateNotificationSettings(notificationSettings);

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

  // Check if a field can be edited
  const canEditField = (fieldName: string): boolean => {
    if (!editMode) return false;

    // If field has never been updated (is empty), allow editing
    const fieldValue = userProfile?.[fieldName as keyof UserProfile];
    if (!fieldValue || fieldValue === "") return true;

    // If field has been updated before, disallow editing
    return !updatedFields.has(fieldName);
  };

  const tabs = [
    { id: "profile", label: "Profile", icon: User },
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
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors mt-4 lg:mt-0 shadow-sm"
            >
              <Edit3 size={14} />
              <span className="text-sm">Edit Profile</span>
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
            <div className="bg-card border border-border rounded-xl p-2 sticky top-24 shadow-sm">
              <nav className="space-y-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${
                        activeTab === tab.id
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      }`}
                    >
                      <Icon size={18} />
                      <span className="font-medium">{tab.label}</span>
                      {activeTab === tab.id && (
                        <ChevronRight size={16} className="ml-auto" />
                      )}
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
              <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                <div className="bg-linear-to-r from-primary/10 to-primary/5 px-6 py-4 border-b border-border">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/20 rounded-lg">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <h2 className="text-xl font-semibold text-foreground">
                      Personal Information
                    </h2>
                  </div>
                </div>

                <div className="p-6">
                  {/* Field Update Notice */}
                  {editMode && (
                    <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                        <div>
                          <h3 className="font-medium text-amber-800 mb-1">
                            Important Notice
                          </h3>
                          <p className="text-sm text-amber-700">
                            You can only update empty fields. Once a field is
                            updated, it cannot be changed again. Please contact
                            administration for any corrections to previously
                            updated fields.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleProfileUpdate}>
                    <div className="space-y-8">
                      {/* Basic Information Section */}
                      <div>
                        <div className="flex items-center gap-2 mb-4">
                          <div className="h-px bg-border flex-1"></div>
                          <h3 className="text-sm font-medium text-muted-foreground px-2">
                            Basic Information
                          </h3>
                          <div className="h-px bg-border flex-1"></div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                              Full Name
                            </label>
                            <div className="relative">
                              <input
                                type="text"
                                value={userProfile?.name || ""}
                                onChange={(e) =>
                                  setUserProfile((prev) =>
                                    prev
                                      ? { ...prev, name: e.target.value }
                                      : null
                                  )
                                }
                                disabled={!canEditField("name")}
                                className={`w-full px-4 py-2.5 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all ${
                                  canEditField("name")
                                    ? "border-border"
                                    : "border-muted-foreground/20 bg-muted/30"
                                }`}
                                placeholder="Enter your full name"
                              />
                              {!canEditField("name") && userProfile?.name && (
                                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                  <Lock
                                    size={14}
                                    className="text-muted-foreground"
                                  />
                                </div>
                              )}
                            </div>
                            {!canEditField("name") && userProfile?.name && (
                              <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                                <Info size={12} />
                                Contact administration to change this field
                              </p>
                            )}
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
                                className="w-full pl-10 pr-3 py-2.5 border border-muted-foreground/20 rounded-lg bg-muted/30 text-muted-foreground"
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
                                    prev
                                      ? { ...prev, phone: e.target.value }
                                      : null
                                  )
                                }
                                disabled={!canEditField("phone")}
                                className={`w-full pl-10 pr-3 py-2.5 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all ${
                                  canEditField("phone")
                                    ? "border-border"
                                    : "border-muted-foreground/20 bg-muted/30"
                                }`}
                                placeholder="Enter your phone number"
                              />
                              {!canEditField("phone") && userProfile?.phone && (
                                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                  <Lock
                                    size={14}
                                    className="text-muted-foreground"
                                  />
                                </div>
                              )}
                            </div>
                            {!canEditField("phone") && userProfile?.phone && (
                              <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                                <Info size={12} />
                                Contact administration to change this field
                              </p>
                            )}
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
                                disabled={!canEditField("dateOfBirth")}
                                className={`w-full pl-10 pr-3 py-2.5 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all ${
                                  canEditField("dateOfBirth")
                                    ? "border-border"
                                    : "border-muted-foreground/20 bg-muted/30"
                                }`}
                              />
                              {!canEditField("dateOfBirth") &&
                                userProfile?.dateOfBirth && (
                                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                    <Lock
                                      size={14}
                                      className="text-muted-foreground"
                                    />
                                  </div>
                                )}
                            </div>
                            {!canEditField("dateOfBirth") &&
                              userProfile?.dateOfBirth && (
                                <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                                  <Info size={12} />
                                  Contact administration to change this field
                                </p>
                              )}
                          </div>
                        </div>
                      </div>

                      {/* Academic Information Section */}
                      <div>
                        <div className="flex items-center gap-2 mb-4">
                          <div className="h-px bg-border flex-1"></div>
                          <h3 className="text-sm font-medium text-muted-foreground px-2">
                            Academic Information
                          </h3>
                          <div className="h-px bg-border flex-1"></div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                              Matric Number
                            </label>
                            <input
                              type="text"
                              value={userProfile?.matricNumber || ""}
                              disabled
                              className="w-full px-4 py-2.5 border border-muted-foreground/20 rounded-lg bg-muted/30 text-muted-foreground"
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
                                className="w-full pl-10 pr-3 py-2.5 border border-muted-foreground/20 rounded-lg bg-muted/30 text-muted-foreground"
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
                                className="w-full pl-10 pr-3 py-2.5 border border-muted-foreground/20 rounded-lg bg-muted/30 text-muted-foreground"
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
                                className="w-full pl-10 pr-3 py-2.5 border border-muted-foreground/20 rounded-lg bg-muted/30 text-muted-foreground"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Additional Information Section */}
                      <div>
                        <div className="flex items-center gap-2 mb-4">
                          <div className="h-px bg-border flex-1"></div>
                          <h3 className="text-sm font-medium text-muted-foreground px-2">
                            Additional Information
                          </h3>
                          <div className="h-px bg-border flex-1"></div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                              State of Origin
                            </label>
                            <div className="relative">
                              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <select
                                value={userProfile?.state || ""}
                                onChange={(e) =>
                                  setUserProfile((prev) =>
                                    prev
                                      ? { ...prev, state: e.target.value }
                                      : null
                                  )
                                }
                                disabled={!canEditField("state")}
                                className={`w-full pl-10 pr-10 py-2.5 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none ${
                                  canEditField("state")
                                    ? "border-border"
                                    : "border-muted-foreground/20 bg-muted/30"
                                }`}
                              >
                                <option value="">Select State</option>
                                {states.map((state, index) => (
                                  <option key={`state-${index}`} value={state}>
                                    {state}
                                  </option>
                                ))}
                              </select>
                              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                                <ChevronRight
                                  size={16}
                                  className="text-muted-foreground rotate-90"
                                />
                              </div>
                              {!canEditField("state") && userProfile?.state && (
                                <div className="absolute right-10 top-1/2 transform -translate-y-1/2">
                                  <Lock
                                    size={14}
                                    className="text-muted-foreground"
                                  />
                                </div>
                              )}
                            </div>
                            {!canEditField("state") && userProfile?.state && (
                              <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                                <Info size={12} />
                                Contact administration to change this field
                              </p>
                            )}
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                              LGA
                            </label>
                            <div className="relative">
                              <select
                                value={userProfile?.lga || ""}
                                onChange={(e) =>
                                  setUserProfile((prev) =>
                                    prev
                                      ? { ...prev, lga: e.target.value }
                                      : null
                                  )
                                }
                                disabled={
                                  !canEditField("lga") || !userProfile?.state
                                }
                                className={`w-full px-4 pr-10 py-2.5 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none ${
                                  canEditField("lga") && userProfile?.state
                                    ? "border-border"
                                    : "border-muted-foreground/20 bg-muted/30"
                                }`}
                              >
                                <option value="">Select LGA</option>
                                {lgas.map((lga, index) => (
                                  <option key={`lga-${index}`} value={lga}>
                                    {lga}
                                  </option>
                                ))}
                              </select>
                              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                                <ChevronRight
                                  size={16}
                                  className="text-muted-foreground rotate-90"
                                />
                              </div>
                              {!canEditField("lga") && userProfile?.lga && (
                                <div className="absolute right-10 top-1/2 transform -translate-y-1/2">
                                  <Lock
                                    size={14}
                                    className="text-muted-foreground"
                                  />
                                </div>
                              )}
                            </div>
                            {!canEditField("lga") && userProfile?.lga && (
                              <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                                <Info size={12} />
                                Contact administration to change this field
                              </p>
                            )}
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                              Gender
                            </label>
                            <div className="relative">
                              <select
                                value={userProfile?.gender || ""}
                                onChange={(e) =>
                                  setUserProfile((prev) =>
                                    prev
                                      ? { ...prev, gender: e.target.value }
                                      : null
                                  )
                                }
                                disabled={!canEditField("gender")}
                                className={`w-full px-4 pr-10 py-2.5 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none ${
                                  canEditField("gender")
                                    ? "border-border"
                                    : "border-muted-foreground/20 bg-muted/30"
                                }`}
                              >
                                <option value="">Select Gender</option>
                                <option value="MALE">Male</option>
                                <option value="FEMALE">Female</option>
                                <option value="OTHER">Other</option>
                              </select>
                              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                                <ChevronRight
                                  size={16}
                                  className="text-muted-foreground rotate-90"
                                />
                              </div>
                              {!canEditField("gender") &&
                                userProfile?.gender && (
                                  <div className="absolute right-10 top-1/2 transform -translate-y-1/2">
                                    <Lock
                                      size={14}
                                      className="text-muted-foreground"
                                    />
                                  </div>
                                )}
                            </div>
                            {!canEditField("gender") && userProfile?.gender && (
                              <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                                <Info size={12} />
                                Contact administration to change this field
                              </p>
                            )}
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                              Marital Status
                            </label>
                            <div className="relative">
                              <select
                                value={userProfile?.maritalStatus || ""}
                                onChange={(e) =>
                                  setUserProfile((prev) =>
                                    prev
                                      ? {
                                          ...prev,
                                          maritalStatus: e.target.value,
                                        }
                                      : null
                                  )
                                }
                                disabled={!canEditField("maritalStatus")}
                                className={`w-full px-4 pr-10 py-2.5 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none ${
                                  canEditField("maritalStatus")
                                    ? "border-border"
                                    : "border-muted-foreground/20 bg-muted/30"
                                }`}
                              >
                                <option value="">Select Marital Status</option>
                                <option value="SINGLE">Single</option>
                                <option value="MARRIED">Married</option>
                                <option value="DIVORCED">Divorced</option>
                                <option value="WIDOWED">Widowed</option>
                              </select>
                              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                                <ChevronRight
                                  size={16}
                                  className="text-muted-foreground rotate-90"
                                />
                              </div>
                              {!canEditField("maritalStatus") &&
                                userProfile?.maritalStatus && (
                                  <div className="absolute right-10 top-1/2 transform -translate-y-1/2">
                                    <Lock
                                      size={14}
                                      className="text-muted-foreground"
                                    />
                                  </div>
                                )}
                            </div>
                            {!canEditField("maritalStatus") &&
                              userProfile?.maritalStatus && (
                                <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                                  <Info size={12} />
                                  Contact administration to change this field
                                </p>
                              )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    {editMode && (
                      <div className="flex gap-3 mt-8 pt-6 border-t border-border">
                        <button
                          type="submit"
                          disabled={saving}
                          className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 shadow-sm"
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
                          className="px-6 py-2.5 border border-border rounded-lg hover:bg-muted transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </form>
                </div>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === "security" && (
              <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                <div className="bg-linear-to-r from-primary/10 to-primary/5 px-6 py-4 border-b border-border">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/20 rounded-lg">
                      <Shield className="h-5 w-5 text-primary" />
                    </div>
                    <h2 className="text-xl font-semibold text-foreground">
                      Security Settings
                    </h2>
                  </div>
                </div>

                <div className="p-6">
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
                            className="w-full pl-10 pr-10 py-2.5 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
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
                            className="w-full pl-10 pr-10 py-2.5 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
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
                            className="w-full pl-10 pr-10 py-2.5 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
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
                          className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 shadow-sm"
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
                    <div className="bg-muted/30 rounded-lg p-4">
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        <li className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5"></div>
                          <span>
                            Use a strong, unique password that you don't use
                            elsewhere
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5"></div>
                          <span>
                            Enable two-factor authentication if available
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5"></div>
                          <span>Never share your password with anyone</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5"></div>
                          <span>Log out from shared devices after use</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === "notifications" && (
              <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                <div className="bg-linear-to-r from-primary/10 to-primary/5 px-6 py-4 border-b border-border">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/20 rounded-lg">
                      <Bell className="h-5 w-5 text-primary" />
                    </div>
                    <h2 className="text-xl font-semibold text-foreground">
                      Notification Preferences
                    </h2>
                  </div>
                </div>

                <div className="p-6">
                  <div className="space-y-4 max-w-2xl">
                    <div className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-muted rounded-lg">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <h3 className="font-medium text-foreground">
                            Email Notifications
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Receive notifications via email
                          </p>
                        </div>
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

                    <div className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-muted rounded-lg">
                          <Bell className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <h3 className="font-medium text-foreground">
                            Push Notifications
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Receive push notifications in your browser
                          </p>
                        </div>
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

                    <div className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-muted rounded-lg">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <h3 className="font-medium text-foreground">
                            Assignment Reminders
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Get reminders for upcoming assignment deadlines
                          </p>
                        </div>
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

                    <div className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-muted rounded-lg">
                          <BookOpen className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <h3 className="font-medium text-foreground">
                            Grade Alerts
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Notify when new grades are posted
                          </p>
                        </div>
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

                    <div className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-muted rounded-lg">
                          <GraduationCap className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <h3 className="font-medium text-foreground">
                            Lecture Reminders
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Remind about upcoming lectures and classes
                          </p>
                        </div>
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
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
