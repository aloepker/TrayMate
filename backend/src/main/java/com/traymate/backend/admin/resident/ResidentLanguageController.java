package com.traymate.backend.admin.resident;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import java.util.Map;
import java.util.Optional;
import java.util.Set;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Per-resident language preference.
 *
 * Lives at /residents/{id}/language (NOT under /admin) because
 * residents change their own language from the Settings screen — it's
 * a profile preference, not an admin action. Caregivers and admins
 * can also hit it on behalf of a resident if needed.
 *
 * The value is the same display string the frontend uses ("English",
 * "Español", "Français", "中文"). We allow-list the four supported
 * values so a typo can't poison the row that later feeds the Gemini
 * system prompt.
 */
@Slf4j
@RestController
@RequestMapping("/residents")
@RequiredArgsConstructor
public class ResidentLanguageController {

    private static final Set<String> SUPPORTED = Set.of(
        "English", "Español", "Français", "中文"
    );
    private static final String DEFAULT_LANGUAGE = "English";

    private final ResidentRepository residentRepository;

    @GetMapping("/{id}/language")
    public ResponseEntity<Map<String, Object>> getLanguage(@PathVariable Integer id) {
        Optional<Resident> opt = residentRepository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        String lang = opt.get().getLanguage();
        if (lang == null || lang.isBlank()) lang = DEFAULT_LANGUAGE;
        return ResponseEntity.ok(Map.of(
            "residentId", id,
            "language", lang
        ));
    }

    @PutMapping("/{id}/language")
    public ResponseEntity<Map<String, Object>> setLanguage(
            @PathVariable Integer id,
            @RequestBody Map<String, Object> body
    ) {
        Optional<Resident> opt = residentRepository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Object raw = body.get("language");
        String lang = raw == null ? null : String.valueOf(raw).trim();
        if (lang == null || !SUPPORTED.contains(lang)) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", "Unsupported language. Allowed: " + SUPPORTED
            ));
        }
        Resident r = opt.get();
        r.setLanguage(lang);
        residentRepository.save(r);
        log.info("[Language] resident {} → {}", id, lang);
        return ResponseEntity.ok(Map.of(
            "residentId", id,
            "language", lang
        ));
    }
}
