package com.traymate.backend.mealOrders;

//import com.traymate.backend.menu.Meal; // Add this
import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
//import java.util.stream.Collectors; // Add this

@RestController
@RequestMapping("/mealOrders")
@RequiredArgsConstructor
public class MealOrdersController {
    
    private final MealOrdersService mealOrdersService;
    private final MealOrdersRepository mealOrdersRepository;

    // 1. SAVE a new order
//    @PostMapping
//    public MealOrders placeOrder(@RequestBody MealOrders newOrder) {
//        return mealOrdersService.saveOrder(newOrder);
//    }

@PostMapping
public ResponseEntity<?> placeOrder(@RequestBody MealOrders newOrder) {
    try {
        MealOrders saved = mealOrdersService.saveOrder(newOrder);
        return new ResponseEntity<>(saved, HttpStatus.CREATED);
    } catch (ComplianceBlockedException e) {
        // 422 with the full violation breakdown so the client can render
        // every reason (allergen + condition + dietary) next to each meal.
        ErrorResponse error = new ErrorResponse(
            "COMPLIANCE_BLOCKED",
            "Order contains meals that violate the resident's dietary profile",
            e.getResult()
        );
        return new ResponseEntity<>(error, HttpStatus.UNPROCESSABLE_ENTITY);
    } catch (IllegalStateException e) {
        String message = e.getMessage();
        Object data = null;

        // If conflict, ignore the string parsing and just look it up manually
        if (message.contains("PENDING_CONFLICT")) {
            // Re-run the same search the service just did to get the object for the UI
            data = mealOrdersRepository.findByUserIdAndMealOfDayAndDate(
                newOrder.getUserId(),
                newOrder.getMealOfDay(),
                newOrder.getDate()
            ).orElse(null);

            message = "PENDING_CONFLICT";
        }

        ErrorResponse error = new ErrorResponse(message, "Conflict detected", data);
        return new ResponseEntity<>(error, HttpStatus.CONFLICT);
    }
}

    @PutMapping("/{id}")
    public ResponseEntity<?> overwriteOrder(
        @PathVariable Integer id,
        @RequestBody MealOrders updatedOrder
    ) {
        try {
            // We use the ID from the URL to ensure we hit the right record
            MealOrders saved = mealOrdersService.updateExistingOrderById(id, updatedOrder);
            return ResponseEntity.ok(saved);
        } catch (ComplianceBlockedException e) {
            ErrorResponse error = new ErrorResponse(
                "COMPLIANCE_BLOCKED",
                "Order contains meals that violate the resident's dietary profile",
                e.getResult()
            );
            return new ResponseEntity<>(error, HttpStatus.UNPROCESSABLE_ENTITY);
        }
    }

    // 2. RETRIEVE history for a specific user
    @GetMapping("/history/{userId}")
    public List<OrderResponseDTO> getUserHistory(@PathVariable String userId) {
        //return mealOrdersService.getUserHistory(userId);
        return mealOrdersService.getUserHistoryWithDetails(userId);
    }
    
    //3. get information for a specific meal and date
    @GetMapping("/search")
    public List<OrderResponseDTO> searchOrders(
      @RequestParam String mealOfDay, 
      @RequestParam String date // We'll receive this as a String like "2026-03-18"
    ) {
      LocalDate localDate = LocalDate.parse(date);
      return mealOrdersService.getOrdersByMealAndDate(mealOfDay, localDate);
    }

    public static record ErrorResponse(String errorCode, String message, Object data) {}
}
