"use client";
import { useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  ArrowRight,
  ArrowLeft,
  Home,
  CheckCircle,
  Eye,
  EyeOff,
  Mail,
  FileText,
  Shield,
  AlertCircle,
  Camera,
  User,
  School,
  GraduationCap,
} from "lucide-react";
import { ThemeToggle } from "@/app/components/theme-toggle";

// Teacher-specific Terms & Conditions content
const TEACHER_AGREEMENT_CONTENT = {
  title: "MOUAU ClassMate Teacher Terms & Conditions",
  lastUpdated: "December 2024",
  sections: [
    {
      title: "1. Acceptance of Terms",
      content:
        "By registering as a teacher on MOUAU ClassMate, you agree to abide by the university's code of conduct, academic policies, and all applicable regulations governing faculty members. These terms constitute a legally binding agreement between you and Michael Okpara University of Agriculture, Umudike (MOUAU).",
    },
    {
      title: "2. Eligibility",
      content:
        "This platform is exclusively for currently employed faculty members of MOUAU. You must provide accurate and complete registration information, including a valid employee ID and departmental affiliation. Any falsification of information may result in immediate account termination and disciplinary action according to university policies.",
    },
    {
      title: "3. Data Privacy & Protection",
      content:
        "Your personal information will be protected in accordance with the Nigerian Data Protection Regulation (NDPR) 2019 and used solely for academic and administrative purposes within MOUAU. We collect and process data including your name, employee ID, contact information, academic credentials, and usage data. You have the right to access, correct, or request deletion of your personal data subject to legal and institutional requirements.",
    },
    {
      title: "4. Academic Integrity & Professional Conduct",
      content:
        "As an educator, you are expected to maintain the highest standards of academic integrity and professional conduct. This includes fair assessment of student work, timely feedback, appropriate communication with students, and adherence to university academic policies. Any violation of academic integrity or professional misconduct may result in disciplinary action as outlined in the university faculty handbook.",
    },
    {
      title: "5. Platform Usage & Responsibilities",
      content:
        "The ClassMate platform is for legitimate academic and administrative purposes. As a teacher, you are responsible for: creating and managing course content, posting assignments and assessments, grading student work, maintaining accurate records, and communicating with students. Prohibited activities include: sharing confidential student information, inappropriate communication with students, unauthorized commercial activities, and any illegal or unethical behavior.",
    },
    {
      title: "6. Account Security & Responsibility",
      content:
        "You are solely responsible for maintaining the confidentiality of your login credentials and for all activities that occur under your account. You must immediately notify the university of any unauthorized access or security breach. You agree not to share your account credentials with others or allow others to access your account.",
    },
    {
      title: "7. Communication & Notifications",
      content:
        "You consent to receive official university communications through the platform, including administrative notices, system updates, and important announcements. It is your responsibility to regularly check the platform for new communications. The university is not liable for any consequences resulting from failure to check notifications.",
    },
    {
      title: "8. Intellectual Property Rights",
      content:
        "You retain ownership of course materials you create, but grant MOUAU a non-exclusive license to use, display, and distribute such materials for educational purposes. You must respect intellectual property rights when using third-party materials in your courses. Unauthorized reproduction or distribution of copyrighted materials is strictly prohibited.",
    },
    {
      title: "9. Student Data Privacy",
      content:
        "You have access to sensitive student information and are obligated to protect this data in accordance with privacy laws and university policies. You may only use student data for legitimate educational purposes and must not share it with unauthorized parties. Violation of student privacy may result in disciplinary action.",
    },
    {
      title: "10. Service Availability",
      content:
        "While we strive to maintain continuous service availability, MOUAU does not guarantee uninterrupted access to the platform. The university reserves the right to modify, suspend, or discontinue any aspect of the service without prior notice for maintenance, upgrades, or other operational needs. We are not liable for any disruption of service.",
    },
    {
      title: "11. Limitation of Liability",
      content:
        "MOUAU and its affiliates shall not be liable for any direct, indirect, incidental, consequential, or punitive damages arising from your use of the platform. This includes but is not limited to loss of data, teaching materials, or any other damages. Your use of the platform is at your own risk.",
    },
    {
      title: "12. User-Generated Content",
      content:
        "You retain ownership of content you submit but grant MOUAU a worldwide, non-exclusive, royalty-free license to use, display, and distribute such content for educational and administrative purposes. You are responsible for ensuring your content does not violate any third-party rights or applicable laws.",
    },
    {
      title: "13. Disciplinary Action",
      content:
        "Violations of these terms may result in account suspension, permanent termination, and/or referral to university disciplinary authorities. The university reserves the right to investigate violations and cooperate with law enforcement when necessary.",
    },
    {
      title: "14. Amendments",
      content:
        "MOUAU reserves the right to modify these terms at any time. You will be notified of significant changes through the platform or via email. Continued use of the platform after modifications constitutes acceptance of the updated terms. You are encouraged to review these terms periodically.",
    },
    {
      title: "15. Governing Law",
      content:
        "These terms are governed by the laws of the Federal Republic of Nigeria. Any disputes arising from these terms or platform usage shall be subject to the exclusive jurisdiction of Nigerian courts.",
    },
    {
      title: "16. Contact & Support",
      content:
        "For questions about these terms, data privacy concerns, or technical support, contact the MOUAU IT Help Desk at support@mouau.edu.ng or visit the ICT Centre on campus during working hours.",
    },
  ],
};

