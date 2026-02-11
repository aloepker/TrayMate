package com.traymate.backend.admin.resident;

import com.traymate.backend.admin.resident.dto.CreateResidentRequest;
import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
// import org.springframework.security.access.prepost.PreAuthorize;
// import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/admin/residents")
@RequiredArgsConstructor
public class ResidentController {

    private final ResidentService service;

    @PostMapping
    public ResponseEntity<Resident> createResident(
            @RequestBody CreateResidentRequest request) {

        return ResponseEntity.ok(service.createResident(request));
    }
}
