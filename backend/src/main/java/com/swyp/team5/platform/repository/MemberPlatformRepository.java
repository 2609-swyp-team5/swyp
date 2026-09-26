package com.swyp.team5.platform.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.swyp.team5.platform.entity.MemberPlatform;

public interface MemberPlatformRepository extends JpaRepository<MemberPlatform, Long> {

    Optional<MemberPlatform> findByMemberIdAndPlatformId(Long memberId, Long platformId);
}
