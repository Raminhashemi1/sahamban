package ir.sahamban.pilot;

public final class BillingDistributionPolicyTest {
    public static void main(String[] args) {
        String[] installers={"com.farsitel.bazaar","ir.mservices.market","com.android.vending"};
        String[] channels={"CAFEBAZAAR","MYKET","GOOGLE_PLAY"};
        for (int i=0;i<installers.length;i++) {
            BillingDistributionPolicy direct=BillingDistributionPolicy.fromInstallers(
                installers[i],installers[i]);
            BillingDistributionPolicy legacy=BillingDistributionPolicy.fromInstallers(
                null,installers[i]);
            if (!direct.isConfiguredBuild() || !legacy.isConfiguredBuild()
                || !direct.channel().equals(channels[i])
                || !legacy.channel().equals(channels[i]))
                throw new AssertionError("installer mismatch "+installers[i]);
        }
        String[][] unknown={
            {null,null},{"",""},{"com.android.packageinstaller","com.android.packageinstaller"},
            {"com.google.android.packageinstaller","com.android.vending"},
            {"com.farsitel.bazaar","ir.mservices.market"},
            {"ir.mservices.market","com.android.vending"},
            {"some.web.browser",null},
            {"com.android.vending","unrecognized.installer"}
        };
        for (String[] pair : unknown) {
            BillingDistributionPolicy result=BillingDistributionPolicy.fromInstallers(
                pair[0],pair[1]);
            if (result.isConfiguredBuild() || !"DISABLED".equals(result.channel()))
                throw new AssertionError("unsafe install route "+pair[0]+","+pair[1]);
        }
        // A sideloaded APK cannot claim the web PSP based on download origin.
        if (BillingDistributionPolicy.fromInstallers(null,null).isConfiguredBuild())
            throw new AssertionError("sideload incorrectly activated");
        System.out.println("BillingDistributionPolicyTest: PASS");
    }
}
