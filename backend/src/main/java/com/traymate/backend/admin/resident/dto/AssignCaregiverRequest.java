// package com.traymate.backend.admin.resident.dto;

// public class AssignCaregiverRequest {
    
// }
package com.traymate.backend.admin.resident.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AssignCaregiverRequest {
    private Long caregiverId; // null = unassign
}
