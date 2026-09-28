package com.swyp.team5.member.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.swyp.team5.member.entity.Member;
import com.swyp.team5.member.entity.MemberStatus;

public interface MemberRepository extends JpaRepository<Member, Long> {

    Optional<Member> findByEmail(String email);

    boolean existsByEmail(String email);

    boolean existsByPhone(String phone);

    Optional<Member> findByEmailAndStatusNot(String email, MemberStatus status);

    boolean existsByEmailAndStatusNot(String email, MemberStatus status);

    boolean existsByPhoneAndStatusNot(String phone, MemberStatus status);
}
