package com.swyp.team5.item.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.swyp.team5.item.entity.Item;

public interface ItemRepository extends JpaRepository<Item, Long> {}
