package com.swyp.team5.platform.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.swyp.team5.platform.entity.CategoryPlatform;

public interface CategoryPlatformRepository extends JpaRepository<CategoryPlatform, Long> {

    List<CategoryPlatform> findByPlatformName(String platformName);
}
