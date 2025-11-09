// app/auth/signup/page.tsx
"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
} from "lucide-react";
import { ThemeToggle } from "@/app/components/theme-toggle";

// Helper to safely check if sessionStorage is available
const isSessionStorageAvailable = (): boolean => {
  try {
    if (typeof window === "undefined") return false;
    const test = "__storage_test__";
    window.sessionStorage.setItem(test, test);
    window.sessionStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
};

// In-memory storage
let inMemoryRoleData: { role: string; timestamp: number } | null = null;

// Helper functions for masking
const maskEmail = (email: string) => {
  const [local, domain] = email.split("@");
  const maskedLocal = local.substring(0, 3) + "*".repeat(local.length - 3);
  const [domainName, tld] = domain.split(".");
  const maskedDomain =
    domainName.substring(0, 2) + "*".repeat(domainName.length - 2);
  return `${maskedLocal}@${maskedDomain}.${tld}`;
};

const maskPhone = (phone: string) => {
  return (
    phone.substring(0, 4) +
    "*".repeat(phone.length - 7) +
    phone.substring(phone.length - 3)
  );
};

// Validation functions
const isValidMatricNumber = (matric: string): boolean => {
  const regex = /^[A-Za-z0-9\/-]{7,}$/;
  return regex.test(matric);
};

const isValidJambReg = (jamb: string): boolean => {
  return /^\d{10,13}[A-Z]{2}$/.test(jamb);
};

// Enhanced Agreement content
const AGREEMENT_CONTENT = {
  title: "MOUAU ClassMate Terms & Conditions",
  lastUpdated: "December 2024",
  sections: [
    {
      title: "1. Acceptance of Terms",
      content:
        "By registering for MOUAU ClassMate, you agree to abide by the university's code of conduct and all applicable policies governing student behavior and academic integrity. These terms constitute a legally binding agreement between you and Michael Okpara University of Agriculture, Umudike (MOUAU).",
    },
    {
      title: "2. Eligibility",
      content:
        "This platform is exclusively for currently enrolled students of MOUAU. You must provide accurate and complete registration information, including a valid matriculation number. Any falsification of information may result in immediate account termination and disciplinary action.",
    },
    {
      title: "3. Data Privacy & Protection",
      content:
        "Your personal information will be protected in accordance with the Nigerian Data Protection Regulation (NDPR) 2019 and used solely for academic and administrative purposes within MOUAU. We collect and process data including your name, matriculation number, contact information, academic records, and usage data. You have the right to access, correct, or request deletion of your personal data subject to legal and institutional requirements.",
    },
    {
      title: "4. Academic Integrity",
      content:
        "You agree to maintain academic honesty and not misuse the platform for any form of academic misconduct, including plagiarism, unauthorized collaboration, cheating, or sharing of examination materials. Violation of academic integrity policies may result in disciplinary action ranging from grade penalties to expulsion, as outlined in the university's student handbook.",
    },
    {
      title: "5. Platform Usage & Conduct",
      content:
        "The ClassMate platform is for legitimate academic purposes only. Prohibited activities include: spamming, harassment, bullying, posting offensive content, distributing malware, unauthorized commercial activities, impersonation, and any illegal activities. The university reserves the right to monitor platform usage and take appropriate action against violations.",
    },
    {
      title: "6. Account Security & Responsibility",
      content:
        "You are solely responsible for maintaining the confidentiality of your login credentials and for all activities that occur under your account. You must immediately notify the university of any unauthorized access or security breach. You agree not to share your account credentials with others or allow others to access your account.",
    },
    {
      title: "7. Communication & Notifications",
      content:
        "You consent to receive official university communications through the platform, including course announcements, grades, examination schedules, fee reminders, and important updates. It is your responsibility to regularly check the platform for new communications. The university is not liable for any consequences resulting from failure to check notifications.",
    },
    {
      title: "8. Intellectual Property Rights",
      content:
        "All content provided through the platform, including course materials, lectures, assignments, and multimedia resources, remains the intellectual property of MOUAU and respective content creators. You are granted a limited, non-exclusive license to access and use materials solely for personal educational purposes. Unauthorized reproduction, distribution, or commercial use is strictly prohibited.",
    },
    {
      title: "9. Service Availability",
      content:
        "While we strive to maintain continuous service availability, MOUAU does not guarantee uninterrupted access to the platform. The university reserves the right to modify, suspend, or discontinue any aspect of the service without prior notice for maintenance, upgrades, or other operational needs. We are not liable for any disruption of service.",
    },
    {
      title: "10. Limitation of Liability",
      content:
        "MOUAU and its affiliates shall not be liable for any direct, indirect, incidental, consequential, or punitive damages arising from your use of the platform. This includes but is not limited to loss of data, grades, academic opportunities, or any other damages. Your use of the platform is at your own risk.",
    },
    {
      title: "11. User-Generated Content",
      content:
        "You retain ownership of content you submit but grant MOUAU a worldwide, non-exclusive, royalty-free license to use, display, and distribute such content for educational and administrative purposes. You are responsible for ensuring your content does not violate any third-party rights or applicable laws.",
    },
    {
      title: "12. Disciplinary Action",
      content:
        "Violations of these terms may result in account suspension, permanent termination, and/or referral to university disciplinary authorities. The university reserves the right to investigate violations and cooperate with law enforcement when necessary.",
    },
    {
      title: "13. Amendments",
      content:
        "MOUAU reserves the right to modify these terms at any time. You will be notified of significant changes through the platform or via email. Continued use of the platform after modifications constitutes acceptance of the updated terms. You are encouraged to review these terms periodically.",
    },
    {
      title: "14. Governing Law",
      content:
        "These terms are governed by the laws of the Federal Republic of Nigeria. Any disputes arising from these terms or platform usage shall be subject to the exclusive jurisdiction of Nigerian courts.",
    },
    {
      title: "15. Contact & Support",
      content:
        "For questions about these terms, data privacy concerns, or technical support, contact the MOUAU IT Help Desk at support@mouau.edu.ng or visit the ICT Centre on campus during working hours.",
    },
  ],
};

export default function SignupPage() {
  const router = useRouter();
  const [roleValidated, setRoleValidated] = useState(false);
  const [roleLoading, setRoleLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    matricNumber: "",
    jambReg: "",
    surname: "",
    firstName: "",
    otherName: "",
    gender: "",
    photo: "",
    college: "",
    department: "",
    course: "",
    state: "",
    lga: "",
    maritalStatus: "",
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

  // Role validation on mount
  useEffect(() => {
    const validateRole = () => {
      setRoleLoading(true);

      try {
        let data: { role: string; timestamp: number } | null = null;

        // Check sessionStorage first if available
        if (isSessionStorageAvailable()) {
          const storedData = sessionStorage.getItem("selectedRole");
          if (storedData) {
            data = JSON.parse(storedData);
            // Sync to in-memory
            inMemoryRoleData = data;
          }
        }

        // Fallback to in-memory if sessionStorage not available or empty
        if (!data && inMemoryRoleData) {
          data = inMemoryRoleData;
        }

        if (!data) {
          throw new Error("No role selected");
        }

        // Check if data is expired (30 minutes)
        const maxAge = 30 * 60 * 1000;
        const isExpired = Date.now() - data.timestamp > maxAge;

        if (isExpired) {
          inMemoryRoleData = null;
          if (isSessionStorageAvailable()) {
            sessionStorage.removeItem("selectedRole");
          }
          throw new Error("Role selection expired");
        }

        // Validate that it's student role
        if (data.role !== "student") {
          throw new Error("Invalid role. Student role required.");
        }

        setRoleValidated(true);
      } catch (error) {
        console.error("Role validation failed:", error);
        inMemoryRoleData = null;
        if (isSessionStorageAvailable()) {
          sessionStorage.removeItem("selectedRole");
        }
        router.push("/select-role");
      } finally {
        setRoleLoading(false);
      }
    };

    validateRole();
  }, [router]);

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

  const handleVerifyStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const matricNumber = formData.matricNumber.trim().toUpperCase();

    if (!matricNumber) {
      setErrorWithTimeout({
        matricNumber: "Please enter your Matriculation Number",
      });
      return;
    }

    if (!isValidMatricNumber(matricNumber)) {
      setErrorWithTimeout({
        matricNumber:
          "Please enter a valid Matric Number (e.g., MOUAU/20/12345)",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/auth/signup/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ identifier: matricNumber }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Verification failed");
      }

      setVerificationResult(result);

      if (result.exists && result.data) {
        setFormData((prev) => ({
          ...prev,
          ...result.data,
          matricNumber: matricNumber,
          jambReg: result.data.jambReg || "",
        }));
        setManualEntry(false);
        setStep(3);
      } else if (result.requiresManualEntry) {
        setManualEntry(true);
        setStep(3);
      } else {
        setErrorWithTimeout({
          matricNumber:
            "Student not found. Please check your matric number and try again.",
        });
      }
    } catch (error) {
      console.error("Verification error:", error);
      setErrorWithTimeout({
        matricNumber:
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
    if (!formData.course) newErrors.course = "Course is required";
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

    if (formData.jambReg && !isValidJambReg(formData.jambReg)) {
      newErrors.jambReg =
        "Please enter a valid JAMB registration number (10-13 digits + 2 letters)";
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
      const registrationData = {
        matricNumber: formData.matricNumber,
        jambReg: formData.jambReg || "",
        studentData: {
          surname: formData.surname,
          firstName: formData.firstName,
          otherName: formData.otherName,
          gender: formData.gender,
          photo: formData.photo,
          college: formData.college,
          department: formData.department,
          course: formData.course,
          state: formData.state,
          lga: formData.lga,
          maritalStatus: formData.maritalStatus,
          email: formData.email,
          phone: formData.phone,
        },
        password: formData.password,
      };

      const response = await fetch("/auth/signup/student", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(registrationData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Registration failed");
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

  // Show loading state while validating role
  if (roleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">
            Verifying role access...
          </p>
        </div>
      </div>
    );
  }

  // If role validation failed, show error (though redirect should happen)
  if (!roleValidated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md mx-auto p-6 bg-card rounded-lg border border-border shadow-lg">
          <div className="mb-4 text-warning">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-16 w-16 mx-auto"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Access Denied
          </h2>
          <p className="text-muted-foreground mb-4">
            Please select Student role to access this registration form.
          </p>
          <button
            onClick={() => router.push("/select-role")}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Select Role
          </button>
        </div>
      </div>
    );
  }

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
                Student Registration
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

        {/* Rest of your form steps remain the same */}
        {step === 1 && (
          <div className="space-y-4 md:space-y-6">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-foreground mb-2">
                Terms & Conditions
              </h2>
              <p className="text-sm md:text-base text-muted-foreground mb-4 md:mb-6">
                Please read and accept the terms to continue with registration
              </p>
            </div>

            <div className="bg-background/50 border border-border rounded-lg p-4 md:p-6 max-h-[400px] md:max-h-96 overflow-y-auto">
              <div className="text-center mb-4 md:mb-6">
                <div className="p-2 md:p-3 bg-primary/10 rounded-full w-12 h-12 md:w-16 md:h-16 mx-auto mb-3 md:mb-4 flex items-center justify-center">
                  <FileText className="h-6 w-6 md:h-8 md:w-8 text-primary" />
                </div>
                <h3 className="text-lg md:text-xl font-bold text-foreground mb-2">
                  {AGREEMENT_CONTENT.title}
                </h3>
                <p className="text-xs md:text-sm text-muted-foreground">
                  Last updated: {AGREEMENT_CONTENT.lastUpdated}
                </p>
              </div>

              <div className="space-y-4 md:space-y-6">
                {AGREEMENT_CONTENT.sections.map((section, index) => (
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
                      your rights and responsibilities.
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
                    I have read, understood, and agree to the Terms & Conditions
                  </span>
                  <p className="text-muted-foreground text-[10px] md:text-xs mt-1">
                    By accepting, you acknowledge that you understand your
                    rights and responsibilities as a MOUAU ClassMate user.
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

        {/* Include all other steps (2-6) from your original code here */}
        {/* For brevity, I'm not repeating them all, but they should remain unchanged */}
      </div>
    </div>
  );
}
