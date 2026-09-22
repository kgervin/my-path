import type { RouteObject } from 'react-router'

import { FlagDetailPage } from '../features/detail/FlagDetailPage'
import { HelpPage } from '../features/help/HelpPage'
import { QueuePage } from '../features/queue/QueuePage'
import { SummaryPage } from '../features/summary/SummaryPage'
import { UploadPage } from '../features/upload/UploadPage'
import { LatestRun } from './LatestRun'
import { Layout } from './Layout'
import { NotFound } from './NotFound'

export const routes: RouteObject[] = [
  {
    element: <Layout />,
    children: [
      { index: true, element: <UploadPage /> },
      { path: 'queue', element: <LatestRun view="queue" /> },
      { path: 'summary', element: <LatestRun view="summary" /> },
      {
        path: 'runs/:runId',
        element: <QueuePage />,
        children: [{ path: 'students/:flagId', element: <FlagDetailPage /> }],
      },
      { path: 'runs/:runId/summary', element: <SummaryPage /> },
      { path: 'help', element: <HelpPage /> },
      { path: '*', element: <NotFound /> },
    ],
  },
]
