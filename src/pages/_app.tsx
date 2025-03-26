import React from 'react';
import type { AppProps } from 'next/app';
import { TaskProvider } from '../context/TaskContext';
import '../styles/globals.css';

function App({ Component, pageProps }: AppProps) {
  return (
    <TaskProvider>
      <Component {...pageProps} />
    </TaskProvider>
  );
}

export default App;
