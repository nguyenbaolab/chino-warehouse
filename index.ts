import { createElement } from 'react';
import { registerRootComponent } from 'expo';

import App from './App';
import StartupErrorBoundary from './components/StartupErrorBoundary';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(() =>
  createElement(StartupErrorBoundary, null, createElement(App)),
);
