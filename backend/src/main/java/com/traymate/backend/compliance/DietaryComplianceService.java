package com.traymate.backend.compliance;

import com.traymate.backend.admin.resident.Resident;
import com.traymate.backend.admin.resident.ResidentRepository;
import com.traymate.backend.compliance.dto.ComplianceResult;
import com.traymate.backend.compliance.dto.ComplianceViolation;
import com.traymate.backend.compliance.dto.MealComplianceResult;
import com.traymate.backend.menu.Meal;
import com.traymate.backend.menu.MealRepository;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Server-side mirror of mealSafetyService.ts. Every meal-order placement
 * and (optionally) explicit check funnels through here so the frontend
 * safety gate can't be bypassed by a direct API call.
 *
 * Rules enforced (match frontend exactly):
 *   1. Explicit food allergies listed on the resident (keyword scan).
 *   2. Implied allergies from medical conditions:
 *        Celiac Disease / Celiac        → gluten, wheat
 *        Lactose Intolerance / Lactose  → dairy
 *   3. Hypertension / High Blood Pressure → sodium ≤ 600mg.
 *   4. Diabetes → sugar ≤ 25g (only if meal exposes sugar).
 *   5. Dietary restrictions (vegetarian, vegan, halal, kosher, pescatarian,
 *      low-sodium). Stored on Resident as comma-separated string when present.
 */
@Service
@RequiredArgsConstructor
public class DietaryComplianceService {

    private final ResidentRepository residentRepository;
    private final MealRepository mealRepository;

    private static final int SODIUM_LIMIT_MG = 600;
    private static final int DIABETES_SUGAR_LIMIT_G = 25;

    private static final Map<String, List<String>> ALLERGEN_KEYWORDS = Map.ofEntries(
        Map.entry("dairy",     List.of("milk", "cheese", "butter", "cream", "yogurt", "dairy",
                                       "cheddar", "parmesan", "mozzarella", "feta", "ricotta")),
        Map.entry("eggs",      List.of("egg", "omelet", "omelette", "quiche", "frittata")),
        Map.entry("egg",       List.of("egg", "omelet", "omelette", "quiche", "frittata")),
        Map.entry("gluten",    List.of("flour", "bread", "pasta", "wheat", "rye", "barley",
                                       "crouton", "pizza", "noodle", "sandwich", "toast", "bun")),
        Map.entry("wheat",     List.of("flour", "bread", "pasta", "wheat", "noodle", "toast", "bun")),
        Map.entry("shellfish", List.of("shrimp", "lobster", "crab", "crayfish", "prawn", "shellfish")),
        Map.entry("fish",      List.of("salmon", "tuna", "cod", "tilapia", "fish", "anchovy",
                                       "sardine", "halibut", "trout")),
        Map.entry("nuts",      List.of("peanut", "almond", "cashew", "walnut", "pecan",
                                       "hazelnut", "pistachio", "nut")),
        Map.entry("tree nuts", List.of("almond", "cashew", "walnut", "pecan", "hazelnut", "pistachio")),
        Map.entry("peanuts",   List.of("peanut")),
        Map.entry("peanut",    List.of("peanut")),
        Map.entry("soy",       List.of("soy", "tofu", "edamame", "tempeh", "miso")),
        Map.entry("sesame",    List.of("sesame", "tahini"))
    );

    private static final Map<String, List<String>> DIET_KEYWORDS = Map.of(
        "vegetarian",  List.of("beef", "pork", "chicken", "turkey", "lamb", "bacon", "ham",
                               "shrimp", "fish", "salmon", "tuna", "sausage", "steak", "meatball"),
        "vegan",       List.of("beef", "pork", "chicken", "turkey", "lamb", "bacon", "ham",
                               "shrimp", "fish", "salmon", "tuna", "sausage", "steak", "meatball",
                               "milk", "cheese", "butter", "cream", "yogurt", "egg", "honey"),
        "halal",       List.of("pork", "bacon", "ham", "sausage", "alcohol", "wine"),
        "kosher",      List.of("pork", "bacon", "ham", "shrimp", "lobster", "crab"),
        "pescatarian", List.of("beef", "pork", "chicken", "turkey", "lamb", "bacon", "ham",
                               "sausage", "steak")
    );

