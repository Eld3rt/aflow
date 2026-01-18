'use client';

import { CheckCircle2, PauseCircle, Clock } from 'lucide-react';

interface WorkflowStatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export function WorkflowStatusBadge({ status, size = 'sm' }: WorkflowStatusBadgeProps) {
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';
  const padding = size === 'sm' ? 'px-2 py-1' : 'px-3 py-1';

  switch (status) {
    case 'active':
      return (
        <span className={`inline-flex items-center gap-1 rounded-full bg-green-100 ${padding} ${textSize} font-medium text-green-800`}>
          <CheckCircle2 className={iconSize} />
          Active
        </span>
      );
    case 'published':
      return (
        <span className={`inline-flex items-center gap-1 rounded-full bg-gray-100 ${padding} ${textSize} font-medium text-gray-800`}>
          <Clock className={iconSize} />
          Published
        </span>
      );
    default:
      return (
        <span className={`inline-flex items-center gap-1 rounded-full bg-gray-100 ${padding} ${textSize} font-medium text-gray-600`}>
          <PauseCircle className={iconSize} />
          Draft
        </span>
      );
  }
}
