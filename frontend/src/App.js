// App.js
import React, { useState } from "react";
import UploadForm from "./components/UploadForm";
import { auth, db } from "./firebase";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";

const App = () => {
  const [user, setUser] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [latestUpload, setLatestUpload] = useState(null);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      setUser(result.user);
    } catch (err) {
      console.error("Login Error:", err);
      setError("Failed to sign in.");
    }
  };

  const fetchDocuments = async () => {
    if (!user) {
      setError("Please sign in to retrieve your documents.");
      return;
    }

    try {
      setLoading(true);
      const userDocRef = collection(db, "users", user.email, "documents");
      const querySnapshot = await getDocs(userDocRef);

      if (querySnapshot.empty) {
        setError("No documents found.");
        setDocuments([]);
        setLoading(false);
        return;
      }

      const docs = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setDocuments(docs);
      setError(null);
      setLoading(false);
    } catch (err) {
      console.error("Fetch Error:", err);
      setError("Failed to retrieve documents.");
      setLoading(false);
    }
  };

  const deleteDocument = async (docId) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, "users", user.email, "documents", docId));
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
    } catch (err) {
      console.error("Delete Error:", err);
    }
  };

  const deleteAllDocuments = async () => {
    if (!user) return;
    try {
      const querySnapshot = await getDocs(
        collection(db, "users", user.email, "documents")
      );
      const deletePromises = querySnapshot.docs.map((doc) =>
        deleteDoc(doc.ref)
      );
      await Promise.all(deletePromises);
      setDocuments([]);
    } catch (err) {
      console.error("Bulk Delete Error:", err);
    }
  };

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", textAlign: "center" }}>
      <h1 style={{ color: "white", marginTop: "12px" }}>Invoice Scanner</h1>

      {!user ? (
        <button onClick={handleLogin}>Sign in with Google</button>
      ) : (
        <p style={{ color: "white", marginTop: "12px" }}>
          Welcome, {user.displayName} ({user.email})
        </p>
      )}

      {user && (
        <UploadForm userEmail={user.email} onUploadComplete={setLatestUpload} />
      )}

      {latestUpload && (
        <div
          style={{
            margin: "20px auto",
            padding: "16px",
            border: "1px solid #ccc",
            borderRadius: "8px",
            backgroundColor: "#f9f9f9",
            color: "#000",
          }}
        >
          <p style={{ color: "#000", marginTop: "12px" }}>
            📄 Document name: {latestUpload.filename}
          </p>

          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              border: "1px solid #ccc",
              backgroundColor: "#fff",
              color: "#000",
            }}
          >
            <thead>
              <tr>
                <td
                  colSpan="2"
                  style={{
                    padding: "12px",
                    backgroundColor: "#d9f2e6",
                    color: "#000",
                    fontWeight: "bold",
                    textAlign: "center",
                    fontSize: "16px",
                    border: "1px solid #ccc",
                  }}
                >
                  💰 Financial Details
                </td>
              </tr>
              <tr>
                <th
                  style={{
                    textAlign: "center",
                    padding: "8px",
                    border: "1px solid #ccc",
                    backgroundColor: "#f0f0f0",
                  }}
                >
                  Field
                </th>
                <th
                  style={{
                    textAlign: "center",
                    padding: "8px",
                    border: "1px solid #ccc",
                    backgroundColor: "#f0f0f0",
                  }}
                >
                  Value
                </th>
              </tr>
            </thead>
            <tbody>
              {latestUpload.structured_data &&
                Object.entries(latestUpload.structured_data).map(
                  ([key, value]) => (
                    <tr key={key}>
                      <td
                        style={{
                          padding: "8px",
                          border: "1px solid #ccc",
                          fontWeight: "bold",
                        }}
                      >
                        {key.replace(/_/g, " ")}
                      </td>
                      <td style={{ padding: "8px", border: "1px solid #ccc" }}>
                        {Array.isArray(value)
                          ? value.map((item, idx) => (
                              <div key={idx}>
                                {Object.entries(item).map(([k, v]) => (
                                  <div key={k}>
                                    <strong>{k.replace(/_/g, " ")}:</strong> {v}
                                  </div>
                                ))}
                              </div>
                            ))
                          : typeof value === "object"
                          ? Object.entries(value).map(([k, v]) => (
                              <div key={k}>
                                <strong>{k.replace(/_/g, " ")}:</strong> {v}
                              </div>
                            ))
                          : value}
                      </td>
                    </tr>
                  )
                )}
            </tbody>
          </table>
        </div>
      )}

      {user && (
        <>
          <button onClick={fetchDocuments}>Retrieve Documents</button>
          <button
            onClick={deleteAllDocuments}
            style={{ marginLeft: "10px", backgroundColor: "#ff4d4d" }}
          >
            Delete All
          </button>
        </>
      )}

      {error && <p style={{ color: "red" }}>{error}</p>}
      {loading && <p>Loading documents...</p>}

      {documents.length > 0 && (
        <div style={{ marginTop: "20px" }}>
          <h2 style={{ color: "white", marginTop: "12px" }}>Your Documents</h2>

          {/* Scrollable container */}
          <div
            style={{
              maxHeight: "500px",
              overflowY: "auto",
              paddingRight: "10px",
            }}
          >
            {documents.map((doc, index) => (
              <div
                key={doc.id}
                style={{
                  border: "1px solid #ccc",
                  borderRadius: "8px",
                  padding: "16px",
                  margin: "16px 0",
                  backgroundColor: "#f9f9f9",
                  color: "#000",
                }}
              >
                {}
                <h3
                  style={{
                    color: "#000",
                    backgroundColor: "#e6f0ff",
                    padding: "10px 20px",
                    borderRadius: "12px",
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                    display: "inline-block",
                    border: "2px solid #cce0ff",
                    marginBottom: "10px",
                  }}
                >
                  📄 Document name: {doc.filename || `Document ${index + 1}`}
                </h3>

                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    border: "1px solid #ccc",
                    backgroundColor: "#fff",
                    color: "#000",
                  }}
                >
                  <thead>
                    <tr>
                      <td
                        colSpan="2"
                        style={{
                          padding: "12px",
                          backgroundColor: "#d9f2e6",
                          color: "#000",
                          fontWeight: "bold",
                          textAlign: "center",
                          fontSize: "16px",
                          border: "1px solid #ccc",
                        }}
                      >
                        💰 Financial Details
                      </td>
                    </tr>
                    <tr>
                      <th
                        style={{
                          textAlign: "center",
                          padding: "8px",
                          border: "1px solid #ccc",
                          backgroundColor: "#f0f0f0",
                        }}
                      >
                        Field
                      </th>
                      <th
                        style={{
                          textAlign: "center",
                          padding: "8px",
                          border: "1px solid #ccc",
                          backgroundColor: "#f0f0f0",
                        }}
                      >
                        Value
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {doc.structured_data &&
                      Object.entries(doc.structured_data).map(
                        ([key, value]) => (
                          <tr key={key}>
                            <td
                              style={{
                                padding: "8px",
                                border: "1px solid #ccc",
                                fontWeight: "bold",
                              }}
                            >
                              {key.replace(/_/g, " ")}
                            </td>
                            <td
                              style={{
                                padding: "8px",
                                border: "1px solid #ccc",
                              }}
                            >
                              {Array.isArray(value)
                                ? value.map((item, idx) => (
                                    <div key={idx}>
                                      {Object.entries(item).map(([k, v]) => (
                                        <div key={k}>
                                          <strong>
                                            {k.replace(/_/g, " ")}:
                                          </strong>{" "}
                                          {v}
                                        </div>
                                      ))}
                                    </div>
                                  ))
                                : typeof value === "object"
                                ? Object.entries(value).map(([k, v]) => (
                                    <div key={k}>
                                      <strong>{k.replace(/_/g, " ")}:</strong>{" "}
                                      {v}
                                    </div>
                                  ))
                                : value}
                            </td>
                          </tr>
                        )
                      )}
                  </tbody>
                </table>

                {doc.file_url && (
                  <a
                    href={doc.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <button style={{ marginTop: "10px" }}>View Document</button>
                  </a>
                )}

                <button
                  onClick={() => deleteDocument(doc.id)}
                  style={{
                    marginTop: "10px",
                    marginLeft: "10px",
                    backgroundColor: "#ff4d4d",
                  }}
                >
                  Delete Document
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
