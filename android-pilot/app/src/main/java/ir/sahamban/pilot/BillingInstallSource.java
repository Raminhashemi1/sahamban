package ir.sahamban.pilot;

import android.content.Context;
import android.content.pm.InstallSourceInfo;
import android.content.pm.PackageManager;
import android.os.Build;

/**
 * UI diagnostic of Android install source only. NEVER grants checkout rights.
 * A device-side installer name can be absent or changed; server must verify
 * store-specific receipts independently before any entitlement.
 */
public final class BillingInstallSource {
    private BillingInstallSource() {}

    public static BillingDistributionPolicy detect(Context context) {
        if (context == null) return BillingDistributionPolicy.fromInstallers(null, null);
        PackageManager manager = context.getPackageManager();
        String packageName = context.getPackageName();
        try {
            if (Build.VERSION.SDK_INT >= 30) {
                InstallSourceInfo source = manager.getInstallSourceInfo(packageName);
                if (source == null)
                    return BillingDistributionPolicy.fromInstallers(null, null);
                return BillingDistributionPolicy.fromInstallers(
                    source.getInitiatingPackageName(), source.getInstallingPackageName());
            }
            return BillingDistributionPolicy.fromInstallers(
                null, manager.getInstallerPackageName(packageName));
        } catch (PackageManager.NameNotFoundException | IllegalArgumentException | SecurityException ex) {
            return BillingDistributionPolicy.fromInstallers(null, null);
        }
    }
}
