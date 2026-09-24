import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'

import { Providers } from './app/Providers'
import { routes } from './app/router'
import '@fontsource-variable/plus-jakarta-sans'
import './styles/app.css'

const root = document.getElementById('root')
if (!root) throw new Error('Missing #root element')

createRoot(root).render(
  <StrictMode>
    <Providers>
      <RouterProvider router={createBrowserRouter(routes)} />
    </Providers>
  </StrictMode>,
)
