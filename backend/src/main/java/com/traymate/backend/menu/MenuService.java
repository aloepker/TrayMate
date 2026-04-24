package com.traymate.backend.menu;

import com.traymate.backend.coverage.MealCoverageAlertService;

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
}
