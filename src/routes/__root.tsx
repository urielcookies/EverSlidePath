import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { Toaster } from 'sonner'
import { useEffect } from 'react'

import appCss from '../styles.css?url'
import { installAuthFetchInterceptor } from '../middleware'
import { getMeFn } from '../server/authFunctions'
import { setAuthUser, clearAuthUser } from '../store/authStore'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'PathShare — Digital Pathology' },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    installAuthFetchInterceptor()
    getMeFn().then((user) => {
      if (user) setAuthUser(user)
      else clearAuthUser()
    }).catch(() => clearAuthUser())
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="bg-[#020617] text-slate-100 font-sans antialiased">
        {children}
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'rgba(15,23,42,0.97)',
              border: '1px solid rgba(51,65,85,0.6)',
              color: '#cbd5e1',
              fontSize: '12px',
              fontFamily: 'monospace',
            },
          }}
        />
        <TanStackDevtools
          config={{ position: 'bottom-right' }}
          plugins={[{ name: 'Tanstack Router', render: <TanStackRouterDevtoolsPanel /> }]}
        />
        <Scripts />
      </body>
    </html>
  )
}
