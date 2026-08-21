// src/components/Perfil/UserAvatar.jsx
// Avatar de la persona con sesión iniciada (o de cualquier usuario que se le
// pase). Muestra la foto de perfil de auth-service (`users.avatar_url`), que es
// la misma en todos los negocios; si no hay foto, cae a iniciales con color
// determinístico por nombre (mismo criterio que el foro).
import React from 'react';
import { Avatar } from 'antd';
import { initialsFromName, colorFromName } from '../../utils/avatar';

const UserAvatar = ({ user, size = 28, style, ...rest }) => {
  const name = user?.name || 'Usuario';
  const src = user?.avatar_url || undefined;

  return (
    <Avatar
      size={size}
      src={src}
      alt={name}
      style={{
        backgroundColor: src ? 'transparent' : colorFromName(name),
        color: '#fff',
        fontSize: Math.max(10, Math.round(size * 0.42)),
        fontWeight: 600,
        flexShrink: 0,
        ...style,
      }}
      {...rest}
    >
      {initialsFromName(name)}
    </Avatar>
  );
};

export default UserAvatar;
