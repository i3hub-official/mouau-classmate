// app/auth/signup/page.tsx
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
} from "lucide-react";
import { ThemeToggle } from "@/app/components/theme-toggle";

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

export default function SignupPage() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    // Step 1
    matricNumber: "",
    jambReg: "",

    // Step 2
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

    // Step 3
    password: "",
    confirmPassword: "",
  });

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

  // Step 1: Verify student using API
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

    // Validate matric number format
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
        // Auto-fill form with verified data including JAMB reg if available
        setFormData((prev) => ({
          ...prev,
          ...result.data,
          matricNumber: matricNumber,
          jambReg: result.data.jambReg || "", // Use verified JAMB reg or empty
        }));
        setManualEntry(false);
        setStep(2);
      } else if (result.requiresManualEntry) {
        setManualEntry(true);
        setStep(2);
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

  // Step 2: Handle manual form input
  const handleStep2Submit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    // Required fields
    if (!formData.surname) newErrors.surname = "Surname is required";
    if (!formData.firstName) newErrors.firstName = "First name is required";
    if (!formData.gender) newErrors.gender = "Gender is required";
    if (!formData.college) newErrors.college = "College is required";
    if (!formData.department) newErrors.department = "Department is required";
    if (!formData.course) newErrors.course = "Course is required";
    if (!formData.email) newErrors.email = "Email is required";
    if (!formData.phone) newErrors.phone = "Phone number is required";

    // Email validation
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    // Phone validation
    if (
      formData.phone &&
      !/^\+?[\d\s-()]{10,}$/.test(formData.phone.replace(/\s/g, ""))
    ) {
      newErrors.phone = "Please enter a valid phone number";
    }

    // JAMB registration validation (optional but must be valid if provided)
    if (!formData.jambReg && !isValidJambReg(formData.jambReg)) {
      newErrors.jambReg =
        "Please enter a valid JAMB registration number (10-13 digits + 2 letters)";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrorWithTimeout(newErrors);
      return;
    }

    setStep(3);
  };

  // Step 3: Password setup
  const handleStep3Submit = (e: React.FormEvent) => {
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

    setStep(4);
  };

  // Step 4: Final submission using API
  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const registrationData = {
        matricNumber: formData.matricNumber,
        jambReg: formData.jambReg || "", // Send empty if no JAMB reg
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

      setStep(5);
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
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Stepper component
  const Stepper = () => (
    <div className="mb-8">
      <div className="flex items-center justify-between max-w-2xl mx-auto">
        {[1, 2, 3, 4, 5].map((stepNumber) => (
          <div key={stepNumber} className="flex flex-col items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                stepNumber < step
                  ? "bg-primary border-primary text-white"
                  : stepNumber === step
                  ? "border-primary bg-primary text-white"
                  : "border-border text-muted-foreground"
              }`}
            >
              {stepNumber < step ? <CheckCircle size={18} /> : stepNumber}
            </div>
            <div
              className={`mt-2 text-xs font-medium ${
                stepNumber <= step ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {stepNumber === 1 && "Verify"}
              {stepNumber === 2 && "Details"}
              {stepNumber === 3 && "Password"}
              {stepNumber === 4 && "Review"}
              {stepNumber === 5 && "Complete"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-background via-accent/5 to-primary/5 p-4">
      <div className="w-full max-w-2xl bg-card border border-border rounded-xl p-8 shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Home size={16} />
            Back to Home
          </Link>
          <ThemeToggle />
        </div>

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex flex-col items-center gap-4 mb-6">
            <div className="p-3 border-2 rounded-xl">
              <img
                src="/mouau_logo.webp"
                alt="MOUAU Logo"
                className="h-12 w-12 object-contain"
              />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                MOUAU ClassMate
              </h1>
              <p className="text-muted-foreground">Student Registration</p>
            </div>
          </div>
        </div>

        <Stepper />

        {/* Global Error Display */}
        {errors.submit && (
          <div className="mb-6 p-4 bg-error/10 border border-error/20 rounded-lg">
            <p className="text-error text-sm">{errors.submit}</p>
          </div>
        )}

        {/* Step 1: Student Verification */}
        {step === 1 && (
          <form onSubmit={handleVerifyStudent} className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Student Verification
              </h2>
              <p className="text-muted-foreground mb-6">
                Enter your Matriculation Number to begin registration
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Matriculation Number *
                </label>
                <input
                  type="text"
                  value={formData.matricNumber}
                  onChange={(e) => {
                    const value = e.target.value.toUpperCase();
                    handleInputChange("matricNumber", value);
                  }}
                  placeholder="e.g., MOUAU/20/12345"
                  className={`form-input w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-primary focus:border-transparent ${
                    errors.matricNumber ? "border-error" : "border-border"
                  }`}
                />
                {errors.matricNumber && (
                  <p className="text-error text-xs mt-1 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-error rounded-full"></span>
                    {errors.matricNumber}
                  </p>
                )}
              </div>

              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="p-1 bg-primary/20 rounded">
                    <BookOpen className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground mb-1">
                      Matric Number Format
                    </p>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>
                        • Must contain <span className="font-mono">/</span> or{" "}
                        <span className="font-mono">-</span>
                      </p>
                      <p>
                        • Example:{" "}
                        <span className="font-mono">MOUAU/20/12345</span>
                      </p>
                      <p>
                        • Example:{" "}
                        <span className="font-mono">MOUAU-20-12345</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  Verifying...
                </>
              ) : (
                <>
                  Verify and Continue
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        )}

        {/* Step 2: Student Details */}
        {step === 2 && (
          <form onSubmit={handleStep2Submit} className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                {manualEntry ? "Enter Your Details" : "Confirm Your Details"}
              </h2>
              <p className="text-muted-foreground mb-6">
                {manualEntry
                  ? "Please provide your student information"
                  : "Please review and confirm your details"}
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {/* JAMB Registration (Optional) */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-2">
                  JAMB Registration Number
                </label>
                <input
                  type="text"
                  value={formData.jambReg}
                  onChange={(e) => {
                    const value = e.target.value.toUpperCase();
                    handleInputChange("jambReg", value);
                  }}
                  placeholder="e.g., 202112345678AB"
                  className={`form-input w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-primary focus:border-transparent ${
                    errors.jambReg ? "border-error" : "border-border"
                  }`}
                />
                {errors.jambReg && (
                  <p className="text-error text-xs mt-1">{errors.jambReg}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  10-13 digits followed by 2 letters (e.g., 202112345678AB)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Surname *
                </label>
                <input
                  type="text"
                  value={formData.surname}
                  onChange={(e) => handleInputChange("surname", e.target.value)}
                  className={`form-input w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-primary focus:border-transparent ${
                    errors.surname ? "border-error" : "border-border"
                  }`}
                />
                {errors.surname && (
                  <p className="text-error text-xs mt-1">{errors.surname}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  First Name *
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) =>
                    handleInputChange("firstName", e.target.value)
                  }
                  className={`form-input w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-primary focus:border-transparent ${
                    errors.firstName ? "border-error" : "border-border"
                  }`}
                />
                {errors.firstName && (
                  <p className="text-error text-xs mt-1">{errors.firstName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Other Names
                </label>
                <input
                  type="text"
                  value={formData.otherName}
                  onChange={(e) =>
                    handleInputChange("otherName", e.target.value)
                  }
                  className="form-input w-full px-4 py-3 rounded-lg border border-border focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Gender *
                </label>
                <select
                  value={formData.gender}
                  onChange={(e) => handleInputChange("gender", e.target.value)}
                  className={`form-input w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-primary focus:border-transparent ${
                    errors.gender ? "border-error" : "border-border"
                  }`}
                >
                  <option value="">Select Gender</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                </select>
                {errors.gender && (
                  <p className="text-error text-xs mt-1">{errors.gender}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  College *
                </label>
                <select
                  value={formData.college}
                  onChange={(e) => handleInputChange("college", e.target.value)}
                  className={`form-input w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-primary focus:border-transparent ${
                    errors.college ? "border-error" : "border-border"
                  }`}
                >
                  <option value="">Select College</option>
                  <option value="COLPAS">
                    COLPAS - College of Physical and Applied Sciences
                  </option>
                  <option value="COLNAS">
                    COLNAS - College of Natural Sciences
                  </option>
                  <option value="COLAMRUD">
                    COLAMRUD - College of Agricultural Management and Rural
                    Development
                  </option>
                  <option value="COLENG">
                    COLENG - College of Engineering and Engineering Technology
                  </option>
                </select>
                {errors.college && (
                  <p className="text-error text-xs mt-1">{errors.college}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Department *
                </label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) =>
                    handleInputChange("department", e.target.value)
                  }
                  className={`form-input w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-primary focus:border-transparent ${
                    errors.department ? "border-error" : "border-border"
                  }`}
                />
                {errors.department && (
                  <p className="text-error text-xs mt-1">{errors.department}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Course *
                </label>
                <input
                  type="text"
                  value={formData.course}
                  onChange={(e) => handleInputChange("course", e.target.value)}
                  className={`form-input w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-primary focus:border-transparent ${
                    errors.course ? "border-error" : "border-border"
                  }`}
                />
                {errors.course && (
                  <p className="text-error text-xs mt-1">{errors.course}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  className={`form-input w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-primary focus:border-transparent ${
                    errors.email ? "border-error" : "border-border"
                  }`}
                />
                {errors.email && (
                  <p className="text-error text-xs mt-1">{errors.email}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Phone *
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  className={`form-input w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-primary focus:border-transparent ${
                    errors.phone ? "border-error" : "border-border"
                  }`}
                />
                {errors.phone && (
                  <p className="text-error text-xs mt-1">{errors.phone}</p>
                )}
              </div>
            </div>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 py-3 border border-border text-foreground font-semibold rounded-lg hover:bg-muted transition-colors flex items-center justify-center gap-2"
              >
                <ArrowLeft size={18} />
                Back
              </button>
              <button
                type="submit"
                className="flex-1 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
              >
                Continue
                <ArrowRight size={18} />
              </button>
            </div>
          </form>
        )}

        {/* Step 3: Password Setup */}
        {step === 3 && (
          <form onSubmit={handleStep3Submit} className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Create Password
              </h2>
              <p className="text-muted-foreground mb-6">
                Create a secure password for your account
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) =>
                      handleInputChange("password", e.target.value)
                    }
                    className={`form-input w-full px-4 py-3 pr-10 rounded-lg border focus:ring-2 focus:ring-primary focus:border-transparent ${
                      errors.password ? "border-error" : "border-border"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-error text-xs mt-1">{errors.password}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Confirm Password *
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      handleInputChange("confirmPassword", e.target.value)
                    }
                    className={`form-input w-full px-4 py-3 pr-10 rounded-lg border focus:ring-2 focus:ring-primary focus:border-transparent ${
                      errors.confirmPassword ? "border-error" : "border-border"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-error text-xs mt-1">
                    {errors.confirmPassword}
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex-1 py-3 border border-border text-foreground font-semibold rounded-lg hover:bg-muted transition-colors flex items-center justify-center gap-2"
              >
                <ArrowLeft size={18} />
                Back
              </button>
              <button
                type="submit"
                className="flex-1 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
              >
                Continue
                <ArrowRight size={18} />
              </button>
            </div>
          </form>
        )}

        {/* Step 4: Review Data */}
        {step === 4 && (
          <form onSubmit={handleFinalSubmit} className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Review Your Information
              </h2>
              <p className="text-muted-foreground mb-6">
                Please review all your information before submitting
              </p>
            </div>

            <div className="bg-background/30 rounded-lg p-6 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Matric Number
                  </label>
                  <p className="font-medium text-foreground">
                    {formData.matricNumber}
                  </p>
                </div>
                {formData.jambReg && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      JAMB Reg Number
                    </label>
                    <p className="font-medium text-foreground">
                      {formData.jambReg}
                    </p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Full Name
                  </label>
                  <p className="font-medium text-foreground">
                    {formData.surname} {formData.firstName} {formData.otherName}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Gender
                  </label>
                  <p className="font-medium text-foreground">
                    {formData.gender}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    College
                  </label>
                  <p className="font-medium text-foreground">
                    {formData.college}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Department
                  </label>
                  <p className="font-medium text-foreground">
                    {formData.department}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Course
                  </label>
                  <p className="font-medium text-foreground">
                    {formData.course}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Email
                  </label>
                  <p className="font-medium text-foreground">
                    {maskEmail(formData.email)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Phone
                  </label>
                  <p className="font-medium text-foreground">
                    {maskPhone(formData.phone)}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-primary/10 rounded-lg border border-primary/20">
              <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm text-foreground font-medium">
                  Email Verification Required
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  After submission, you'll receive a verification email to
                  activate your account.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="flex-1 py-3 border border-border text-foreground font-semibold rounded-lg hover:bg-muted transition-colors flex items-center justify-center gap-2"
              >
                <ArrowLeft size={18} />
                Back
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    Submitting...
                  </>
                ) : (
                  <>
                    Finish
                    <CheckCircle size={18} />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Step 5: Completion */}
        {step === 5 && (
          <div className="text-center space-y-6">
            <div className="p-4 bg-primary/10 rounded-full w-20 h-20 mx-auto flex items-center justify-center">
              <CheckCircle className="h-10 w-10 text-primary" />
            </div>

            <div>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Registration Complete!
              </h2>
              <p className="text-muted-foreground mb-4">
                Welcome to MOUAU ClassMate, {formData.firstName}!
              </p>
            </div>

            <div className="bg-background/30 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <Mail className="h-5 w-5 text-primary" />
                <div className="text-left">
                  <p className="font-medium text-foreground text-sm">
                    Check Your Email
                  </p>
                  <p className="text-muted-foreground text-xs">
                    We've sent a verification link to{" "}
                    {maskEmail(formData.email)}
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Click the verification link in your email to activate your
                account and start using MOUAU ClassMate.
              </p>
            </div>

            <div className="flex gap-4">
              <Link
                href="/auth/signin"
                className="flex-1 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors text-center"
              >
                Sign In Now
              </Link>
              <Link
                href="/"
                className="flex-1 py-3 border border-border text-foreground font-semibold rounded-lg hover:bg-muted transition-colors text-center"
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
