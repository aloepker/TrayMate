package com.traymate.backend.admin.kitchen;

import com.traymate.backend.admin.kitchen.dto.KitchenStaffDto;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/admin/kitchen")
@RequiredArgsConstructor
public class AdminKitchenStaffController {

    private final AdminKitchenStaffService service;

    @GetMapping
    public List<KitchenStaffDto> getKitchenStaff() {
        return service.getKitchenStaff();
    }
}
