const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");
const authenticateAdmin = require("./authenticateAdmin");
require("dotenv").config();

// Path to .env file
const envPath = path.join(__dirname, "..", ".env");

// Helper: read .env file into key-value object
function readEnv() {
  try {
    const content = fs.readFileSync(envPath, "utf8");
    const env = {};
    content.split("\n").forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;
      const eqIndex = trimmed.indexOf("=");
      if (eqIndex === -1) return;
      const key = trimmed.substring(0, eqIndex);
      const value = trimmed.substring(eqIndex + 1);
      env[key] = value;
    });
    return env;
  } catch (err) {
    console.error("Error reading .env:", err.message);
    return null;
  }
}

// Helper: write key-value object back to .env file
function writeEnv(envObj) {
  const lines = Object.entries(envObj).map(([key, value]) => `${key}=${value}`);
  fs.writeFileSync(envPath, lines.join("\n") + "\n", "utf8");
}

// Helper: mask a password (show first 2 and last 2 chars)
function maskPassword(pass) {
  if (!pass || pass.length < 5) return "****";
  return pass.substring(0, 2) + "****" + pass.substring(pass.length - 2);
}

// GET /api/admin/settings/email — return current email config
router.get("/email", authenticateAdmin, (req, res) => {
  const env = readEnv();
  if (!env) {
    return res.status(500).json({ error: "Could not read server configuration" });
  }

  res.json({
    email_service: env.EMAIL_SERVICE || "",
    email_username: env.EMAIL_USERNAME || "",
    email_password_masked: maskPassword(env.EMAIL_PASSWORD || ""),
    owner_email: env.OWNER_EMAIL || "",
    has_password: !!(env.EMAIL_PASSWORD && env.EMAIL_PASSWORD.length > 0),
  });
});

// PUT /api/admin/settings/email — update email config
router.put("/email", authenticateAdmin, (req, res) => {
  const { email_service, email_username, email_password, owner_email } = req.body;

  const env = readEnv();
  if (!env) {
    return res.status(500).json({ error: "Could not read server configuration" });
  }

  // Update only fields that were provided
  if (email_service !== undefined) env.EMAIL_SERVICE = email_service;
  if (email_username !== undefined) env.EMAIL_USERNAME = email_username;
  if (email_password !== undefined && email_password !== "") {
    env.EMAIL_PASSWORD = email_password;
  }
  if (owner_email !== undefined) env.OWNER_EMAIL = owner_email;

  try {
    writeEnv(env);

    // Update process.env so the running server uses new values immediately
    if (email_service !== undefined) process.env.EMAIL_SERVICE = email_service;
    if (email_username !== undefined) process.env.EMAIL_USERNAME = email_username;
    if (email_password !== undefined && email_password !== "") {
      process.env.EMAIL_PASSWORD = email_password;
    }
    if (owner_email !== undefined) process.env.OWNER_EMAIL = owner_email;

    res.json({
      message: "Email settings updated successfully",
      email_username: env.EMAIL_USERNAME,
      email_password_masked: maskPassword(env.EMAIL_PASSWORD),
    });
  } catch (err) {
    console.error("Error writing .env:", err.message);
    res.status(500).json({ error: "Failed to save settings" });
  }
});

// POST /api/admin/settings/email/test — send a test email
router.post("/email/test", authenticateAdmin, (req, res) => {
  const service = process.env.EMAIL_SERVICE;
  const user = process.env.EMAIL_USERNAME;
  const pass = process.env.EMAIL_PASSWORD;
  const recipient = req.body.recipient || process.env.OWNER_EMAIL || user;

  if (!user || !pass) {
    return res.status(400).json({ error: "Email username or password not configured" });
  }

  // Create a fresh transporter with current settings
  const testTransporter = nodemailer.createTransport({
    service: service,
    auth: { user: user, pass: pass },
  });

  testTransporter.verify((verifyErr) => {
    if (verifyErr) {
      console.error("Email verification failed:", verifyErr.message);
      return res.status(400).json({
        error: "Email authentication failed",
        details: verifyErr.message,
      });
    }

    // Send test email
    testTransporter.sendMail(
      {
        from: user,
        to: recipient,
        subject: "Salon Sindbad — Test Email",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 400px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #c9a84c;">✅ Email Working!</h2>
            <p>This is a test email from your Salon Sindbad booking system.</p>
            <p>If you received this, your email settings are configured correctly.</p>
            <hr style="border: 1px solid #eee;">
            <p style="color: #999; font-size: 12px;">Sent at ${new Date().toLocaleString()}</p>
          </div>
        `,
      },
      (sendErr, info) => {
        if (sendErr) {
          console.error("Test email send failed:", sendErr.message);
          return res.status(400).json({
            error: "Failed to send test email",
            details: sendErr.message,
          });
        }
        res.json({
          message: "Test email sent successfully",
          recipient: recipient,
          messageId: info.messageId,
        });
      }
    );
  });
});

module.exports = router;
