import React, { useState, useRef, useEffect } from 'react';
import './App.css';

function App() {
  // --- STATE MANAGEMENT ---
  // Holds the selected file object
  const [file, setFile] = useState(null);
  // Tracks if the indexing process is running
  const [isIndexing, setIsIndexing] = useState(false);
  // Tracks if the AI is generating an answer
  const [isAnswering, setIsAnswering] = useState(false);
  // Tracks if a document has been successfully indexed
  const [docIndexed, setDocIndexed] = useState(false);
  // Holds the user's current chat input
  const [query, setQuery] = useState('');
  // Stores the conversation history
  const [chatHistory, setChatHistory] = useState([]);
  // Stores any error messages to display to the user
  const [error, setError] = useState('');
  // A reference to the end of the chat window for auto-scrolling
  const chatEndRef = useRef(null);

  // --- EVENT HANDLERS ---

  // This function is called when the user selects a file from the input.
  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    // Reset state when a new file is chosen
    setDocIndexed(false);
    setChatHistory([]);
    setError('');
  };

  // This function is called when the user clicks the "Index Document" button.
  const handleIndexSubmit = async (e) => {
    // LOG 1: Check if the function is being called at all.
    console.log("handleIndexSubmit function triggered!");

    e.preventDefault(); // Make absolutely sure this is here and is called first.

    // LOG 2: Check the state of the 'file' variable.
    console.log("Current file state:", file);

    if (!file) {
      console.error("Validation failed: No file selected.");
      setError('Please select a PDF file to index.');
      return; // The function stops here if no file is selected.
    }

    const formData = new FormData();
    formData.append('file', file);

    setIsIndexing(true);
    setError('');

    // LOG 3: Check if we are about to make the fetch call.
    console.log("Preparing to send fetch request to http://127.0.0.1:5000/api/index...");

    try {
      const response = await fetch('http://127.0.0.1:5000/api/index', {
        method: 'POST',
        body: formData,
      });

      // LOG 4: If this log appears, the request was sent successfully.
      console.log("Fetch request sent. Waiting for response...", response);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to index document.');
      }
      
      setDocIndexed(true);
      alert('Document indexed successfully! You can now ask questions.');

    } catch (err) {
      console.error("An error occurred in the fetch block:", err);
      setError(err.message);
    } finally {
      setIsIndexing(false);
    }
  };

  // This function is called when the user sends a message in the chat.
  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    const userMessage = { type: 'user', message: query };
    setChatHistory(prev => [...prev, userMessage]);
    setQuery('');
    setIsAnswering(true);
    setError('');

    try {
      const response = await fetch('http://127.0.0.1:5000/api/chat', {
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
      console.error("Failed to get chat response:", err);
      const aiErrorMessage = { type: 'ai', message: `Error: ${err.message}` };
      setChatHistory(prev => [...prev, aiErrorMessage]);
    } finally {
      setIsAnswering(false);
    }
  };
  
  // This effect runs whenever the chat history changes to scroll to the bottom.
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  // --- JSX FOR THE UI ---
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