import React from 'react';
import Head from 'next/head';
import TaskForm from '../components/TaskForm';
import TaskList from '../components/TaskList';
import ProjectForm from '../components/ProjectForm';

export default function Home() {
  return (
    <>
      <Head>
        <title>Task Todo Next</title>
        <meta name="description" content="Task management application" />
      </Head>

      <main>
        <section className="section">
          <div className="container">
            <h1 className="title has-text-light mb-6">Task Todo Next</h1>
            
            <div className="columns">
              <div className="column is-4">
                <div className="mb-6">
                  <h2 className="title is-4 has-text-light mb-4">Gerenciar Projetos</h2>
                  <ProjectForm />
                </div>
                
                <div>
                  <TaskForm />
                </div>
              </div>
              
              <div className="column is-8">
                <h2 className="title is-4 has-text-light mb-4">Lista de Tarefas</h2>
                <TaskList />
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
