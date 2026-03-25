const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const pool = require('../db/pool');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
const signPasswordResetToken = (email, userVersion) =>
  jwt.sign(
    { email, type: 'password_reset', userVersion },
    process.env.JWT_SECRET,
    { expiresIn: process.env.PASSWORD_RESET_TOKEN_EXPIRES_IN || '10m' }
  );

const OTP_TTL_MS = 10 * 60 * 1000;
const RESET_TOKEN_TTL_SECONDS = 10 * 60;

const normalizeEmail = (email = '') => email.trim().toLowerCase();
const createOtp = () => String(Math.floor(100000 + Math.random() * 900000));
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(email);
const isGmail = (email) => /^[^\s@]+@gmail\.com$/i.test(email);
const isDevOtpVisible = () => process.env.NODE_ENV !== 'production';
const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
const getPublicAppUrl = () =>
  (process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '');

let transporterPromise = null;

const getTransporter = async () => {
  if (transporterPromise) return transporterPromise;

  transporterPromise = (async () => {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
      throw new Error('SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS.');
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    await transporter.verify();
    return transporter;
  })().catch(err => {
    transporterPromise = null;
    throw err;
  });

  return transporterPromise;
};

const sendOtpEmail = async ({ email, otp, subject, heading, subheading, intro, codeLabel }) => {
  const transporter = await getTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  await transporter.sendMail({
    from,
    to: email,
    subject,
    text: [
      heading,
      '',
      intro,
      '',
      `${codeLabel}: ${otp}`,
      '',
      'This code will expire in 10 minutes.',
      'If you did not request this, you can ignore this email.',
    ].join('\n'),
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; color: #1f2937;">
        <div style="background: linear-gradient(135deg, #6d28d9, #8b5cf6); border-radius: 20px; padding: 24px; color: white; margin-bottom: 20px;">
          <h1 style="margin: 0; font-size: 24px;">AnimalBase</h1>
          <p style="margin: 8px 0 0; opacity: 0.9;">${subheading}</p>
        </div>
        <p style="font-size: 15px; line-height: 1.6;">${intro}</p>
        <div style="margin: 24px 0; padding: 18px 20px; background: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 16px; text-align: center;">
          <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.16em; color: #7c3aed; margin-bottom: 8px;">${codeLabel}</div>
          <div style="font-size: 32px; font-weight: 700; letter-spacing: 0.35em; color: #4c1d95;">${otp}</div>
        </div>
        <p style="font-size: 14px; color: #6b7280;">This code expires in 10 minutes. If you did not request this code, you can ignore this email.</p>
      </div>
    `,
  });
};

const sendSignupOtpEmail = async (email, otp) =>
  sendOtpEmail({
    email,
    otp,
    subject: 'AnimalBase Email Verification Code',
    heading: 'AnimalBase Email Verification',
    subheading: 'Email Verification Code',
    intro: 'Use the code below to continue creating your AnimalBase account.',
    codeLabel: 'Verification Code',
  });

const sendPasswordResetOtpEmail = async (email, otp) =>
  sendOtpEmail({
    email,
    otp,
    subject: 'AnimalBase Password Reset Code',
    heading: 'AnimalBase Password Reset',
    subheading: 'Password Reset Code',
    intro: 'Use the code below to reset your AnimalBase password.',
    codeLabel: 'Reset Code',
  });

const sendNewPetAvailableEmail = async ({ email, fullName, pet }) => {
  const transporter = await getTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const appUrl = `${getPublicAppUrl()}/dashboard/home`;
  const safeRecipientName = escapeHtml(fullName || 'AnimalBase member');
  const safePetName = escapeHtml(pet.name);
  const safePetType = escapeHtml(pet.type);
  const safeBreed = escapeHtml(pet.breed);
  const safeAge = escapeHtml(pet.age || 'Age not specified');
  const safeLocation = escapeHtml(pet.location || 'AnimalBase Shelter');

  await transporter.sendMail({
    from,
    to: email,
    subject: `New pet available for adoption: ${pet.name}`,
    text: [
      `Hi ${fullName || 'AnimalBase member'},`,
      '',
      `${pet.name} is now available for adoption on AnimalBase.`,
      `Type: ${pet.type}`,
      `Breed: ${pet.breed}`,
      `Age: ${pet.age || 'Age not specified'}`,
      `Location: ${pet.location || 'AnimalBase Shelter'}`,
      '',
      `View available pets: ${appUrl}`,
      '',
      'You are receiving this because email alerts for new pets are enabled in your AnimalBase notification settings.',
    ].join('\n'),
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1f2937;">
        <div style="background: linear-gradient(135deg, #6d28d9, #8b5cf6); border-radius: 20px; padding: 24px; color: white; margin-bottom: 20px;">
          <h1 style="margin: 0; font-size: 24px;">AnimalBase</h1>
          <p style="margin: 8px 0 0; opacity: 0.9;">A new pet is ready for adoption</p>
        </div>
        <p style="font-size: 15px; line-height: 1.6;">Hi ${safeRecipientName},</p>
        <p style="font-size: 15px; line-height: 1.6;">
          <strong>${safePetName}</strong> has just been listed as available for adoption on AnimalBase.
        </p>
        <div style="margin: 24px 0; padding: 18px 20px; background: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 16px;">
          <div style="font-size: 14px; line-height: 1.8;">
            <div><strong>Type:</strong> ${safePetType}</div>
            <div><strong>Breed:</strong> ${safeBreed}</div>
            <div><strong>Age:</strong> ${safeAge}</div>
            <div><strong>Location:</strong> ${safeLocation}</div>
          </div>
        </div>
        <a
          href="${appUrl}"
          style="display: inline-block; background: #7c3aed; color: #ffffff; text-decoration: none; padding: 12px 18px; border-radius: 12px; font-weight: 700;"
        >
          View Available Pets
        </a>
        <p style="margin-top: 24px; font-size: 13px; color: #6b7280;">
          You are receiving this because email alerts for new pets are enabled in Settings &gt; Notifications.
        </p>
      </div>
    `,
  });
};

