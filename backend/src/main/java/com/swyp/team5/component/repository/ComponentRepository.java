package com.swyp.team5.component.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.swyp.team5.component.entity.Component;

public interface ComponentRepository extends JpaRepository<Component, Long> {

    List<Component> findAllByNameIn(List<String> names);
}
