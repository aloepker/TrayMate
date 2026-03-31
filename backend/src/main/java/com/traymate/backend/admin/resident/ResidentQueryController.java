//get request for residents
package com.traymate.backend.admin.resident;

import com.traymate.backend.admin.resident.dto.ResidentCardDto;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/admin/residents")
@RequiredArgsConstructor
public class ResidentQueryController {

    private final ResidentQueryService service;

    @GetMapping
    public List<ResidentCardDto> getResidents() {
        return service.getAllResidents();
    }
}
