package com.traymate.backend.menu;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface MealRepository extends JpaRepository<Meal, Integer> {
    List<Meal> findByAvailableTrue();

    List<Meal> findByMealperiodContainingIgnoreCase(String mealperiod);

    List<Meal> findByMealtypeIgnoreCase(String mealtype);
}
