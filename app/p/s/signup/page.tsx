// File: app/p/s/signup/page.tsx
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
  Camera,
  User,
  Upload,
} from "lucide-react";
import { ThemeToggle } from "@/app/components/theme-toggle";
import {
  mouauColleges,
  departments,
  AGREEMENT_CONTENT,
  type AgreementSection,
} from "@/lib/data";
import { uploadImageForRegistration } from "@/lib/utils/cloudinaryUpload";

const CLOUDINARY_URL =
  "cloudinary://922179739365564:ofrmL1eiymD7RlwJ7-aTA31lnow@djimok28g/image/upload";
const CLOUDINARY_UPLOAD_PRESET = "app_media_preset";

const uploadImageToCloudinary = async (file: File): Promise<string | null> => {
  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

    // Optional: Add folder and transformation parameters
    formData.append("folder", "student_registrations");
    // formData.append("transformation", "w_400,h_400,c_fill"); // Resize to 400x400

    const response = await fetch(CLOUDINARY_URL, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || "Failed to upload image");
    }

    const data = await response.json();
    return data.secure_url;
  } catch (error) {
    // console.error("Cloudinary upload error:", error);
    throw error;
  }
};

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
  // More flexible validation to accept various MOUAU matric formats
  const regex = /^[A-Za-z0-9\/\-]{7,}$/;
  return regex.test(matric);
};

const isValidjambRegNumber = (jamb: string): boolean => {
  return /^\d{10,13}[A-Z]{2}$/.test(jamb);
};

const isValidNIN = (nin: string): boolean => {
  // NIN is typically 11 digits
  return /^\d{11}$/.test(nin);
};

