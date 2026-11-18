package ir.sahamban.pilot;

/**
 * UI-only best-effort installer routing for ONE universal APK.
 * Installer metadata is neither immutable nor authorization-grade proof.
 * Unknown, ambiguous and sideloaded APKs MUST stay disabled.
 */
public final class BillingDistributionPolicy {
    private final String channel;
    private BillingDistributionPolicy(String channel) { this.channel = channel; }

    private static String channelForInstaller(String installer) {
        if ("com.farsitel.bazaar".equals(installer)) return "CAFEBAZAAR";
        if ("ir.mservices.market".equals(installer)) return "MYKET";
        if ("com.android.vending".equals(installer)) return "GOOGLE_PLAY";
        return "DISABLED";
    }

    /** May identify one trusted-looking store for UI only; no real checkout. */
    public static BillingDistributionPolicy fromInstallers(String initiator, String installer) {
        String primary = channelForInstaller(initiator);
        String secondary = channelForInstaller(installer);
        // If both are present and disagree, refuse to select any payment route.
        if (initiator != null && installer != null && !initiator.equals(installer))
            return new BillingDistributionPolicy("DISABLED");
        // Older Android versions may supply installer only; still a UI hint.
        String channel = initiator != null ? primary : secondary;
        return new BillingDistributionPolicy(channel);
    }

    public boolean isConfiguredBuild() { return !"DISABLED".equals(channel); }
    public String channel() { return channel; }
    public String displayName() {
        switch (channel) {
            case "CAFEBAZAAR": return "کافه‌بازار";
            case "MYKET": return "مایکت";
            case "GOOGLE_PLAY": return "Google Play";
            default: return "نامشخص";
        }
    }
    public String statusText() {
        switch (channel) {
            case "CAFEBAZAAR":
                return "مسیر پیشنهادی این نصب: کافه‌بازار؛ پرداخت واقعی هنوز غیرفعال است.";
            case "MYKET":
                return "مسیر پیشنهادی این نصب: مایکت؛ پرداخت واقعی هنوز غیرفعال است.";
            case "GOOGLE_PLAY":
                return "مسیر پیشنهادی این نصب: Google Play؛ پرداخت واقعی هنوز غیرفعال است.";
            default:
                return "منبع نصب معتبر و قابل‌تشخیص نیست؛ پرداخت غیرفعال است. APK دانلودشده از وب‌سایت نیز خودکار به پرداخت وب متصل نمی‌شود.";
        }
    }
}
