package com.traymate.backend.override;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface MedicalOverrideRepository extends JpaRepository<MedicalOverrideRequest, Integer> {
    List<MedicalOverrideRequest> findByStatusOrderByRequestedAtDesc(String status);

    List<MedicalOverrideRequest> findByResidentIdOrderByRequestedAtDesc(Integer residentId);

    /**
     * Look up a single approved, not-yet-consumed override that matches the
     * resident + meal period + date. Caller still needs to verify mealIds
     * equality (kept out of the query to avoid DB string-ordering issues).
     */
    List<MedicalOverrideRequest> findByResidentIdAndMealOfDayAndTargetDateAndStatus(
        Integer residentId, String mealOfDay, LocalDate targetDate, String status
    );
}
