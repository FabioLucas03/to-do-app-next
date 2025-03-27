import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const router = useRouter();
  const currentPath = router.pathname;
  
  return (
    <>
      <nav className="navbar is-dark" role="navigation" aria-label="main navigation">
        <div className="navbar-brand">
          <Link href="/" legacyBehavior>
            <a className="navbar-item">
              <strong>Task Todo Next</strong>
            </a>
          </Link>

          <a 
            role="button" 
            className="navbar-burger" 
            aria-label="menu" 
            aria-expanded="false"
            onClick={() => {
              const burger = document.querySelector('.navbar-burger');
              const menu = document.querySelector('.navbar-menu');
              burger?.classList.toggle('is-active');
              menu?.classList.toggle('is-active');
            }}
          >
            <span aria-hidden="true"></span>
            <span aria-hidden="true"></span>
            <span aria-hidden="true"></span>
          </a>
        </div>

        <div className="navbar-menu">
          <div className="navbar-start">
            <Link href="/" legacyBehavior>
              <a className={`navbar-item ${currentPath === '/' ? 'is-active' : ''}`}>
                <span className="icon">
                  <i className="fas fa-tasks"></i>
                </span>
                <span>Tarefas</span>
              </a>
            </Link>
            
            <Link href="/analytics" legacyBehavior>
              <a className={`navbar-item ${currentPath === '/analytics' ? 'is-active' : ''}`}>
                <span className="icon">
                  <i className="fas fa-chart-bar"></i>
                </span>
                <span>Analytics</span>
              </a>
            </Link>
          </div>
        </div>
      </nav>
      <main>{children}</main>
    </>
  );
};

export default MainLayout;