    private static final Map<String, List<String>> CONDITION_IMPLIED_ALLERGIES = Map.of(
        "celiac disease",      List.of("gluten", "wheat"),
        "celiac",              List.of("gluten", "wheat"),
        "lactose intolerance", List.of("dairy"),
        "lactose",             List.of("dairy")
    );

    // ── Public API ─────────────────────────────────────────────────

    /** Look up resident + meals and return aggregated compliance result. */
    public ComplianceResult check(Integer residentId, List<Integer> mealIds) {
        Resident resident = residentRepository.findById(residentId)
            .orElseThrow(() -> new IllegalArgumentException("Resident not found: " + residentId));

        List<Meal> meals = (mealIds == null || mealIds.isEmpty())
            ? List.of()
            : mealRepository.findAllById(mealIds);

        return validate(resident, meals);
    }

    /**
     * Validate a pre-fetched resident + meals bundle. Used internally by
     * MealOrdersService during order placement so we don't do redundant
     * repository calls.
     */
    public ComplianceResult validate(Resident resident, List<Meal> meals) {
        List<String> allergies    = splitList(resident.getFoodAllergies());
        List<String> conditions   = splitList(resident.getMedicalConditions());
        List<String> restrictions = splitList(resident.getDietaryRestrictions());

        List<MealComplianceResult> perMeal = meals.stream()
            .map(m -> checkMeal(m, allergies, restrictions, conditions))
            .collect(Collectors.toList());

        List<ComplianceViolation> flat = perMeal.stream()
            .flatMap(r -> r.getViolations().stream())
            .sorted(Comparator.comparingInt(v -> severityRank(v.getSeverity())))
            .collect(Collectors.toList());

        return ComplianceResult.builder()
            .residentId(resident.getId())
            .safe(flat.isEmpty())
            .meals(perMeal)
            .violations(flat)
            .build();
    }

    // ── Core per-meal rule run ─────────────────────────────────────

