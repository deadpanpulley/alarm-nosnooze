import React from 'react';
import { createRoot } from 'react-dom/client';
import App from '../../App';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Web-specific entry point
const WebApp = () => {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center',
      height: '100vh',
      width: '100vw',
      overflow: 'hidden'
    }}>
      <div style={{ 
        maxWidth: 420, 
        width: '100%', 
        height: '100%', 
        overflow: 'hidden',
        position: 'relative',
        WebkitBoxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        MozBoxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        borderRadius: Platform.OS === 'web' ? '12px' : 0
      }}>
        <SafeAreaProvider>
          <App />
        </SafeAreaProvider>
      </div>
    </div>
  );
};

// Mount the app
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<WebApp />);
}
