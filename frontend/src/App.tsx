import { Dashboard } from './pages/Dashboard';

/**
 * Single-purpose console.
 *
 * The router and its five "under construction" placeholder pages were removed:
 * they were dead ends that made a purpose-built control surface read like a
 * generic admin template. This app does one thing - operate the house - and
 * the console owns the whole viewport, including its own sticky header.
 */
function App() {
  return <Dashboard />;
}

export default App;
