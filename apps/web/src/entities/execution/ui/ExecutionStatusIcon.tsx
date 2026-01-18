'use client';

import { CheckCircle2, XCircle, PauseCircle, Clock } from 'lucide-react';

interface ExecutionStatusIconProps {
  status: string;
  size?: 'sm' | 'md';
}

export function ExecutionStatusIcon({ status, size = 'sm' }: ExecutionStatusIconProps) {
  const iconSize = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';

  switch (status) {
    case 'completed':
      return <CheckCircle2 className={`${iconSize} text-green-600`} />;
    case 'failed':
      return <XCircle className={`${iconSize} text-red-600`} />;
    case 'paused':
      return <PauseCircle className={`${iconSize} text-yellow-600`} />;
    case 'running':
      return <Clock className={`${iconSize} text-blue-600 animate-spin`} />;
    default:
      return <Clock className={`${iconSize} text-gray-400`} />;
  }
}
