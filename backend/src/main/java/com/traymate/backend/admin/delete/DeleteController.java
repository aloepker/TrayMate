package com.traymate.backend.admin.delete;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/admin")
@RequiredArgsConstructor
public class DeleteController {
    private final DeleteService deleteService;

    @DeleteMapping("/delete/{type}/{id}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<?> deleteEntity(
            @PathVariable String type,
            @PathVariable Long id
    ) {
        deleteService.deleteEntity(type, id);
        return ResponseEntity.ok("Deleted successfully");
    }
}
