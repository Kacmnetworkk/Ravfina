import { useEffect, useState } from 'react';
import { LandingPage } from './components/LandingPage';
import { RouteTransitionShell } from './components/MotionPrimitives';
import { OnboardingWizard } from './components/OnboardingWizard';
import { navigateTo } from './components/SiteChrome';
import { TreasuryWorkspace } from './components/TreasuryWorkspace';
import { ThemeProvider } from './context/ThemeContext';
import { DEFAULT_ONBOARDING_CONFIG } from './data/seedTreasury';
import type { OnboardingConfig } from './domain/treasury';
import { AgencyPage } from './pages/AgencyPage';
import { AiChatPage } from './pages/AiChatPage';
import { ApiHubPage } from './pages/ApiHubPage';
import { AuthPage } from './pages/AuthPage';
import { BlogPage } from './pages/BlogPage';
import { DocsPage } from './pages/DocsPage';
import { EditorPage } from './pages/EditorPage';
import { JournalPage } from './pages/JournalPage';
import { LegalPage } from './pages/LegalPage';
import { PricingPage } from './pages/PricingPage';
import { SpotlightPage } from './pages/SpotlightPage';
import { StorePage } from './pages/StorePage';

function resolveCurrentPath(): string {
  if (typeof window === 'undefined') return '/';
  const params = new URLSearchParams(window.location.search);
  const pathname = window.location.pathname || '/';
  if (pathname === '/' && params.get('autostart') === '1') {
    return '/app/vanguard-robotics';
  }
  if (pathname === '/' && params.get('onboarding') === '1') {
    return '/onboarding';
  }
  return pathname;
}

export default function App() {
  const [path, setPath] = useState<string>(resolveCurrentPath);
  const [config, setConfig] = useState<OnboardingConfig>(DEFAULT_ONBOARDING_CONFIG);

  useEffect(() => {
    const syncPath = () => setPath(resolveCurrentPath());
    window.addEventListener('popstate', syncPath);
    return () => window.removeEventListener('popstate', syncPath);
  }, []);

  const renderRoute = () => {
    if (path === '/onboarding') {
      return (
        <OnboardingWizard
          initialConfig={config}
          onComplete={(completedConfig) => {
            setConfig(completedConfig);
            navigateTo('/app/vanguard-robotics');
          }}
          onBackToLanding={() => navigateTo('/')}
        />
      );
    }

    if (path === '/app' || path.startsWith('/app/')) {
      const slug = path.replace(/^\/app\/?/, '').split('/')[0] || 'vanguard-robotics';
      return (
        <TreasuryWorkspace
          orgSlug={slug}
          config={config}
          onReopenWizard={() => navigateTo('/onboarding')}
          onReturnToLanding={() => navigateTo('/')}
        />
      );
    }

    if (path === '/pricing') return <PricingPage currentPath={path} />;
    if (path === '/legal' || path.startsWith('/legal/')) return <LegalPage currentPath={path} />;
    if (path === '/blog' || path.startsWith('/blog/')) return <BlogPage currentPath={path} />;
    if (path === '/docs' || path.startsWith('/docs/')) return <DocsPage currentPath={path} />;
    if (path === '/api') return <ApiHubPage currentPath={path} />;
    if (path === '/store') return <StorePage currentPath={path} />;
    if (path === '/chat') return <AiChatPage currentPath={path} />;
    if (path === '/editor') return <EditorPage currentPath={path} />;
    if (path === '/journal') return <JournalPage currentPath={path} />;
    if (path === '/agency') return <AgencyPage currentPath={path} />;
    if (path === '/spotlight') return <SpotlightPage currentPath={path} />;
    if (path === '/auth') return <AuthPage currentPath={path} />;

    return (
      <LandingPage
        onStartOnboarding={() => navigateTo('/onboarding')}
        onExploreWorkspace={() => navigateTo('/app/vanguard-robotics')}
      />
    );
  };

  return (
    <ThemeProvider>
      <RouteTransitionShell transitionKey={path}>{renderRoute()}</RouteTransitionShell>
    </ThemeProvider>
  );
}
