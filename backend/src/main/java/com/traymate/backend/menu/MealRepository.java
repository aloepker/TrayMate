package com.traymate.backend.menu;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface MealRepository extends JpaRepository<Meal, Integer> {
    List<Meal> findByAvailableTrue();

    List<Meal> findByMealperiodContainingIgnoreCase(String mealperiod);

    /**
     * Meals in a given period that are currently available. Used by
     * MealCoverageAlertService to see what's actually on offer for a
     * resident's breakfast/lunch/dinner before running compliance.
     */
    List<Meal> findByMealperiodContainingIgnoreCaseAndAvailableTrue(String mealperiod);

    List<Meal> findByMealtypeIgnoreCase(String mealtype);
}
