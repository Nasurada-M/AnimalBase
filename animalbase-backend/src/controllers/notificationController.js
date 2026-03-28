const pool = require('../db/pool');

const toIsoString = (value) => new Date(value).toISOString();
const MAX_FEED_ITEMS = 12;
const RECENT_DISCOVERY_WINDOW_DAYS = 30;

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

function createAvailablePetNotification(row, scope) {
  const scopePrefix = scope === 'admin' ? 'admin' : 'user';
  const locationSuffix = row.location?.trim() ? ` near ${row.location.trim()}` : '';

  return createNotification({
    id: `${scopePrefix}-pet-${row.id}-available-${toIsoString(row.created_at)}`,
    kind: 'new_pet_available',
    title: scope === 'admin' ? 'New adoption pet listed' : 'New pet available',
    message: scope === 'admin'
      ? `${row.pet_name} was listed as available for adoption${locationSuffix}.`
      : `${row.pet_name} is now available for adoption${locationSuffix}.`,
    createdAt: row.created_at,
    route: scope === 'admin' ? '/admin/pets' : `/dashboard/pet-adoption?petId=${row.id}`,
  });
}

function createMissingPetReportedNotification(row, scope) {
  const scopePrefix = scope === 'admin' ? 'admin' : 'user';
  const location = row.last_seen_location?.trim() || 'Pangasinan';

  return createNotification({
    id: `${scopePrefix}-missing-pet-${row.id}-reported-${toIsoString(row.reported_at)}`,
    kind: 'missing_pet_reported',
    title: scope === 'admin' ? 'New missing pet report' : 'New Pet Finder alert',
    message: scope === 'admin'
      ? `${row.owner_name} reported ${row.pet_name} missing near ${location}.`
      : `${row.pet_name} was reported missing near ${location}.`,
    createdAt: row.reported_at,
    route: scope === 'admin' ? '/admin/lost-pets' : `/dashboard/pet-finder?petId=${row.id}`,
  });
}

async function getUserNotifications(userId) {
  const [applications, sightings, lostPets, availablePets, missingPetReports] = await Promise.all([
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
       LIMIT $2`,
      [userId, MAX_FEED_ITEMS]
    ),
    pool.query(
      `SELECT p.id, p.name AS pet_name, p.location, p.created_at
       FROM pets p
       WHERE p.status = 'Available'
         AND p.created_at >= NOW() - INTERVAL '${RECENT_DISCOVERY_WINDOW_DAYS} days'
       ORDER BY p.created_at DESC
       LIMIT $1`,
      [MAX_FEED_ITEMS]
    ),
    pool.query(
      `SELECT lp.id, lp.pet_name, lp.last_seen_location, lp.owner_name, lp.reported_at
       FROM lost_pets lp
       WHERE lp.status = 'Missing'
         AND lp.reported_at >= NOW() - INTERVAL '${RECENT_DISCOVERY_WINDOW_DAYS} days'
       ORDER BY lp.reported_at DESC
       LIMIT $1`,
      [MAX_FEED_ITEMS]
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

  const newPetNotifications = availablePets.rows.map((row) =>
    createAvailablePetNotification(row, 'user')
  );

  const missingPetReportedNotifications = missingPetReports.rows.map((row) =>
    createMissingPetReportedNotification(row, 'user')
  );

  return [
    ...applicationNotifications,
    ...sightingNotifications,
    ...lostPetNotifications,
    ...newPetNotifications,
    ...missingPetReportedNotifications,
  ]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, MAX_FEED_ITEMS);
}

async function getAdminNotifications() {
  const [applications, sightings, availablePets, missingPetReports] = await Promise.all([
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
       LIMIT $1`,
      [MAX_FEED_ITEMS]
    ),
    pool.query(
      `SELECT p.id, p.name AS pet_name, p.location, p.created_at
       FROM pets p
       WHERE p.status = 'Available'
         AND p.created_at >= NOW() - INTERVAL '${RECENT_DISCOVERY_WINDOW_DAYS} days'
       ORDER BY p.created_at DESC
       LIMIT $1`,
      [MAX_FEED_ITEMS]
    ),
    pool.query(
      `SELECT lp.id, lp.pet_name, lp.last_seen_location, lp.owner_name, lp.reported_at
       FROM lost_pets lp
       WHERE lp.status = 'Missing'
         AND lp.reported_at >= NOW() - INTERVAL '${RECENT_DISCOVERY_WINDOW_DAYS} days'
       ORDER BY lp.reported_at DESC
       LIMIT $1`,
      [MAX_FEED_ITEMS]
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

  const newPetNotifications = availablePets.rows.map((row) =>
    createAvailablePetNotification(row, 'admin')
  );

  const missingPetReportedNotifications = missingPetReports.rows.map((row) =>
    createMissingPetReportedNotification(row, 'admin')
  );

  return [
    ...applicationNotifications,
    ...sightingNotifications,
    ...newPetNotifications,
    ...missingPetReportedNotifications,
  ]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, MAX_FEED_ITEMS);
}

function resolveNotificationScope(requestedScope, user) {
  return requestedScope === 'admin' && user?.role === 'admin' ? 'admin' : 'user';
}

async function getNotificationsFeed(user, requestedScope = 'user') {
  const scope = resolveNotificationScope(requestedScope, user);
  const notifications = scope === 'admin'
    ? await getAdminNotifications()
    : await getUserNotifications(user.id);

  return { scope, notifications };
}

const getNotifications = async (req, res) => {
  try {
    const requestedScope = req.query.scope === 'admin' ? 'admin' : 'user';
    const { scope, notifications } = await getNotificationsFeed(req.user, requestedScope);
    res.json({ scope, notifications });
  } catch (err) {
    console.error('getNotifications error:', err);
    res.status(500).json({ error: 'Server error while loading notifications.' });
  }
};

module.exports = {
  getNotifications,
  getNotificationsFeed,
  getUserNotifications,
  getAdminNotifications,
  resolveNotificationScope,
};
