# Decryption Troubleshooting Guide

## Problem: Cannot Decrypt Messages

If you're unable to decrypt messages when clicking "Retrieve Text from Image" or "Retrieve Text from Video", follow this guide to identify and fix the issue.

---

## Quick Diagnosis Checklist

- [ ] Is the backend running? (`node backend/index.js`)
- [ ] Is the frontend running? (`npm start`)
- [ ] Did you **logout and login again** after code changes?
- [ ] Are you using the **correct browser console** for debugging?
- [ ] Is localStorage enabled in your browser?

---

## Step 1: Check Browser Console Logs

1. **Open Developer Tools**:
   - Press `F12` or Right-click → Inspect
   
2. **Go to Console Tab**

3. **Click "Retrieve Text" button**

4. **Look for these logs** (in order):
   ```
   Retrieved private key: Present
   Image downloaded, size: 12345
   Starting image data extraction...
   Extracted message bits length: 2048
   Decoded message length: 256
   Looking for END_OF_MESSAGE marker: $$EOM$$
   EOM index: 120
   Parsed encrypted payload: (3) ["iv", "encryptedKey", "encryptedMessage"]
   Decryption successful, message: [YOUR MESSAGE HERE]
   ```

---

## Common Issues & Solutions

### Issue 1: "Private key missing"

**Error Message**: "Private key missing. Please logout and login again."

**Causes**:
1. You haven't logged in yet
2. Private key wasn't stored during login
3. localStorage was cleared

**Solutions**:

**Solution A - Quick Fix**:
```bash
1. Click "Logout" button
2. Login again with your credentials
3. Try decrypt again
```

**Solution B - Verify Login Stored the Key**:
1. Open Developer Tools (F12)
2. Go to **Application** or **Storage** tab
3. Click **Local Storage** → your domain
4. Look for key: `privateKey_yourUserId`
5. If it's there → proceed to Issue 2
6. If it's NOT there → go to Solution C

**Solution C - Check Backend is Returning Private Key**:
1. Open Network tab (F12)
2. Login with your credentials
3. Find the `login` API call
4. Click on it, go to **Response** tab
5. You should see: `"privateKey": "-----BEGIN RSA PRIVATE KEY-----..."`
6. If private key is missing → **backend problem** (see Backend Issues below)

---

### Issue 2: "End of message marker not found"

**Error Message**: "Failed to extract data from image: End of message marker not found"

**Causes**:
1. Image was corrupted during upload
2. Stego image extraction failed
3. File path is wrong

**Diagnosis**:
1. Open Console (F12)
2. Click "Retrieve Text"
3. Look for: `Extracted message bits length: X`
4. If this number is 0 or very small → **Image corrupted**
5. If this number is large (>1000) → continue to Issue 3

**Solutions**:

**Solution A - Resend Message**:
```bash
1. Send the message again
2. Use a different image/video file
3. Try to retrieve again
```

**Solution B - Check Image Upload**:
1. Right-click on image in chat → "Inspect"
2. Check the `src` attribute
3. Verify it's: `http://localhost:3001/uploads/...`
4. Visit that URL in browser → image should load
5. If 404 error → file not uploaded to server

---

### Issue 3: "Decryption failed" or "Incorrect padding"

**Error Message**: 
- "Failed to extract data from image: End of message marker not found"
- "Incorrect IV length"
- "Failed to decrypt"

**Causes**:
1. Wrong private key being used
2. Encrypted data got corrupted
3. Sender used different key than you

**Diagnosis**:
1. Console should show: `Parsed encrypted payload: (3) ["iv", "encryptedKey", "encryptedMessage"]`
2. All 3 fields should be present and non-empty
3. If you see error → **Encrypted data corrupted**

**Solutions**:

**Solution A - Verify You're Using Correct User**:
1. Check "Logged in as: **username**" at top
2. This username should have received the message
3. If wrong user → **ask sender to resend to correct user**

**Solution B - Check Message Was Sent Correctly**:
1. Did sender get confirmation "Message sent"?
2. Did you see message appear in chat?
3. Does image/video display properly?
4. If any "no" → message not sent successfully

**Solution C - Clear Browser Cache**:
```bash
1. Press Ctrl+Shift+Delete
2. Select "Cached images and files"
3. Click "Clear data"
4. Refresh browser (Ctrl+R)
5. Login again and retry
```

---

## Backend Issues

### Issue: Private Key Not Returned on Login

**Check Backend Logs**:
1. Open terminal where backend is running
2. Login with credentials
3. Watch for errors

**Verify Database Has User**:
```bash
# In another terminal
cd backend
npm install -g sqlite3
sqlite3 database.db "SELECT userId, publicKey, privateKey FROM Users WHERE userId='yourId';"
```

Expected output:
```
yourId | -----BEGIN RSA PUBLIC KEY----- | -----BEGIN RSA PRIVATE KEY-----
```

If private key is NULL:
1. Delete user from database
2. Register again with different password
3. Check if private key is now stored

**Re-register User**:
```bash
# In backend terminal
rm database.db
node index.js
# Now register new user in frontend
```

---

### Issue: Stego Frame Not Saved

