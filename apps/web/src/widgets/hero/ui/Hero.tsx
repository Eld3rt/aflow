'use client';

import { SignUpButton } from '@clerk/nextjs';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-white pt-32 pb-20 sm:pt-40 sm:pb-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
            Automate workflows without code
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            Connect your tools, automate repetitive tasks, and build powerful
            workflows that run reliably. Focus on what matters while your
            automations handle the rest.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <SignUpButton fallbackRedirectUrl='/app/dashboard' mode="modal">
              <button className="flex items-center gap-2 cursor-pointer rounded-lg bg-gray-900 px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-gray-800">
                Start automating
                <ArrowRight className="h-5 w-5" />
              </button>
            </SignUpButton>
            <Link
              href="#how-it-works"
              className="text-base font-semibold leading-6 text-gray-900 transition-colors hover:text-gray-700"
            >
              See how it works <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
        <div className="mt-16 flex justify-center">
          <div className="relative w-full max-w-4xl">
            {/* Placeholder for illustration - user will add image src manually */}
            <div className="aspect-video w-full rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 shadow-2xl ring-1 ring-gray-900/10">
              <div className="flex h-full items-center justify-center">
                <img src="/images/hero-image.png" alt="aflow hero image" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
