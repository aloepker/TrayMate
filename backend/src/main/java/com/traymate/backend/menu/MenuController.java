package com.traymate.backend.menu;

import lombok.RequiredArgsConstructor;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/menu")
@RequiredArgsConstructor
public class MenuController {

    private final MenuService menuService;

    @GetMapping
    public List<Meal> getAllMeals(){
        return menuService.getAllMeals();
    }

    @GetMapping("/available")
    public List<Meal> getAvailableMeals(){
        return menuService.getAvailableMeals();
    }

    @GetMapping("/period/{mealperiod}")
    public List<Meal> getMealsByPeriod(@PathVariable String mealperiod) {
        return menuService.getMealsByPeriod(mealperiod);
    }

    @GetMapping("/period/drinks")
    public List<Meal> getDrinks() {
        return menuService.getDrinks();
    }

    @GetMapping("/period/sides")
    public List<Meal> getSides() {
        return menuService.getSides();
    }

    /**
     * Kitchen-facing quick toggle for a meal's `available` flag.
     * Gated to ROLE_ADMIN + kitchen roles via @PreAuthorize so the
     * kitchen dashboard can hide/show a dish globally without hitting the
     * admin-only /admin/** prefix. Body: { "available": true|false }
     */
    @PatchMapping("/{id}/availability")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN','ROLE_KITCHEN_STAFF','ROLE_KITCHEN')")
    public Meal setAvailability(
            @PathVariable Integer id,
            @RequestBody Map<String, Boolean> body) {
        Boolean available = body.get("available");
        if (available == null) {
            throw new IllegalArgumentException(
                "Request body must include 'available' boolean");
        }
        return menuService.setAvailability(id, available);
    }
}
