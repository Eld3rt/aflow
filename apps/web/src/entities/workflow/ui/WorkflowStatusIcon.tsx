'use client';

import { CheckCircle2, PauseCircle, Clock } from 'lucide-react';

interface WorkflowStatusIconProps {
  status: string;
  size?: 'sm' | 'md';
}

export function WorkflowStatusIcon({ status, size = 'sm' }: WorkflowStatusIconProps) {
  const iconSize = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';

  switch (status) {
    case 'active':
      return <CheckCircle2 className={`${iconSize} text-green-600`} />;
    case 'published':
      return <Clock className={`${iconSize} text-gray-600`} />;
    default:
      return <PauseCircle className={`${iconSize} text-gray-400`} />;
  }
}