    private MealComplianceResult checkMeal(
        Meal meal,
        List<String> allergies,
        List<String> restrictions,
        List<String> conditions
    ) {
        List<ComplianceViolation> violations = new ArrayList<>();
        Set<String> reportedAllergens = new HashSet<>();
        String haystack = buildHaystack(meal);
        Integer sodium = meal.getSodium(); // mg
        Integer sugar = null; // Meal entity doesn't expose sugar yet; kept as hook for future.

        // 1. Explicit allergies
        for (String allergy : allergies) {
            if (matchesAllergen(allergy, meal, haystack)) {
                violations.add(ComplianceViolation.builder()
                    .severity("allergy")
                    .category("allergen")
                    .reason("Contains " + titleCase(allergy) + " — resident is allergic")
                    .trigger(titleCase(allergy))
                    .build());
                reportedAllergens.add(allergy);
            }
        }

        // 2. Medical conditions
        for (String condition : conditions) {
            // 2a. Implied allergens from condition
            List<String> implied = CONDITION_IMPLIED_ALLERGIES.get(condition);
            if (implied != null) {
                for (String impliedAllergy : implied) {
                    if (reportedAllergens.contains(impliedAllergy)) continue;
                    if (matchesAllergen(impliedAllergy, meal, haystack)) {
                        violations.add(ComplianceViolation.builder()
                            .severity("allergy")
                            .category("condition-implied-allergen")
                            .reason("Contains " + titleCase(impliedAllergy)
                                + " — resident has " + titleCase(condition))
                            .trigger(titleCase(condition))
                            .build());
                        reportedAllergens.add(impliedAllergy);
                    }
                }
            }

            // 2b. Hypertension / high blood pressure → sodium cap
            if (condition.contains("hypertension") || condition.contains("high blood pressure")) {
                if (sodium != null && sodium > SODIUM_LIMIT_MG) {
                    violations.add(ComplianceViolation.builder()
                        .severity("medical")
                        .category("condition-sodium")
                        .reason("High sodium (" + sodium + "mg) — resident has " + titleCase(condition))
                        .trigger(titleCase(condition))
                        .build());
                }
            }

            // 2c. Diabetes → sugar cap (skipped if meal has no sugar field)
            if ((condition.contains("diabetes") || condition.contains("diabetic"))
                && sugar != null && sugar > DIABETES_SUGAR_LIMIT_G) {
                violations.add(ComplianceViolation.builder()
                    .severity("medical")
                    .category("condition-sugar")
                    .reason("High sugar (" + sugar + "g) — resident has " + titleCase(condition))
                    .trigger(titleCase(condition))
                    .build());
            }
        }

        // 3. Dietary restrictions
        for (String restriction : restrictions) {
            if (restriction.contains("low sodium") || restriction.contains("low-sodium")) {
                if (sodium != null && sodium > SODIUM_LIMIT_MG) {
                    violations.add(ComplianceViolation.builder()
                        .severity("medical")
                        .category("diet-low-sodium")
                        .reason("High sodium (" + sodium + "mg) — resident on low-sodium diet")
                        .trigger("Low-Sodium Diet")
                        .build());
                }
                continue;
            }
            List<String> keywords = DIET_KEYWORDS.get(restriction);
            if (keywords != null && keywords.stream().anyMatch(haystack::contains)) {
                violations.add(ComplianceViolation.builder()
                    .severity("dietary")
                    .category("diet-restriction")
                    .reason("Not " + titleCase(restriction)
                        + " — resident follows " + titleCase(restriction) + " diet")
                    .trigger(titleCase(restriction))
                    .build());
            }
        }

        return MealComplianceResult.builder()
            .mealId(meal.getId())
            .mealName(meal.getName() == null ? String.valueOf(meal.getId()) : meal.getName())
            .safe(violations.isEmpty())
            .violations(violations)
            .build();
    }

    // ── Helpers ────────────────────────────────────────────────────

    private boolean matchesAllergen(String allergy, Meal meal, String haystack) {
        String explicit = norm(nullToEmpty(meal.getAllergenInfo()));
        if (!explicit.isEmpty() && (explicit.contains(allergy) || allergy.contains(explicit))) {
            return true;
        }
        List<String> keywords = ALLERGEN_KEYWORDS.getOrDefault(allergy, List.of(allergy));
        return keywords.stream().anyMatch(haystack::contains);
    }

    private String buildHaystack(Meal meal) {
        StringBuilder sb = new StringBuilder();
        sb.append(nullToEmpty(meal.getName())).append(' ');
        sb.append(nullToEmpty(meal.getDescription())).append(' ');
        sb.append(nullToEmpty(meal.getIngredients())).append(' ');
        sb.append(nullToEmpty(meal.getAllergenInfo())).append(' ');
        sb.append(nullToEmpty(meal.getTags()));
        return sb.toString().toLowerCase(Locale.ROOT);
    }

    /** Parse a resident's comma-or-semicolon list into normalized lowercase tokens. */
    private List<String> splitList(String raw) {
        if (raw == null || raw.isBlank()) return List.of();
        return Arrays.stream(raw.split("[,;]"))
            .map(String::trim)
            .filter(s -> !s.isEmpty())
            .map(s -> s.toLowerCase(Locale.ROOT))
            .collect(Collectors.toList());
    }

    private static int severityRank(String severity) {
        if (severity == null) return 99;
        return switch (severity) {
            case "allergy" -> 0;
            case "medical" -> 1;
            case "dietary" -> 2;
            default -> 99;
        };
    }

    private static String titleCase(String s) {
        if (s == null || s.isEmpty()) return "";
        return Character.toUpperCase(s.charAt(0)) + s.substring(1);
    }

    private static String norm(String s) {
        return s == null ? "" : s.toLowerCase(Locale.ROOT).trim();
    }

    private static String nullToEmpty(String s) {
        return s == null ? "" : s;
    }
}