const sendNewPetAvailabilityEmails = async (pet) => {
  try {
    const recipients = await pool.query(
      `SELECT full_name, email
       FROM users
       WHERE role = 'user'
         AND email IS NOT NULL
         AND COALESCE(new_pet_email_notifications_enabled, TRUE) = TRUE`
    );

    if (recipients.rows.length === 0) {
      return { queued: 0, delivered: 0, failed: 0 };
    }

    const results = await Promise.allSettled(
      recipients.rows.map((row) =>
        sendNewPetAvailableEmail({
          email: row.email,
          fullName: row.full_name,
          pet,
        })
      )
    );

    const delivered = results.filter((result) => result.status === 'fulfilled').length;
    const failed = results.length - delivered;

    if (failed > 0) {
      console.warn(
        `[notifications] Failed to send ${failed} new-pet email notification(s) for pet ${pet.id}.`
      );
    }

    return { queued: results.length, delivered, failed };
  } catch (err) {
    console.error(
      '[notifications] Unable to send new-pet email notifications:',
      err instanceof Error ? err.message : err
    );
    return { queued: 0, delivered: 0, failed: 0 };
  }
};

const initMailer = async () => {
  await getTransporter();
  console.log('✅  Gmail SMTP ready');
};

const purgeExpiredVerifications = async () => {
  await pool.query(
    `DELETE FROM email_verifications
     WHERE expires_at <= NOW()
       AND verified_at IS NULL`
  );
};

const savePendingOtp = async (email, otp) => {
  await pool.query(
    `INSERT INTO email_verifications (email, otp_code, expires_at, verified_at)
     VALUES ($1, $2, NOW() + ($3 || ' milliseconds')::interval, NULL)
     ON CONFLICT (email)
     DO UPDATE SET
       otp_code = EXCLUDED.otp_code,
       expires_at = EXCLUDED.expires_at,
       verified_at = NULL,
       updated_at = NOW()`,
    [email, otp, String(OTP_TTL_MS)]
  );
};

const getVerification = async (email) => {
  const result = await pool.query(
    `SELECT email, otp_code, expires_at, verified_at
     FROM email_verifications
     WHERE email = $1`,
    [email]
  );
  return result.rows[0] || null;
};

