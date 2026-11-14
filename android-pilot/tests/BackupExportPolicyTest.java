package ir.sahamban.pilot;

public final class BackupExportPolicyTest {
    private static void expect(boolean condition) {
        if (!condition) throw new AssertionError("Backup export policy rejected an expectation");
    }
    public static void main(String[] args) {
        String page="https://raminhashemi1.github.io/sahamban/";
        expect(BackupExportPolicy.acceptsSource("https://raminhashemi1.github.io",true,page));
        expect(!BackupExportPolicy.acceptsSource("http://raminhashemi1.github.io",true,page));
        expect(!BackupExportPolicy.acceptsSource("https://evil.github.io",true,page));
        expect(!BackupExportPolicy.acceptsSource("https://raminhashemi1.github.io",false,page));
        expect(!BackupExportPolicy.acceptsSource("https://raminhashemi1.github.io",true,"https://raminhashemi1.github.io/other/"));
        expect(!BackupExportPolicy.acceptsSource("https://raminhashemi1.github.io",true,"https://raminhashemi1.github.io/sahamban.evil/"));
        expect(BackupExportPolicy.acceptsContents(BackupExportPolicy.LOCAL_NAME,"{}"));
        expect(BackupExportPolicy.acceptsContents(BackupExportPolicy.PORTFOLIO_NAME,"{}"));
        expect(!BackupExportPolicy.acceptsContents("../backup.json","{}"));
        expect(!BackupExportPolicy.acceptsContents(BackupExportPolicy.LOCAL_NAME,"[]"));
        expect(!BackupExportPolicy.acceptsContents(BackupExportPolicy.LOCAL_NAME,"{"));
        expect(!BackupExportPolicy.acceptsContents(BackupExportPolicy.LOCAL_NAME,"x".repeat(BackupExportPolicy.MAX_JSON_BYTES+1)));
        expect(!BackupExportPolicy.acceptsContents(BackupExportPolicy.LOCAL_NAME,"{\"f\":\"" + "ق".repeat(140000) + "\"}"));
        System.out.println("PASS: strictly scoped backup export policy");
    }
}
