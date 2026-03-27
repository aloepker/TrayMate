package com.traymate.backend.caregiver;

import com.traymate.backend.caregiver.dto.CaregiverResidentDto;

import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/caregiver")
@RequiredArgsConstructor
public class CaregiverController {

    private final CaregiverService caregiverService;

    @GetMapping("/residents")
    @PreAuthorize("hasAuthority('ROLE_CAREGIVER')")
    public List<CaregiverResidentDto> getMyResidents() {
        return caregiverService.getAssignedResidents();
    }
}