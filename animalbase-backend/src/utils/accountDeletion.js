const pool = require('../db/pool');

async function deleteUserAccountById(userId) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const userResult = await client.query(
      'SELECT id, email FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return { deleted: false };
    }

    const user = userResult.rows[0];

    // Preserve adoption history for admins, but detach it from the deleted account
    // so a future re-registration starts with a clean slate.
    await client.query(
      'UPDATE adoption_applications SET user_id = NULL WHERE user_id = $1',
      [userId]
    );

    // Remove user-authored reports and any sightings they submitted.
    await client.query('DELETE FROM sightings WHERE reported_by = $1', [userId]);
    await client.query('DELETE FROM lost_pets WHERE reported_by = $1', [userId]);

    if (user.email) {
      await client.query('DELETE FROM email_verifications WHERE LOWER(email) = LOWER($1)', [
        user.email,
      ]);
    }

    await client.query('DELETE FROM users WHERE id = $1', [userId]);
    await client.query('COMMIT');

    return {
      deleted: true,
      email: user.email,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { deleteUserAccountById };
