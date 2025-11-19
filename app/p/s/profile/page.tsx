// app/p/s/profile/page.tsx
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/server/prisma";
import {
  User,
  Settings,
  Camera,
  Edit,
  Save,
  Shield,
  Home,
  Key,
  Lock,
  Unlock,
  Mail,
  Phone,
  MapPin,
  Calendar,
  CheckCircle,
  AlertTriangle,
  FileText,
  Download,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Profile | Student Portal",
  description: "Manage your personal information and account settings",
};

interface StudentProfile {
  id: string;
  userId: string;
  matricNumber: string;
  jambRegNumber: string;
  firstName: string;
  surname: string;
  otherName?: string | null;
  gender?: string | null;
  phone?: string | null;
  email?: string | null;
  passportUrl?: string | null;
  department: string;
  course: string;
  college: string;
  state: string;
  lga: string;
  maritalStatus?: string | null;
  dateEnrolled: Date;
  isActive: boolean;
  admissionYear?: number | null;
  dateOfBirth?: Date | null;
  lastActivityAt?: Date | null;
}

interface UserSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  assignmentReminders: boolean;
  gradeAlerts: boolean;
  lectureReminders: boolean;
  twoFactorEnabled: boolean;
  sessionTimeout: number;
  language: string;
  theme: string;
}

// Extend the Session type to include 'role'
interface SessionUserWithRole {
  id?: string | null;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: string | null;
}

