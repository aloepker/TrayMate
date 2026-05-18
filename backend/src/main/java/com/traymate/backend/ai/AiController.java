package com.traymate.backend.ai;

import java.util.Map;
import java.util.Set;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

/**
 * Proxies AI requests to Google's Gemini API so the API key lives on the
 * server (set as the GEMINI_API_KEY environment variable on Render) and
 * never ships in the React Native app bundle.
 *
 * Client contract (see src/services/geminiService.ts in the RN repo):
 *   POST /ai/gemini
 *   Body: { "model": "<gemini-model-id>", "body": { ...raw Gemini body... } }
 *   Response: Gemini's response passed through verbatim, with the
 *             upstream HTTP status preserved so the client's 429-cooldown
 *             logic still works.
 *
 * Auth: This endpoint falls under Spring Security's default
 * `.anyRequest().authenticated()` rule, so callers must send a valid
 * JWT in `Authorization: Bearer <token>`. That prevents anyone with
 * the URL from burning our Google free-tier quota.
 */
@RestController
@RequestMapping("/ai")
public class AiController {

    // Allowlist — clients can only ask for these models. Stops a
    // compromised client from being used to call arbitrary Google APIs
    // with our key.
    private static final Set<String> ALLOWED_MODELS = Set.of(
        "gemini-2.5-flash",
        "gemini-2.0-flash",
        "gemini-2.0-flash-lite"
    );

    private static final String UPSTREAM_BASE =
        "https://generativelanguage.googleapis.com/v1beta/models";

    @Value("${GEMINI_API_KEY:}")
    private String geminiApiKey;

    private final RestClient http = RestClient.builder().build();

    @PostMapping("/gemini")
    public ResponseEntity<String> proxy(@RequestBody Map<String, Object> payload) {
        if (geminiApiKey == null || geminiApiKey.isBlank()) {
            return error(500, "GEMINI_API_KEY env var not set on server");
        }
        Object modelObj = payload == null ? null : payload.get("model");
        Object bodyObj  = payload == null ? null : payload.get("body");
        if (!(modelObj instanceof String) || bodyObj == null) {
            return error(400, "Expected JSON body { model: <string>, body: <object> }");
        }
        String model = (String) modelObj;
        if (!ALLOWED_MODELS.contains(model)) {
            return error(400, "Model not allowed: " + model);
        }

        String url = UPSTREAM_BASE + "/" + model + ":generateContent?key=" + geminiApiKey;

        try {
            String upstreamBody = http.post()
                .uri(url)
                .contentType(MediaType.APPLICATION_JSON)
                .body(bodyObj)
                .retrieve()
                .body(String.class);
            return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_JSON)
                .body(upstreamBody);
        } catch (RestClientResponseException ex) {
            // Forward Google's status code + body so the client's
            // 429-cooldown / 503-retry logic behaves the same as if it
            // had called Gemini directly.
            return ResponseEntity.status(ex.getStatusCode())
                .contentType(MediaType.APPLICATION_JSON)
                .body(ex.getResponseBodyAsString());
        } catch (Exception ex) {
            return error(502, "Upstream fetch failed: " + ex.getMessage());
        }
    }

    private static ResponseEntity<String> error(int status, String message) {
        String json = "{\"error\":{\"message\":\"" + message.replace("\"", "\\\"") + "\"}}";
        return ResponseEntity.status(HttpStatusCode.valueOf(status))
            .contentType(MediaType.APPLICATION_JSON)
            .body(json);
    }
}
