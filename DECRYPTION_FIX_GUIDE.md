# Decryption Fix - Quick Start Guide

## Changes Made

I've fixed the decryption issues. Here are the key fixes:

### 1. **Fixed CORS Issue with Canvas Pixel Access** ✅
   - Added `crossOrigin = 'anonymous'` to image loading in `crypto.js`
   - This allows canvas to read pixel data from remote images
   - Added CORS headers to backend file serving

### 2. **Enhanced Error Handling & Logging** ✅
   - Better error messages at each step
   - Detailed console logs for debugging
   - Separate try-catch blocks for each operation
   - Shows exact JSON parse errors

### 3. **Files Modified**
   - `backend/index.js` - CORS headers for file uploads
   - `frontend/src/utils/crypto.js` - Canvas CORS fix
   - `frontend/src/components/Chat.js` - Better error handling

---

## What to Do Now

### Step 1: Restart Backend
```bash
# Terminal 1 - Backend
cd backend
node index.js
```

### Step 2: Restart Frontend
```bash
# Terminal 2 - Frontend
cd frontend
npm start
```

### Step 3: **IMPORTANT** - Logout & Login Again
1. Click **Logout** button
2. Login with your credentials
3. This reloads the app with the new code

### Step 4: Test Decryption

**Scenario A - Fresh Test (Recommended)**
```
1. Register 2 new users (bob, alice)
2. Login as alice
3. Select bob as recipient
4. Type message: "Test message"
5. Select an image
6. Click Send
7. Wait 2-3 seconds
8. Click "Retrieve Text from Image"
9. Should see decrypted message
```

**Scenario B - Existing Messages**
```
1. Login as the receiver
2. Find encrypted message
3. Click "Retrieve Text from Image"
4. Should now work!
```

---

## How to Debug

### Open Browser Developer Tools
Press `F12` and go to **Console** tab

### When you click "Retrieve Text from Image", you should see:

```
Retrieved private key: Present
Image downloaded, size: 12345
Starting image data extraction...
Extracted message bits length: 2048
Decoded message length: 256
Looking for END_OF_MESSAGE marker: $$EOM$$
EOM index: 120
Extracted encrypted data length: 250
Extracted data (first 100 chars): {"iv":"xyz...","encryptedKey":"...","encryptedMessage":"..."}
Parsed encrypted payload: (3) ["iv", "encryptedKey", "encryptedMessage"]
Decryption successful, message: YOUR MESSAGE HERE
```

### If you see an error:

**Error: "Failed to load image: ...CORS error"**
- Backend not running or not restarted
- Solution: Restart backend with `node index.js`

**Error: "End of message marker not found"**
- Message bits not extracted correctly
- Image corrupted during upload
- Solution: Send the message again

**Error: "Encrypted data is corrupted. Cannot parse JSON"**
- Extracted data is not valid JSON
- Solution: Check the "Extracted data" log to see what was extracted

**Error: "Decryption failed: Incorrect ..."**
- Private key doesn't match
- Or encrypted data is corrupted
- Solution: Make sure you're logged in as the correct user

---

## Backend Changes Detail

### CORS Headers Added
```javascript
app.use('/uploads', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
}, express.static(...));
```

This allows the frontend to:
1. Download images from `/uploads/`
2. Use them in Canvas without security restrictions
3. Read pixel data from the Canvas

---

## Frontend Changes Detail

### Canvas CORS Fix
```javascript
const getImageData = (dataUrl) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous'; // ← This is the key fix
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            resolve({
                imageData: ctx.getImageData(0, 0, canvas.width, canvas.height),
                ctx: ctx
            });
        };
        // ...
    });
};
```

### Better Error Logging
```javascript
try {
    const encryptedPayload = JSON.parse(encryptedDataString);
    console.log('Parsed encrypted payload:', Object.keys(encryptedPayload));
} catch (parseError) {
    console.error('JSON parse error:', parseError.message);
    console.error('Raw data:', encryptedDataString.substring(0, 200));
    alert("Encrypted data is corrupted. Cannot parse JSON.");
    return;
}
```

---

## Expected Results After Fix

| Scenario | Result |
|----------|--------|
| Send message with image | ✅ Message appears in chat |
| Click "Retrieve Text from Image" | ✅ Console shows all logs |
| Encrypted data extracts | ✅ Shows JSON with iv, encryptedKey, encryptedMessage |
| Decryption works | ✅ Original message displayed |
| Phishing detection runs | ✅ Shows "SAFE MESSAGE" or "PHISHING DETECTED" |

---

## Common Issues & Quick Fixes

| Issue | Fix |
|-------|-----|
| "Failed to load image: CORS" | Restart backend: `node index.js` |
| "Private key missing" | Logout and login again |
| "Encrypted data is corrupted" | Send the message again with a different image |
| "End of message marker not found" | Make sure image uploaded successfully (check Network tab) |
| Decryption still not working | Clear browser cache: `Ctrl+Shift+Delete`, then refresh |

---

## Verify Everything Works

### Test Checklist

- [ ] Backend running on port 3001
- [ ] Frontend running on port 3000
- [ ] Logged in as correct user
- [ ] Message appears in chat with image
- [ ] "Retrieve Text from Image" button visible
- [ ] Browser console shows logs (F12)
- [ ] Message successfully decrypts
- [ ] Decrypted text appears in chat

---

## Need More Help?

1. **Check console logs** - F12 → Console tab → look for error messages
2. **Check backend logs** - Terminal where you ran `node index.js`
3. **Try fresh message** - Send a new test message
4. **Clear cache** - Ctrl+Shift+Delete → Clear all → Refresh page
5. **Restart everything** - Stop backend, stop frontend, restart both

---

**The decryption should now work! Try it out.** 🎉

