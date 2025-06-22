import os
from dotenv import load_dotenv
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
from langchain_qdrant import Qdrant
from openai import OpenAI

# Load environment variables (ensure you have OPENAI_API_KEY in a .env file)
load_dotenv()

# --- Initialize Global Components ---
# This is more efficient as they are loaded only once when the server starts.
QDRANT_URL = "http://localhost:6333"
COLLECTION_NAME = "learning_vectors"
EMBEDDING_MODEL = OpenAIEmbeddings(model="text-embedding-3-large")
LLM_CLIENT = OpenAI()

def process_and_index_pdf(file_path: str):
    """
    Loads, splits, embeds, and indexes a PDF file into the Qdrant vector database.
    This function encapsulates the logic from your rag-main.py script.
    """
    print(f"Starting indexing for: {file_path}")
    
    # 1. Loading the Document
    loader = PyPDFLoader(file_path=file_path)
    docs = loader.load()
    print(f"Loaded {len(docs)} pages from the document.")

    # 2. Chunking the Document
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    split_docs = text_splitter.split_documents(documents=docs)
    print(f"Document split into {len(split_docs)} chunks.")

    # 3. Storing in Vector Database
    # NOTE: `force_recreate=True` will delete the existing collection and create a new one.
    # For a multi-document application, you might want to manage collections differently.
    print("Storing chunks in Qdrant vector database...")
    Qdrant.from_documents(
        documents=split_docs,
        embedding=EMBEDDING_MODEL,
        url=QDRANT_URL,
        collection_name=COLLECTION_NAME,
        force_recreate=True,
    )
    print("--- Indexing of document is complete! ---")
    return {"status": "success", "message": f"Successfully indexed {len(split_docs)} chunks."}


def get_rag_response(query: str) -> str:
    """
    Retrieves context from Qdrant and generates a response using an LLM.
    This function encapsulates the logic from your chat.py script.
    """
    print(f"Received query for RAG response: {query}")
    
    # 1. Connect to the existing vector database
    vector_db = Qdrant.from_existing_collection(
        embedding=EMBEDDING_MODEL,
        url=QDRANT_URL,
        collection_name=COLLECTION_NAME,
    )

    # 2. Perform Similarity Search
    search_results = vector_db.similarity_search(query=query, k=3)
    print(f"Found {len(search_results)} relevant chunks.")

    # 3. Format the Context
    context = "\n\n---\n\n".join([
        f"Page Content: {result.page_content}\n"
        f"Source File: {result.metadata.get('source', 'N/A')}, "
        f"Page Number: {result.metadata.get('page', 'N/A') + 1}"
        for result in search_results
    ])

    # 4. Construct the Final Prompt
    SYSTEM_PROMPT = f"""
    You are a helpful AI assistant. Your task is to answer the user's query based ONLY on the following context retrieved from a PDF document.
    When you answer, you must:
    1. Provide a clear and concise answer to the user's question.
    2. Base your answer strictly on the provided context. Do not use any external knowledge.
    3. After your answer, cite the source and page number(s) where the information was found.

    Here is the context:
    ---
    {context}
    ---
    """
    
    # 5. Send to LLM and Get Answer
    chat_completion = LLM_CLIENT.chat.completions.create(
        model="gpt-4-turbo",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": query}
        ]
    )

    return chat_completion.choices[0].message.content