package com.traymate.backend.menu;

import com.traymate.backend.coverage.MealCoverageAlertService;
import com.traymate.backend.menu.dto.UpdateMeal;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class MenuService {
    private final MealRepository mealRepository;
    private final MealCoverageAlertService coverageAlertService;

    public List<Meal> getAllMeals(){
        return mealRepository.findAll();
    }

    public List<Meal> getAvailableMeals(){
        return mealRepository.findByAvailableTrue();
    }

    public List<Meal> getMealsByPeriod(String mealperiod){
        return mealRepository.findByMealperiodContainingIgnoreCase(mealperiod);
    }

    public List<Meal> getDrinks() {
        return mealRepository.findByMealtypeIgnoreCase("Beverage");
    }

    public List<Meal> getSides() {
        return mealRepository.findByMealtypeIgnoreCase("Side");
    }

    /**
     * Toggle a single meal's `available` flag. Used by the kitchen-dashboard
     * hide/show icon to take a dish off the menu for every resident in one
     * click (next time any resident fetches /menu the flag is reflected).
     */
    public Meal setAvailability(Integer id, boolean available) {
        Meal meal = mealRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException(
                "Meal not found: " + id));
        meal.setAvailable(available);
        Meal saved = mealRepository.save(meal);
        // Menu changes can push a resident off the "has safe options" cliff
        // (or pull one back). Re-run coverage for everyone — cheaper than
        // doing nothing and waiting for someone to hit a blocked order.
        coverageAlertService.evaluateAllResidents();
        return saved;
    }

    //edit meal
    public Meal updateMeal(Integer mealId, UpdateMeal req) {

        Meal meal = mealRepository.findById(mealId)
                .orElseThrow(() -> new RuntimeException("Meal not found"));

        if (req.getName() != null) {
            meal.setName(req.getName());
        }

        if (req.getDescription() != null) {
            meal.setDescription(req.getDescription());
        }

        if (req.getMealperiod() != null) {
            meal.setMealperiod(req.getMealperiod());
        }

        if (req.getCalories() != null) {
            meal.setCalories(req.getCalories());
        }

        if (req.getSodium() != null) {
            meal.setSodium(req.getSodium());
        }

        if (req.getProtein() != null) {
            meal.setProtein(req.getProtein());
        }

        if (req.getTags() != null) {
            meal.setTags(req.getTags());
        }

        if (req.getSeasonal() != null) {
            meal.setSeasonal(req.getSeasonal());
        }

        if (req.getImageUrl() != null) {
            meal.setImageUrl(req.getImageUrl());
        }

        if (req.getAvailable() != null) {
            meal.setAvailable(req.getAvailable());
        }

        return mealRepository.save(meal);
    }
}
