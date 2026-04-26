import { FileUpload } from './presentation/converter/components/FileUpload'
import './App.css'

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>BPD to Wallet File Formatter</h1>
        <p>Convert your BPD CSV or text-based PDF statements to wallet format</p>
      </header>
      <main className="app-main">
        <FileUpload />
      </main>
    </div>
  )
}

export default App
