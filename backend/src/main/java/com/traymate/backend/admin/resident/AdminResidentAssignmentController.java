package com.traymate.backend.admin.resident;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import com.traymate.backend.admin.assignment.AdminAssignmentService;
import com.traymate.backend.admin.resident.dto.AssignCaregiverRequest;
import com.traymate.backend.admin.resident.dto.ResidentResponse;

@RestController
@RequestMapping("/admin/residents")
@RequiredArgsConstructor
public class AdminResidentAssignmentController {

    private final AdminAssignmentService assignmentService;

    // @PutMapping("/{residentId}/assign")
    // public Resident assignResident(
    //         @PathVariable Integer residentId,
    //         @RequestBody AssignCaregiverRequest request
    // ) {
    //     return assignmentService.assignResident(
    //             residentId,
    //             request.getCaregiverId()
    //     );

    // }
    @PutMapping("/{residentId}/assign")
    public ResidentResponse assignResident(
            @PathVariable Integer residentId,
            @RequestBody AssignCaregiverRequest request
    ) {
        Resident resident = assignmentService.assignResident(
                residentId,
                request.getCaregiverId()
        );
        
        return new ResidentResponse(resident);
    }

}
