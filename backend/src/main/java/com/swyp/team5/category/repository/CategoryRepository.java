package com.swyp.team5.category.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.swyp.team5.category.entity.Category;

public interface CategoryRepository extends JpaRepository<Category, Long> {

    List<Category> findAllByOrderByIdAsc();
}
