package com.traymate.backend.menu;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class MenuService {
    private final MealRepository mealRepository;

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
        return mealRepository.save(meal);
    }
}