const markEmailVerified = async (email) => {
  await pool.query(
    `UPDATE email_verifications
     SET verified_at = NOW(),
         expires_at = NOW() + ($2 || ' milliseconds')::interval,
         updated_at = NOW()
     WHERE email = $1`,
    [email, String(OTP_TTL_MS)]
  );
};

const deleteVerification = async (email) => {
  await pool.query('DELETE FROM email_verifications WHERE email = $1', [email]);
};

// POST /api/auth/send-otp
const sendOtp = async (req, res) => {
  try {
    await purgeExpiredVerifications();
    const email = normalizeEmail(req.body.email);

    if (!email) {
      return res.status(400).json({ error: 'Email is required.' });
    }
    if (!isGmail(email)) {
      return res.status(400).json({ error: 'Please enter a valid Gmail address.' });
    }

    const dup = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (dup.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered.' });
    }

    const otp = createOtp();
    await savePendingOtp(email, otp);

    let mailSent = true;
    let mailError = '';

    try {
      await sendSignupOtpEmail(email, otp);
    } catch (mailErr) {
      mailSent = false;
      mailError = mailErr instanceof Error ? mailErr.message : 'Unknown mail transport error';

      if (!isDevOtpVisible()) {
        throw mailErr;
      }

      console.warn(`[auth] SMTP unavailable in development; using dev OTP for ${email}: ${mailError}`);
    }

    console.log(`[auth] Verification code for ${email}: ${otp}`);

    const payload = {
      message: mailSent
        ? 'Verification code sent.'
        : 'SMTP is unavailable in development. Use the OTP shown below.',
      expiresInSeconds: OTP_TTL_MS / 1000,
    };

    if (isDevOtpVisible()) {
      payload.devOtp = otp;
      payload.devHint = mailSent
        ? 'Development mode: use this OTP for testing.'
        : `Development fallback: email delivery is unavailable (${mailError}).`;
    }

    return res.json(payload);
  } catch (err) {
    console.error('sendOtp error:', err);
    const error = 'Server error while sending verification code.';
    const details = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json(
      process.env.NODE_ENV !== 'production'
        ? { error, details }
        : { error }
    );
  }
};

// POST /api/auth/send-reset-otp
const sendResetOtp = async (req, res) => {
  try {
    await purgeExpiredVerifications();
    const email = normalizeEmail(req.body.email);

    if (!email) {
      return res.status(400).json({ error: 'Email is required.' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    const userResult = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'No account found for that email.' });
    }

    const otp = createOtp();
    await savePendingOtp(email, otp);

    let mailSent = true;
    let mailError = '';

    try {
      await sendPasswordResetOtpEmail(email, otp);
    } catch (mailErr) {
      mailSent = false;
      mailError = mailErr instanceof Error ? mailErr.message : 'Unknown mail transport error';

      if (!isDevOtpVisible()) {
        throw mailErr;
      }

      console.warn(`[auth] SMTP unavailable in development; using reset OTP for ${email}: ${mailError}`);
    }

    console.log(`[auth] Password reset code for ${email}: ${otp}`);

    const payload = {
      message: mailSent
        ? 'Password reset code sent.'
        : 'SMTP is unavailable in development. Use the OTP shown below.',
      expiresInSeconds: OTP_TTL_MS / 1000,
    };

    if (isDevOtpVisible()) {
      payload.devOtp = otp;
      payload.devHint = mailSent
        ? 'Development mode: use this OTP for testing.'
        : `Development fallback: email delivery is unavailable (${mailError}).`;
    }

    return res.json(payload);
  } catch (err) {
    console.error('sendResetOtp error:', err);
    const error = 'Server error while sending password reset code.';
    const details = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json(
      process.env.NODE_ENV !== 'production'
        ? { error, details }
        : { error }
    );
  }
};

