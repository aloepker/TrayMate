package com.traymate.backend.auth.repository;

/**
 * repository layer for User entity
 * 
 * handles all database operations related to users
 * spring Data JPA automatically provides implementations
 * for common CRUD operations.
 */

import com.traymate.backend.auth.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    //find a user by email
    //returns Optional to safely handle cases where user does not exist
    Optional<User> findByEmail(String email);

    List<User> findByRole(String role);
}
