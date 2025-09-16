'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

export interface LoadingStateProps {
  message?: string;
  progress?: number;
  variant?: 'default' | 'inline' | 'overlay';
  size?: 'sm' | 'md' | 'lg';
}

export function LoadingState({
  message = 'Loading...',
  progress,
  variant = 'default',
  size = 'md'
}: LoadingStateProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  const iconSize = sizeClasses[size];

  if (variant === 'inline') {
    return (
      <div className="flex items-center space-x-2">
        <Loader2 className={`animate-spin text-blue-600 ${iconSize}`} />
        <span className="text-sm text-gray-600">{message}</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center space-x-3 ${variant === 'overlay' ? 'p-6' : 'p-4'}`}>
      <Loader2 className={`animate-spin text-blue-600 ${iconSize}`} />
      <div>
        <p className={`font-medium text-gray-900 ${size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-base' : 'text-sm'}`}>
          {message}
        </p>
        {progress !== undefined && (
          <div className="w-32 bg-gray-200 rounded-full h-1 mt-2">
            <div
              className="bg-blue-600 h-1 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export interface FormLoadingOverlayProps {
  isLoading: boolean;
  message?: string;
  children: React.ReactNode;
}

export function FormLoadingOverlay({
  isLoading,
  message = 'Processing...',
  children
}: FormLoadingOverlayProps) {
  return (
    <div className="relative">
      {children}
      {isLoading && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-lg flex items-center justify-center z-10">
          <LoadingState message={message} variant="overlay" size="md" />
        </div>
      )}
    </div>
  );
}

export interface LoadingSkeletonProps {
  lines?: number;
  className?: string;
}

export function LoadingSkeleton({ lines = 3, className = '' }: LoadingSkeletonProps) {
  return (
    <div className={`animate-pulse space-y-3 ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className={`h-4 bg-gray-200 rounded ${
            index === lines - 1 ? 'w-3/4' : 'w-full'
          }`}
        />
      ))}
    </div>
  );
}