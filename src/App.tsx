import { AppSidebar } from './components/AppSidebar'

function App() {
  return (
    <div style={styles.layout}>
      <AppSidebar />
      <main style={styles.main}>
        {/* Conteúdo da página */}
      </main>
    </div>
  )
}

export default App

const styles = {
  layout: {
    display: 'flex',
    minHeight: '100vh',
  },
  main: {
    flex: 1,
    backgroundColor: '#ffffff',
    minHeight: '100vh',
  },
} as const
