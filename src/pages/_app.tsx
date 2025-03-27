import React from 'react';
import type { AppProps } from 'next/app';
import { TaskProvider } from '../context/TaskContext';
import MainLayout from '../components/MainLayout';
import '../styles/globals.css';

function App({ Component, pageProps }: AppProps) {
  return (
    <TaskProvider>
      <MainLayout>
        <Component {...pageProps} />
      </MainLayout>
    </TaskProvider>
  );
}

export default App;
