// app/teacher/profile/page.tsx
"use client";
import { useState, useEffect } from "react";
import { TeacherProfileService } from "@/lib/services/teachers/profileService";
import {
  User,
  Mail,
  Phone,
  BookOpen,
  Building,
  Calendar,
  Edit,
  Save,
  Lock,
  Bell,
  Shield,
  Activity,
} from "lucide-react";

interface TeacherProfile {
  id: string;
  firstName: string;
  lastName: string;
  otherName?: string;
  email: string;
  phone: string;
  department: string;
  qualification?: string;
  specialization?: string;
  gender?: string;
  employeeId: string;
  institution: string;
  dateJoined: Date;
  user: {
    id: string;
    email: string;
    role: string;
    isActive: boolean;
    lastLoginAt?: Date;
    loginCount: number;
    createdAt: Date;
  };
  stats: {
    totalCourses: number;
    totalStudents: number;
    totalAssignments: number;
    totalSubmissions: number;
    pendingGrading: number;
  };
}

export default function TeacherProfilePage() {
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const teacherId = "temp-teacher-id";
      const profileData = await TeacherProfileService.getProfile(teacherId);
      // Ensure institution is present (fallback to empty string if missing)
      setProfile({
        ...profileData,
        otherName: profileData.otherName ?? undefined,
        qualification: profileData.qualification ?? undefined,
        specialization: profileData.specialization ?? undefined,
        gender: profileData.gender ?? undefined,
        institution: (profileData as any).institution ?? "",
        user: {
          ...profileData.user,
          lastLoginAt: profileData.user.lastLoginAt ?? undefined,
        },
      });
    } catch (error) {
      console.error("Failed to load profile:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">
          Profile not found
        </h3>
        <p className="text-muted-foreground">
          Unable to load your profile information.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            My Profile
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your account information and preferences
          </p>
        </div>
        <button
          onClick={() => setEditing(!editing)}
          className="flex items-center gap-2 px-4 py-2 border border-border text-foreground rounded-lg hover:bg-muted transition-colors"
        >
          {editing ? <Save size={16} /> : <Edit size={16} />}
          {editing ? "Save Changes" : "Edit Profile"}
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-border mb-6">
        <nav className="flex space-x-8">
          {[
            { id: "profile", label: "Profile", icon: User },
            { id: "security", label: "Security", icon: Shield },
            { id: "notifications", label: "Notifications", icon: Bell },
            { id: "activity", label: "Activity", icon: Activity },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {activeTab === "profile" && (
            <ProfileTab profile={profile} editing={editing} />
          )}
          {activeTab === "security" && <SecurityTab />}
          {activeTab === "notifications" && <NotificationsTab />}
          {activeTab === "activity" && <ActivityTab />}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Profile Stats */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Teaching Statistics
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Courses:</span>
                <span className="font-medium">
                  {profile.stats.totalCourses}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Students:</span>
                <span className="font-medium">
                  {profile.stats.totalStudents}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Total Assignments:
                </span>
                <span className="font-medium">
                  {profile.stats.totalAssignments}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Total Submissions:
                </span>
                <span className="font-medium">
                  {profile.stats.totalSubmissions}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pending Grading:</span>
                <span className="font-medium text-orange-600">
                  {profile.stats.pendingGrading}
                </span>
              </div>
            </div>
          </div>

          {/* Account Information */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Account Information
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Member Since:</span>
                <span className="font-medium">
                  {new Date(profile.user.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Login:</span>
                <span className="font-medium">
                  {profile.user.lastLoginAt
                    ? new Date(profile.user.lastLoginAt).toLocaleDateString()
                    : "Never"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Login Count:</span>
                <span className="font-medium">{profile.user.loginCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <span
                  className={`font-medium ${
                    profile.user.isActive ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {profile.user.isActive ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileTab({
  profile,
  editing,
}: {
  profile: TeacherProfile;
  editing: boolean;
}) {
  const [formData, setFormData] = useState({
    firstName: profile.firstName,
    lastName: profile.lastName,
    otherName: profile.otherName || "",
    phone: profile.phone,
    department: profile.department,
    qualification: profile.qualification || "",
    specialization: profile.specialization || "",
    gender: profile.gender || "",
  });

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <h2 className="text-lg font-semibold text-foreground mb-6">
        Personal Information
      </h2>

      <div className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              First Name *
            </label>
            <input
              type="text"
              value={formData.firstName}
              onChange={(e) => handleChange("firstName", e.target.value)}
              disabled={!editing}
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Last Name *
            </label>
            <input
              type="text"
              value={formData.lastName}
              onChange={(e) => handleChange("lastName", e.target.value)}
              disabled={!editing}
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Other Names
            </label>
            <input
              type="text"
              value={formData.otherName}
              onChange={(e) => handleChange("otherName", e.target.value)}
              disabled={!editing}
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Gender
            </label>
            <select
              value={formData.gender}
              onChange={(e) => handleChange("gender", e.target.value)}
              disabled={!editing}
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background disabled:opacity-50"
            >
              <option value="">Select Gender</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
        </div>

        {/* Contact Information */}
        <div>
          <h3 className="text-md font-medium text-foreground mb-4 flex items-center gap-2">
            <Mail size={16} />
            Contact Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Email Address
              </label>
              <div className="flex items-center gap-2 p-2 border border-border rounded-lg bg-muted/50">
                <Mail size={16} className="text-muted-foreground" />
                <span className="text-foreground">{profile.email}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Contact administrator to change email
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Phone Number *
              </label>
              <div className="flex items-center gap-2">
                <Phone size={16} className="text-muted-foreground" />
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  disabled={!editing}
                  className="flex-1 px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background disabled:opacity-50"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Professional Information */}
        <div>
          <h3 className="text-md font-medium text-foreground mb-4 flex items-center gap-2">
            <BookOpen size={16} />
            Professional Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Department *
              </label>
              <input
                type="text"
                value={formData.department}
                onChange={(e) => handleChange("department", e.target.value)}
                disabled={!editing}
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Qualification
              </label>
              <input
                type="text"
                value={formData.qualification}
                onChange={(e) => handleChange("qualification", e.target.value)}
                disabled={!editing}
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background disabled:opacity-50"
                placeholder="e.g., PhD, M.Sc., B.Sc."
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-foreground mb-2">
                Specialization
              </label>
              <input
                type="text"
                value={formData.specialization}
                onChange={(e) => handleChange("specialization", e.target.value)}
                disabled={!editing}
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background disabled:opacity-50"
                placeholder="e.g., Computer Science, Mathematics, Physics"
              />
            </div>
          </div>
        </div>

        {/* Institutional Information */}
        <div>
          <h3 className="text-md font-medium text-foreground mb-4 flex items-center gap-2">
            <Building size={16} />
            Institutional Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Employee ID
              </label>
              <div className="p-2 border border-border rounded-lg bg-muted/50">
                <span className="text-foreground font-mono">
                  {profile.employeeId}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Institution
              </label>
              <div className="p-2 border border-border rounded-lg bg-muted/50">
                <span className="text-foreground">{profile.institution}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Date Joined
              </label>
              <div className="flex items-center gap-2 p-2 border border-border rounded-lg bg-muted/50">
                <Calendar size={16} className="text-muted-foreground" />
                <span className="text-foreground">
                  {new Date(profile.dateJoined).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SecurityTab() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert("New passwords don't match");
      return;
    }

    setLoading(true);
    try {
      const teacherId = "temp-teacher-id";
      await TeacherProfileService.changePassword(teacherId, {
        currentPassword,
        newPassword,
      });
      alert("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <h2 className="text-lg font-semibold text-foreground mb-6">
        Security Settings
      </h2>

      <form onSubmit={handleChangePassword} className="space-y-6">
        <div>
          <h3 className="text-md font-medium text-foreground mb-4 flex items-center gap-2">
            <Lock size={16} />
            Change Password
          </h3>

          <div className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Current Password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background"
                required
                minLength={8}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? "Changing Password..." : "Change Password"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function NotificationsTab() {
  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    pushNotifications: true,
    assignmentReminders: true,
    gradeAlerts: true,
    lectureReminders: true,
  });

  const handlePreferenceChange = (key: string, value: boolean) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
    // In real app, save to API
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <h2 className="text-lg font-semibold text-foreground mb-6">
        Notification Preferences
      </h2>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 border border-border rounded-lg">
          <div>
            <p className="font-medium text-foreground">Email Notifications</p>
            <p className="text-sm text-muted-foreground">
              Receive notifications via email
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={preferences.emailNotifications}
              onChange={(e) =>
                handlePreferenceChange("emailNotifications", e.target.checked)
              }
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>

        <div className="flex items-center justify-between p-4 border border-border rounded-lg">
          <div>
            <p className="font-medium text-foreground">Push Notifications</p>
            <p className="text-sm text-muted-foreground">
              Receive browser push notifications
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={preferences.pushNotifications}
              onChange={(e) =>
                handlePreferenceChange("pushNotifications", e.target.checked)
              }
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>

        <div className="flex items-center justify-between p-4 border border-border rounded-lg">
          <div>
            <p className="font-medium text-foreground">Assignment Reminders</p>
            <p className="text-sm text-muted-foreground">
              Get reminders for upcoming assignment deadlines
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={preferences.assignmentReminders}
              onChange={(e) =>
                handlePreferenceChange("assignmentReminders", e.target.checked)
              }
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>

        <div className="flex items-center justify-between p-4 border border-border rounded-lg">
          <div>
            <p className="font-medium text-foreground">Grade Alerts</p>
            <p className="text-sm text-muted-foreground">
              Notify when students submit assignments for grading
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={preferences.gradeAlerts}
              onChange={(e) =>
                handlePreferenceChange("gradeAlerts", e.target.checked)
              }
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>

        <div className="flex items-center justify-between p-4 border border-border rounded-lg">
          <div>
            <p className="font-medium text-foreground">Lecture Reminders</p>
            <p className="text-sm text-muted-foreground">
              Reminders for scheduled lectures and materials
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={preferences.lectureReminders}
              onChange={(e) =>
                handlePreferenceChange("lectureReminders", e.target.checked)
              }
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>
      </div>
    </div>
  );
}

function ActivityTab() {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivities();
  }, []);

  const loadActivities = async () => {
    try {
      const teacherId = "temp-teacher-id";
      const response = await TeacherProfileService.getActivityLog(teacherId, {
        limit: 20,
      });
      setActivities(response.activities);
    } catch (error) {
      console.error("Failed to load activities:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <h2 className="text-lg font-semibold text-foreground mb-6">
        Recent Activity
      </h2>

      <div className="space-y-4">
        {activities.map((activity) => (
          <div
            key={activity.id}
            className="flex items-start gap-4 p-4 border border-border rounded-lg"
          >
            <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
            <div className="flex-1">
              <p className="text-foreground font-medium">
                {formatActivityAction(activity.action)}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {new Date(activity.createdAt).toLocaleString()}
              </p>
              {activity.details && (
                <p className="text-sm text-muted-foreground mt-1">
                  {JSON.stringify(activity.details)}
                </p>
              )}
            </div>
          </div>
        ))}

        {activities.length === 0 && (
          <div className="text-center py-8">
            <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No activity records found</p>
          </div>
        )}
      </div>
    </div>
  );
}

function formatActivityAction(action: string): string {
  const actions: { [key: string]: string } = {
    USER_LOGGED_IN: "You logged in to the system",
    ASSIGNMENT_CREATED: "You created a new assignment",
    GRADE_ASSIGNED: "You graded a student submission",
    COURSE_CREATED: "You created a new course",
    PROFILE_UPDATED: "You updated your profile",
    PASSWORD_CHANGED: "You changed your password",
  };

  return actions[action] || action.replace(/_/g, " ").toLowerCase();
}
