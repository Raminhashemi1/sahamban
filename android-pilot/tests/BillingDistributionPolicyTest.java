package ir.sahamban.pilot;

public final class BillingDistributionPolicyTest {
    public static void main(String[] args) {
        String[] channels={"CAFEBAZAAR","MYKET","GOOGLE_PLAY","WEB_DIRECT"};
        String[] labels={"کافه‌بازار","مایکت","Google Play","وب‌سایت"};
        for (int i=0;i<channels.length;i++) {
            BillingDistributionPolicy x=BillingDistributionPolicy.from(channels[i]);
            if (!x.isConfiguredBuild() || !x.channel().equals(channels[i])
                || !x.displayName().equals(labels[i]))
                throw new AssertionError("wrong build channel "+channels[i]);
        }
        for (String invalid : new String[]{null,"","bazaar","MYKET;WEB_DIRECT","UNKNOWN"}) {
            BillingDistributionPolicy x=BillingDistributionPolicy.from(invalid);
            if (x.isConfiguredBuild() || !"DISABLED".equals(x.channel()))
                throw new AssertionError("fail-closed rejected "+invalid);
        }
        System.out.println("BillingDistributionPolicyTest: PASS");
    }
}
