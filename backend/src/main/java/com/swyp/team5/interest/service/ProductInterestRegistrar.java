package com.swyp.team5.interest.service;

import org.springframework.stereotype.Component;

import com.swyp.team5.interest.entity.Interest;
import com.swyp.team5.interest.error.InterestAlreadyExistsException;
import com.swyp.team5.interest.repository.InterestRepository;
import com.swyp.team5.member.entity.Member;
import com.swyp.team5.product.dto.ListingSource;
import com.swyp.team5.product.entity.Product;
import com.swyp.team5.product.error.ProductNotFoundException;
import com.swyp.team5.product.repository.ProductRepository;

/** 우리 회원 상품을 관심상품으로 등록하는 전략. */
@Component
class ProductInterestRegistrar implements InterestRegistrar {

    private final InterestRepository interestRepository;
    private final ProductRepository productRepository;

    ProductInterestRegistrar(InterestRepository interestRepository, ProductRepository productRepository) {
        this.interestRepository = interestRepository;
        this.productRepository = productRepository;
    }

    @Override
    public ListingSource source() {
        return ListingSource.OUR;
    }

    @Override
    public Interest register(Member member, Long memberId, Long productId) {
        Product product =
                productRepository.findById(productId).orElseThrow(() -> new ProductNotFoundException(productId));
        if (interestRepository.existsByMemberIdAndProductId(memberId, productId)) {
            throw new InterestAlreadyExistsException();
        }
        return Interest.ofProduct(member, product);
    }
}
