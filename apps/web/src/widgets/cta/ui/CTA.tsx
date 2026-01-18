'use client';

import { SignUpButton } from '@clerk/nextjs';
import { ArrowRight } from 'lucide-react';

export function CTA() {
  return (
    <section className="bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Ready to automate?
          </h2>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            Create your first workflow in minutes. No credit card required.
          </p>
          <div className="mt-10 flex items-center justify-center">
            <SignUpButton fallbackRedirectUrl='/app/dashboard' mode="modal">
              <button className="flex items-center gap-2 cursor-pointer rounded-lg bg-gray-900 px-8 py-4 text-base font-semibold text-white shadow-sm transition-colors hover:bg-gray-800">
                Get started
                <ArrowRight className="h-5 w-5" />
              </button>
            </SignUpButton>
          </div>
        </div>
      </div>
    </section>
  );
}
