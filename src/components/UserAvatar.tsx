interface UserAvatarProps {
  fullName?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  className?: string;
  textClassName?: string;
  alt?: string;
}

export default function UserAvatar({
  fullName,
  email,
  avatarUrl,
  className = '',
  textClassName = '',
  alt,
}: UserAvatarProps) {
  const displayName = fullName?.trim() || email?.trim() || 'User';
  const initial =
    displayName.charAt(0).toUpperCase() ||
    email?.trim().charAt(0).toUpperCase() ||
    'U';

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={alt || `${displayName} avatar`}
        className={`${className} object-cover`}
      />
    );
  }

  return (
    <div className={`flex items-center justify-center bg-gradient-to-br from-primary-400 to-primary-600 ${className}`}>
      <span className={`font-bold text-white ${textClassName}`}>{initial}</span>
    </div>
  );
}
