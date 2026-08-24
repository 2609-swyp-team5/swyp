# 빌드
FROM gradle:8.5-jdk21-alpine AS builder
WORKDIR /app
COPY . .
RUN ./gradlew bootJar -x test

# 실행
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=builder /app/build/libs/*.jar app.jar
ENTRYPOINT ["java", "-jar", "app.jar"]