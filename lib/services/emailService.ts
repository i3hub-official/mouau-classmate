// lib/services/emailService.ts - ENHANCED VERSION
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
    this.logSmtpConfiguration();

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
        rejectUnauthorized: false, // Might help with certificate issues
      },
      debug: true, // Enable debug output
      logger: true, // Enable logger
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
      console.log("🔍 Checking email server connection...");
      const isConnected = await this.verifyConnection();

      if (isConnected) {
        this.connectionVerified = true;
        this.lastConnectionCheck = now;
        console.log("✅ Email connection verified and cached");
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
      // In development, log email instead of sending but still validate
      if (process.env.NODE_ENV === "development") {
        console.log("📧 DEVELOPMENT MODE - Email would be sent:", {
          to: options.to,
          subject: options.subject,
          template: options.template,
          context: options.context,
        });

        // Still try to load template to validate it exists
        try {
          await this.loadTemplate(options.template);
          console.log("✅ Template validation passed");
        } catch (templateError) {
          console.error("❌ Template validation failed:", templateError);
          return false;
        }

        return true;
      }

      // PRODUCTION: Actually send emails
      console.log("🔄 Verifying email connection before sending...");
      const isConnected = await this.ensureConnection();

      if (!isConnected) {
        console.error("❌ Cannot send email - no connection to email server");
        return false;
      }

      console.log("✅ Connection verified, loading template...");
      const template = await this.loadTemplate(options.template);
      const compiled = this.compileTemplate(template, options.context);

      const mailOptions = {
        from: {
          name: process.env.EMAIL_FROM_NAME || "MOUAU ClassMate",
          address: process.env.EMAIL_FROM_ADDRESS || "noreply@mouau.edu.ng",
        },
        to: options.to,
        subject: compiled.subject,
        html: compiled.html,
        text: compiled.text,
        // Add delivery status notifications
        dsn: {
          id: `email-${Date.now()}`,
          return: "headers",
          notify: ["failure", "delay"],
          recipient: process.env.EMAIL_FROM_ADDRESS || "noreply@mouau.edu.ng",
        },
      };

      console.log("📤 Sending email to:", options.to);
      console.log("📝 Email details:", {
        from: mailOptions.from,
        subject: mailOptions.subject,
        template: options.template,
      });

      const result = await this.transporter.sendMail(mailOptions);

      console.log("✅ Email sent successfully:", {
        messageId: result.messageId,
        to: options.to,
        subject: compiled.subject,
        response: result.response,
      });

      return true;
    } catch (error) {
      console.error("❌ Failed to send email:", error);

      // Reset connection status on error
      this.connectionVerified = false;

      // Log specific error details
      if (error instanceof Error) {
        console.error("📧 Email error details:", {
          name: error.name,
          message: error.message,
          code: (error as any).code,
          command: (error as any).command,
        });

        // Gmail-specific error handling
        if (error.message.includes("Invalid login")) {
          console.error("🔐 GMAIL ISSUE: This usually means:");
          console.error("   • Your Gmail password is incorrect");
          console.error(
            "   • You're using your regular password instead of an App Password"
          );
          console.error(
            "   • 2FA is enabled but no App Password was generated"
          );
          console.error(
            "   💡 SOLUTION: Go to Google Account > Security > App Passwords"
          );
        } else if (error.message.includes("ECONNREFUSED")) {
          console.error(
            "🌐 NETWORK ISSUE: Cannot connect to Gmail SMTP server"
          );
          console.error("   • Check your internet connection");
          console.error("   • Check if port 587 is blocked by firewall");
          console.error("   • Try using port 465 with secure: true");
        }
      }

      return false;
    }
  }

  async verifyConnection(): Promise<boolean> {
    try {
      console.log("🔌 Testing email server connection...");
      console.log("📧 Using configuration:", {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        user: process.env.SMTP_USER,
        secure: process.env.SMTP_SECURE,
      });

      // Test the connection
      await this.transporter.verify();

      console.log("✅ Email server connection verified successfully");
      this.connectionVerified = true;
      this.lastConnectionCheck = Date.now();
      return true;
    } catch (error) {
      console.error("❌ Email server connection verification FAILED:", error);

      // Enhanced error diagnostics
      if (error instanceof Error) {
        console.error("🔌 Connection error analysis:", {
          name: error.name,
          message: error.message,
          code: (error as any).code,
        });

        // Specific Gmail error handling
        if (
          error.message.includes("Invalid login") ||
          error.message.includes("535")
        ) {
          console.error("🔐 GMAIL AUTHENTICATION ERROR:");
          console.error(
            "   1. Make sure you're using an APP PASSWORD, not your regular Gmail password"
          );
          console.error("   2. Go to: https://myaccount.google.com/security");
          console.error(
            "   3. Enable 2-Factor Authentication if not already enabled"
          );
          console.error("   4. Generate an App Password for your application");
          console.error(
            "   5. Use the 16-character App Password in your SMTP_PASS"
          );
        } else if (error.message.includes("ECONNREFUSED")) {
          console.error("🌐 CONNECTION REFUSED:");
          console.error("   • Check if SMTP_HOST and SMTP_PORT are correct");
          console.error(
            "   • Try changing SMTP_PORT to 465 and SMTP_SECURE to true"
          );
          console.error("   • Check firewall/network settings");
        } else if (error.message.includes("ETIMEDOUT")) {
          console.error("⏰ CONNECTION TIMEOUT:");
          console.error("   • Network connectivity issue");
          console.error(
            "   • Gmail SMTP server might be temporarily unavailable"
          );
        }
      }

      this.connectionVerified = false;
      this.lastConnectionCheck = Date.now();
      return false;
    }
  }

  // Enhanced test method
  async testEmailService(testEmail: string = "test@example.com"): Promise<{
    success: boolean;
    steps: {
      connection: boolean;
      template: boolean;
      sending: boolean;
    };
    error?: string;
  }> {
    console.log("🧪 Starting comprehensive email service test...");

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
      console.log("1. Testing SMTP connection...");
      results.steps.connection = await this.verifyConnection();

      if (!results.steps.connection) {
        results.error = "SMTP connection failed";
        return results;
      }

      // Step 2: Test template loading
      console.log("2. Testing template loading...");
      try {
        await this.loadTemplate("email-verification");
        results.steps.template = true;
      } catch (templateError) {
        results.error = `Template loading failed: ${
          templateError instanceof Error
            ? templateError.message
            : "Unknown error"
        }`;
        return results;
      }

      // Step 3: Test email sending
      console.log("3. Testing email sending...");
      if (process.env.NODE_ENV === "development") {
        console.log("   DEVELOPMENT MODE - Simulating email send");
        results.steps.sending = true;
      } else {
        results.steps.sending = await this.sendEmail({
          to: testEmail,
          subject: "Test Email from MOUAU ClassMate",
          template: "email-verification",
          context: {
            name: "Test User",
            verificationLink: "https://mouau.edu.ng/auth/verify?token=test",
          },
        });
      }

      results.success =
        results.steps.connection &&
        results.steps.template &&
        results.steps.sending;

      if (results.success) {
        console.log("✅ Email service test PASSED");
      } else {
        console.log("❌ Email service test FAILED");
      }

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
        secure: process.env.SMTP_SECURE,
      },
    };
  }

  // Reset connection
  async resetConnection(): Promise<boolean> {
    console.log("🔄 Resetting email connection...");
    this.connectionVerified = false;
    this.lastConnectionCheck = 0;

    try {
      this.transporter.close();
    } catch (error) {
      console.log("ℹ️ No existing connection to close");
    }

    // Recreate transporter with current environment variables
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      connectionTimeout: 30000,
      greetingTimeout: 30000,
      socketTimeout: 30000,
      tls: {
        rejectUnauthorized: false,
      },
      debug: true,
      logger: true,
    });

    return await this.verifyConnection();
  }

  // Method to test different configurations
  async testConfiguration(config: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;
  }): Promise<boolean> {
    console.log("🧪 Testing custom SMTP configuration...");

    const testTransporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.pass,
      },
      connectionTimeout: 30000,
      greetingTimeout: 30000,
      socketTimeout: 30000,
    });

    try {
      await testTransporter.verify();
      console.log("✅ Custom configuration test PASSED");
      testTransporter.close();
      return true;
    } catch (error) {
      console.error("❌ Custom configuration test FAILED:", error);
      testTransporter.close();
      return false;
    }
  }
}

// Singleton instance
export const emailService = new EmailService();

// Export test function
export async function testEmailService() {
  return await emailService.testEmailService();
}
