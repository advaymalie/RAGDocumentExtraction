import React, { useState, useRef, useEffect } from 'react';
import './App.css';

function App() {
  const [file, setFile] = useState(null);
  const [isIndexing, setIsIndexing] = useState(false);
  const [isAnswering, setIsAnswering] = useState(false);
  const [docIndexed, setDocIndexed] = useState(false);
  const [query, setQuery] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [error, setError] = useState('');
  const chatEndRef = useRef(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setDocIndexed(false); // Reset if a new file is chosen
    setChatHistory([]);
    setError('');
  };

  const handleIndexSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a PDF file to index.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setIsIndexing(true);
    setError('');

    try {
      const response = await fetch('http://localhost:5000/api/index', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to index document.');
      }
      
      setDocIndexed(true);
      alert('Document indexed successfully! You can now ask questions.');

    } catch (err) {
      setError(err.message);
    } finally {
      setIsIndexing(false);
    }
  };

  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    const userMessage = { type: 'user', message: query };
    setChatHistory(prev => [...prev, userMessage]);
    setQuery('');
    setIsAnswering(true);
    setError('');

    try {
      const response = await fetch('http://localhost:5000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get an answer.');
      }

      const aiMessage = { type: 'ai', message: data.answer };
      setChatHistory(prev => [...prev, aiMessage]);

    } catch (err) {
      setError(err.message);
      const aiErrorMessage = { type: 'ai', message: `Error: ${err.message}` };
      setChatHistory(prev => [...prev, aiErrorMessage]);
    } finally {
      setIsAnswering(false);
    }
  };
  
  // Auto-scroll to the bottom of the chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  return (
    <div className="App">
      <header className="App-header">
        <h1>PDF-RAG Chat Application</h1>
      </header>
      <main>
        <div className="pipeline-section">
          <h2>Step 1: Index Your Document</h2>
          <form onSubmit={handleIndexSubmit}>
            <input type="file" accept=".pdf" onChange={handleFileChange} />
            <button type="submit" disabled={isIndexing}>
              {isIndexing ? 'Indexing...' : 'Index Document'}
            </button>
          </form>
          {error && <p className="error-message">{error}</p>}
        </div>

        <div className={`pipeline-section ${!docIndexed ? 'disabled' : ''}`}>
          <h2>Step 2: Chat With Your Document</h2>
          <div className="chat-window">
            <div className="chat-history">
              {chatHistory.map((chat, index) => (
                <div key={index} className={`chat-message ${chat.type}`}>
                  <p>{chat.message}</p>
                </div>
              ))}
              {isAnswering && (
                 <div className="chat-message ai">
                  <p><i>Thinking...</i></p>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <form onSubmit={handleChatSubmit} className="chat-input-form">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={docIndexed ? 'Ask a question...' : 'Please index a document first'}
                disabled={!docIndexed || isAnswering}
              />
              <button type="submit" disabled={!docIndexed || isAnswering}>Send</button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;