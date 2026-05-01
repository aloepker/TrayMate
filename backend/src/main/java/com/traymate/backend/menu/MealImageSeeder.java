package com.traymate.backend.menu;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * MealImageSeeder
 * ----------------------------------------------------------------------------
 * One-shot startup hook that fills in <code>image_url</code> on every meal row
 * whose URL is currently empty. The pictures are already committed to the
 * frontend repo at <code>src/styles/pictures/{meals,drinks,sides}/</code>, so
 * we point each meal at the public GitHub Raw URL of its image. This keeps
 * the demo self-hosted (no Cloudinary / S3 to set up) and survives database
 * resets — every cold start, any newly-inserted meal that matches a known
 * name automatically picks up its photo.
 *
 * Existing rows that already have a non-empty <code>image_url</code> are
 * never touched, so an admin can override an image via the dashboard and
 * the seeder will respect that.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class MealImageSeeder {

    /**
     * Repo root on GitHub Raw. If the repo moves, fork is renamed, or the
     * branch changes, update this single constant.
     */
    private static final String REPO_RAW =
            "https://raw.githubusercontent.com/aloepker/TrayMate/main/src/styles/pictures";

    private final MealRepository mealRepository;

    /**
     * Authoritative meal-name → period map used to backfill the
     * <code>mealperiod</code> column on rows that came in null/empty.
     * Without this fix drinks default to "All Day" on the frontend
     * and clutter the main tab.
     */
    private static final Map<String, String> NAME_TO_PERIOD = Map.ofEntries(
        // Meals
        Map.entry("Banana-Chocolate Pancakes",  "Breakfast"),
        Map.entry("Broccoli-Cheddar Quiche",    "Breakfast"),
        Map.entry("Caesar Salad with Chicken",  "All Day"),
        Map.entry("Citrus Butter Salmon",       "Dinner"),
        Map.entry("Chicken Bruschetta",         "Dinner"),
        Map.entry("Breakfast Banana Split",     "Breakfast"),
        Map.entry("Herb Baked Chicken",         "Lunch"),
        Map.entry("Garden Vegetable Medley",    "Lunch"),
        Map.entry("Strawberry Belgian Waffle",  "Breakfast"),
        Map.entry("Spring Menu Special",        "Dinner"),
        Map.entry("Grilled Salmon Fillet",      "Dinner"),
        Map.entry("Oatmeal Bowl",               "Breakfast"),

        // Drinks
        Map.entry("Fresh Orange Juice",   "Drinks"),
        Map.entry("Hot Green Tea",        "Drinks"),
        Map.entry("Hot Coffee",           "Drinks"),
        Map.entry("Mixed Berry Smoothie", "Drinks"),
        Map.entry("Warm Apple Cider",     "Drinks"),
        Map.entry("Sparkling Water",      "Drinks"),
        Map.entry("Whole Milk",           "Drinks"),
        Map.entry("Decaf Coffee",         "Drinks"),
        Map.entry("Chamomile Tea",        "Drinks"),
        Map.entry("Cranberry Juice",      "Drinks"),
        Map.entry("Apple Juice",          "Drinks"),
        Map.entry("Hot Cocoa",            "Drinks"),

        // Sides
        Map.entry("Chicken Noodle Soup",      "Sides"),
        Map.entry("Garden Side Salad",        "Sides"),
        Map.entry("Vanilla Ice Cream",        "Sides"),
        Map.entry("Apple Pie Slice",          "Sides"),
        Map.entry("Chocolate Chip Cookies",   "Sides"),
        Map.entry("Fresh Fruit Cup",          "Sides"),
        Map.entry("Tomato Basil Soup",        "Sides"),
        Map.entry("Rice Pudding",             "Sides")
    );

    /** Mapping of meal name → bundled image filename (relative to REPO_RAW). */
    private static Map<String, String> buildImageMap() {
        Map<String, String> m = new HashMap<>();

        // ── Meals ────────────────────────────────────────────────────────
        m.put("Banana-Chocolate Pancakes", "meals/Chocolate-chip-banana-pancakes.jpg");
        m.put("Broccoli-Cheddar Quiche",   "meals/Broccoli-Quiche.jpg");
        m.put("Caesar Salad with Chicken", "meals/Chicken-Caesar-Salad.png");
        m.put("Citrus Butter Salmon",      "meals/Citrus-butter-salmon.png");
        m.put("Chicken Bruschetta",        "meals/Grilled_Bruschetta_Chicken.jpg");
        m.put("Breakfast Banana Split",    "meals/Breakfast-banana-split.webp");
        m.put("Herb Baked Chicken",        "meals/herb-baked-chicken.png");
        m.put("Garden Vegetable Medley",   "meals/Seasonal%20vegetables.png");

        // ── Drinks ───────────────────────────────────────────────────────
        m.put("Fresh Orange Juice",   "drinks/drink-orange-juice.jpg");
        m.put("Hot Green Tea",        "drinks/drink-green-tea.jpg");
        m.put("Hot Coffee",           "drinks/drink-coffee.jpg");
        m.put("Mixed Berry Smoothie", "drinks/drink-berry-smoothie.jpg");
        m.put("Warm Apple Cider",     "drinks/drink-apple-cider.jpg");
        m.put("Sparkling Water",      "drinks/drink-sparkling-water.jpg");
        m.put("Whole Milk",           "drinks/drink-milk.jpg");
        m.put("Decaf Coffee",         "drinks/drink-decaf-coffee.jpg");
        m.put("Chamomile Tea",        "drinks/drink-chamomile-tea.jpg");
        m.put("Cranberry Juice",      "drinks/drink-cranberry.jpg");
        m.put("Apple Juice",          "drinks/drink-apple-juice.jpg");
        m.put("Hot Cocoa",            "drinks/drink-hot-cocoa.jpg");

        // ── Sides ────────────────────────────────────────────────────────
        m.put("Chicken Noodle Soup",      "sides/side-chicken-noodle-soup.jpg");
        m.put("Garden Side Salad",        "sides/side-garden-salad.jpg");
        m.put("Vanilla Ice Cream",        "sides/side-vanilla-ice-cream.jpg");
        m.put("Apple Pie Slice",          "sides/side-apple-pie.jpg");
        m.put("Chocolate Chip Cookies",   "sides/side-chocolate-chip-cookies.jpg");
        m.put("Fresh Fruit Cup",          "sides/side-fruit-cup.jpg");
        m.put("Tomato Basil Soup",        "sides/side-tomato-basil-soup.jpg");
        m.put("Rice Pudding",             "sides/side-rice-pudding.jpg");

        return m;
    }

    @PostConstruct
    public void backfillMissingImages() {
        try {
            final Map<String, String> images = buildImageMap();
            final List<Meal> meals = mealRepository.findAll();
            int imagesPatched = 0;
            int periodsPatched = 0;

            for (Meal meal : meals) {
                boolean dirty = false;

                // ── image_url ───────────────────────────────────────────
                final String currentUrl = meal.getImageUrl();
                if (currentUrl == null || currentUrl.trim().isEmpty()) {
                    final String relative = images.get(meal.getName());
                    if (relative != null) {
                        meal.setImageUrl(REPO_RAW + "/" + relative);
                        imagesPatched++;
                        dirty = true;
                    }
                }

                // ── mealperiod ──────────────────────────────────────────
                // If the row's mealperiod is null/blank or doesn't match a
                // recognised value, the frontend defaults it to "All Day"
                // and drinks/sides leak into the main tab. Backfill from
                // the authoritative name → period map.
                final String currentPeriod = meal.getMealperiod();
                final String desiredPeriod = NAME_TO_PERIOD.get(meal.getName());
                if (desiredPeriod != null) {
                    final boolean periodMissing =
                            currentPeriod == null || currentPeriod.trim().isEmpty();
                    final boolean periodMismatch =
                            currentPeriod != null && !currentPeriod.equalsIgnoreCase(desiredPeriod);
                    if (periodMissing || periodMismatch) {
                        meal.setMealperiod(desiredPeriod);
                        periodsPatched++;
                        dirty = true;
                    }
                }
                // dirty flag isn't used after this loop because saveAll
                // saves the whole list — kept for readability if we later
                // switch to per-row save() calls.
                if (dirty) {
                    // intentional no-op
                }
            }

            mealRepository.saveAll(meals);
            log.info(
                "[MealImageSeeder] Backfill complete — imagesPatched={}, periodsPatched={}",
                imagesPatched, periodsPatched
            );
        } catch (Exception e) {
            // Never let a seeder failure crash the app — log and move on.
            log.warn("[MealImageSeeder] Failed to backfill meal data: {}", e.getMessage());
        }
    }
}