**Check File Upload**:
1. Open backend terminal
2. Look for upload logs
3. Verify `uploads/` directory exists

**Check Uploads Directory**:
```bash
# In backend directory
ls -la uploads/
# Should show files like: 1701245678901-video.mp4, 1701245678902-stego-frame.png
```

If directory doesn't exist:
```bash
cd backend
mkdir uploads
node index.js
```

---

## Network Issues

### Issue: CORS Errors

**Error Message**: "Access to XMLHttpRequest blocked by CORS policy"

**Solution**:
1. Backend is not running on port 3001
2. Frontend is not on localhost:3000
3. Update all `http://localhost:3001` references

**Check Backend Running**:
```bash
# In new terminal
curl http://localhost:3001/api/users
# Should return a JSON array, not error
```

### Issue: 404 Error on Image/Video

**Error**: File not found when trying to retrieve

**Solution**:
1. File path in database might be wrong
2. Upload failed silently
3. File was deleted

**Check File Exists**:
```bash
# Backend directory
ls uploads/stego-image.png
# If file not found, message wasn't uploaded correctly
```

---

## Step-by-Step Test

Follow this exact process to verify everything works:

### Step 1: Fresh Start
```bash
# Terminal 1 - Backend
cd backend
rm database.db  # Fresh start
npm install
node index.js
# Wait for: "Database connected and synchronized"
# Wait for: "Server is running on port 3001"
```

### Step 2: Register Users
```bash
# Frontend (localhost:3000)
1. Click "Register"
2. User ID: "alice"
3. Password: "Password123"
4. Click "Register"
5. Should see: "User registered successfully!"

6. Repeat for User ID: "bob"
```

### Step 3: Login as Alice
```bash
1. Click "Login"
2. User ID: "alice"
3. Password: "Password123"
4. Click "Login"
5. You should see Chat interface

6. Open Browser DevTools → Application → Local Storage
7. Find: "privateKey_alice"
8. It should contain: "-----BEGIN RSA PRIVATE KEY-----"
```

### Step 4: Send Message
```bash
1. Select recipient: "bob"
2. Select carrier: Image (radio button)
3. Choose image file
4. Type message: "Hello Bob!"
5. Click "Send"
6. Wait 3-5 seconds
7. Message should appear in chat
8. Image should display below message
```

### Step 5: Login as Bob (New Tab)
```bash
# Open new browser tab (or new browser window)
1. Go to localhost:3000
2. Click "Login"
3. User ID: "bob"
4. Password: "Password123"
5. Select recipient: "alice"
6. You should see Alice's message
```

### Step 6: Decrypt Message
```bash
1. Click "Retrieve Text from Image" button
2. Watch browser console (F12)
3. Look for: "Decryption successful, message: Hello Bob!"
4. The decrypted message should appear in chat
```

---

## Enable Verbose Logging

If issues persist, add extra debugging:

### In Chat.js - Image Decryption:
```javascript
const handleRetrieveText = async (mediaUrl, index) => {
    console.log('=== DECRYPTION START ===');
    console.log('userId:', userId);
    console.log('mediaUrl:', mediaUrl);
    console.log('messageIndex:', index);
    
    const myPrivateKey = localStorage.getItem(`privateKey_${userId}`);
    console.log('privateKey:', myPrivateKey?.substring(0, 50) + '...');
    // ... rest of function
};
```

### In crypto.js - Image Extraction:
```javascript
export const extractDataFromImage = async (imageDataUrl) => {
    console.log('=== IMAGE EXTRACTION START ===');
    console.log('imageDataUrl length:', imageDataUrl.length);
    
    const { imageData } = await getImageData(imageDataUrl);
    console.log('imageData pixels:', imageData.data.length);
    
    const pixels = imageData.data;
    let messageBits = '';
    
    for (let i = 0; i < pixels.length; i += 4) {
        messageBits += (pixels[i] & 1).toString();
    }
    
    console.log('messageBits:', messageBits.substring(0, 100) + '...');
    // ... rest of function
};
```

---

## Performance Notes

**Expected Decryption Times**:
- Image (1MB): 1-3 seconds
- Video frame extraction + decryption: 2-5 seconds
- Phishing detection: 0.5-1 second

If taking longer → check browser performance

---

## Getting Help

When reporting issue, include:

1. **Browser Console Logs** (Copy-paste from F12)
2. **Backend Console Output** (When you clicked decrypt)
3. **Steps You Took** (To reproduce)
4. **Error Message** (Exact text)
5. **Browser & OS** (Chrome on Windows, Safari on Mac, etc.)

---

## Quick Commands for Testing

```bash
# Check if backend running
curl http://localhost:3001/api/users

# Get all users
curl http://localhost:3001/api/users

# Get alice's public key
curl http://localhost:3001/api/key/alice

# Check database
cd backend && sqlite3 database.db ".tables"

# View users table
cd backend && sqlite3 database.db "SELECT userId FROM Users;"

# Check uploads
cd backend && ls -la uploads/
```

---

**Still not working?** 

1. Try fresh browser (incognito mode)
2. Restart both backend and frontend
3. Logout and login again
4. Check backend logs for errors
5. Verify all files are saved (no unsaved changes in editor)

