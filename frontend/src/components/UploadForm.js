import React, { useState, useRef } from "react"; 
import axios from "axios";


const API_BASE_URL = "http://127.0.0.1:5000";

const UploadForm = ({ userEmail }) => {
    const [file, setFile] = useState(null);
    const [response, setResponse] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef(null); 


    const handleFileChange = (event) => {
        setFile(event.target.files[0]);
    };

    const handleUpload = async () => {
        if (!file) {
            setError("Please provide a file.");
            return;
        }

        const formData = new FormData();
        formData.append("user_email", userEmail);
        formData.append("file", file);

        setLoading(true);
        try {
            const res = await axios.post(`${API_BASE_URL}/process`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            setResponse(res.data);
            setError(null);
        } catch (err) {
            setError("Failed to process document.");
            console.error("Upload Error:", err.response?.data || err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            border: "2px solid #ccc",
            borderRadius: "12px",
            padding: "24px",
            margin: "24px auto",
            maxWidth: "600px",
            backgroundColor: "#f2f9ff",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
        }}>
            <h2 style={{ marginBottom: "16px", color: "#333" }}>📤 Upload Invoice</h2>

            <div style={{ marginBottom: "12px" }}>
    <input
        type="file"
        ref={fileInputRef}  

        onChange={handleFileChange}
        style={{
            color: "#000", 
            fontWeight: "bold",
            backgroundColor: "#fff",
            border: "1px solid #ccc",
            padding: "6px",
            borderRadius: "4px"
        }}
    />
    {file && (
        <div style={{ marginTop: "6px", color: "#000", fontWeight: "bold" }}>
            📄 Selected File: {file.name}
        </div>
    )}
</div>
            <br />
            <button onClick={handleUpload} style={{
                padding: "10px 20px",
                backgroundColor: "#4CAF50",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer"
            }}>
                Upload
            </button>

            {loading && <p style={{ color: "#000", marginTop: "12px" }}>⏳ Extracting...</p>}
            {error && <p style={{ color: "red" }}>{error}</p>}

            {response && (
                <div style={{
                    backgroundColor: "#fff",
                    padding: "16px",
                    marginTop: "20px",
                    borderRadius: "8px",
                    boxShadow: "0 0 10px rgba(0,0,0,0.05)"
                }}>
                    <h3 style={{ marginBottom: "8px" }}>📄 Document: {response.filename || "Uploaded File"}</h3>

                    <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #ccc", backgroundColor: "#fff", color: "#000" }}>
                        <thead>
                            <tr>
                                <td colSpan="2" style={{
                                    padding: "12px",
                                    backgroundColor: "#d9f2e6",
                                    color: "#000",
                                    fontWeight: "bold",
                                    textAlign: "center",
                                    fontSize: "16px",
                                    border: "1px solid #ccc"
                                }}>
                                    💰 Financial Details
                                </td>
                            </tr>
                            <tr>
                                <th style={{ textAlign: "center", padding: "8px", border: "1px solid #ccc", backgroundColor: "#f0f0f0" }}>Field</th>
                                <th style={{ textAlign: "center", padding: "8px", border: "1px solid #ccc", backgroundColor: "#f0f0f0" }}>Value</th>
                            </tr>
                        </thead>
                        <tbody>
                            {response.structured_data && Object.entries(response.structured_data).map(([key, value]) => (
                                <tr key={key}>
                                    <td style={{ padding: "8px", border: "1px solid #ccc", fontWeight: "bold" }}>{key.replace(/_/g, " ")}</td>
                                    <td style={{ padding: "8px", border: "1px solid #ccc" }}>
                                        {Array.isArray(value) ? (
                                            value.map((item, idx) => (
                                                <div key={idx}>
                                                    {Object.entries(item).map(([k, v]) => (
                                                        <div key={k}><strong>{k.replace(/_/g, " ")}:</strong> {v}</div>
                                                    ))}
                                                </div>
                                            ))
                                        ) : typeof value === "object" ? (
                                            Object.entries(value).map(([k, v]) => (
                                                <div key={k}><strong>{k.replace(/_/g, " ")}:</strong> {v}</div>
                                            ))
                                        ) : (
                                            value
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {response.file_url && (
    <>
        <a href={response.file_url} target="_blank" rel="noopener noreferrer">
            <button style={{ marginTop: "10px" }}>View Document</button>
        </a>

        {/* Clear Button */}
        <button
            onClick={() => {
                setResponse(null);
                setFile(null);
                fileInputRef.current.value = null;

            }}
            style={{
                marginTop: "10px",
                marginLeft: "10px",
                backgroundColor: "#ccc",
                border: "none",
                borderRadius: "6px",
                padding: "8px 16px",
                cursor: "pointer"
            }}
        >
            Clear
        </button>
    </>
)}
                </div>
            )}
        </div>
    );
};

export default UploadForm;
