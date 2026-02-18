package com.traymate.backend.admin.caregiver;

import com.traymate.backend.admin.caregiver.dto.CaregiverCardDto;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/admin/caregivers")
@RequiredArgsConstructor
public class AdminCaregiverController {

    private final AdminCaregiverService service;

    @GetMapping
    public List<CaregiverCardDto> getCaregivers() {
        return service.getCaregivers();
    }
}
