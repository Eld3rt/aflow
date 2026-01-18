'use client';

import { CheckCircle2, XCircle, PauseCircle, Clock } from 'lucide-react';

interface ExecutionStatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export function ExecutionStatusBadge({ status, size = 'sm' }: ExecutionStatusBadgeProps) {
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';
  const padding = size === 'sm' ? 'px-2 py-1' : 'px-3 py-1';

  switch (status) {
    case 'completed':
      return (
        <span className={`inline-flex items-center gap-1 rounded-full bg-green-100 ${padding} ${textSize} font-medium text-green-800`}>
          <CheckCircle2 className={iconSize} />
          Completed
        </span>
      );
    case 'failed':
      return (
        <span className={`inline-flex items-center gap-1 rounded-full bg-red-100 ${padding} ${textSize} font-medium text-red-800`}>
          <XCircle className={iconSize} />
          Failed
        </span>
      );
    case 'paused':
      return (
        <span className={`inline-flex items-center gap-1 rounded-full bg-yellow-100 ${padding} ${textSize} font-medium text-yellow-800`}>
          <PauseCircle className={iconSize} />
          Paused
        </span>
      );
    case 'running':
      return (
        <span className={`inline-flex items-center gap-1 rounded-full bg-blue-100 ${padding} ${textSize} font-medium text-blue-800`}>
          <Clock className={`${iconSize} animate-spin`} />
          Running
        </span>
      );
    default:
      return (
        <span className={`inline-flex items-center gap-1 rounded-full bg-gray-100 ${padding} ${textSize} font-medium text-gray-600`}>
          <Clock className={iconSize} />
          {status}
        </span>
      );
  }
}
