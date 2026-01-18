'use client';

import { SignInButton, SignUpButton } from '@clerk/nextjs';
import { Menu, X } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { cn } from '@aflow/web/shared/lib';

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation = [
    { name: 'How it works', href: '#how-it-works' },
    { name: 'Features', href: '#features' },
    { name: 'Use Cases', href: '#use-cases' },
  ];

  return (
    <header className="fixed top-0 z-50 w-full border-b border-gray-200 bg-white/80 backdrop-blur-sm">
      <nav
        className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8"
        aria-label="Global"
      >
        <div className="flex items-center gap-x-12">
          <Link href="/" className="text-xl font-bold text-gray-900">
            <img src="/images/logo.png" alt="aflow" width={120} height={120} />
          </Link>
          <div className="hidden lg:flex lg:gap-x-6">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="text-sm font-medium text-gray-700 transition-colors hover:text-gray-900"
              >
                {item.name}
              </Link>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-x-4">
          <div className="hidden items-center gap-x-4 sm:flex">
            <SignInButton fallbackRedirectUrl='/app' mode="modal">
              <button className="cursor-pointer text-sm font-medium text-gray-700 transition-colors hover:text-gray-900">
                Sign in
              </button>
            </SignInButton>
            <SignUpButton fallbackRedirectUrl='/app' mode="modal">
              <button className="cursor-pointer rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800">
                Get started
              </button>
            </SignUpButton>
          </div>
          <button
            type="button"
            className="lg:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6 text-gray-700" />
            ) : (
              <Menu className="h-6 w-6 text-gray-700" />
            )}
          </button>
        </div>
      </nav>
      {/* Mobile menu */}
      <div
        className={cn(
          'lg:hidden',
          mobileMenuOpen ? 'block' : 'hidden',
          'border-t border-gray-200 bg-white',
        )}
      >
        <div className="space-y-1 px-4 pb-4 pt-4">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="block rounded-lg px-3 py-2 text-base font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-gray-900"
              onClick={() => setMobileMenuOpen(false)}
            >
              {item.name}
            </Link>
          ))}
          <div className="mt-4 space-y-2 border-t border-gray-200 pt-4">
            <SignInButton mode="modal">
              <button className="block w-full cursor-pointer rounded-lg px-3 py-2 text-left text-base font-medium text-gray-700 transition-colors hover:bg-gray-50">
                Sign in
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="block w-full cursor-pointer rounded-lg bg-gray-900 px-3 py-2 text-left text-base font-medium text-white transition-colors hover:bg-gray-800">
                Get started
              </button>
            </SignUpButton>
          </div>
        </div>
      </div>
    </header>
  );
}