// Validation functions
const isValidEmployeeId = (employeeId: string): boolean => {
  const regex = /^[A-Za-z0-9\/-]{5,}$/;
  return regex.test(employeeId);
};

export default function TeacherSignupPage() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    employeeId: "",
    staffNumber: "",
    surname: "",
    firstName: "",
    otherName: "",
    gender: "",
    photo: "",
    college: "",
    department: "",
    rank: "",
    state: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const [agreementAccepted, setAgreementAccepted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [manualEntry, setManualEntry] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    exists: boolean;
    data?: any;
    requiresManualEntry?: boolean;
  } | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const setErrorWithTimeout = (errorObj: Record<string, string>) => {
    setErrors(errorObj);

    if (Object.keys(errorObj).length > 0) {
      setTimeout(() => {
        setErrors((prev) => {
          const newErrors = { ...prev };
          Object.keys(errorObj).forEach((key) => {
            delete newErrors[key];
          });
          return newErrors;
        });
      }, 5000);
    }
  };

  const handleAgreementAccept = () => {
    if (!agreementAccepted) {
      setErrorWithTimeout({
        agreement: "You must accept the terms and conditions to continue",
      });
      return;
    }
    setStep(2);
  };

  const handleVerifyTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const employeeId = formData.employeeId.trim().toUpperCase();

    if (!employeeId) {
      setErrorWithTimeout({
        employeeId: "Please enter your Employee ID",
      });
      return;
    }

    if (!isValidEmployeeId(employeeId)) {
      setErrorWithTimeout({
        employeeId:
          "Please enter a valid Employee ID (e.g., MOUAU/STAFF/12345)",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Real API call to verify teacher
      const response = await fetch("/api/auth/teacher/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ employeeId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Verification failed");
      }

      setVerificationResult(data);

      if (data.exists && data.data) {
        setFormData((prev) => ({
          ...prev,
          ...data.data,
          employeeId: employeeId,
          staffNumber: data.data.staffNumber || "",
        }));
        setManualEntry(false);
        setStep(3);
      } else if (data.requiresManualEntry) {
        setManualEntry(true);
        setStep(3);
      } else {
        setErrorWithTimeout({
          employeeId:
            "Teacher not found. Please check your employee ID and try again.",
        });
      }
    } catch (error) {
      console.error("Verification error:", error);
      setErrorWithTimeout({
        employeeId:
          error instanceof Error
            ? error.message
            : "Verification failed. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStep3Submit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!formData.surname) newErrors.surname = "Surname is required";
    if (!formData.firstName) newErrors.firstName = "First name is required";
    if (!formData.gender) newErrors.gender = "Gender is required";
    if (!formData.college) newErrors.college = "College is required";
    if (!formData.department) newErrors.department = "Department is required";
    if (!formData.rank) newErrors.rank = "Rank is required";
    if (!formData.email) newErrors.email = "Email is required";
    if (!formData.phone) newErrors.phone = "Phone number is required";

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (
      formData.phone &&
      !/^\+?[\d\s-()]{10,}$/.test(formData.phone.replace(/\s/g, ""))
    ) {
      newErrors.phone = "Please enter a valid phone number";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrorWithTimeout(newErrors);
      return;
    }

    setStep(4);
  };

  const handleStep4Submit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setStep(5);
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Prepare teacher data for registration
      const teacherData = {
        firstName: formData.firstName,
        lastName: formData.surname,
        otherName: formData.otherName,
        gender: formData.gender,
        employeeId: formData.employeeId,
        department: formData.department,
        qualification: formData.rank, // Using rank as qualification
        specialization: "", // This might need to be added to the form
        institution: "MOUAU", // Default institution
        experience: "", // This might need to be added to the form
        email: formData.email,
        phone: formData.phone,
        photo: formData.photo,
      };

      // Real API call to register teacher
      const response = await fetch("/api/auth/teacher/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employeeId: formData.employeeId,
          teacherData,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Registration failed");
      }

      setStep(6);
    } catch (error) {
      console.error("Registration error:", error);
      setErrorWithTimeout({
        submit:
          error instanceof Error
            ? error.message
            : "Registration failed. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrorWithTimeout({
          photo: "Photo must be less than 5MB",
        });
        return;
      }

      if (!file.type.startsWith("image/")) {
        setErrorWithTimeout({
          photo: "Please select an image file",
        });
        return;
      }

      setFormData({ ...formData, photo: file.name });
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setErrorWithTimeout({ photo: "" });
    }
  };

  const Stepper = () => (
    <div className="mb-6 md:mb-8">
      <div className="flex items-center justify-between max-w-2xl mx-auto">
        {[1, 2, 3, 4, 5, 6].map((stepNumber) => (
          <div key={stepNumber} className="flex flex-col items-center">
            <div
              className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                stepNumber < step
                  ? "bg-primary border-primary text-white"
                  : stepNumber === step
                  ? "border-primary bg-primary text-white"
                  : "border-border text-muted-foreground"
              }`}
            >
              {stepNumber < step ? (
                <CheckCircle size={16} className="md:w-[18px] md:h-[18px]" />
              ) : (
                <span className="text-xs md:text-sm">{stepNumber}</span>
              )}
            </div>
            <div
              className={`mt-1 md:mt-2 text-[10px] md:text-xs font-medium ${
                stepNumber <= step ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {stepNumber === 1 && "Terms"}
              {stepNumber === 2 && "Verify"}
              {stepNumber === 3 && "Details"}
              {stepNumber === 4 && "Password"}
              {stepNumber === 5 && "Review"}
              {stepNumber === 6 && "Done"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-background via-accent/5 to-primary/5 p-3 md:p-4">
      <div className="w-full max-w-2xl bg-card border border-border rounded-xl p-4 md:p-8 shadow-lg">
        <div className="flex items-center justify-between mb-6 md:mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 md:gap-2 text-xs md:text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Home size={14} className="md:w-4 md:h-4" />
            <span className="hidden sm:inline">Back to Home</span>
            <span className="sm:hidden">Home</span>
          </Link>
          <ThemeToggle />
        </div>

        <div className="text-center mb-6 md:mb-8">
          <div className="flex flex-col items-center gap-3 md:gap-4 mb-4 md:mb-6">
            <div className="p-2 md:p-3 border-2 rounded-xl">
              <img
                src="/mouau_logo.webp"
                alt="MOUAU Logo"
                className="h-10 w-10 md:h-12 md:w-12 object-contain"
              />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-1 md:mb-2">
                MOUAU ClassMate
              </h1>
              <p className="text-sm md:text-base text-muted-foreground">
                Teacher Registration
              </p>
            </div>
          </div>
        </div>

        <Stepper />

        {errors.submit && (
          <div className="mb-4 md:mb-6 p-3 md:p-4 bg-error/10 border border-error/20 rounded-lg">
            <p className="text-error text-xs md:text-sm">{errors.submit}</p>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4 md:space-y-6">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-foreground mb-2">
                Teacher Terms & Conditions
              </h2>
              <p className="text-sm md:text-base text-muted-foreground mb-4 md:mb-6">
                Please read and accept the terms to continue with registration
              </p>
            </div>

            <div className="bg-background/50 border border-border rounded-lg p-4 md:p-6 max-h-[400px] md:max-h-96 overflow-y-auto">
              <div className="text-center mb-4 md:mb-6">
                <div className="p-2 md:p-3 bg-primary/10 rounded-full w-12 h-12 md:w-16 md:h-16 mx-auto mb-3 md:mb-4 flex items-center justify-center">
                  <GraduationCap className="h-6 w-6 md:h-8 md:w-8 text-primary" />
                </div>
                <h3 className="text-lg md:text-xl font-bold text-foreground mb-2">
                  {TEACHER_AGREEMENT_CONTENT.title}
                </h3>
                <p className="text-xs md:text-sm text-muted-foreground">
                  Last updated: {TEACHER_AGREEMENT_CONTENT.lastUpdated}
                </p>
              </div>

              <div className="space-y-4 md:space-y-6">
                {TEACHER_AGREEMENT_CONTENT.sections.map((section, index) => (
                  <div
                    key={index}
                    className="border-l-4 border-primary/20 pl-3 md:pl-4"
                  >
                    <h4 className="font-semibold text-sm md:text-base text-foreground mb-1.5 md:mb-2">
                      {section.title}
                    </h4>
                    <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                      {section.content}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-4 md:mt-6 p-3 md:p-4 bg-card border border-accent/20 rounded-lg">
                <div className="flex items-start gap-2 md:gap-3">
                  <Shield className="h-4 w-4 md:h-5 md:w-5 text-accent mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs md:text-sm font-medium text-foreground mb-1">
                      Important Notice
                    </p>
                    <p className="text-[10px] md:text-xs text-muted-foreground">
                      You must accept these terms every time you access the
                      registration form. This ensures you are always aware of
                      your rights and responsibilities as a MOUAU faculty
                      member.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3 md:space-y-4">
              <div className="flex items-start gap-2 md:gap-3 p-3 md:p-4 bg-muted/30 rounded-lg border border-border">
                <input
                  type="checkbox"
                  id="agreement"
                  checked={agreementAccepted}
                  onChange={(e) => setAgreementAccepted(e.target.checked)}
                  className="mt-0.5 md:mt-1 w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary focus:ring-2"
                />
                <label
                  htmlFor="agreement"
                  className="text-xs md:text-sm text-foreground"
                >
                  <span className="font-medium">
                    I have read, understood, and agree to the Teacher Terms &
                    Conditions
                  </span>
                  <p className="text-muted-foreground text-[10px] md:text-xs mt-1">
                    By accepting, you acknowledge that you understand your
                    rights and responsibilities as a MOUAU ClassMate teacher.
                  </p>
                </label>
              </div>

              {errors.agreement && (
                <div className="p-2.5 md:p-3 bg-error/10 border border-error/20 rounded-lg">
                  <p className="text-error text-xs md:text-sm flex items-center gap-2">
                    <AlertCircle size={14} className="md:w-4 md:h-4" />
                    {errors.agreement}
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={handleAgreementAccept}
              disabled={!agreementAccepted}
              className="w-full py-2.5 md:py-3 text-sm md:text-base bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Accept & Continue
              <ArrowRight size={16} className="md:w-[18px] md:h-[18px]" />
            </button>
          </div>
        )}

        {step === 2 && (
          <form
            onSubmit={handleVerifyTeacher}
            className="space-y-4 md:space-y-6"
          >
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-foreground mb-2">
                Teacher Verification
              </h2>
              <p className="text-sm md:text-base text-muted-foreground mb-4 md:mb-6">
                Enter your Employee ID to begin registration
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs md:text-sm font-medium text-foreground mb-2">
                  Employee ID *
                </label>
                <input
                  type="text"
                  value={formData.employeeId}
                  onChange={(e) => {
                    const value = e.target.value.toUpperCase();
                    handleInputChange("employeeId", value);
                  }}
                  placeholder="e.g., MOUAU/STAFF/12345"
                  className={`form-input w-full px-3 md:px-4 py-2.5 md:py-3 text-sm md:text-base rounded-lg border focus:ring-2 focus:ring-primary focus:border-transparent ${
                    errors.employeeId ? "border-error" : "border-border"
                  }`}
                />
                {errors.employeeId && (
                  <p className="text-error text-[10px] md:text-xs mt-1 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-error rounded-full"></span>
                    {errors.employeeId}
                  </p>
                )}
              </div>

              <div className="bg-muted/50 rounded-lg p-3 md:p-4">
                <div className="flex items-start gap-2 md:gap-3">
                  <div className="p-1 bg-primary/20 rounded">
                    <School className="h-3 w-3 md:h-4 md:w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs md:text-sm font-medium text-foreground mb-1">
                      Employee ID Format
                    </p>
                    <div className="text-[10px] md:text-xs text-foreground space-y-1">
                      <p>
                        • Must contain <span className="font-mono">/</span> or{" "}
                        <span className="font-mono">-</span>
                      </p>
                      <p>
                        • Example:{" "}
                        <span className="font-mono text-[9px] md:text-xs">
                          MOUAU/STAFF/12345
                        </span>
                      </p>
                      <p>
                        • Example:{" "}
                        <span className="font-mono text-[9px] md:text-xs">
                          MOUAU-STAFF-12345
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2 md:gap-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 py-2.5 md:py-3 text-sm md:text-base border border-border text-foreground font-semibold rounded-lg hover:bg-muted transition-colors flex items-center justify-center gap-1.5 md:gap-2"
              >
                <ArrowLeft size={16} className="md:w-[18px] md:h-[18px]" />
                Back
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 py-2.5 md:py-3 text-sm md:text-base bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-1.5 md:gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-3.5 w-3.5 md:h-4 md:w-4 border-2 border-white border-t-transparent" />
                    <span className="hidden sm:inline">Verifying...</span>
                    <span className="sm:hidden">Wait...</span>
                  </>
                ) : (
                  <>
                    <span className="hidden sm:inline">
                      Verify and Continue
                    </span>
                    <span className="sm:hidden">Verify</span>
                    <ArrowRight size={16} className="md:w-[18px] md:h-[18px]" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={handleStep3Submit} className="space-y-4 md:space-y-6">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-foreground mb-2">
                {manualEntry ? "Enter Your Details" : "Confirm Your Details"}
              </h2>
              <p className="text-sm md:text-base text-muted-foreground mb-4 md:mb-6">
                {manualEntry
                  ? "Please provide your teacher information"
                  : "Please review and confirm your details"}
              </p>
            </div>

            {/* Profile Photo Section */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs md:text-sm font-medium text-foreground mb-2">
                  Profile Photo
                </label>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    {photoPreview ? (
                      <img
                        src={photoPreview}
                        alt="Profile"
                        className="w-20 h-20 md:w-24 md:h-24 rounded-full object-cover border-2 border-border"
                      />
                    ) : (
                      <div className="w-20 h-20 md:w-24 md:h-24 bg-muted rounded-full flex items-center justify-center border-2 border-border">
                        <User className="h-8 w-8 md:h-10 md:w-10 text-muted-foreground" />
                      </div>
                    )}
                    <label
                      htmlFor="photo-upload"
                      className="absolute bottom-0 right-0 w-6 h-6 md:w-8 md:h-8 bg-primary rounded-full flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors"
                    >
                      <Camera className="h-3 w-3 md:h-4 md:w-4 text-white" />
                    </label>
                    <input
                      id="photo-upload"
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                  </div>
                  <div>
                    <p className="text-xs md:text-sm text-foreground">
                      Upload a professional photo
                    </p>
                    <p className="text-[10px] md:text-xs text-muted-foreground">
                      JPG, PNG up to 5MB
                    </p>
                    {errors.photo && (
                      <p className="text-error text-[10px] md:text-xs mt-1">
                        {errors.photo}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-3 md:gap-4">
              <div>
                <label className="block text-xs md:text-sm font-medium text-foreground mb-2">
                  Surname *
                </label>
                <input
                  type="text"
                  value={formData.surname}
                  onChange={(e) => handleInputChange("surname", e.target.value)}
                  className={`form-input w-full px-3 md:px-4 py-2.5 md:py-3 text-sm md:text-base rounded-lg border focus:ring-2 focus:ring-primary focus:border-transparent ${
                    errors.surname ? "border-error" : "border-border"
                  }`}
                />
                {errors.surname && (
                  <p className="text-error text-[10px] md:text-xs mt-1">
                    {errors.surname}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs md:text-sm font-medium text-foreground mb-2">
                  First Name *
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) =>
                    handleInputChange("firstName", e.target.value)
                  }
                  className={`form-input w-full px-3 md:px-4 py-2.5 md:py-3 text-sm md:text-base rounded-lg border focus:ring-2 focus:ring-primary focus:border-transparent ${
                    errors.firstName ? "border-error" : "border-border"
                  }`}
                />
                {errors.firstName && (
                  <p className="text-error text-[10px] md:text-xs mt-1">
                    {errors.firstName}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs md:text-sm font-medium text-foreground mb-2">
                  Other Names
                </label>
                <input
                  type="text"
                  value={formData.otherName}
                  onChange={(e) =>
                    handleInputChange("otherName", e.target.value)
                  }
                  className="form-input w-full px-3 md:px-4 py-2.5 md:py-3 text-sm md:text-base rounded-lg border border-border focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-xs md:text-sm font-medium text-foreground mb-2">
                  Gender *
                </label>
                <select
                  value={formData.gender}
                  onChange={(e) => handleInputChange("gender", e.target.value)}
                  className={`form-input w-full px-3 md:px-4 py-2.5 md:py-3 text-sm md:text-base rounded-lg border focus:ring-2 focus:ring-primary focus:border-transparent ${
                    errors.gender ? "border-error" : "border-border"
                  }`}
                >
                  <option value="">Select Gender</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                </select>
                {errors.gender && (
                  <p className="text-error text-[10px] md:text-xs mt-1">
                    {errors.gender}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs md:text-sm font-medium text-foreground mb-2">
                  College *
                </label>
                <select
                  value={formData.college}
                  onChange={(e) => handleInputChange("college", e.target.value)}
                  className={`form-input w-full px-3 md:px-4 py-2.5 md:py-3 text-sm md:text-base rounded-lg border focus:ring-2 focus:ring-primary focus:border-transparent ${
                    errors.college ? "border-error" : "border-border"
                  }`}
                >
                  <option value="">Select College</option>
                  <option value="COLPAS">
                    COLPAS - Physical & Applied Sciences
                  </option>
                  <option value="COLNAS">COLNAS - Natural Sciences</option>
                  <option value="COLAMRUD">
                    COLAMRUD - Agricultural Management
                  </option>
                  <option value="COLENG">COLENG - Engineering</option>
                </select>
                {errors.college && (
                  <p className="text-error text-[10px] md:text-xs mt-1">
                    {errors.college}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs md:text-sm font-medium text-foreground mb-2">
                  Department *
                </label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) =>
                    handleInputChange("department", e.target.value)
                  }
                  className={`form-input w-full px-3 md:px-4 py-2.5 md:py-3 text-sm md:text-base rounded-lg border focus:ring-2 focus:ring-primary focus:border-transparent ${
                    errors.department ? "border-error" : "border-border"
                  }`}
                />
                {errors.department && (
                  <p className="text-error text-[10px] md:text-xs mt-1">
                    {errors.department}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs md:text-sm font-medium text-foreground mb-2">
                  Academic Rank *
                </label>
                <select
                  value={formData.rank}
                  onChange={(e) => handleInputChange("rank", e.target.value)}
                  className={`form-input w-full px-3 md:px-4 py-2.5 md:py-3 text-sm md:text-base rounded-lg border focus:ring-2 focus:ring-primary focus:border-transparent ${
                    errors.rank ? "border-error" : "border-border"
                  }`}
                >
                  <option value="">Select Rank</option>
                  <option value="Professor">Professor</option>
                  <option value="Associate Professor">
                    Associate Professor
                  </option>
                  <option value="Senior Lecturer">Senior Lecturer</option>
                  <option value="Lecturer I">Lecturer I</option>
                  <option value="Lecturer II">Lecturer II</option>
                  <option value="Assistant Lecturer">Assistant Lecturer</option>
                  <option value="Graduate Assistant">Graduate Assistant</option>
                </select>
                {errors.rank && (
                  <p className="text-error text-[10px] md:text-xs mt-1">
                    {errors.rank}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs md:text-sm font-medium text-foreground mb-2">
                  State *
                </label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => handleInputChange("state", e.target.value)}
                  className={`form-input w-full px-3 md:px-4 py-2.5 md:py-3 text-sm md:text-base rounded-lg border focus:ring-2 focus:ring-primary focus:border-transparent ${
                    errors.state ? "border-error" : "border-border"
                  }`}
                />
                {errors.state && (
                  <p className="text-error text-[10px] md:text-xs mt-1">
                    {errors.state}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs md:text-sm font-medium text-foreground mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  className={`form-input w-full px-3 md:px-4 py-2.5 md:py-3 text-sm md:text-base rounded-lg border focus:ring-2 focus:ring-primary focus:border-transparent ${
                    errors.email ? "border-error" : "border-border"
                  }`}
                />
                {errors.email && (
                  <p className="text-error text-[10px] md:text-xs mt-1">
                    {errors.email}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs md:text-sm font-medium text-foreground mb-2">
                  Phone *
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  className={`form-input w-full px-3 md:px-4 py-2.5 md:py-3 text-sm md:text-base rounded-lg border focus:ring-2 focus:ring-primary focus:border-transparent ${
                    errors.phone ? "border-error" : "border-border"
                  }`}
                />
                {errors.phone && (
                  <p className="text-error text-[10px] md:text-xs mt-1">
                    {errors.phone}
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-2 md:gap-4">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex-1 py-2.5 md:py-3 text-sm md:text-base border border-border text-foreground font-semibold rounded-lg hover:bg-muted transition-colors flex items-center justify-center gap-1.5 md:gap-2"
              >
                <ArrowLeft size={16} className="md:w-[18px] md:h-[18px]" />
                Back
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 md:py-3 text-sm md:text-base bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-1.5 md:gap-2"
              >
                Continue
                <ArrowRight size={16} className="md:w-[18px] md:h-[18px]" />
              </button>
            </div>
          </form>
        )}

        {step === 4 && (
          <form onSubmit={handleStep4Submit} className="space-y-4 md:space-y-6">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-foreground mb-2">
                Create Password
              </h2>
              <p className="text-sm md:text-base text-muted-foreground mb-4 md:mb-6">
                Create a secure password for your account
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs md:text-sm font-medium text-foreground mb-2">
                  Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) =>
                      handleInputChange("password", e.target.value)
                    }
                    className={`form-input w-full px-3 md:px-4 py-2.5 md:py-3 pr-10 text-sm md:text-base rounded-lg border focus:ring-2 focus:ring-primary focus:border-transparent ${
                      errors.password ? "border-error" : "border-border"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
                  >
                    {showPassword ? (
                      <EyeOff size={16} className="md:w-[18px] md:h-[18px]" />
                    ) : (
                      <Eye size={16} className="md:w-[18px] md:h-[18px]" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-error text-[10px] md:text-xs mt-1">
                    {errors.password}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs md:text-sm font-medium text-foreground mb-2">
                  Confirm Password *
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      handleInputChange("confirmPassword", e.target.value)
                    }
                    className={`form-input w-full px-3 md:px-4 py-2.5 md:py-3 pr-10 text-sm md:text-base rounded-lg border focus:ring-2 focus:ring-primary focus:border-transparent ${
                      errors.confirmPassword ? "border-error" : "border-border"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={16} className="md:w-[18px] md:h-[18px]" />
                    ) : (
                      <Eye size={16} className="md:w-[18px] md:h-[18px]" />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-error text-[10px] md:text-xs mt-1">
                    {errors.confirmPassword}
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-2 md:gap-4">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="flex-1 py-2.5 md:py-3 text-sm md:text-base border border-border text-foreground font-semibold rounded-lg hover:bg-muted transition-colors flex items-center justify-center gap-1.5 md:gap-2"
              >
                <ArrowLeft size={16} className="md:w-[18px] md:h-[18px]" />
                Back
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 md:py-3 text-sm md:text-base bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-1.5 md:gap-2"
              >
                Continue
                <ArrowRight size={16} className="md:w-[18px] md:h-[18px]" />
              </button>
            </div>
          </form>
        )}

        {step === 5 && (
          <form onSubmit={handleFinalSubmit} className="space-y-4 md:space-y-6">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-foreground mb-2">
                Review Your Information
              </h2>
              <p className="text-sm md:text-base text-muted-foreground mb-4 md:mb-6">
                Please review all your information before submitting
              </p>
            </div>

            <div className="bg-background/30 rounded-lg p-4 md:p-6 space-y-3 md:space-y-4">
              <div className="grid md:grid-cols-2 gap-3 md:gap-4">
                <div>
                  <label className="text-xs md:text-sm font-medium text-muted-foreground">
                    Employee ID
                  </label>
                  <p className="font-medium text-sm md:text-base text-foreground">
                    {formData.employeeId}
                  </p>
                </div>
                <div>
                  <label className="text-xs md:text-sm font-medium text-muted-foreground">
                    Full Name
                  </label>
                  <p className="font-medium text-sm md:text-base text-foreground">
                    {formData.surname} {formData.firstName} {formData.otherName}
                  </p>
                </div>
                <div>
                  <label className="text-xs md:text-sm font-medium text-muted-foreground">
                    Gender
                  </label>
                  <p className="font-medium text-sm md:text-base text-foreground">
                    {formData.gender}
                  </p>
                </div>
                <div>
                  <label className="text-xs md:text-sm font-medium text-muted-foreground">
                    College
                  </label>
                  <p className="font-medium text-sm md:text-base text-foreground">
                    {formData.college}
                  </p>
                </div>
                <div>
                  <label className="text-xs md:text-sm font-medium text-muted-foreground">
                    Department
                  </label>
                  <p className="font-medium text-sm md:text-base text-foreground">
                    {formData.department}
                  </p>
                </div>
                <div>
                  <label className="text-xs md:text-sm font-medium text-muted-foreground">
                    Academic Rank
                  </label>
                  <p className="font-medium text-sm md:text-base text-foreground">
                    {formData.rank}
                  </p>
                </div>
                <div>
                  <label className="text-xs md:text-sm font-medium text-muted-foreground">
                    Email
                  </label>
                  <p className="font-medium text-sm md:text-base text-foreground">
                    {formData.email.substring(0, 3) +
                      "***" +
                      formData.email.substring(formData.email.indexOf("@"))}
                  </p>
                </div>
                <div>
                  <label className="text-xs md:text-sm font-medium text-muted-foreground">
                    Phone
                  </label>
                  <p className="font-medium text-sm md:text-base text-foreground">
                    {formData.phone.substring(0, 4) +
                      "***" +
                      formData.phone.substring(formData.phone.length - 3)}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2 md:gap-3 p-3 md:p-4 bg-primary/10 rounded-lg border border-primary/20">
              <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-xs md:text-sm text-foreground font-medium">
                  Email Verification Required
                </p>
                <p className="text-[10px] md:text-xs text-muted-foreground mt-1">
                  After submission, you'll receive a verification email to
                  activate your account.
                </p>
              </div>
            </div>

            <div className="flex gap-2 md:gap-4">
              <button
                type="button"
                onClick={() => setStep(4)}
                className="flex-1 py-2.5 md:py-3 text-sm md:text-base border border-border text-foreground font-semibold rounded-lg hover:bg-muted transition-colors flex items-center justify-center gap-1.5 md:gap-2"
              >
                <ArrowLeft size={16} className="md:w-[18px] md:h-[18px]" />
                Back
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 py-2.5 md:py-3 text-sm md:text-base bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-1.5 md:gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-3.5 w-3.5 md:h-4 md:w-4 border-2 border-white border-t-transparent" />
                    <span className="hidden sm:inline">Submitting...</span>
                    <span className="sm:hidden">Wait...</span>
                  </>
                ) : (
                  <>
                    Finish
                    <CheckCircle
                      size={16}
                      className="md:w-[18px] md:h-[18px]"
                    />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {step === 6 && (
          <div className="text-center space-y-4 md:space-y-6">
            <div className="p-3 md:p-4 bg-primary/10 rounded-full w-16 h-16 md:w-20 md:h-20 mx-auto flex items-center justify-center">
              <CheckCircle className="h-8 w-8 md:h-10 md:w-10 text-primary" />
            </div>

            <div>
              <h2 className="text-xl md:text-2xl font-bold text-foreground mb-2">
                Registration Complete!
              </h2>
              <p className="text-sm md:text-base text-muted-foreground mb-3 md:mb-4">
                Welcome to MOUAU ClassMate, {formData.firstName}!
              </p>
            </div>

            <div className="bg-background/30 rounded-lg p-4 md:p-6">
              <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
                <Mail className="h-4 w-4 md:h-5 md:w-5 text-primary shrink-0" />
                <div className="text-left">
                  <p className="font-medium text-foreground text-xs md:text-sm">
                    Check Your Email
                  </p>
                  <p className="text-muted-foreground text-[10px] md:text-xs">
                    We've sent a verification link to{" "}
                    {formData.email.substring(0, 3) +
                      "***" +
                      formData.email.substring(formData.email.indexOf("@"))}
                  </p>
                </div>
              </div>
              <p className="text-[10px] md:text-xs text-muted-foreground">
                Click the verification link in your email to activate your
                account and start using MOUAU ClassMate.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 md:gap-4">
              <Link
                href="/auth/signin"
                className="flex-1 py-2.5 md:py-3 text-sm md:text-base bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors text-center"
              >
                Sign In Now
              </Link>
              <Link
                href="/"
                className="flex-1 py-2.5 md:py-3 text-sm md:text-base border border-border text-foreground font-semibold rounded-lg hover:bg-muted transition-colors text-center"
              >
                Back to Home
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
