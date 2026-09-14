import { Suspense } from 'react';
import { AppStateProvider } from '@/components/app-state';
import { AppFooter } from '@/components/app-shell/app-footer';
import { MobileNav } from '@/components/app-shell/mobile-nav';
import { Sidebar } from '@/components/app-shell/sidebar';
import { Topbar } from '@/components/app-shell/topbar';
import { PageHeading } from '@/components/app-shell/page-heading';
import { AppDialogs } from '@/components/dialogs/app-dialogs';
import { DialogProvider } from '@/components/dialogs/dialog-provider';
import { Toast } from '@/components/toast';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppStateProvider>
      <DialogProvider>
        {/* `useSearchParams` needs a Suspense boundary to keep the rest of the
            shell renderable while the client reads the URL. */}
        <Suspense fallback={null}>
          <div className="app-shell">
            <Sidebar />
            <div className="main-shell">
              <Topbar />
              <main className="main-content">
                <PageHeading />
                {children}
                <AppFooter />
              </main>
            </div>
            <MobileNav />
          </div>
          <AppDialogs />
        </Suspense>
        <Toast />
      </DialogProvider>
    </AppStateProvider>
  );
}
