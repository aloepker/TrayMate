package com.traymate.backend.audit.dto;

import com.traymate.backend.audit.DietaryAuditLog;

import lombok.*;

import java.time.Instant;

/**
 * Wire format for a single audit entry — shaped for the mobile UI.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DietaryAuditEntryDto {

    private Long      id;
    private Integer   residentId;
    private String    fieldName;
    private String    oldValue;
    private String    newValue;
    private Long      changedByUserId;
    private String    changedByName;
    private String    changedByRole;
    private Instant   changedAt;

    public static DietaryAuditEntryDto from(DietaryAuditLog log) {
        return DietaryAuditEntryDto.builder()
            .id(log.getId())
            .residentId(log.getResidentId())
            .fieldName(log.getFieldName())
            .oldValue(log.getOldValue())
            .newValue(log.getNewValue())
            .changedByUserId(log.getChangedByUserId())
            .changedByName(log.getChangedByName())
            .changedByRole(log.getChangedByRole())
            .changedAt(log.getChangedAt())
            .build();
    }
}
