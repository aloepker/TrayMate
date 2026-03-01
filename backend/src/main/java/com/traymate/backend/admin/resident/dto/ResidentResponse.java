package com.traymate.backend.admin.resident.dto;

import com.traymate.backend.admin.resident.Resident;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
public class ResidentResponse {

    private Integer id;
    private String firstName;
    private String middleName;
    private String lastName;
    private LocalDate dob;
    private String gender;
    private String phone;
    private String emergencyContact;
    private String emergencyPhone;
    private String doctor;
    private String doctorPhone;
    private String medicalConditions;
    private String foodAllergies;
    private String medications;
    private String roomNumber;
    private Long caregiverId; 

    // constructor from Resident entity
    public ResidentResponse(Resident resident) {
        this.id = resident.getId();
        this.firstName = resident.getFirstName();
        this.middleName = resident.getMiddleName();
        this.lastName = resident.getLastName();
        this.dob = resident.getDob();
        this.gender = resident.getGender() != null ? resident.getGender().name() : null;
        this.phone = resident.getPhone();
        this.emergencyContact = resident.getEmergencyContact();
        this.emergencyPhone = resident.getEmergencyPhone();
        this.doctor = resident.getDoctor();
        this.doctorPhone = resident.getDoctorPhone();
        this.medicalConditions = resident.getMedicalConditions();
        this.foodAllergies = resident.getFoodAllergies();
        this.medications = resident.getMedications();
        this.roomNumber = resident.getRoomNumber();
        this.caregiverId = resident.getCaregiver() != null ? resident.getCaregiver().getId() : null;
    }
}
