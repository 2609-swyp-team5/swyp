package com.swyp.team5.member.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.swyp.team5.member.entity.Social;
import com.swyp.team5.member.entity.SocialProvider;

public interface SocialRepository extends JpaRepository<Social, Long> {

    Optional<Social> findByProviderAndProviderId(SocialProvider provider, String providerId);
}
