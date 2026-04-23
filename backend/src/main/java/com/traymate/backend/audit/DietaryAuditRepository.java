package com.traymate.backend.audit;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface DietaryAuditRepository extends JpaRepository<DietaryAuditLog, Long> {
    /** Full history for one resident, newest first. */
    List<DietaryAuditLog> findByResidentIdOrderByChangedAtDesc(Integer residentId);
}
