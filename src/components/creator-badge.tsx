'use client';

import React from 'react';
import { useFamily } from '@/context/family-context';

interface CreatorBadgeProps {
  memberId: string;
  size?: 'sm' | 'md';
  showName?: boolean;
}

export function CreatorBadge({ memberId, size = 'sm', showName = true }: CreatorBadgeProps) {
  const { getMemberById } = useFamily();
  const member = getMemberById(memberId);

  if (!member) return null;

  const isSmall = size === 'sm';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium transition-colors ${
        isSmall ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'
      }`}
      style={{
        backgroundColor: `${member.color_hex}18`,
        color: member.color_hex,
        border: `1px solid ${member.color_hex}40`,
      }}
      title={`Erstellt von ${member.display_name}`}
    >
      <span
        className={`inline-flex items-center justify-center rounded-full font-bold text-white ${
          isSmall ? 'h-4 w-4 text-[9px]' : 'h-5 w-5 text-[10px]'
        }`}
        style={{ backgroundColor: member.color_hex }}
      >
        {member.short_code}
      </span>
      {showName && <span>{member.display_name}</span>}
    </span>
  );
}

