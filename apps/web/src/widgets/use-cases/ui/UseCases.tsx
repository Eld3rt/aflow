import {
  Server,
  Bell,
  Database,
  Wrench,
} from 'lucide-react';

const useCases = [
  {
    name: 'DevOps automation',
    description:
      'Automate deployments, monitor infrastructure, and sync data between services. Keep your systems running smoothly.',
    icon: Server,
  },
  {
    name: 'Product notifications',
    description:
      'Send user notifications, trigger alerts, and keep stakeholders informed. Deliver timely updates automatically.',
    icon: Bell,
  },
  {
    name: 'Data sync',
    description:
      'Sync data between systems, transform formats, and keep databases in sync. Maintain consistency across platforms.',
    icon: Database,
  },
  {
    name: 'Internal tools',
    description:
      'Build internal automations for your team. Streamline processes and reduce manual work with custom workflows.',
    icon: Wrench,
  },
];

export function UseCases() {
  return (
    <section
      id="use-cases"
      className="bg-gray-50 py-24 sm:py-32"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Use cases
          </h2>
          <p className="mt-4 text-lg leading-8 text-gray-600">
            Automate workflows across different domains
          </p>
        </div>
        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-4xl">
          <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-2 lg:gap-y-16">
            {useCases.map((useCase) => (
              <div key={useCase.name} className="relative pl-16">
                <dt className="text-base font-semibold leading-7 text-gray-900">
                  <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-gray-900">
                    <useCase.icon
                      className="h-6 w-6 text-white"
                      aria-hidden="true"
                    />
                  </div>
                  {useCase.name}
                </dt>
                <dd className="mt-2 text-base leading-7 text-gray-600">
                  {useCase.description}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
