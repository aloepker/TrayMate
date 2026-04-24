package com.traymate.backend.coverage;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MealCoverageAlertRepository extends JpaRepository<MealCoverageAlert, Integer> {

    /** All alerts still "open" (ACTIVE or ACKNOWLEDGED), newest first. */
    List<MealCoverageAlert> findByStatusInOrderByDetectedAtDesc(List<String> statuses);

    /**
     * Is there already a non-RESOLVED alert for this (resident, period)?
     * Used by the evaluate step to avoid duplicate rows.
     */
    Optional<MealCoverageAlert> findFirstByResidentIdAndMealPeriodAndStatusIn(
        Integer residentId, String mealPeriod, List<String> statuses);

    /** Full history for one resident (admin/caregiver drill-down). */
    List<MealCoverageAlert> findByResidentIdOrderByDetectedAtDesc(Integer residentId);
}
