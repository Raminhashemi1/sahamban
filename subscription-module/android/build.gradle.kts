plugins {
    id("com.android.library")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "ir.sahmino.subscription"
    compileSdk = 35

    defaultConfig {
        minSdk = 26
        consumerProguardFiles("consumer-rules.pro")
    }

    flavorDimensions += "store"
    productFlavors {
        create("bazaar") {
            dimension = "store"
            manifestPlaceholders["marketApplicationId"] = "com.farsitel.bazaar"
            manifestPlaceholders["marketBindAddress"] = "ir.cafebazaar.pardakht.InAppBillingService.BIND"
            manifestPlaceholders["marketPermission"] = "com.farsitel.bazaar.permission.PAY_THROUGH_BAZAAR"
        }
        create("myket") {
            dimension = "store"
            manifestPlaceholders["marketApplicationId"] = "ir.mservices.market"
            manifestPlaceholders["marketBindAddress"] = "ir.mservices.market.InAppBillingService.BIND"
            manifestPlaceholders["marketPermission"] = "ir.mservices.market.BILLING"
            val myketPublicKey = providers.gradleProperty("MYKET_PUBLIC_KEY").orNull ?: ""
            buildConfigField("String", "IAB_PUBLIC_KEY", "\"__MYKET_PUBLIC_KEY__\"".replace("__MYKET_PUBLIC_KEY__", myketPublicKey))
        }
    }

    buildFeatures { buildConfig = true }

    sourceSets {
        getByName("bazaar").java.srcDir("src/bazaar/kotlin")
        getByName("myket").java.srcDir("src/myket/kotlin")
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
}

dependencies {
    implementation("androidx.activity:activity-ktx:1.10.1")
    implementation("androidx.webkit:webkit:1.14.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.10.2")

    add("bazaarImplementation", "com.github.cafebazaar.Poolakey:poolakey:2.3.0")
    add("myketImplementation", "ir.myket:billing:2.2")
}
