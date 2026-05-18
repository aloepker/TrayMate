# Backend AI Proxy Route — Setup Instructions

The TrayMate React Native app now calls the Gemini AI through **our own backend** instead of calling Google directly. This means:

- ✅ The Google API key lives **only** on Render (environment variable), never in the GitHub repo.
- ✅ Anyone can clone the repo and the AI chat works — no personal API key needed.
- ✅ The repo can be made public for submission without leaking the key.

This file is for **whoever maintains the backend at `traymate-auth.onrender.com`**. You need to add **one route** and **one env variable**.

---

## 1. Add this environment variable on Render

In your Render dashboard → the `traymate-auth` service → **Environment** tab → **Add Environment Variable**:

| Key | Value |
| --- | --- |
| `GEMINI_API_KEY` | (paste the Google AI Studio key — same one currently in `manzi`'s `.env` file) |

Click **Save Changes**. Render will redeploy automatically.

---

## 2. Add the `/ai/gemini` route

### Request the client sends

```
POST /ai/gemini
Content-Type: application/json

{
  "model": "gemini-2.5-flash",
  "body": {
    "systemInstruction": { "parts": [{ "text": "..." }] },
    "contents": [{ "role": "user", "parts": [{ "text": "..." }] }],
    "generationConfig": { "maxOutputTokens": 600, "temperature": 0.7 }
  }
}
```

### Response the backend must return

Pass through Gemini's response **verbatim** (don't reshape it). On error, forward Gemini's status code so the client's 429 cooldown still works.

---

### Node / Express

```js
// routes/ai.js  (or wherever you keep routes)
const express = require('express');
const router  = express.Router();

router.post('/ai/gemini', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: { message: 'GEMINI_API_KEY not set on server' } });
  }

  const { model, body } = req.body || {};
  if (!model || !body) {
    return res.status(400).json({ error: { message: 'Expected { model, body }' } });
  }

  // Allowlist the models the client is allowed to ask for — prevents abuse
  // of our key for arbitrary endpoints.
  const ALLOWED = new Set(['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-lite']);
  if (!ALLOWED.has(model)) {
    return res.status(400).json({ error: { message: `Model not allowed: ${model}` } });
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  try {
    const upstream = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const text = await upstream.text();
    // Forward Gemini's status code (so 429 cooldown works on the client)
    res.status(upstream.status).type('application/json').send(text);
  } catch (e) {
    res.status(502).json({ error: { message: `Upstream fetch failed: ${e.message}` } });
  }
});

module.exports = router;
```

Then in your main app file:

```js
const aiRoutes = require('./routes/ai');
app.use(express.json({ limit: '1mb' }));  // make sure JSON body parser is enabled
app.use(aiRoutes);
```

---

### Python / FastAPI

```python
import os, httpx
from fastapi import APIRouter, HTTPException, Request

router = APIRouter()
ALLOWED = {'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-lite'}

@router.post('/ai/gemini')
async def proxy_gemini(req: Request):
    api_key = os.environ.get('GEMINI_API_KEY')
    if not api_key:
        raise HTTPException(500, 'GEMINI_API_KEY not set on server')

    payload = await req.json()
    model = payload.get('model')
    body  = payload.get('body')
    if not model or not body:
        raise HTTPException(400, 'Expected { model, body }')
    if model not in ALLOWED:
        raise HTTPException(400, f'Model not allowed: {model}')

    url = f'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}'
    async with httpx.AsyncClient(timeout=30) as cx:
        upstream = await cx.post(url, json=body)
    # Forward status + body so 429 cooldown works on the client
    from fastapi.responses import Response
    return Response(content=upstream.content, status_code=upstream.status_code,
                    media_type='application/json')
```

---

### Java / Spring Boot

```java
@RestController
public class AiProxyController {

    private static final Set<String> ALLOWED = Set.of(
        "gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.0-flash-lite"
    );

    @PostMapping("/ai/gemini")
    public ResponseEntity<String> proxyGemini(@RequestBody Map<String, Object> payload) {
        String apiKey = System.getenv("GEMINI_API_KEY");
        if (apiKey == null || apiKey.isBlank()) {
            return ResponseEntity.status(500).body("{\"error\":{\"message\":\"GEMINI_API_KEY not set\"}}");
        }
        String model = (String) payload.get("model");
        Object body  = payload.get("body");
        if (model == null || body == null) {
            return ResponseEntity.badRequest().body("{\"error\":{\"message\":\"Expected { model, body }\"}}");
        }
        if (!ALLOWED.contains(model)) {
            return ResponseEntity.badRequest().body("{\"error\":{\"message\":\"Model not allowed\"}}");
        }
        String url = "https://generativelanguage.googleapis.com/v1beta/models/"
                   + model + ":generateContent?key=" + apiKey;
        RestTemplate http = new RestTemplate();
        HttpHeaders h = new HttpHeaders();
        h.setContentType(MediaType.APPLICATION_JSON);
        try {
            ResponseEntity<String> upstream = http.postForEntity(
                url, new HttpEntity<>(new ObjectMapper().writeValueAsString(body), h), String.class);
            return ResponseEntity.status(upstream.getStatusCode()).body(upstream.getBody());
        } catch (HttpStatusCodeException ex) {
            return ResponseEntity.status(ex.getStatusCode()).body(ex.getResponseBodyAsString());
        } catch (Exception e) {
            return ResponseEntity.status(502).body("{\"error\":{\"message\":\"" + e.getMessage() + "\"}}");
        }
    }
}
```

---

## 3. Test it

After deploying, hit the route with curl from any machine:

```bash
curl -i https://traymate-auth.onrender.com/ai/gemini \
  -H 'Content-Type: application/json' \
  -d '{"model":"gemini-2.5-flash","body":{"contents":[{"role":"user","parts":[{"text":"say hi"}]}],"generationConfig":{"maxOutputTokens":50}}}'
```

You should see HTTP 200 and JSON containing `candidates[0].content.parts[0].text` with a greeting. If you see 401/403 the env var isn't set; if you see 429 the Google free-tier quota is exhausted (just wait or use a different model).

---

## 4. Once it's live

The React Native app already calls this route — nothing else to do on the client side. The `.env` file on developer machines is no longer used for Gemini and can be deleted (`GEMINI_API_KEY` line specifically).
