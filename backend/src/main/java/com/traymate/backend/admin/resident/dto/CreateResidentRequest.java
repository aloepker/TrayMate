package com.traymate.backend.admin.resident.dto;
import com.fasterxml.jackson.annotation.JsonFormat;
import com.traymate.backend.admin.resident.Gender;
import lombok.Data;

import java.time.LocalDate;

@Data
public class CreateResidentRequest {

    private String firstName;
    private String middleName;
    private String lastName;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate dob;

    private Gender gender;

    private String phone;

    private String emergencyContact;
    private String emergencyPhone;

    private String doctor;
    private String doctorPhone;

    private String medicalConditions;
    private String foodAllergies;
    private String medications;

    private String roomNumber;
}

