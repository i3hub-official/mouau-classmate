// lib/config/nodemailer.ts
import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";
import handlebars from "handlebars";

// Email configuration
const emailConfig = {
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  from: {
    name: process.env.SMTP_FROM_NAME || "MOUAU ClassMate",
    address: process.env.SMTP_FROM_EMAIL || "noreply@mouaucm.vercel.app",
  },
};

// Create transporter
const transporter = nodemailer.createTransport(emailConfig);

// Verify connection
transporter.verify((error) => {
  if (error) {
    console.error("SMTP connection error:", error);
  } else {
    console.log("SMTP server is ready to send emails");
  }
});

// Template directory - CORRECTED PATH: inside lib directory
const templatesDir = path.join(process.cwd(), "lib", "templates", "emails");

// Function to compile email template
const compileTemplate = async (templateName: string, context: any) => {
  try {
    const templatePath = path.join(templatesDir, templateName);

    // Read and compile subject template
    const subjectSource = fs.readFileSync(
      path.join(templatePath, "subject.hbs"),
      "utf8"
    );
    const subjectTemplate = handlebars.compile(subjectSource);
    const subject = subjectTemplate(context);

    // Read and compile HTML template
    const htmlSource = fs.readFileSync(
      path.join(templatePath, "html.hbs"),
      "utf8"
    );
    const htmlTemplate = handlebars.compile(htmlSource);
    const html = htmlTemplate(context);

    // Read and compile text template (if exists)
    let text = "";
    try {
      const textSource = fs.readFileSync(
        path.join(templatePath, "text.hbs"),
        "utf8"
      );
      const textTemplate = handlebars.compile(textSource);
      text = textTemplate(context);
    } catch {
      // Text template is optional
    }

    return { subject, html, text };
  } catch (error) {
    console.error(`Error compiling template ${templateName}:`, error);
    throw new Error(`Failed to compile email template: ${templateName}`);
  }
};

// Email sending function
export const sendEmail = async (
  to: string,
  templateName: string,
  context: any
) => {
  try {
    // Compile template
    const { subject, html, text } = await compileTemplate(
      templateName,
      context
    );

    // Email options
    const mailOptions = {
      from: emailConfig.from,
      to,
      subject,
      html,
      text: text || undefined,
    };

    // Send email
    const result = await transporter.sendMail(mailOptions);

    console.log(`Email sent to ${to} with template ${templateName}`);
    return result;
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
};

export { transporter };
