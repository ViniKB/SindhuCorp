/**
 * Sindhu Corporation — Enquiry Webhook
 * ------------------------------------
 * This Google Apps Script receives enquiry form submissions from
 * sindhucorporation.com, appends them to the connected Google Sheet,
 * and sends an email notification to the sales team.
 *
 * HOW TO INSTALL:
 *  1. Upload admin/enquiry-log.xlsx to your Google Drive.
 *  2. Right-click the file → Open with → Google Sheets (keep it open).
 *  3. In that sheet, choose Extensions → Apps Script.
 *  4. Delete any boilerplate code, paste ALL of this file, save.
 *  5. Edit the CONFIG block below — set NOTIFY_EMAIL to your address.
 *  6. Click Deploy → New deployment.
 *       Type: Web app
 *       Execute as: Me
 *       Who has access: Anyone
 *     Authorize when prompted. Copy the Web app URL.
 *  7. Paste that URL into assets/js/main.js (ENQUIRY_WEBHOOK_URL).
 */

// ============================================================
// ===============    CONFIG — EDIT THESE     =================
// ============================================================
const NOTIFY_EMAIL   = 'info@sindhucorporation.com';   // <-- change to your real email
const NOTIFY_EMAIL_2 = '';                             // optional second recipient (leave blank if not needed)
const COMPANY_NAME   = 'Sindhu Corporation';
const SHEET_NAME     = 'Enquiries';                    // must match the tab name in the Google Sheet
// ============================================================


function doPost(e) {
  try {
    // Accept JSON body OR URL-encoded form fields
    let data = {};
    if (e.postData && e.postData.type === 'application/json') {
      data = JSON.parse(e.postData.contents || '{}');
    } else if (e.parameter) {
      data = e.parameter;
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];

    // Compute next Sl. No. (the 4th row is where enquiry data starts — row 3 is the header)
    const lastRow = sheet.getLastRow();
    const nextSlNo = Math.max(0, lastRow - 3) + 1;

    const now = new Date();
    const stamp = Utilities.formatDate(now, Session.getScriptTimeZone() || 'Asia/Kolkata', 'yyyy-MM-dd HH:mm');

    // Column order (must match Enquiries sheet):
    // A Sl. No. | B Received On | C Full Name | D Phone | E Email
    // F Project of Interest | G Configuration | H Budget Range
    // I Buying Timeline | J Message | K Status | L Assigned To | M Follow-up Date | N Notes
    const row = [
      nextSlNo,
      stamp,
      data.name     || '',
      data.phone    || '',
      data.email    || '',
      data.project  || '',
      data.config   || '',
      data.budget   || '',
      data.timeline || '',
      data.message  || '',
      'New',        // Status default
      '',           // Assigned To
      '',           // Follow-up Date
      ''            // Notes
    ];

    sheet.appendRow(row);

    // Send email notification
    sendNotificationEmail_(data, stamp, nextSlNo);

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, id: nextSlNo }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  // Simple health check — lets you open the URL in a browser and verify it's live.
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, service: COMPANY_NAME + ' Enquiry Webhook' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function sendNotificationEmail_(d, stamp, slNo) {
  const to = [NOTIFY_EMAIL, NOTIFY_EMAIL_2].filter(String).join(',');
  if (!to) return;

  const subject = '🏠 New Enquiry #' + slNo + ' — ' + (d.name || 'Unknown') + ' (' + (d.project || 'project unspecified') + ')';

  const htmlBody =
    '<div style="font-family:Arial,Helvetica,sans-serif; color:#0F2A44; max-width:640px;">' +
      '<div style="background:#0F2A44; color:#fff; padding:18px 22px;">' +
        '<h2 style="margin:0; font-size:20px;">New Enquiry Received</h2>' +
        '<div style="color:#C9A24A; font-size:13px;">' + COMPANY_NAME + ' · sindhucorporation.com</div>' +
      '</div>' +
      '<div style="padding:22px; background:#FAF7F2;">' +
        '<p style="margin:0 0 16px 0;"><strong>Enquiry #' + slNo + '</strong> · received ' + stamp + '</p>' +
        kv_('Full Name', d.name) +
        kv_('Phone', d.phone) +
        kv_('Email', d.email) +
        kv_('Project of Interest', d.project) +
        kv_('Configuration', d.config) +
        kv_('Budget Range', d.budget) +
        kv_('Buying Timeline', d.timeline) +
        kv_('Message', d.message) +
        '<p style="margin:22px 0 0 0; font-size:12px; color:#5C6773;">Auto-recorded in Google Sheet "Enquiries". Update the Status column once you have contacted this lead.</p>' +
      '</div>' +
    '</div>';

  const plainBody =
    'New Enquiry #' + slNo + ' · ' + stamp + '\n\n' +
    'Name: '     + (d.name || '-')     + '\n' +
    'Phone: '    + (d.phone || '-')    + '\n' +
    'Email: '    + (d.email || '-')    + '\n' +
    'Project: '  + (d.project || '-')  + '\n' +
    'Config: '   + (d.config || '-')   + '\n' +
    'Budget: '   + (d.budget || '-')   + '\n' +
    'Timeline: ' + (d.timeline || '-') + '\n' +
    'Message: '  + (d.message || '-');

  MailApp.sendEmail({
    to: to,
    subject: subject,
    body: plainBody,
    htmlBody: htmlBody,
    replyTo: d.email || NOTIFY_EMAIL,
    name: COMPANY_NAME + ' Website'
  });
}

function kv_(label, val) {
  const safe = (val == null ? '' : String(val)).replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return '<div style="margin-bottom:10px;">' +
           '<div style="font-size:11px; letter-spacing:.06em; color:#8D6C29; text-transform:uppercase;">' + label + '</div>' +
           '<div style="font-size:15px; color:#0F2A44;">' + (safe || '-') + '</div>' +
         '</div>';
}

/**
 * Optional: run this once manually from the Apps Script editor
 * to authorize the script and test that an email + row get created.
 */
function testSubmission() {
  doPost({
    postData: {
      type: 'application/json',
      contents: JSON.stringify({
        name: 'Test User',
        phone: '+91 90000 00000',
        email: 'test@example.com',
        project: 'Sindhu Enclave — Gandhinagar',
        config: '2 BHK',
        budget: '₹60L – ₹90L',
        timeline: 'Within 3 months',
        message: 'This is a test submission from Apps Script.'
      })
    }
  });
}
