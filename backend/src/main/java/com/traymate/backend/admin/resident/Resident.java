package com.traymate.backend.admin.resident;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import com.fasterxml.jackson.annotation.JsonFormat;

@Entity
@Table(name = "residents")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Resident {

    // PRIMARY KEY — matches DB
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "residentID")
    private Integer id;

    @Column(name = "first_name")
    private String firstName;

    @Column(name = "middle_name")
    private String middleName;

    @Column(name = "last_name")
    private String lastName;

    //@Column(name = "dob")
    //private LocalDate dob;
    @JsonFormat(pattern = "yyyy-MM-dd")
    @Column(name = "dob")
    private LocalDate dob;

    // @Column(name = "gender")
    // private String gender;
    @Enumerated(EnumType.STRING)
    @Column(name = "gender")
    private Gender gender;


    //@Column(name = "email")
    // @Column(nullable = true)
    // private String email;

    @Column(name = "phone")
    private String phone;

    @Column(name = "emergency_contact")
    private String emergencyContact;

    @Column(name = "emergency_phone")
    private String emergencyPhone;

    @Column(name = "doctor")
    private String doctor;

    @Column(name = "doctor_phone")
    private String doctorPhone;

    @Column(name = "medical_conditions")
    private String medicalConditions;

    @Column(name = "food_allergies")
    private String foodAllergies;

    @Column(name = "medications")
    private String medications;

    @Column(name = "room_number")
    private String roomNumber;
}
