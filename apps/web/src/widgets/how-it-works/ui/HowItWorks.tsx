import {
  Play,
  Shuffle,
  Zap,
  Activity,
} from 'lucide-react';

const steps = [
  {
    name: 'Trigger',
    description:
      'Start your workflow with webhooks, schedules, or manual triggers. Your automation begins when an event occurs.',
    icon: Play,
  },
  {
    name: 'Transform',
    description:
      'Shape and transform data between steps. Map fields, filter content, and prepare data for the next action.',
    icon: Shuffle,
  },
  {
    name: 'Action',
    description:
      'Execute actions like sending emails, making HTTP requests, or updating databases. Connect to your tools seamlessly.',
    icon: Zap,
  },
  {
    name: 'Monitor',
    description:
      'Track execution history, view logs, and get notified on failures. Stay in control with detailed insights.',
    icon: Activity,
  },
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="bg-gray-50 py-24 sm:py-32"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            How it works
          </h2>
          <p className="mt-4 text-lg leading-8 text-gray-600">
            Build powerful automations in four simple steps
          </p>
        </div>
        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
          <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-4">
            {steps.map((step) => (
              <div key={step.name} className="flex flex-col">
                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-900">
                    <step.icon
                      className="h-6 w-6 text-white"
                      aria-hidden="true"
                    />
                  </div>
                  {step.name}
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                  <p className="flex-auto">{step.description}</p>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
