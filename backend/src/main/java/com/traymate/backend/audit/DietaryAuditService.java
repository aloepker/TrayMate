package com.traymate.backend.audit;

import com.traymate.backend.auth.model.User;

import lombok.RequiredArgsConstructor;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Objects;

/**
 * Central recorder for resident dietary-profile edits.
 * Callers hand in the diff and the entry is persisted along with the
 * currently-authenticated user pulled from the Spring SecurityContext.
 */
@Service
@RequiredArgsConstructor
public class DietaryAuditService {

    private final DietaryAuditRepository repo;

    /**
     * Record a single field change. A no-op when {@code oldValue} equals
     * {@code newValue} (treats null and "" as equal so blank-to-blank
     * doesn't create noise entries).
     */
    public void record(Integer residentId,
                       String fieldName,
                       String oldValue,
                       String newValue) {

        String o = normalize(oldValue);
        String n = normalize(newValue);
        if (Objects.equals(o, n)) return;

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        Long   actorId   = null;
        String actorName = null;
        String actorRole = null;
        if (auth != null && auth.getPrincipal() instanceof User u) {
            actorId   = u.getId();
            actorName = u.getFullName();
            actorRole = u.getRole();
        }

        repo.save(DietaryAuditLog.builder()
                .residentId(residentId)
                .fieldName(fieldName)
                .oldValue(oldValue)
                .newValue(newValue)
                .changedByUserId(actorId)
                .changedByName(actorName)
                .changedByRole(actorRole)
                .changedAt(Instant.now())
                .build());
    }

    /** Convenience — record several fields in one go (skips unchanged ones). */
    public void recordAll(Integer residentId, List<FieldDiff> diffs) {
        for (FieldDiff d : diffs) {
            record(residentId, d.field, d.oldValue, d.newValue);
        }
    }

    public List<DietaryAuditLog> history(Integer residentId) {
        return repo.findByResidentIdOrderByChangedAtDesc(residentId);
    }

    private static String normalize(String s) {
        return (s == null || s.isBlank()) ? "" : s;
    }

    /** Tiny value holder so callers can hand in a list of changes. */
    public static class FieldDiff {
        public final String field;
        public final String oldValue;
        public final String newValue;
        public FieldDiff(String field, String oldValue, String newValue) {
            this.field = field;
            this.oldValue = oldValue;
            this.newValue = newValue;
        }
    }
}
