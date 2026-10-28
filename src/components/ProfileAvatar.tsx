import React, { useEffect, useState } from 'react';
import { User as UserIcon } from 'lucide-react';
import { fetchProfilePhotoUrls } from '../services/profilePhotoService';

interface ProfileAvatarProps {
  userId: string;
  name: string;
  className: string;
  refreshKey?: number;
}

export const ProfileAvatar: React.FC<ProfileAvatarProps> = ({
  userId,
  name,
  className,
  refreshKey = 0,
}) => {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setPhotoUrl(null);
    void fetchProfilePhotoUrls([userId])
      .then((photos) => {
        if (active) setPhotoUrl(photos[userId] || null);
      })
      .catch((error: unknown) => {
        if (active) console.error('Foto profil tidak dapat dimuat.', error);
      });
    return () => {
      active = false;
    };
  }, [refreshKey, userId]);

  return (
    <span className={`${className} relative inline-flex shrink-0 items-center justify-center overflow-hidden`}>
      {photoUrl ? (
        <img src={photoUrl} alt={`Foto profil ${name}`} className="h-full w-full object-cover" />
      ) : name.trim() ? (
        <span aria-hidden="true">
          {name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()}
        </span>
      ) : (
        <UserIcon className="h-1/2 w-1/2" aria-hidden="true" />
      )}
    </span>
  );
};
