package com.traymate.backend.menu;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Admin-only endpoint to re-run the SoftBiteMealSeeder on demand.
 *
 * The seeder also fires once at application startup (it implements
 * CommandLineRunner), but that requires a full container restart. On
 * Render's free tier the JVM is paused/resumed rather than restarted,
 * so changes to the seeded meal list don't take effect until the next
 * cold deploy. This endpoint lets an admin reseed without a redeploy.
 *
 * The underlying seeder is idempotent — it upserts each meal by name —
 * so calling this repeatedly is safe.
 */
@Slf4j
@RestController
@RequestMapping("/admin/seed")
@RequiredArgsConstructor
public class SoftBiteSeedController {

    private final SoftBiteMealSeeder softBiteMealSeeder;

    @PostMapping("/soft-bite")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<Map<String, Object>> reseedSoftBite() {
        long started = System.currentTimeMillis();
        try {
            softBiteMealSeeder.run();
            long durationMs = System.currentTimeMillis() - started;
            log.info("[SoftBiteSeedController] Manual reseed complete in {}ms", durationMs);
            return ResponseEntity.ok(Map.of(
                "status", "ok",
                "durationMs", durationMs
            ));
        } catch (Exception e) {
            log.warn("[SoftBiteSeedController] Manual reseed failed: {}", e.getMessage());
            return ResponseEntity.internalServerError().body(Map.of(
                "status", "error",
                "message", e.getMessage() == null ? "unknown error" : e.getMessage()
            ));
        }
    }
}
