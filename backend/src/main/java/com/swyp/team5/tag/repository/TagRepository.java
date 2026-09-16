package com.swyp.team5.tag.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.swyp.team5.tag.entity.Tag;

public interface TagRepository extends JpaRepository<Tag, Long> {

    List<Tag> findAllByNameIn(List<String> names);
}
