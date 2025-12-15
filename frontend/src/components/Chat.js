// src/components/Chat.js

import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import io from "socket.io-client";
import {
    encryptMessage,
    decryptMessage,
    hideDataInImage,
    extractDataFromImage,
    hideDataInVideoFrame
} from "../utils/crypto";

const Chat = ({ userId }) => {
    const [users, setUsers] = useState([]);
    const [recipient, setRecipient] = useState("");
    const [currentMessage, setCurrentMessage] = useState("");
    const [messages, setMessages] = useState([]);
    const [selectedFile, setSelectedFile] = useState(null);
    const [selectedCarrierType, setSelectedCarrierType] = useState("image");
    const [isSending, setIsSending] = useState(false);
    const [decryptingIndex, setDecryptingIndex] = useState(null);

    const socket = useRef(null);

    // ------------------ SOCKET SETUP ------------------
    useEffect(() => {
        socket.current = io("http://localhost:3001");
        socket.current.emit("register_user", userId);

        socket.current.on("receive_message", (payload) => {
            const { mediaUrl, stegoFramePath, mediaType, frameTimestamp } = payload;

            setMessages((prev) => [
                ...prev,
                {
                    sender: "other",
                    content: "[Encrypted Message - Click to Decrypt]",
                    mediaUrl,
                    stegoFramePath,
                    mediaType,
                    frameTimestamp,
                    isEncrypted: true,
                    isDecrypted: false
                }
            ]);
        });

        const fetchUsers = async () => {
            const res = await axios.get("http://localhost:3001/api/users");
            setUsers(res.data.filter((u) => u !== userId));
        };
        fetchUsers();

        return () => socket.current.disconnect();
    }, [userId]);

    // ------------------ HELPERS ------------------
    const dataURLtoBlob = (dataurl) => {
        const arr = dataurl.split(",");
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) u8arr[n] = bstr.charCodeAt(n);
        return new Blob([u8arr], { type: mime });
    };

    const downloadFile = async (url, filename) => {
        try {
            // Fetch the file from server
            const response = await axios.get(`http://localhost:3001${url}`, {
                responseType: 'blob'
            });

            // Create blob and object URL
            const blob = response.data;
            const blobUrl = window.URL.createObjectURL(blob);

            // Create temporary link element
            const link = document.createElement("a");
            link.href = blobUrl;
            link.download = filename || url.split("/").pop();

            // Trigger download by simulating click
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Clean up the blob URL
            window.URL.revokeObjectURL(blobUrl);
        } catch (err) {
            console.error("Download error:", err);
            alert("Failed to download file. Please try again.");
        }
    };

    // ------------------ SEND MESSAGE ------------------
    const sendMessage = async () => {
        if (!recipient || !currentMessage || !selectedFile) {
            alert("Please type a message and select a carrier file.");
            return;
        }

        setIsSending(true);

        try {
            const res = await axios.get(`http://localhost:3001/api/key/${recipient}`);
            const encryptedPayload = encryptMessage(currentMessage, res.data.publicKey);
            const encryptedString = JSON.stringify(encryptedPayload);

            const reader = new FileReader();

            reader.onload = async (event) => {
                let uploadData = null;
                let mediaType = selectedCarrierType;

                if (selectedCarrierType === "image") {
                    const stegoImage = await hideDataInImage(event.target.result, encryptedString);
                    const blob = dataURLtoBlob(stegoImage);

                    const formData = new FormData();
                    formData.append("carrier", blob, "stego-image.png");

                    const uploadRes = await axios.post("http://localhost:3001/api/upload", formData);
                    uploadData = uploadRes.data;

                } else {
                    const result = await hideDataInVideoFrame(selectedFile, encryptedString);
                    const stegoBlob = dataURLtoBlob(result.stegoFrame);

                    const formData = new FormData();
                    formData.append("carrier", selectedFile, selectedFile.name);
                    formData.append("stegoFrame", stegoBlob, "stego-frame.png");
                    formData.append("frameTimestamp", result.frameMetadata.frameTimestamp);

                    const uploadRes = await axios.post("http://localhost:3001/api/upload", formData);
                    uploadData = uploadRes.data;
                }

                socket.current.emit("send_message", {
                    recipientId: recipient,
                    message: {
                        mediaUrl: uploadData.filePath,
                        stegoFramePath: uploadData.stegoFramePath,
                        mediaType,
                        frameTimestamp: uploadData.frameTimestamp || null
                    }
                });

                // Add sender message to UI
                setMessages((prev) => [
                    ...prev,
                    {
                        sender: "me",
                        content: currentMessage,
                        mediaUrl: uploadData.filePath,
                        stegoFramePath: uploadData.stegoFramePath,
                        mediaType,
                        frameTimestamp: uploadData.frameTimestamp || null,
                        isDecrypted: true
                    }
                ]);

                setCurrentMessage("");
                setSelectedFile(null);
            };

            reader.readAsDataURL(selectedFile);

        } catch (err) {
            console.error(err);
            alert("Error sending message.");
        }

        setIsSending(false);
    };

    // ------------------ DECRYPT IMAGE ------------------
    const handleRetrieveText = async (mediaUrl, index) => {
        setDecryptingIndex(index);

        try {
            const myKey = localStorage.getItem(`privateKey_${userId}`);
            if (!myKey) return alert("Private key missing.");

            const img = await axios.get(`http://localhost:3001${mediaUrl}`, { responseType: "blob" });

            const reader = new FileReader();
            reader.onload = async () => {
                const hidden = await extractDataFromImage(reader.result);
                const decrypted = decryptMessage(JSON.parse(hidden), myKey);

                const updated = [...messages];
                updated[index].content = decrypted;
                updated[index].isDecrypted = true;

                setMessages(updated);
                setDecryptingIndex(null);
            };

            reader.readAsDataURL(img.data);

        } catch (err) {
            console.error(err);
            alert("Error decrypting message.");
            setDecryptingIndex(null);
        }
    };

    // ------------------ DECRYPT VIDEO ------------------
    const handleRetrieveTextFromVideo = async (stegoFramePath, index) => {
        setDecryptingIndex(index);

        try {
            const myKey = localStorage.getItem(`privateKey_${userId}`);
            if (!myKey) return alert("Private key missing.");

            const frame = await axios.get(`http://localhost:3001${stegoFramePath}`, { responseType: "blob" });

            const reader = new FileReader();
            reader.onload = async () => {
                const hidden = await extractDataFromImage(reader.result);
                const decrypted = decryptMessage(JSON.parse(hidden), myKey);

                const updated = [...messages];
                updated[index].content = decrypted;
                updated[index].isDecrypted = true;

                setMessages(updated);
                setDecryptingIndex(null);
            };

            reader.readAsDataURL(frame.data);

        } catch (err) {
            console.error(err);
            alert("Error decrypting video message.");
            setDecryptingIndex(null);
        }
    };

    // ------------------ UI ------------------
    return (
        <div className="chat-wrapper">

            {/* Sidebar */}
            <aside className="sidebar">
                <div className="sidebar-header">Users</div>
                <ul className="user-list">
                    {users.map((u) => (
                        <li
                            key={u}
                            className={`user-item ${recipient === u ? "active" : ""}`}
                            onClick={() => setRecipient(u)}
                        >
                            <span className="user-circle"></span>
                            <span className="username">{u}</span>
                        </li>
                    ))}
                </ul>
            </aside>

            {/* Chat Section */}
            <main className="chat-section">

                <header className="top-header">
                    <div>
                        <h2 className="chat-title">
                            {recipient ? `Chatting with: ${recipient}` : "Select a user to start chat"}
                        </h2>
                        <p className="login-user">Logged in as: <b>{userId}</b></p>
                    </div>
                </header>

                <div className="messages-area">
                    {messages.map((msg, i) => (
                        <div key={i} className={`msg-bubble ${msg.sender === "me" ? "me" : "other"}`}>
                            
                            <div className="msg-text">
                                {msg.content}
                            </div>

                            {/* Image */}
                            {msg.mediaType === "image" && (
                                <div className="media-box">
                                    <img
                                        src={`http://localhost:3001${msg.mediaUrl}`}
                                        className="media-img"
                                        alt="hidden"
                                    />
                                    <div className="media-buttons">
                                        {!msg.isDecrypted && (
                                            <button
                                                className="btn decrypt-btn"
                                                disabled={decryptingIndex === i}
                                                onClick={() => handleRetrieveText(msg.mediaUrl, i)}
                                            >
                                                {decryptingIndex === i ? "Decrypting..." : "🔍 Reveal Text"}
                                            </button>
                                        )}
                                        <button
                                            className="btn download-btn"
                                            onClick={() => downloadFile(msg.mediaUrl, `carrier-image-${i}.png`)}
                                        >
                                            ⬇ Download
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Video */}
                            {msg.mediaType === "video" && (
                                <div className="media-box">
                                    <video controls className="media-video">
                                        <source src={`http://localhost:3001${msg.mediaUrl}`} />
                                    </video>
                                    <div className="media-buttons">
                                        {!msg.isDecrypted && (
                                            <button
                                                className="btn decrypt-btn"
                                                disabled={decryptingIndex === i}
                                                onClick={() => handleRetrieveTextFromVideo(msg.stegoFramePath, i)}
                                            >
                                                {decryptingIndex === i ? "Decrypting..." : "🎞 Reveal Text"}
                                            </button>
                                        )}
                                        <button
                                            className="btn download-btn"
                                            onClick={() => downloadFile(msg.mediaUrl, `carrier-video-${i}.mp4`)}
                                        >
                                            ⬇ Download
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Input Bar */}
                <footer className="input-area">

                    <div className="carrier-select">
                        <label className="radio-option">
                            <input
                                type="radio"
                                value="image"
                                checked={selectedCarrierType === "image"}
                                onChange={() => { setSelectedCarrierType("image"); setSelectedFile(null); }}
                            />
                            🖼 Image
                        </label>

                        <label className="radio-option">
                            <input
                                type="radio"
                                value="video"
                                checked={selectedCarrierType === "video"}
                                onChange={() => { setSelectedCarrierType("video"); setSelectedFile(null); }}
                            />
                            🎥 Video
                        </label>
                    </div>

                    <input
                        type="file"
                        className="file-input"
                        accept={selectedCarrierType === "image" ? "image/*" : "video/*"}
                        onChange={(e) => setSelectedFile(e.target.files[0])}
                    />

                    <input
                        type="text"
                        className="msg-input"
                        placeholder="Write a message..."
                        value={currentMessage}
                        onChange={(e) => setCurrentMessage(e.target.value)}
                        disabled={!recipient}
                    />

                    <button className="btn send-btn" onClick={sendMessage} disabled={isSending}>
                        ➤
                    </button>

                </footer>
            </main>
        </div>
    );
};

export default Chat;
