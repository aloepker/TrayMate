package com.traymate.backend.admin.resident;

import com.traymate.backend.admin.resident.dto.CreateResidentRequest;
import com.traymate.backend.admin.resident.dto.UpdateResidentInfo;

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

    //UPDATE (Edit Resident Button)
    @PutMapping("/{id}")
    public ResponseEntity<Resident> updateResident(
            @PathVariable Integer id,
            @RequestBody UpdateResidentInfo request) {

        return ResponseEntity.ok(service.updateResident(id, request));
    }
}