export default function SignupPage() {
  const router = useRouter();
  const [roleValidated, setRoleValidated] = useState(false);
  const [roleLoading, setRoleLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    nin: "",
    hasMatricNumber: "",
    matricNumber: "",
    jambRegNumber: "",
    surname: "",
    firstName: "",
    otherName: "",
    gender: "",
    photo: "",
    photoUrl: "",
    college: "",
    department: "",
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
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

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
        const isExpired = data ? Date.now() - data.timestamp > maxAge : true;

        if (isExpired) {
          inMemoryRoleData = null;
          if (isSessionStorageAvailable()) {
            sessionStorage.removeItem("selectedRole");
          }
          throw new Error("Role selection expired");
        }

        // Validate that it's student role
        if (!data || data.role !== "student") {
          throw new Error("Invalid role. Student role required.");
        }

        setRoleValidated(true);
      } catch (error) {
        // console.error("Role validation failed:", error);
        inMemoryRoleData = null;
        if (isSessionStorageAvailable()) {
          sessionStorage.removeItem("selectedRole");
        }
        // Redirect silently without showing an error
        router.push("/sr");
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

  // Function to clear form data
  const clearFormData = () => {
    setFormData({
      nin: "",
      hasMatricNumber: "",
      matricNumber: "",
      jambRegNumber: "",
      surname: "",
      firstName: "",
      otherName: "",
      gender: "",
      photo: "",
      photoUrl: "",
      college: "",
      department: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
    });
    setPhotoPreview(null);
    setVerificationResult(null);
    setManualEntry(false);
  };

  // Handle agreement checkbox change
  const handleAgreementChange = (checked: boolean) => {
    setAgreementAccepted(checked);
    if (!checked) {
      clearFormData();
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

  const handleVerifyUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const nin = formData.nin.trim();

    if (!nin) {
      setErrorWithTimeout({
        nin: "Please enter your National Identification Number",
      });
      return;
    }

    if (!isValidNIN(nin)) {
      setErrorWithTimeout({
        nin: "Please enter a valid NIN (11 digits)",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Updated API endpoint for NIN verification
      const response = await fetch("/api/auth/verify/nin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ nin }),
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
          nin: nin,
        }));
        setManualEntry(false);
        setStep(3);
      } else if (result.requiresManualEntry) {
        setManualEntry(true);
        setStep(3);
      } else {
        setErrorWithTimeout({
          nin: "Verification failed. Please check your NIN and try again.",
        });
      }
    } catch (error) {
      // console.error("Verification error:", error);
      setErrorWithTimeout({
        nin:
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

    // JAMB Registration Number is now compulsory
    if (!formData.jambRegNumber || formData.jambRegNumber.trim() === "") {
      newErrors.jambRegNumber = "JAMB Registration Number is required";
    } else if (!isValidjambRegNumber(formData.jambRegNumber)) {
      newErrors.jambRegNumber =
        "Please enter a valid JAMB registration number (10-13 digits + 2 letters)";
    }

    // Matric Number is optional but if user says they have one, it's required
    if (formData.hasMatricNumber === "yes" && !formData.matricNumber) {
      newErrors.matricNumber = "Please enter your Matriculation Number";
    } else if (
      formData.hasMatricNumber === "yes" &&
      formData.matricNumber &&
      !isValidMatricNumber(formData.matricNumber)
    ) {
      newErrors.matricNumber =
        "Please enter a valid Matric Number (e.g., MOUAU/20/12345)";
    }

    if (!formData.surname || formData.surname.trim() === "") {
      newErrors.surname = "Surname is required";
    }
    if (!formData.firstName || formData.firstName.trim() === "") {
      newErrors.firstName = "First name is required";
    }
    if (!formData.gender) {
      newErrors.gender = "Gender is required";
    }
    if (!formData.college) {
      newErrors.college = "College is required";
    }
    if (!formData.department) {
      newErrors.department = "Department is required";
    }
    if (!formData.email || formData.email.trim() === "") {
      newErrors.email = "Email is required";
    }
    if (!formData.phone || formData.phone.trim() === "") {
      newErrors.phone = "Phone number is required";
    }

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
      // console.log("Validation errors:", newErrors);
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

  // New handler for photo upload step (step 5)
  const handlePhotoUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!formData.photoUrl) {
      newErrors.photo =
        "Please upload your passport photograph before continuing";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrorWithTimeout(newErrors);
      return;
    }

    setStep(6);
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Check if photo is uploaded
      if (!formData.photoUrl) {
        setErrorWithTimeout({
          submit: "Please upload your passport photograph before submitting",
        });
        setIsLoading(false);
        return;
      }

      // Prepare registration data with Cloudinary URL
      const registrationData = {
        nin: formData.nin,
        hasMatricNumber: formData.hasMatricNumber,
        matricNumber: formData.matricNumber,
        jambRegNumber: formData.jambRegNumber,
        surname: formData.surname,
        firstName: formData.firstName,
        otherName: formData.otherName,
        gender: formData.gender,
        passportUrl: formData.photoUrl, // Use Cloudinary URL as passportUrl
        college: formData.college,
        department: formData.department,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
      };

      // Updated API endpoint
      const response = await fetch("/api/s/signup", {
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

      setStep(7);
    } catch (error) {
      // console.error("Registration error:", error);
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
    // console.log(`Updating ${field}:`, value);

    // Clear form if NIN is edited
    if (field === "nin" && formData.nin && value !== formData.nin) {
      clearFormData();
      setFormData((prev) => ({ ...prev, [field]: value }));
      return;
    }

    // Reset department when college changes
    if (field === "college") {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
        department: "", // Reset department when college changes
      }));
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }

    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploadingPhoto(true);
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.photo;
        return newErrors;
      });

      try {
        // Use JAMB reg number for the upload (since user doesn't exist yet)
        const jambReg = formData.jambRegNumber || "temp";

        // Upload to Cloudinary using the registration-specific function
        const photoUrl = await uploadImageForRegistration(file, jambReg);

        if (!photoUrl) {
          throw new Error("Failed to upload photo to Cloudinary");
        }

        // Update form data with Cloudinary URL
        setFormData((prev) => ({
          ...prev,
          photo: file.name,
          photoUrl: photoUrl, // This is the Cloudinary URL
        }));

        // Create preview
        const reader = new FileReader();
        reader.onloadend = () => {
          setPhotoPreview(reader.result as string);
        };
        reader.readAsDataURL(file);

        // Clear any previous photo errors
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors.photo;
          return newErrors;
        });
      } catch (error) {
        // console.error("Photo upload error:", error);
        setErrorWithTimeout({
          photo:
            error instanceof Error
              ? error.message
              : "Failed to upload photo. Please try again.",
        });
        // Reset photo data on error
        setFormData((prev) => ({
          ...prev,
          photo: "",
          photoUrl: "",
        }));
        setPhotoPreview(null);
      } finally {
        setIsUploadingPhoto(false);
      }
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

  // If role validation failed, we should have already redirected
  // This is a fallback in case redirect doesn't work
  if (!roleValidated) {
    return null;
  }

  const Stepper = () => (
    <div className="mb-6 md:mb-8">
      <div className="flex items-center justify-between max-w-2xl mx-auto">
        {[1, 2, 3, 4, 5, 6, 7].map((stepNumber) => (
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
              {stepNumber === 2 && "Verify NIN"}
              {stepNumber === 3 && "Details"}
              {stepNumber === 4 && "Password"}
              {stepNumber === 5 && "Photo"}
              {stepNumber === 6 && "Review"}
              {stepNumber === 7 && "Done"}
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
                {AGREEMENT_CONTENT.sections.map(
                  (section: AgreementSection, index: number) => (
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
                  )
                )}
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
                  onChange={(e) => handleAgreementChange(e.target.checked)}
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

        {step === 2 && (
          <form onSubmit={handleVerifyUser} className="space-y-4 md:space-y-6">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-foreground mb-2">
                Identity Verification
              </h2>
              <p className="text-sm md:text-base text-muted-foreground mb-4 md:mb-6">
                Enter your National Identification Number (NIN) to begin
                registration
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs md:text-sm font-medium text-foreground mb-2">
                  National Identification Number (NIN) *
                </label>
                <input
                  type="text"
                  value={formData.nin}
                  onChange={(e) => {
                    const value = e.target.value
                      .replace(/\D/g, "")
                      .slice(0, 11);
                    handleInputChange("nin", value);
                  }}
                  placeholder="Enter 11-digit NIN"
                  className={`form-input w-full px-3 md:px-4 py-2.5 md:py-3 text-sm md:text-base rounded-lg border focus:ring-2 focus:ring-primary focus:border-transparent ${
                    errors.nin ? "border-error" : "border-border"
                  }`}
                />
                {errors.nin && (
                  <p className="text-error text-[10px] md:text-xs mt-1 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-error rounded-full"></span>
                    {errors.nin}
                  </p>
                )}
              </div>

              <div className="bg-muted/50 rounded-lg p-3 md:p-4">
                <div className="flex items-start gap-2 md:gap-3">
                  <div className="p-1 bg-primary/20 rounded">
                    <Shield className="h-3 w-3 md:h-4 md:w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs md:text-sm font-medium text-foreground mb-1">
                      Privacy Notice
                    </p>
                    <div className="text-[10px] md:text-xs text-foreground space-y-1">
                      <p>• Your NIN is used solely for identity verification</p>
                      <p>• It will be encrypted and stored securely</p>
                      <p>• We will not share your NIN with third parties</p>
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
                  ? "Please provide your student information"
                  : "Please review and confirm your details"}
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-3 md:gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs md:text-sm font-medium text-foreground mb-2">
                  Do you have a Matriculation Number?
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="hasMatricNumber"
                      value="yes"
                      checked={formData.hasMatricNumber === "yes"}
                      onChange={(e) =>
                        handleInputChange("hasMatricNumber", e.target.value)
                      }
                      className="mr-2"
                    />
                    <span className="text-sm">Yes</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="hasMatricNumber"
                      value="no"
                      checked={formData.hasMatricNumber === "no"}
                      onChange={(e) =>
                        handleInputChange("hasMatricNumber", e.target.value)
                      }
                      className="mr-2"
                    />
                    <span className="text-sm">No</span>
                  </label>
                </div>
              </div>

              {formData.hasMatricNumber === "yes" && (
                <div className="md:col-span-2">
                  <label className="block text-xs md:text-sm font-medium text-foreground mb-2">
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
                    className={`form-input w-full px-3 md:px-4 py-2.5 md:py-3 text-sm md:text-base rounded-lg border focus:ring-2 focus:ring-primary focus:border-transparent ${
                      errors.matricNumber ? "border-error" : "border-border"
                    }`}
                  />
                  {errors.matricNumber && (
                    <p className="text-error text-[10px] md:text-xs mt-1">
                      {errors.matricNumber}
                    </p>
                  )}
                </div>
              )}

              <div className="md:col-span-2">
                <label className="block text-xs md:text-sm font-medium text-foreground mb-2">
                  JAMB Registration Number *
                </label>
                <input
                  type="text"
                  value={formData.jambRegNumber}
                  onChange={(e) => {
                    const value = e.target.value.toUpperCase();
                    handleInputChange("jambRegNumber", value);
                  }}
                  placeholder="e.g., 202112345678AB"
                  className={`form-input w-full px-3 md:px-4 py-2.5 md:py-3 text-sm md:text-base rounded-lg border focus:ring-2 focus:ring-primary focus:border-transparent ${
                    errors.jambRegNumber ? "border-error" : "border-border"
                  }`}
                />
                {errors.jambRegNumber && (
                  <p className="text-error text-[10px] md:text-xs mt-1">
                    {errors.jambRegNumber}
                  </p>
                )}
                <p className="text-[10px] md:text-xs text-muted-foreground mt-1">
                  10-13 digits followed by 2 letters (e.g., 202112345678AB)
                </p>
              </div>

              <div>
                <label className="block text-xs md:text-sm font-medium text-foreground mb-2">
                  Surname *
                </label>
                <input
                  type="text"
                  value={formData.surname || ""} // Ensure it's never undefined
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
                  {mouauColleges.map((college) => (
                    <option key={college} value={college}>
                      {college}
                    </option>
                  ))}
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
                <select
                  value={formData.department}
                  onChange={(e) =>
                    handleInputChange("department", e.target.value)
                  }
                  className={`form-input w-full px-3 md:px-4 py-2.5 md:py-3 text-sm md:text-base rounded-lg border focus:ring-2 focus:ring-primary focus:border-transparent ${
                    errors.department ? "border-error" : "border-border"
                  }`}
                  disabled={!formData.college}
                >
                  <option value="">
                    {formData.college
                      ? "Select Department"
                      : "Select College First"}
                  </option>
                  {formData.college &&
                    departments[formData.college]?.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                </select>
                {errors.department && (
                  <p className="text-error text-[10px] md:text-xs mt-1">
                    {errors.department}
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

        {/* New Photo Upload Step (Step 5) */}
        {step === 5 && (
          <form
            onSubmit={handlePhotoUploadSubmit}
            className="space-y-4 md:space-y-6"
          >
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-foreground mb-2">
                Upload Your Photo
              </h2>
              <p className="text-sm md:text-base text-muted-foreground mb-4 md:mb-6">
                Please upload a passport photograph for your profile
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col items-center">
                <div className="relative mb-4">
                  {photoPreview ? (
                    <img
                      src={photoPreview}
                      alt="Profile"
                      className="w-32 h-32 md:w-40 md:h-40 rounded-full object-cover border-4 border-border"
                    />
                  ) : (
                    <div className="w-32 h-32 md:w-40 md:h-40 bg-muted rounded-full flex items-center justify-center border-4 border-dashed border-border">
                      <User className="h-16 w-16 md:h-20 md:w-20 text-muted-foreground" />
                    </div>
                  )}
                  <label
                    htmlFor="photo-upload"
                    className="absolute bottom-0 right-0 w-10 h-10 md:w-12 md:h-12 bg-primary rounded-full flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors"
                  >
                    {isUploadingPhoto ? (
                      <div className="animate-spin rounded-full h-5 w-5 md:h-6 md:w-6 border-2 border-white border-t-transparent" />
                    ) : (
                      <Camera className="h-5 w-5 md:h-6 md:w-6 text-white" />
                    )}
                  </label>
                  <input
                    id="photo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </div>
                <div className="text-center max-w-md">
                  <p className="text-sm md:text-base text-foreground mb-2">
                    Upload a professional passport photograph
                  </p>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    JPG, PNG (7KB - 25KB). This photo will be displayed on your
                    profile.
                  </p>
                  {errors.photo && (
                    <p className="text-error text-xs md:text-sm mt-2">
                      {errors.photo}
                    </p>
                  )}
                </div>
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
                className="flex-1 py-2.5 md:py-3 text-sm md:text-base bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-1.5 md:gap-2"
              >
                Continue
                <ArrowRight size={16} className="md:w-[18px] md:h-[18px]" />
              </button>
            </div>
          </form>
        )}

        {step === 6 && (
          <form onSubmit={handleFinalSubmit} className="space-y-4 md:space-y-6">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-foreground mb-2">
                Review Your Information
              </h2>
              <p className="text-sm md:text-base text-muted-foreground mb-4 md:mb-6">
                Please review all your information before submitting
              </p>
            </div>

            <div className="bg-background/30 rounded-lg p-4 md:p-6 space-y-4 md:space-y-6">
              {/* Profile Photo at the top center */}
              <div className="flex flex-col items-center">
                {photoPreview ? (
                  <div className="text-center">
                    <img
                      src={photoPreview}
                      alt="Profile Preview"
                      className="w-32 h-32 md:w-40 md:h-40 rounded-full object-cover border-4 border-primary/20 mx-auto mb-3"
                    />
                    <p className="text-green-600 text-sm font-medium">
                      Profile Photo ✓
                    </p>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="w-32 h-32 md:w-40 md:h-40 bg-muted rounded-full flex items-center justify-center border-4 border-dashed border-border mx-auto mb-3">
                      <User className="h-16 w-16 md:h-20 md:w-20 text-muted-foreground" />
                    </div>
                    <p className="text-yellow-600 text-sm font-medium">
                      No photo uploaded
                    </p>
                  </div>
                )}
              </div>

              {/* Personal Information Section */}
              <div className="space-y-3 md:space-y-4">
                <h3 className="text-base md:text-lg font-semibold text-foreground pb-2 border-b border-border">
                  Personal Information
                </h3>
                <div className="grid md:grid-cols-2 gap-3 md:gap-4">
                  <div>
                    <label className="text-xs md:text-sm font-medium text-muted-foreground">
                      Full Name
                    </label>
                    <p className="font-medium text-sm md:text-base text-foreground">
                      {formData.surname} {formData.firstName}{" "}
                      {formData.otherName}
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
                      Email
                    </label>
                    <p className="font-medium text-sm md:text-base text-foreground">
                      {maskEmail(formData.email)}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs md:text-sm font-medium text-muted-foreground">
                      Phone
                    </label>
                    <p className="font-medium text-sm md:text-base text-foreground">
                      {maskPhone(formData.phone)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Academic Information Section */}
              <div className="space-y-3 md:space-y-4">
                <h3 className="text-base md:text-lg font-semibold text-foreground pb-2 border-b border-border">
                  Academic Information
                </h3>
                <div className="grid md:grid-cols-2 gap-3 md:gap-4">
                  <div>
                    <label className="text-xs md:text-sm font-medium text-muted-foreground">
                      NIN
                    </label>
                    <p className="font-medium text-sm md:text-base text-foreground">
                      {formData.nin.substring(0, 4)}******
                      {formData.nin.substring(8)}
                    </p>
                  </div>
                  {formData.hasMatricNumber === "yes" &&
                    formData.matricNumber && (
                      <div>
                        <label className="text-xs md:text-sm font-medium text-muted-foreground">
                          Matric Number
                        </label>
                        <p className="font-medium text-sm md:text-base text-foreground">
                          {formData.matricNumber}
                        </p>
                      </div>
                    )}
                  <div>
                    <label className="text-xs md:text-sm font-medium text-muted-foreground">
                      JAMB Reg Number
                    </label>
                    <p className="font-medium text-sm md:text-base text-foreground">
                      {formData.jambRegNumber}
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
                  <div className="md:col-span-2">
                    <label className="text-xs md:text-sm font-medium text-muted-foreground">
                      Department
                    </label>
                    <p className="font-medium text-sm md:text-base text-foreground">
                      {formData.department}
                    </p>
                  </div>
                </div>
              </div>

              {/* Warning message if no photo */}
              {!photoPreview && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-yellow-800 text-xs flex items-center gap-2">
                    <AlertCircle size={14} />
                    Please go back and upload your passport photograph before
                    submitting
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-start gap-2 md:gap-3 p-3 md:p-4 bg-primary/10 rounded-lg border border-primary/20">
              <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-xs md:text-sm text-foreground font-medium">
                  Email Verification Required
                </p>
                <p className="text-[10px] md:text-xs text-muted-foreground mt-1">
                  After submission, you'll receive a verification link to
                  activate your account.
                </p>
              </div>
            </div>

            <div className="flex gap-2 md:gap-4">
              <button
                type="button"
                onClick={() => setStep(5)}
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

        {step === 7 && (
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
                    {maskEmail(formData.email)}
                  </p>
                </div>
              </div>
              <p className="text-[10px] md:text-xs text-muted-foreground">
                Click verification link in your email to activate your account
                and start using MOUAU ClassMate.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 md:gap-4">
              <Link
                href="/signin"
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
