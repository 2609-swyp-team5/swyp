package com.swyp.team5.platform.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.swyp.team5.platform.entity.Platform;
import com.swyp.team5.platform.entity.PlatformListing;

public interface PlatformListingRepository extends JpaRepository<PlatformListing, Long> {

    Optional<PlatformListing> findByPlatformAndExternalItemId(Platform platform, String externalItemId);
}
