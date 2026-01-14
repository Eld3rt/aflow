import { Header } from '@aflow/web/widgets/header';
import { Hero } from '@aflow/web/widgets/hero';
import { HowItWorks } from '@aflow/web/widgets/how-it-works';
import { Features } from '@aflow/web/widgets/features';
import { UseCases } from '@aflow/web/widgets/use-cases';
import { CTA } from '@aflow/web/widgets/cta';
import { Footer } from '@aflow/web/widgets/footer';

export function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <Hero />
        <HowItWorks />
        <Features />
        <UseCases />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
