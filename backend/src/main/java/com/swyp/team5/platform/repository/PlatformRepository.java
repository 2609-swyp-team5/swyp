package com.swyp.team5.platform.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.swyp.team5.platform.entity.Platform;

public interface PlatformRepository extends JpaRepository<Platform, Long> {

    Optional<Platform> findByName(String name);
}
