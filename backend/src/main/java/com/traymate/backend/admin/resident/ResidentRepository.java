package com.traymate.backend.admin.resident;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

//import java.util.Optional;

public interface ResidentRepository extends JpaRepository<Resident, Integer> {

   //Optional<Resident> findByResidentId(String residentId);

    //Optional<Resident> findByEmail(String email);

    //for the count of the residents on the admin dashboard
    long countByCaregiverIsNotNull();
    long countByCaregiverIsNull();

    List<Resident> findByCaregiver_Id(Long caregiverId);
}

