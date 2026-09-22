import { Link } from 'react-router'

import { PageHeading } from '../components/PageHeading'

export function NotFound() {
  return (
    <>
      <PageHeading title="Page not found">
        <p>
          That page does not exist. Go to the <Link to="/queue">queue</Link> or{' '}
          <Link to="/">upload a CSV</Link>.
        </p>
      </PageHeading>
    </>
  )
}