// POST /api/auth/verify-otp
const verifyOtp = async (req, res) => {
  try {
    await purgeExpiredVerifications();
    const email = normalizeEmail(req.body.email);
    const otp = String(req.body.otp || '').trim();

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and verification code are required.' });
    }

    const pending = await getVerification(email);
    if (!pending || !pending.otp_code || pending.verified_at || new Date(pending.expires_at) <= new Date()) {
      await deleteVerification(email);
      return res.status(400).json({ error: 'Verification code expired. Please request a new one.' });
    }
    if (pending.otp_code !== otp) {
      return res.status(400).json({ error: 'Invalid verification code.' });
    }

    await markEmailVerified(email);

    return res.json({
      message: 'Email verified successfully.',
      verified: true,
    });
  } catch (err) {
    console.error('verifyOtp error:', err);
    return res.status(500).json({ error: 'Server error while verifying code.' });
  }
};

// POST /api/auth/verify-reset-otp
const verifyResetOtp = async (req, res) => {
  try {
    await purgeExpiredVerifications();
    const email = normalizeEmail(req.body.email);
    const otp = String(req.body.otp || '').trim();

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and verification code are required.' });
    }

    const userResult = await pool.query(
      'SELECT id, updated_at FROM users WHERE email = $1',
      [email]
    );
    if (userResult.rows.length === 0) {
      await deleteVerification(email);
      return res.status(404).json({ error: 'No account found for that email.' });
    }

    const pending = await getVerification(email);
    if (!pending || !pending.otp_code || pending.verified_at || new Date(pending.expires_at) <= new Date()) {
      await deleteVerification(email);
      return res.status(400).json({ error: 'Verification code expired. Please request a new one.' });
    }
    if (pending.otp_code !== otp) {
      return res.status(400).json({ error: 'Invalid verification code.' });
    }

    await deleteVerification(email);

    const resetToken = signPasswordResetToken(
      email,
      new Date(userResult.rows[0].updated_at).getTime()
    );

    return res.json({
      message: 'OTP verified. You can now reset your password.',
      verified: true,
      resetToken,
      expiresInSeconds: RESET_TOKEN_TTL_SECONDS,
    });
  } catch (err) {
    console.error('verifyResetOtp error:', err);
    return res.status(500).json({ error: 'Server error while verifying reset code.' });
  }
};

// POST /api/auth/register
const register = async (req, res) => {
  try {
    await purgeExpiredVerifications();
    const { fullName, password, phone = null, address = null } = req.body;
    const email = normalizeEmail(req.body.email);

    if (!fullName || !email || !password) {
      return res.status(400).json({ error: 'Full name, email, and password are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const verified = await getVerification(email);
    if (!verified || !verified.verified_at || new Date(verified.expires_at) <= new Date()) {
      await deleteVerification(email);
      return res.status(400).json({ error: 'Please verify your email before creating an account.' });
    }

    const dup = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (dup.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered.' });
    }

    const hashed = await bcrypt.hash(password, 12);

    const result = await pool.query(
      `INSERT INTO users (full_name, email, password, phone, address)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, full_name, email, phone, address, avatar_url, role, joined_at,
                 new_pet_email_notifications_enabled`,
      [fullName, email, hashed, phone, address]
    );

    await deleteVerification(email);

    const user = result.rows[0];
    const token = signToken(user.id);

    res.status(201).json({
      token,
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        phone: user.phone,
        address: user.address,
        avatarUrl: user.avatar_url,
        newPetEmailNotificationsEnabled: user.new_pet_email_notifications_enabled,
        role: user.role,
        joinedAt: user.joined_at,
      },
    });
  } catch (err) {
    console.error('register error:', err);
    res.status(500).json({ error: 'Server error during registration.' });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const { password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = signToken(user.id);

    res.json({
      token,
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        phone: user.phone,
        address: user.address,
        avatarUrl: user.avatar_url,
        newPetEmailNotificationsEnabled: user.new_pet_email_notifications_enabled,
        role: user.role,
        joinedAt: user.joined_at,
      },
    });
  } catch (err) {
    console.error('login error:', err);
    res.status(500).json({ error: 'Server error during login.' });
  }
};

// POST /api/auth/reset-password
const resetPassword = async (req, res) => {
  try {
    const { resetToken, newPassword, confirmPassword } = req.body;

    if (!resetToken || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: 'Reset token and both password fields are required.' });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters.' });
    }

    let decoded;
    try {
      decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
    } catch (_err) {
      return res.status(400).json({ error: 'Reset session expired. Please verify a new OTP.' });
    }

    if (
      !decoded ||
      typeof decoded !== 'object' ||
      decoded.type !== 'password_reset' ||
      !decoded.email
    ) {
      return res.status(400).json({ error: 'Invalid reset session. Please verify a new OTP.' });
    }

    const email = normalizeEmail(decoded.email);
    const userResult = await pool.query(
      'SELECT id, password, updated_at FROM users WHERE email = $1',
      [email]
    );
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'No account found for that email.' });
    }

    const user = userResult.rows[0];
    if (Number(decoded.userVersion) !== new Date(user.updated_at).getTime()) {
      return res.status(400).json({ error: 'Reset session is no longer valid. Please verify a new OTP.' });
    }

    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({ error: 'New password must be different from your current password.' });
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashed, user.id]);
    await deleteVerification(email);

    return res.json({ message: 'Password reset successfully.' });
  } catch (err) {
    console.error('resetPassword error:', err);
    return res.status(500).json({ error: 'Server error while resetting password.' });
  }
};