export default async function StudentProfilePage() {
  // Check if user is authenticated and is a student
  // Check if user is authenticated and is an admin
  const session = (await getServerSession()) as {
    user?: SessionUserWithRole;
  } | null;
  if (!session || session.user?.role !== "ADMIN") {
    redirect("/signin");
  }

  // Get student profile and settings
  if (!session.user.id) {
    throw new Error("User ID is missing from session.");
  }
  const studentProfile = await getStudentProfile(session.user.id);
  const userSettings = await getUserSettings(session.user.id);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto py-6">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Home className="h-4 w-4" />
            <span>Student Portal</span>
            <span>/</span>
            <span>Profile</span>
          </div>
          <div>
            <h1 className="text-3xl font-bold">My Profile</h1>
            <p className="text-muted-foreground">
              Manage your personal information and account settings
            </p>
          </div>
        </div>

        {/* Profile Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Personal Information */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Personal Information</h2>
                <button
                  onClick={() => {
                    window.location.href = "/p/s/profile/edit";
                  }}
                  className="inline-flex items-center justify-center rounded-md bg-blue-600 text-white hover:bg-blue-700 h-9 px-4 py-2"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Profile
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Matric Number
                    </label>
                    <div className="text-gray-900 font-medium">
                      {studentProfile.matricNumber}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      JAMB Reg Number
                    </label>
                    <div className="text-gray-900 font-medium">
                      {studentProfile.jambRegNumber}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Full Name
                  </label>
                  <div className="text-gray-900 font-medium">
                    {studentProfile.firstName}{" "}
                    {studentProfile.otherName
                      ? `${studentProfile.otherName} `
                      : ""}
                    {studentProfile.surname}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Gender
                  </label>
                  <div className="text-gray-900 font-medium capitalize">
                    {studentProfile.gender || "Not specified"}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Date of Birth
                  </label>
                  <div className="text-gray-900 font-medium">
                    {studentProfile.dateOfBirth
                      ? format(studentProfile.dateOfBirth, "PPP")
                      : "Not specified"}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Phone Number
                  </label>
                  <div className="text-gray-900 font-medium">
                    {studentProfile.phone || "Not specified"}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Marital Status
                  </label>
                  <div className="text-gray-900 font-medium capitalize">
                    {studentProfile.maritalStatus || "Not specified"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Academic Information */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-6">Academic Information</h2>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Department
                  </label>
                  <div className="text-gray-900 font-medium">
                    {studentProfile.department}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Course of Study
                  </label>
                  <div className="text-gray-900 font-medium">
                    {studentProfile.course}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    College
                  </label>
                  <div className="text-gray-900 font-medium">
                    {studentProfile.college}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Admission Year
                  </label>
                  <div className="text-gray-900 font-medium">
                    {studentProfile.admissionYear || "Not specified"}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Date Enrolled
                  </label>
                  <div className="text-gray-900 font-medium">
                    {format(studentProfile.dateEnrolled, "PPP")}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Picture */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Profile Picture</h2>
              <button
                onClick={() => {
                  // In a real implementation, this would open a file picker
                  document.getElementById("passport-upload")?.click();
                }}
                className="inline-flex items-center justify-center rounded-md bg-blue-600 text-white hover:bg-blue-700 h-9 px-4 py-2"
              >
                <Camera className="h-4 w-4 mr-2" />
                Change Photo
              </button>
            </div>

            <div className="flex justify-center">
              <div className="relative h-32 w-32">
                {studentProfile.passportUrl ? (
                  <Image
                    src={studentProfile.passportUrl}
                    alt={`${studentProfile.firstName} ${studentProfile.surname}`}
                    width={128}
                    height={128}
                    className="rounded-full object-cover"
                  />
                ) : (
                  <div className="h-32 w-32 rounded-full bg-gray-200 flex items-center justify-center">
                    <User className="h-12 w-12 text-gray-400" />
                  </div>
                )}
              </div>
              <input
                id="passport-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  // In a real implementation, this would handle file upload
                  if (e.target.files && e.target.files[0]) {
                    console.log("File selected:", e.target.files[0]);
                  }
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Account Settings */}
      <div className="lg:col-span-3">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Account Settings</h2>
            <button
              onClick={() => {
                window.location.href = "/p/s/profile/settings";
              }}
              className="inline-flex items-center justify-center rounded-md bg-blue-600 text-white hover:bg-blue-700 h-9 px-4 py-2"
            >
              <Settings className="h-4 w-4 mr-2" />
              Manage Settings
            </button>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  Email Notifications
                </label>
                <div className="flex items-center space-x-2">
                  <div
                    className={cn(
                      "relative inline-block w-12 h-6 rounded-full",
                      userSettings.emailNotifications
                        ? "bg-green-500"
                        : "bg-gray-300"
                    )}
                  >
                    <div
                      className={cn(
                        "absolute top-1/2 left-1/2 transform -translate-y-1/2 w-5 h-5 bg-white rounded-full",
                        userSettings.emailNotifications && "translate-x-5"
                      )}
                    >
                      <CheckCircle className="h-3 w-3 text-white" />
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    // In a real implementation, this would toggle the setting
                    toggleNotificationSetting(
                      "emailNotifications",
                      !userSettings.emailNotifications
                    );
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  {userSettings.emailNotifications ? "Disable" : "Enable"}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  Push Notifications
                </label>
                <div className="flex items-center space-x-2">
                  <div
                    className={cn(
                      "relative inline-block w-12 h-6 rounded-full",
                      userSettings.pushNotifications
                        ? "bg-green-500"
                        : "bg-gray-300"
                    )}
                  >
                    <div
                      className={cn(
                        "absolute top-1/2 left-1/2 transform -translate-y-1/2 w-5 h-5 bg-white rounded-full",
                        userSettings.pushNotifications && "translate-x-5"
                      )}
                    >
                      <CheckCircle className="h-3 w-3 text-white" />
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    // In a real implementation, this would toggle the setting
                    toggleNotificationSetting(
                      "pushNotifications",
                      !userSettings.pushNotifications
                    );
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  {userSettings.pushNotifications ? "Disable" : "Enable"}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  Assignment Reminders
                </label>
                <div className="flex items-center space-x-2">
                  <div
                    className={cn(
                      "relative inline-block w-12 h-6 rounded-full",
                      userSettings.assignmentReminders
                        ? "bg-green-500"
                        : "bg-gray-300"
                    )}
                  >
                    <div
                      className={cn(
                        "absolute top-1/2 left-1/2 transform -translate-y-1/2 w-5 h-5 bg-white rounded-full",
                        userSettings.assignmentReminders && "translate-x-5"
                      )}
                    >
                      <CheckCircle className="h-3 w-3 text-white" />
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    // In a real implementation, this would toggle the setting
                    toggleNotificationSetting(
                      "assignmentReminders",
                      !userSettings.assignmentReminders
                    );
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  {userSettings.assignmentReminders ? "Disable" : "Enable"}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  Grade Alerts
                </label>
                <div className="flex items-center space-x-2">
                  <div
                    className={cn(
                      "relative inline-block w-12 h-6 rounded-full",
                      userSettings.gradeAlerts ? "bg-green-500" : "bg-gray-300"
                    )}
                  >
                    <div
                      className={cn(
                        "absolute top-1/2 left-1/2 transform -translate-y-1/2 w-5 h-5 bg-white rounded-full",
                        userSettings.gradeAlerts && "translate-x-5"
                      )}
                    >
                      <CheckCircle className="h-3 w-3 text-white" />
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    // In a real implementation, this would toggle the setting
                    toggleNotificationSetting(
                      "gradeAlerts",
                      !userSettings.gradeAlerts
                    );
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  {userSettings.gradeAlerts ? "Disable" : "Enable"}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  Lecture Reminders
                </label>
                <div className="flex items-center space-x-2">
                  <div
                    className={cn(
                      "relative inline-block w-12 h-6 rounded-full",
                      userSettings.lectureReminders
                        ? "bg-green-500"
                        : "bg-gray-300"
                    )}
                  >
                    <div
                      className={cn(
                        "absolute top-1/2 left-1/2 transform -translate-y-1/2 w-5 h-5 bg-white rounded-full",
                        userSettings.lectureReminders && "translate-x-5"
                      )}
                    >
                      <CheckCircle className="h-3 w-3 text-white" />
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    // In a real implementation, this would toggle the setting
                    toggleNotificationSetting(
                      "lectureReminders",
                      !userSettings.lectureReminders
                    );
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  {userSettings.lectureReminders ? "Disable" : "Enable"}
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  Two-Factor Authentication
                </label>
                <div className="flex items-center space-x-2">
                  <div
                    className={cn(
                      "relative inline-block w-12 h-6 rounded-full",
                      userSettings.twoFactorEnabled
                        ? "bg-green-500"
                        : "bg-gray-300"
                    )}
                  >
                    <div
                      className={cn(
                        "absolute top-1/2 left-1/2 transform -translate-y-1/2 w-5 h-5 bg-white rounded-full",
                        userSettings.twoFactorEnabled && "translate-x-5"
                      )}
                    >
                      <CheckCircle className="h-3 w-3 text-white" />
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    // In a real implementation, this would toggle the setting
                    toggleNotificationSetting(
                      "twoFactorEnabled",
                      !userSettings.twoFactorEnabled
                    );
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  {userSettings.twoFactorEnabled ? "Disable" : "Enable"}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  Session Timeout (minutes)
                </label>
                <div className="flex items-center space-x-2">
                  <div className="bg-gray-100 rounded px-3 py-1 text-gray-800 font-medium w-16 text-center">
                    {userSettings.sessionTimeout}
                  </div>
                  <button
                    onClick={() => {
                      // In a real implementation, this would adjust the timeout
                      adjustSessionTimeout(userSettings.sessionTimeout - 5);
                    }}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <span className="font-bold">-</span>
                  </button>
                  <button
                    onClick={() => {
                      // In a real implementation, this would adjust the timeout
                      adjustSessionTimeout(userSettings.sessionTimeout + 5);
                    }}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <span className="font-bold">+</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Server-side functions
async function getStudentProfile(studentId: string): Promise<StudentProfile> {
  const student = await prisma.student.findUnique({
    where: { userId: studentId },
  });

  if (!student) {
    throw new Error("Student not found");
  }

  return {
    id: student.id,
    userId: student.userId,
    matricNumber: student.matricNumber,
    jambRegNumber: student.jambRegNumber,
    firstName: student.firstName,
    surname: student.surname,
    otherName: student.otherName,
    gender: student.gender,
    phone: student.phone,
    email: student.email,
    passportUrl: student.passportUrl,
    department: student.department,
    course: student.course,
    college: student.college,
    state: student.state,
    lga: student.lga,
    maritalStatus: student.maritalStatus,
    dateEnrolled: student.dateEnrolled,
    isActive: student.isActive,
    admissionYear: student.admissionYear,
    dateOfBirth: student.dateOfBirth,
    lastActivityAt: student.lastActivityAt,
  };
}

async function getUserSettings(userId: string): Promise<UserSettings> {
  // In a real implementation, this would fetch from a user settings table
  // For now, we'll return default settings
  return {
    emailNotifications: true,
    pushNotifications: true,
    assignmentReminders: true,
    gradeAlerts: true,
    lectureReminders: true,
    twoFactorEnabled: false,
    sessionTimeout: 30,
    language: "en",
    theme: "light",
  };
}

// Client-side functions (would be in a separate file)
function toggleNotificationSetting(setting: string, value: boolean) {
  // In a real implementation, this would call an API endpoint
  console.log(`Toggling ${setting} to ${value}`);
}

function adjustSessionTimeout(newTimeout: number) {
  // In a real implementation, this would call an API endpoint
  console.log(`Adjusting session timeout to ${newTimeout} minutes`);
}
