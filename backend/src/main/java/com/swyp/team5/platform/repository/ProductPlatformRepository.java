package com.swyp.team5.platform.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.swyp.team5.platform.entity.ProductPlatform;

public interface ProductPlatformRepository extends JpaRepository<ProductPlatform, Long> {

    List<ProductPlatform> findByProductId(Long productId);

    Optional<ProductPlatform> findByProductIdAndMemberPlatformId(Long productId, Long memberPlatformId);
}
