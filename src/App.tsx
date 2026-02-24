import logo from './assets/omni_logo.jpeg'

function App() {
  return (
    <div style={styles.container}>
      <img src={logo} alt="Logo" style={styles.logo} />
    </div>
  );
}

export default App;

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
  },
  logo: {
    maxWidth: '280px',
    width: '100%',
    height: 'auto',
  },
} as const;
