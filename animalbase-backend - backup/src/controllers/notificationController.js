const pool = require('../db/pool');

const toIsoString = (value) => new Date(value).toISOString();

const createNotification = ({
  id,
  kind,
  title,
  message,
  createdAt,
  route,
}) => ({
  id,
  kind,
  title,
  message,
  createdAt: toIsoString(createdAt),
  route,
});

async function getUserNotifications(userId) {
  const [applications, sightings, lostPets] = await Promise.all([
    pool.query(
      `SELECT aa.id, aa.status, aa.admin_remark, aa.submitted_at, aa.updated_at,
              p.name AS pet_name
       FROM adoption_applications aa
       JOIN pets p ON aa.pet_id = p.id
       WHERE aa.user_id = $1
       ORDER BY GREATEST(aa.updated_at, aa.submitted_at) DESC
       LIMIT 12`,
      [userId]
    ),
    pool.query(
      `SELECT s.id, s.reported_at, s.location_seen,
              lp.pet_name
       FROM sightings s
       JOIN lost_pets lp ON lp.id = s.lost_pet_id
       WHERE lp.reported_by = $1
       ORDER BY s.reported_at DESC
       LIMIT 12`,
      [userId]
    ),
    pool.query(
      `SELECT lp.id, lp.pet_name, lp.status, lp.reported_at, lp.updated_at
       FROM lost_pets lp
       WHERE lp.reported_by = $1
         AND lp.status = 'Found'
       ORDER BY lp.updated_at DESC
       LIMIT 12`,
      [userId]
    ),
  ]);

  const applicationNotifications = applications.rows.map((row) => {
    const remarkSuffix = row.admin_remark?.trim()
      ? ` Remark: ${row.admin_remark.trim()}`
      : '';

    if (row.status === 'Approved') {
      return createNotification({
        id: `user-application-${row.id}-approved-${toIsoString(row.updated_at)}`,
        kind: 'application_approved',
        title: 'Application approved',
        message: `Your adoption application for ${row.pet_name} was approved.${remarkSuffix}`,
        createdAt: row.updated_at,
        route: '/dashboard/applications',
      });
    }

    if (row.status === 'Rejected') {
      return createNotification({
        id: `user-application-${row.id}-rejected-${toIsoString(row.updated_at)}`,
        kind: 'application_rejected',
        title: 'Application rejected',
        message: `Your adoption application for ${row.pet_name} was rejected.${remarkSuffix}`,
        createdAt: row.updated_at,
        route: '/dashboard/applications',
      });
    }

    return createNotification({
      id: `user-application-${row.id}-pending-${toIsoString(row.submitted_at)}`,
      kind: 'application_pending',
      title: 'Application received',
      message: `Your adoption application for ${row.pet_name} is pending review.`,
      createdAt: row.submitted_at,
      route: '/dashboard/applications',
    });
  });

  const sightingNotifications = sightings.rows.map((row) =>
    createNotification({
      id: `user-sighting-${row.id}`,
      kind: 'sighting_reported',
      title: 'New sighting report',
      message: `A new sighting for ${row.pet_name} was reported near ${row.location_seen}.`,
      createdAt: row.reported_at,
      route: '/dashboard/pet-finder',
    })
  );

  const lostPetNotifications = lostPets.rows.map((row) =>
    createNotification({
      id: `user-lost-pet-${row.id}-found-${toIsoString(row.updated_at)}`,
      kind: 'lost_pet_found',
      title: 'Missing pet update',
      message: `${row.pet_name} has been marked as found.`,
      createdAt: row.updated_at,
      route: '/dashboard/pet-finder',
    })
  );

  return [...applicationNotifications, ...sightingNotifications, ...lostPetNotifications]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 12);
}

async function getAdminNotifications() {
  const [applications, sightings] = await Promise.all([
    pool.query(
      `SELECT aa.id, aa.status, aa.submitted_at, aa.updated_at, aa.full_name,
              p.name AS pet_name
       FROM adoption_applications aa
       JOIN pets p ON aa.pet_id = p.id
       ORDER BY GREATEST(aa.updated_at, aa.submitted_at) DESC
       LIMIT 12`
    ),
    pool.query(
      `SELECT s.id, s.reported_at, s.reporter_name, s.location_seen,
              lp.pet_name
       FROM sightings s
       JOIN lost_pets lp ON lp.id = s.lost_pet_id
       ORDER BY s.reported_at DESC
       LIMIT 12`
    ),
  ]);

  const applicationNotifications = applications.rows.map((row) => {
    if (row.status === 'Approved') {
      return createNotification({
        id: `admin-application-${row.id}-approved-${toIsoString(row.updated_at)}`,
        kind: 'application_approved',
        title: 'Application approved',
        message: `${row.full_name}'s application for ${row.pet_name} was approved.`,
        createdAt: row.updated_at,
        route: '/admin/applications',
      });
    }

    if (row.status === 'Rejected') {
      return createNotification({
        id: `admin-application-${row.id}-rejected-${toIsoString(row.updated_at)}`,
        kind: 'application_rejected',
        title: 'Application rejected',
        message: `${row.full_name}'s application for ${row.pet_name} was rejected.`,
        createdAt: row.updated_at,
        route: '/admin/applications',
      });
    }

    return createNotification({
      id: `admin-application-${row.id}-pending-${toIsoString(row.submitted_at)}`,
      kind: 'application_pending',
      title: 'New adoption application',
      message: `${row.full_name} applied to adopt ${row.pet_name}.`,
      createdAt: row.submitted_at,
      route: '/admin/applications',
    });
  });

  const sightingNotifications = sightings.rows.map((row) =>
    createNotification({
      id: `admin-sighting-${row.id}`,
      kind: 'sighting_reported',
      title: 'New sighting report',
      message: `${row.reporter_name} reported a sighting for ${row.pet_name} near ${row.location_seen}.`,
      createdAt: row.reported_at,
      route: '/admin/sightings',
    })
  );

  return [...applicationNotifications, ...sightingNotifications]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 12);
}

const getNotifications = async (req, res) => {
  try {
    const requestedScope = req.query.scope === 'admin' ? 'admin' : 'user';
    const scope = requestedScope === 'admin' && req.user.role === 'admin' ? 'admin' : 'user';

    const notifications = scope === 'admin'
      ? await getAdminNotifications()
      : await getUserNotifications(req.user.id);

    res.json({ scope, notifications });
  } catch (err) {
    console.error('getNotifications error:', err);
    res.status(500).json({ error: 'Server error while loading notifications.' });
  }
};

module.exports = { getNotifications };
