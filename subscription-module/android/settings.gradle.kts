pluginManagement {
    plugins {
        id("com.android.library") version "8.9.2"
        id("org.jetbrains.kotlin.android") version "2.0.21"
    }
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
        maven("https://jitpack.io")
        maven("https://maven.myket.ir")
    }
}

rootProject.name = "SahminoSubscriptionAndroid"
