import { ErrorBoundary } from './components/common/ErrorBoundary'
import { RestaurantWebShell } from './screens/restaurant/RestaurantWebShell'

function App() {
  return (
    <ErrorBoundary>
      <RestaurantWebShell />
    </ErrorBoundary>
  )
}

export default App
