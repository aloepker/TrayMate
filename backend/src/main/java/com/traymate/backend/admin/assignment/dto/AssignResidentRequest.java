
package com.traymate.backend.admin.assignment.dto;

import lombok.Data;

@Data
public class AssignResidentRequest {
    private Integer residentId;
    private Long caregiverId; // null = unassign
}

