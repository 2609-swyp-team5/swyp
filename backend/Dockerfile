# 빌드
FROM gradle:8.5-jdk21-alpine AS builder
WORKDIR /app
COPY . .
RUN ./gradlew bootJar -x test

# 실행
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=builder /app/build/libs/*.jar app.jar
# 컨테이너 실행 시 프로파일 미지정으로 인해 local(H2) 설정으로 뜨는 사고 방지
# 필요 시 -e SPRING_PROFILES_ACTIVE=dev 등으로 재정의
ENV SPRING_PROFILES_ACTIVE=prod
ENTRYPOINT ["java", "-jar", "app.jar"]