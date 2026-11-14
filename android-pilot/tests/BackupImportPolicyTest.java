package ir.sahamban.pilot;

public final class BackupImportPolicyTest {
    private static void expect(boolean condition) {
        if (!condition) throw new AssertionError("Backup import policy rejected an expectation");
    }

    public static void main(String[] args) {
        expect(BackupImportPolicy.acceptsContentUri(
                "content://com.android.providers.downloads.documents/document/1234"));
        expect(BackupImportPolicy.acceptsContentUri(
                "content://com.example.provider/tree/primary%3ADownload/document/primary%3ADownload%2Fbackup.json"));
        expect(!BackupImportPolicy.acceptsContentUri("file:///sdcard/Download/backup.json"));
        expect(!BackupImportPolicy.acceptsContentUri("https://example.com/backup.json"));
        expect(!BackupImportPolicy.acceptsContentUri("content:relative/path"));
        expect(!BackupImportPolicy.acceptsContentUri("content:///document/1234"));
        expect(!BackupImportPolicy.acceptsContentUri("content://user@provider/document/1234"));
        expect(!BackupImportPolicy.acceptsContentUri(null));
        expect(!BackupImportPolicy.acceptsContentUri("x".repeat(8193)));
        System.out.println("PASS: selected SAF import accepts content:// only");
    }
}
