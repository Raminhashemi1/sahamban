package ir.sahamban.pilot;

/**
 * Build-controlled payment routing. App never guesses installation source or
 * offers a provider selector; unsupported builds fail closed.
 * No receipt validation or payment activation occurs in this class.
 */
public final class BillingDistributionPolicy {
    private final String channel;
    private BillingDistributionPolicy(String channel) { this.channel = channel; }

    public static BillingDistributionPolicy from(String channel) {
        if (!"CAFEBAZAAR".equals(channel) && !"MYKET".equals(channel)
            && !"GOOGLE_PLAY".equals(channel) && !"WEB_DIRECT".equals(channel)) {
            return new BillingDistributionPolicy("DISABLED");
        }
        return new BillingDistributionPolicy(channel);
    }

    public boolean isConfiguredBuild() { return !"DISABLED".equals(channel); }
    public String channel() { return channel; }
    public String displayName() {
        switch (channel) {
            case "CAFEBAZAAR": return "کافه‌بازار";
            case "MYKET": return "مایکت";
            case "GOOGLE_PLAY": return "Google Play";
            case "WEB_DIRECT": return "وب‌سایت";
            default: return "غیرفعال";
        }
    }
    public String statusText() {
        switch (channel) {
            case "CAFEBAZAAR":
                return "فقط مسیر کافه‌بازار برای این نسخه تعیین شده؛ اتصال خرید واقعی هنوز غیرفعال است.";
            case "MYKET":
                return "فقط مسیر مایکت برای این نسخه تعیین شده؛ اتصال خرید واقعی هنوز غیرفعال است.";
            case "GOOGLE_PLAY":
                return "فقط مسیر Google Play برای این نسخه تعیین شده؛ اتصال خرید واقعی هنوز غیرفعال است.";
            case "WEB_DIRECT":
                return "فقط مسیر پرداخت وب‌سایت برای این نسخه تعیین شده؛ اتصال بانکی واقعی هنوز غیرفعال است.";
            default:
                return "مسیر پرداخت معتبر نیست؛ خرید غیرفعال است.";
        }
    }
}