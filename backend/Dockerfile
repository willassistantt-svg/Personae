FROM eclipse-temurin:21-jdk AS build
WORKDIR /src
COPY . .
ENV GRADLE_OPTS="-Dorg.gradle.daemon=false -Xmx1024m"
RUN ./gradlew bootJar --no-daemon

FROM eclipse-temurin:21-jre
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /src/build/libs/api.jar app.jar
EXPOSE 8091
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
