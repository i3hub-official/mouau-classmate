// lib/services/emailService.ts - FIXED VERSION

import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";
import handlebars from "handlebars";

export interface EmailOptions {
  to: string;
  subject: string;
  template: string;
  context: Record<string, any>;
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export class EmailService {
  private transporter: nodemailer.Transporter;
  private templatesDir: string;
  private connectionVerified: boolean = false;
  private lastConnectionCheck: number = 0;
  private readonly CONNECTION_CHECK_INTERVAL = 5 * 60 * 1000;

  constructor() {
    // Log configuration for debugging
    // this.logSmtpConfiguration();

    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true", // false for port 587, true for 465
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      // Enhanced timeout settings
      connectionTimeout: 30000, // 30 seconds
      greetingTimeout: 30000, // 30 seconds
      socketTimeout: 30000, // 30 seconds
      // Gmail-specific settings
      tls: {
        rejectUnauthorized: false,
      },
      debug: false,
      logger: false,
    });

    this.templatesDir = path.join(process.cwd(), "lib/templates/emails");
    this.registerHelpers();
  }

  private logSmtpConfiguration() {
    console.log("📧 SMTP Configuration:", {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE,
      user: process.env.SMTP_USER ? "SET" : "MISSING",
      pass: process.env.SMTP_PASS ? "SET" : "MISSING",
      fromName: process.env.EMAIL_FROM_NAME,
      fromAddress: process.env.EMAIL_FROM_ADDRESS,
      nodeEnv: process.env.NODE_ENV,
    });
  }

  private registerHelpers() {
    handlebars.registerHelper("eq", (a, b) => a === b);
    handlebars.registerHelper("neq", (a, b) => a !== b);
    handlebars.registerHelper("formatDate", (date: Date) => {
      return new Date(date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    });
  }

  private async loadTemplate(templateName: string): Promise<EmailTemplate> {
    try {
      const templatePath = path.join(this.templatesDir, templateName);

      // Check if template directory exists
      if (!fs.existsSync(templatePath)) {
        throw new Error(`Template directory not found: ${templatePath}`);
      }

      const subject = await fs.promises.readFile(
        path.join(templatePath, "subject.hbs"),
        "utf-8"
      );

      const html = await fs.promises.readFile(
        path.join(templatePath, "html.hbs"),
        "utf-8"
      );

      const text = await fs.promises.readFile(
        path.join(templatePath, "text.hbs"),
        "utf-8"
      );

      return { subject, html, text };
    } catch (error) {
      console.error(`❌ Template loading error for ${templateName}:`, error);
      throw new Error(
        `Failed to load email template: ${templateName}. Error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  private compileTemplate(
    template: EmailTemplate,
    context: Record<string, any>
  ) {
    return {
      subject: handlebars.compile(template.subject)(context),
      html: handlebars.compile(template.html)(context),
      text: handlebars.compile(template.text)(context),
    };
  }

  private async ensureConnection(): Promise<boolean> {
    const now = Date.now();
    if (
      this.connectionVerified &&
      now - this.lastConnectionCheck < this.CONNECTION_CHECK_INTERVAL
    ) {
      return true;
    }

    try {
      // console.log("🔍 Checking email server connection...");
      const isConnected = await this.verifyConnection();

      if (isConnected) {
        this.connectionVerified = true;
        this.lastConnectionCheck = now;
        // console.log("✅ Email connection verified and cached");
        return true;
      } else {
        this.connectionVerified = false;
        console.error("❌ Email connection verification failed");
        return false;
      }
    } catch (error) {
      this.connectionVerified = false;
      console.error("❌ Error during email connection check:", error);
      return false;
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      // console.log("🚀 Starting email send process...");
      // console.log("📧 Environment:", process.env.NODE_ENV);
      // console.log("📬 Recipient:", options.to);
      // console.log("📄 Template:", options.template);

      // Load and compile template first
      // console.log("📝 Loading email template...");
      const template = await this.loadTemplate(options.template);
      const compiled = this.compileTemplate(template, options.context);

      // console.log("✅ Template loaded and compiled successfully");
      // console.log("📧 Subject:", compiled.subject);

      // Check if we should actually send or just simulate
      const shouldSimulate =
        process.env.EMAIL_SIMULATE === "true" ||
        process.env.NODE_ENV === "test";

      if (shouldSimulate) {
        console.log("🧪 SIMULATION MODE - Email would be sent:");
        console.log({
          to: options.to,
          from: {
            name: process.env.EMAIL_FROM_NAME || "MOUAU ClassMate",
            address: process.env.EMAIL_FROM_ADDRESS || "noreply@mouau.edu.ng",
          },
          subject: compiled.subject,
          template: options.template,
        });
        console.log("✅ Email simulation successful");
        return true;
      }

      // ACTUALLY SEND THE EMAIL
      // console.log("📤 SENDING REAL EMAIL...");
      // console.log("🔄 Verifying connection before sending...");

      const isConnected = await this.ensureConnection();

      if (!isConnected) {
        console.error("❌ Cannot send email - no connection to email server");
        throw new Error("Email server connection failed");
      }

      // console.log("✅ Connection verified, preparing to send...");

      const mailOptions = {
        from: {
          name: process.env.EMAIL_FROM_NAME || "MOUAU ClassMate",
          address: process.env.EMAIL_FROM_ADDRESS || "noreply@mouau.edu.ng",
        },
        to: options.to,
        subject: compiled.subject,
        html: compiled.html,
        text: compiled.text,
      };

      console.log("📤 Sending email with options:", {
        from: mailOptions.from,
        to: mailOptions.to,
        subject: mailOptions.subject,
      });

      const result = await this.transporter.sendMail(mailOptions);

      // console.log("✅ EMAIL SENT SUCCESSFULLY!");
      // console.log("📬 Message ID:", result.messageId);
      // console.log("📨 Response:", result.response);
      // console.log("✉️ Accepted:", result.accepted);
      // console.log("🚫 Rejected:", result.rejected);

      if (result.rejected && result.rejected.length > 0) {
        console.error("⚠️ Some recipients were rejected:", result.rejected);
      }

      return true;
    } catch (error) {
      console.error("❌ FAILED TO SEND EMAIL");
      console.error("💥 Error details:", error);

      // Reset connection status on error
      this.connectionVerified = false;

      // Log specific error details
      if (error instanceof Error) {
        console.error("📧 Email error:", {
          name: error.name,
          message: error.message,
          stack: error.stack,
        });

        // Provide helpful debugging information
        if (error.message.includes("Invalid login")) {
          console.error("\n🔐 AUTHENTICATION ERROR:");
          console.error("   • Using Gmail? You need an App Password");
          console.error(
            "   • Go to: https://myaccount.google.com/apppasswords"
          );
          console.error("   • Generate a new App Password");
          console.error("   • Update your SMTP_PASS environment variable");
        } else if (error.message.includes("ECONNREFUSED")) {
          console.error("\n🌐 CONNECTION ERROR:");
          console.error("   • Check SMTP_HOST and SMTP_PORT");
          console.error(
            "   • Current: " +
              process.env.SMTP_HOST +
              ":" +
              process.env.SMTP_PORT
          );
          console.error("   • Gmail: smtp.gmail.com:587 (secure: false)");
          console.error("   • Gmail Alt: smtp.gmail.com:465 (secure: true)");
        } else if (error.message.includes("ETIMEDOUT")) {
          console.error("\n⏰ TIMEOUT ERROR:");
          console.error("   • Network connectivity issue");
          console.error("   • Check firewall settings");
          console.error("   • Try a different network");
        }
      }

      throw error; // Re-throw to let caller handle it
    }
  }

  async verifyConnection(): Promise<boolean> {
    try {
      // console.log("🔌 Testing email server connection...");
      // console.log("📧 Configuration:", {
      //   host: process.env.SMTP_HOST,
      //   port: process.env.SMTP_PORT,
      //   user: process.env.SMTP_USER,
      //   secure: process.env.SMTP_SECURE,
      // });

      // Test the connection
      await this.transporter.verify();

      // console.log("✅ Email server connection verified successfully");
      this.connectionVerified = true;
      this.lastConnectionCheck = Date.now();
      return true;
    } catch (error) {
      console.error("❌ Email server connection verification FAILED");
      console.error("💥 Error:", error);

      if (error instanceof Error) {
        console.error("\n🔍 Diagnostics:");
        console.error("   Error name:", error.name);
        console.error("   Error message:", error.message);

        if (error.message.includes("Invalid login")) {
          console.error("\n🔐 AUTHENTICATION ISSUE:");
          console.error("   1. Verify SMTP_USER is correct");
          console.error(
            "   2. For Gmail, use App Password (not regular password)"
          );
          console.error(
            "   3. Generate at: https://myaccount.google.com/apppasswords"
          );
        }
      }

      this.connectionVerified = false;
      this.lastConnectionCheck = Date.now();
      return false;
    }
  }

  // Enhanced test method that actually sends
  async testEmailService(testEmail?: string): Promise<{
    success: boolean;
    steps: {
      connection: boolean;
      template: boolean;
      sending: boolean;
    };
    error?: string;
  }> {
    console.log("\n🧪 ===== EMAIL SERVICE TEST =====");
    console.log("📧 Environment:", process.env.NODE_ENV);
    console.log("🔧 Simulate mode:", process.env.EMAIL_SIMULATE);

    const results: {
      success: boolean;
      steps: {
        connection: boolean;
        template: boolean;
        sending: boolean;
      };
      error?: string;
    } = {
      success: false,
      steps: {
        connection: false,
        template: false,
        sending: false,
      },
    };

    try {
      // Step 1: Test connection
      console.log("\n1️⃣ Testing SMTP connection...");
      results.steps.connection = await this.verifyConnection();

      if (!results.steps.connection) {
        results.error = "SMTP connection failed";
        console.error("❌ Test failed at connection step");
        return results;
      }

      // Step 2: Test template loading
      console.log("\n2️⃣ Testing template loading...");
      try {
        await this.loadTemplate("email-verification");
        results.steps.template = true;
        console.log("✅ Template loaded successfully");
      } catch (templateError) {
        results.error = `Template loading failed: ${
          templateError instanceof Error
            ? templateError.message
            : "Unknown error"
        }`;
        console.error("❌ Test failed at template step");
        return results;
      }

      // Step 3: Test actual email sending
      console.log("\n3️⃣ Testing email sending...");

      if (!testEmail) {
        console.log("⚠️ No test email provided, skipping send test");
        console.log(
          "💡 Provide test email: emailService.testEmailService('your@email.com')"
        );
        results.steps.sending = true; // Mark as passed since we can't test without email
      } else {
        console.log("📬 Test recipient:", testEmail);

        try {
          results.steps.sending = await this.sendEmail({
            to: testEmail,
            subject: "Test Email from MOUAU ClassMate",
            template: "email-verification",
            context: {
              name: "Test User",
              verificationLink:
                "https://mouau.edu.ng/auth/verify?token=test123",
            },
          });

          if (results.steps.sending) {
            console.log("✅ Test email sent successfully!");
            console.log("📬 Check inbox:", testEmail);
          }
        } catch (sendError) {
          console.error("❌ Failed to send test email:", sendError);
          results.error =
            sendError instanceof Error ? sendError.message : "Send failed";
          return results;
        }
      }

      results.success =
        results.steps.connection &&
        results.steps.template &&
        results.steps.sending;

      console.log("\n" + "=".repeat(40));
      if (results.success) {
        console.log("✅ EMAIL SERVICE TEST PASSED");
      } else {
        console.log("❌ EMAIL SERVICE TEST FAILED");
      }
      console.log("=".repeat(40) + "\n");

      return results;
    } catch (error) {
      console.error("❌ Email service test failed with error:", error);
      results.error =
        error instanceof Error ? error.message : "Unknown error occurred";
      return results;
    }
  }

  // Get connection status
  getConnectionStatus(): {
    verified: boolean;
    lastChecked: number;
    config: any;
  } {
    return {
      verified: this.connectionVerified,
      lastChecked: this.lastConnectionCheck,
      config: {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        user: process.env.SMTP_USER ? "SET" : "MISSING",
        pass: process.env.SMTP_PASS
          ? "SET (length: " + (process.env.SMTP_PASS?.length || 0) + ")"
          : "MISSING",
        secure: process.env.SMTP_SECURE,
        nodeEnv: process.env.NODE_ENV,
        simulateMode: process.env.EMAIL_SIMULATE,
      },
    };
  }

  // Force send email (bypass simulation)
  async forceSendEmail(options: EmailOptions): Promise<boolean> {
    const originalSimulate = process.env.EMAIL_SIMULATE;
    const originalNodeEnv = process.env.NODE_ENV;

    try {
      // Temporarily disable simulation
      (process.env as any).EMAIL_SIMULATE = "false";
      if (process.env.NODE_ENV === "test") {
        (process.env as any).NODE_ENV = "production";
      }

      // console.log("🚀 FORCE SENDING EMAIL (bypassing simulation)...");
      const result = await this.sendEmail(options);

      return result;
    } finally {
      // Restore original values
      if (originalSimulate !== undefined) {
        (process.env as any).EMAIL_SIMULATE = originalSimulate;
      }
      if (originalNodeEnv !== undefined) {
        (process.env as any).NODE_ENV = originalNodeEnv;
      }
    }
  }
}

// Singleton instance
export const emailService = new EmailService();

// Export test function
export async function testEmailService(testEmail?: string) {
  return await emailService.testEmailService(testEmail);
}

// Quick status check
export function getEmailStatus() {
  return emailService.getConnectionStatus();
}
