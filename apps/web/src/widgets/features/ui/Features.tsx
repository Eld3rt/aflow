import {
  Webhook,
  Clock,
  Plug,
  Shield,
} from 'lucide-react';

const features = [
  {
    name: 'Webhooks',
    description:
      'Receive real-time events from external services. Trigger workflows instantly when data changes.',
    icon: Webhook,
  },
  {
    name: 'Schedules',
    description:
      'Run workflows on a schedule with cron expressions. Automate recurring tasks automatically.',
    icon: Clock,
  },
  {
    name: 'Integrations',
    description:
      'Connect to HTTP APIs, send emails, query databases, and more. Extend functionality with custom actions.',
    icon: Plug,
  },
  {
    name: 'Error handling',
    description:
      'Built-in retry logic, pause on failure, and notifications. Keep your automations reliable and monitored.',
    icon: Shield,
  },
];

export function Features() {
  return (
    <section
      id="features"
      className="bg-white py-24 sm:py-32"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Powerful features
          </h2>
          <p className="mt-4 text-lg leading-8 text-gray-600">
            Everything you need to build reliable automations
          </p>
        </div>
        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-4xl">
          <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-2 lg:gap-y-16">
            {features.map((feature) => (
              <div key={feature.name} className="relative pl-16">
                <dt className="text-base font-semibold leading-7 text-gray-900">
                  <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-gray-900">
                    <feature.icon
                      className="h-6 w-6 text-white"
                      aria-hidden="true"
                    />
                  </div>
                  {feature.name}
                </dt>
                <dd className="mt-2 text-base leading-7 text-gray-600">
                  {feature.description}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