// GET /api/auth/me
const getMe = async (req, res) => {
  const u = req.user;
  res.json({
    id: u.id,
    fullName: u.full_name,
    email: u.email,
    phone: u.phone,
    address: u.address,
    avatarUrl: u.avatar_url,
    newPetEmailNotificationsEnabled: u.new_pet_email_notifications_enabled,
    role: u.role,
  });
};

// PUT /api/auth/me
const updateMe = async (req, res) => {
  try {
    const hasFullName = Object.prototype.hasOwnProperty.call(req.body, 'fullName');
    const hasPhone = Object.prototype.hasOwnProperty.call(req.body, 'phone');
    const hasAddress = Object.prototype.hasOwnProperty.call(req.body, 'address');
    const hasNewPetEmailNotificationsEnabled = Object.prototype.hasOwnProperty.call(
      req.body,
      'newPetEmailNotificationsEnabled'
    );

    const fullName = hasFullName ? req.body.fullName : req.user.full_name;
    const phone = hasPhone ? req.body.phone : req.user.phone;
    const address = hasAddress ? req.body.address : req.user.address;
    const newPetEmailNotificationsEnabled = hasNewPetEmailNotificationsEnabled
      ? req.body.newPetEmailNotificationsEnabled
      : req.user.new_pet_email_notifications_enabled;

    if (
      hasNewPetEmailNotificationsEnabled &&
      typeof newPetEmailNotificationsEnabled !== 'boolean'
    ) {
      return res
        .status(400)
        .json({ error: 'New pet email notification preference must be true or false.' });
    }

    const result = await pool.query(
      `UPDATE users
       SET full_name=$1,
           phone=$2,
           address=$3,
           new_pet_email_notifications_enabled=$4
       WHERE id=$5
       RETURNING id, full_name, email, phone, address, avatar_url, role,
                 new_pet_email_notifications_enabled`,
      [fullName, phone, address, newPetEmailNotificationsEnabled, req.user.id]
    );
    const u = result.rows[0];
    res.json({
      id: u.id, fullName: u.full_name, email: u.email,
      phone: u.phone,
      address: u.address,
      avatarUrl: u.avatar_url,
      newPetEmailNotificationsEnabled: u.new_pet_email_notifications_enabled,
      role: u.role,
    });
  } catch (err) {
    console.error('updateMe error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

// PUT /api/auth/change-password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Both passwords are required.' });
    }
    const result = await pool.query('SELECT password FROM users WHERE id=$1', [req.user.id]);
    const match = await bcrypt.compare(currentPassword, result.rows[0].password);
    if (!match) return res.status(400).json({ error: 'Current password is incorrect.' });
    if (newPassword.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters.' });
    const hashed = await bcrypt.hash(newPassword, 12);
    await pool.query('UPDATE users SET password=$1 WHERE id=$2', [hashed, req.user.id]);
    res.json({ message: 'Password updated successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
};

module.exports = {
  initMailer,
  sendOtp,
  sendResetOtp,
  verifyOtp,
  verifyResetOtp,
  register,
  login,
  resetPassword,
  getMe,
  updateMe,
  changePassword,
  sendNewPetAvailabilityEmails,
};
