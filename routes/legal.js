const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const authenticateAdmin = require("./authenticateAdmin");

const LEGAL_FILE = path.join(__dirname, "..", "legal.json");

// Default legal texts
const DEFAULTS = {
  privacy: {
    content: `
<h3>1. Who We Are</h3>
<p>Salon Sindbad is a barbershop located at Nørrebrogade 64, 2200 København, Denmark. We are committed to protecting your personal data in accordance with the EU General Data Protection Regulation (GDPR).</p>

<h3>2. What Data We Collect</h3>
<p>When you book an appointment through our website, we collect:</p>
<ul>
  <li><strong>Name</strong> — to identify your booking</li>
  <li><strong>Email address</strong> — to send booking confirmations and calendar invites</li>
  <li><strong>Phone number</strong> — so your barber can reach you if needed</li>
  <li><strong>Service preferences</strong> — to prepare for your appointment</li>
  <li><strong>Chosen barber and date/time</strong> — to schedule your visit</li>
</ul>

<h3>3. How We Use Your Data</h3>
<p>Your personal data is used exclusively to:</p>
<ul>
  <li>Process and manage your booking</li>
  <li>Send you a confirmation email with a calendar invite</li>
  <li>Notify your barber about the appointment</li>
  <li>Contact you if there are changes to your booking</li>
</ul>
<p>We do not use your data for marketing purposes unless you explicitly consent.</p>

<h3>4. Data Storage & Security</h3>
<p>Your booking data is stored securely on our servers. We use encrypted connections (HTTPS) for all data transmission. Your data is retained for the duration needed to fulfill the booking and for up to 12 months afterwards for record-keeping.</p>

<h3>5. Data Sharing</h3>
<p>We do not sell or share your personal data with third parties, except:</p>
<ul>
  <li>Email service providers (to send confirmations)</li>
  <li>Hosting providers (to run our website)</li>
</ul>

<h3>6. Your Rights</h3>
<p>Under GDPR, you have the right to:</p>
<ul>
  <li>Access your personal data</li>
  <li>Request correction of inaccurate data</li>
  <li>Request deletion of your data</li>
  <li>Withdraw consent at any time</li>
  <li>File a complaint with the Danish Data Protection Agency (Datatilsynet)</li>
</ul>

<h3>7. Cookies</h3>
<p>Our website uses cookies for:</p>
<ul>
  <li><strong>Essential cookies</strong> — required for the website to function (login sessions)</li>
  <li><strong>Functional cookies</strong> — remember your preferences for a better experience</li>
  <li><strong>Analytics cookies</strong> — help us understand how visitors use the site (only with your consent)</li>
</ul>
<p>You can manage your cookie preferences at any time via the "Cookie Settings" link in the footer.</p>

<h3>8. Contact</h3>
<p>For any questions about your data or this policy, contact us at the salon or via our booking email.</p>

<p><em>Last updated: April 2026</em></p>
`
  },
  terms: {
    content: `
<h3>1. Booking</h3>
<p>By booking an appointment through our website, you agree to provide accurate personal information (name, email, phone number) and to arrive at your scheduled time.</p>

<h3>2. Cancellations & No-Shows</h3>
<p>We kindly ask that you cancel or reschedule at least 2 hours before your appointment time. Repeated no-shows may result in your future bookings being restricted.</p>

<h3>3. Services & Pricing</h3>
<p>All prices listed on our website are in Danish Kroner (DKK) and include VAT (moms). Prices may be updated at any time. The price at the time of booking is the price you pay.</p>

<h3>4. Personal Data</h3>
<p>By using our booking system, you consent to the collection and processing of your personal data as described in our <a href="#" onclick="document.getElementById('terms-modal').style.display='none';document.getElementById('footer-privacy-link').click();return false;" style="color:var(--clr-gold);">Privacy Policy</a>.</p>

<h3>5. Liability</h3>
<p>Salon Sindbad strives to provide excellent service. If you are unsatisfied with a service, please let us know immediately so we can address your concerns.</p>

<h3>6. Age Requirements</h3>
<p>Minors under 16 should be accompanied by a parent or guardian. Bookings made on behalf of minors are the responsibility of the booking adult.</p>

<h3>7. Changes to These Terms</h3>
<p>We may update these terms from time to time. The latest version is always available on our website.</p>

<p><em>Last updated: April 2026</em></p>
`
  }
};

// Read legal texts from file, or return defaults
function readLegal() {
  try {
    if (fs.existsSync(LEGAL_FILE)) {
      var content = fs.readFileSync(LEGAL_FILE, "utf8");
      return JSON.parse(content);
    }
  } catch (err) {
    console.error("Error reading legal.json:", err);
  }
  return DEFAULTS;
}

// Save legal texts to file
function saveLegal(data) {
  fs.writeFileSync(LEGAL_FILE, JSON.stringify(data, null, 2), "utf8");
}

// GET — public, returns privacy or terms content
router.get("/:type", (req, res) => {
  var type = req.params.type;
  if (type !== "privacy" && type !== "terms") {
    return res.status(400).json({ error: "Invalid type. Use 'privacy' or 'terms'." });
  }

  var legal = readLegal();
  var entry = legal[type] || DEFAULTS[type];
  res.json({ content: entry.content });
});

// PUT — admin only, update privacy or terms content
router.put("/:type", authenticateAdmin, (req, res) => {
  var type = req.params.type;
  if (type !== "privacy" && type !== "terms") {
    return res.status(400).json({ error: "Invalid type. Use 'privacy' or 'terms'." });
  }

  var { content } = req.body;
  if (!content || !content.trim()) {
    return res.status(400).json({ error: "Content is required" });
  }

  var legal = readLegal();
  legal[type] = { content: content.trim() };
  saveLegal(legal);

  res.json({ message: type + " updated successfully" });
});

module.exports = router;